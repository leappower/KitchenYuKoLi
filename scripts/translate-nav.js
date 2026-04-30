#!/usr/bin/env node
'use strict';

/**
 * Standalone script to batch-translate nav items into all target languages.
 * Reads nav_items from SQLite, calls NVIDIA API, writes to i18n JSON files.
 *
 * Usage: node scripts/translate-nav.js [--lang ja,ko,...] [--dry-run] [--source zh-CN]
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Load .env
// Load .env manually (no dotenv dependency needed)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const DB_PATH = path.join(__dirname, '..', 'src', 'admin', 'data', 'cms.db');
const LANG_DIR = path.join(__dirname, '..', 'src', 'assets', 'lang');

const SUPPORTED_LANGS = {
  'en': 'English', 'ja': '日本語', 'ko': '한국어', 'th': 'ไทย',
  'vi': 'Tiếng Việt', 'id': 'Bahasa Indonesia', 'ms': 'Bahasa Melayu',
  'hi': 'हिन्दी', 'ar': 'العربية', 'zh-TW': '繁體中文'
};

// Parse args
const args = process.argv.slice(2);
let targetLangs = null;
let dryRun = false;
let sourceLang = 'zh-CN';

args.forEach(a => {
  if (a === '--dry-run') dryRun = true;
  if (a.startsWith('--lang=')) targetLangs = a.split('=')[1].split(',').map(s => s.trim());
  if (a.startsWith('--source=')) sourceLang = a.split('=')[1].trim();
});

const langs = targetLangs || Object.keys(SUPPORTED_LANGS);
const apiKey = process.env.TRANSLATE_API_KEY;
const apiUrl = (process.env.TRANSLATE_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const model = process.env.TRANSLATE_MODEL || 'gpt-4o-mini';

if (!apiKey) {
  console.error('ERROR: TRANSLATE_API_KEY not set in .env');
  process.exit(1);
}

console.log('API: ' + apiUrl + ' / ' + model);
console.log('Source: ' + sourceLang);
console.log('Target langs: ' + langs.join(', '));
console.log('Dry run: ' + dryRun);
console.log('');

// Load nav items
const db = new Database(DB_PATH, { readonly: true });
const items = db.prepare('SELECT id, i18n_key, default_label FROM nav_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
db.close();

console.log('Found ' + items.length + ' active nav items');

// Build key→label map
const srcFile = path.join(LANG_DIR, sourceLang + '-ui.json');
const srcData = fs.existsSync(srcFile) ? JSON.parse(fs.readFileSync(srcFile, 'utf8')) : {};

const keyLabelMap = {};
items.forEach(item => {
  const label = item.default_label || srcData[item.i18n_key] || item.i18n_key;
  if (label.trim()) keyLabelMap[item.i18n_key] = label;
});

console.log('Labels to translate: ' + Object.keys(keyLabelMap).length);
console.log('');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callWithRetry(url, body, maxRetries) {
  maxRetries = maxRetries || 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
      console.log('    Retry ' + attempt + '/' + maxRetries + ' after ' + backoff + 'ms...');
      await sleep(backoff);
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: body,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.status === 502 || response.status === 503) {
        if (attempt < maxRetries) {
          console.log('    ' + response.status + ', retrying...');
          continue;
        }
      }
      return response;
    } catch (e) {
      if (attempt === maxRetries) throw e;
      console.log('    Network error: ' + e.message + ', retrying...');
    }
  }
}

async function translateLang(lang) {
  if (lang === sourceLang) return { status: 'skipped' };

  const langFile = path.join(LANG_DIR, lang + '-ui.json');
  if (!fs.existsSync(langFile)) return { status: 'error', error: 'File not found' };

  const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
  const missingKeys = Object.keys(keyLabelMap).filter(k => !langData[k] || langData[k].trim() === '');

  if (missingKeys.length === 0) {
    return { status: 'already_done', count: 0 };
  }

  console.log('  [' + lang + '] Translating ' + missingKeys.length + ' keys...');

  const entries = missingKeys.map(k => [k, keyLabelMap[k]]);
  const langName = SUPPORTED_LANGS[lang] || lang;

  const prompt = '将以下网站导航菜单文本从' + (sourceLang === 'zh-CN' ? '简体中文' : sourceLang) + '翻译成' + langName + '。\n\n' +
    '要求：\n' +
    '1. 只输出JSON，不要包含任何其他文字或markdown代码块标记\n' +
    '2. 翻译要简洁、专业、符合当地语言习惯\n' +
    '3. 保留品牌名、专有名词不变\n' +
    '4. 导航文本通常很短（2-8个字），翻译也要保持简洁\n' +
    '5. 对于阿拉伯语，只输出翻译文本，不要输出RTL标记\n\n' +
    entries.map((e, i) => (i + 1) + '. ' + e[0] + ' = ' + e[1]).join('\n') + '\n\n' +
    '输出JSON格式，key为原文的i18n_key，value为翻译后的文本：\n' +
    '{ "' + entries[0][0] + '": "...", "' + entries[1][0] + '": "..." }';

  try {
    const reqBody = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: '你是专业的网站本地化翻译专家。只输出JSON，不要包含任何其他文字或markdown代码块标记。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    const response = await callWithRetry(apiUrl + '/chat/completions', reqBody, 3);

    if (!response.ok) {
      const errText = await response.text();
      return { status: 'error', error: 'API ' + response.status + ' ' + errText.substring(0, 200) };
    }

    const data = await response.json();
    let translated;
    try {
      const content = data.choices[0].message.content;
      translated = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
    } catch (e) {
      return { status: 'error', error: 'JSON parse failed: ' + data.choices[0].message.content.substring(0, 100) };
    }

    // Show some samples
    const samples = Object.entries(translated).slice(0, 3);
    samples.forEach(([k, v]) => console.log('    ' + k + ': ' + v));

    if (dryRun) {
      return { status: 'dry_run', would_translate: Object.keys(translated).length };
    }

    // Write back to file
    let written = 0;
    for (const key of missingKeys) {
      if (translated[key] && translated[key].trim()) {
        langData[key] = translated[key];
        written++;
      }
    }

    fs.writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n', 'utf-8');
    return { status: 'ok', translated: written, total: missingKeys.length };

  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function main() {
  const results = {};
  let totalTranslated = 0;
  let totalErrors = 0;

  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    const result = await translateLang(lang);
    results[lang] = result;

    if (result.status === 'ok') {
      totalTranslated += result.translated;
      console.log('  [' + lang + '] ✅ Translated ' + result.translated + '/' + result.total);
    } else if (result.status === 'already_done') {
      console.log('  [' + lang + '] ⏭️ Already done');
    } else if (result.status === 'error') {
      totalErrors++;
      console.log('  [' + lang + '] ❌ ' + result.error);
    } else if (result.status === 'dry_run') {
      console.log('  [' + lang + '] 🔍 Would translate ' + result.would_translate + ' keys');
    }

    // Rate limit: wait 8s between API calls (NVIDIA free tier ~8/min)
    if (i < langs.length - 1 && result.status !== 'already_done' && result.status !== 'skipped') {
      console.log('  Waiting 8s for rate limit...');
      await sleep(8000);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Total translated: ' + totalTranslated);
  console.log('Errors: ' + totalErrors);
  console.log('Langs processed: ' + langs.length);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
