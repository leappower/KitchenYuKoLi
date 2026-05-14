#!/usr/bin/env node
/**
 * Incremental i18n translator for KitchenYuKoLi
 * Usage: node translate-lang.js <lang> [batch-size] [delay-ms]
 *   PROVIDER=provider_name node translate-lang.js <lang>
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.env.HOME, '.openclaw', 'openclaw.json');
const LANG_DIR = path.join(__dirname, 'src/assets/lang');
const PROGRESS_FILE = path.join(__dirname, '.translation-progress.json');

const lang = process.argv[2];
const batchSize = parseInt(process.argv[3]) || 25;
const delayMs = parseInt(process.argv[4]) || 1000;
const providerName = process.env.PROVIDER;

if (!lang) {
  console.error('Usage: node translate-lang.js <lang> [batch-size] [delay-ms]');
  process.exit(1);
}

const langFile = path.join(LANG_DIR, `${lang}-ui.json`);
if (!fs.existsSync(langFile)) {
  console.error(`Language file not found: ${langFile}`);
  process.exit(1);
}

function log(msg) {
  const ts = new Date().toTimeString().slice(0, 8);
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadOpenClawConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

function loadProvider(name, config) {
  const providers = config?.models?.providers;
  if (!providers) throw new Error('No providers in config');
  
  const p = providers[name];
  if (!p) throw new Error(`Provider ${name} not found`);
  
  const model = p.models?.[0]?.id;
  if (!model) throw new Error(`No model for provider ${name}`);
  
  return { name, model, apiKey: p.apiKey, baseUrl: p.baseUrl };
}

async function translateBatch(provider, keys, retryCount) {
  const systemPrompt = `You are a professional translator. Translate the following UI keys from English to the target language.
Return ONLY a JSON object with the same keys and translated values.
IMPORTANT:
- Preserve any HTML tags (<strong>, <span>, <a>, etc.) exactly as-is
- Preserve any {{variable}} or {variable} placeholders exactly as-is
- Preserve any \\n newline characters
- Do NOT translate brand names (YuKoLi, etc.)
- Keep the translation natural and culturally appropriate
- Output valid JSON only, no markdown, no code blocks, no explanation`;

  const userPrompt = `Translate the following JSON values from English to the target language. Return ONLY a JSON object with the same keys:\n\n${JSON.stringify(keys, null, 2)}`;

  const body = {
    model: provider.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 16384
  };

  const url = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  for (let attempt = 0; attempt <= (retryCount || 5); attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000)
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await resp.json();
      let content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from model');

      // Strip markdown code blocks
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      const translated = JSON.parse(content);
      return translated;
    } catch (err) {
      if (attempt >= (retryCount || 5)) throw err;
      log(`⚠️ Attempt ${attempt + 1} failed: ${err.message}, retrying...`);
      await sleep(2000 * (attempt + 1));
    }
  }
}

function loadProgress(lang) {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const d = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      return d[lang] || null;
    }
  } catch {}
  return null;
}

function saveProgress(lang, data) {
  let all = {};
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      all = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch {}
  all[lang] = data;
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(all, null, 2));
}

async function main() {
  // Load config and provider
  const config = loadOpenClawConfig();
  let provider;
  if (providerName) {
    provider = loadProvider(providerName, config);
    log(`Using provider: ${provider.name} (${provider.model})`);
  } else {
    for (const name of ['kuai', 'zhipu3', 'siliconflow', 'zhipu2']) {
      try {
        provider = loadProvider(name, config);
        log(`Using provider: ${name} (${provider.model})`);
        break;
      } catch {}
    }
  }
  if (!provider) throw new Error('No available provider');

  // Load language file
  const data = JSON.parse(fs.readFileSync(langFile, 'utf8'));
  const totalKeys = Object.keys(data).length;

  // Find TRANSLATE: keys
  const translateKeys = Object.keys(data).filter(k => {
    const v = data[k];
    return typeof v === 'string' && v.startsWith('TRANSLATE:');
  });

  if (translateKeys.length === 0) {
    log(`🎉 ${lang}: Complete! No TRANSLATE keys remaining.`);
    saveProgress(lang, { status: 'done', totalKeys, remaining: 0 });
    process.exit(0);
  }

  log(`📝 ${lang}: ${translateKeys.length} keys to translate (${totalKeys} total), batch=${batchSize}, delay=${delayMs}ms`);

  // Load progress
  const progress = loadProgress(lang);
  let startIdx = 0;
  if (progress && progress.status === 'running' && progress.lastKey) {
    const idx = translateKeys.indexOf(progress.lastKey);
    if (idx >= 0) startIdx = idx + 1;
    log(`📌 Resuming from key #${startIdx + 1}`);
  }

  let translated = 0;
  let errors = 0;
  const totalBatches = Math.ceil((translateKeys.length - startIdx) / batchSize);

  for (let i = startIdx; i < translateKeys.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = {};
    const batchKeys = translateKeys.slice(i, i + batchSize);
    
    for (const k of batchKeys) {
      // Remove "TRANSLATE: " prefix to get the source text
      batch[k] = data[k].replace(/^TRANSLATE:\s*/, '');
    }

    try {
      const result = await translateBatch(provider, batch);
      let count = 0;
      for (const [k, v] of Object.entries(result)) {
        if (v && typeof v === 'string' && v.trim()) {
          data[k] = v;
          count++;
        }
      }

      // Save to file
      fs.writeFileSync(langFile, JSON.stringify(data, null, 2) + '\n');
      
      translated += count;
      const elapsed = Math.round(process.uptime());
      log(`✅ ${lang} batch ${batchNum}/${totalBatches}: ${count}/${batchKeys.length} translated | total ${translated}/${translateKeys.length} (${(translated/translateKeys.length*100).toFixed(1)}%) | ${elapsed}s elapsed`);

      // Save progress
      saveProgress(lang, {
        status: 'running',
        total: totalKeys,
        pending: translateKeys.length - i - batchKeys.length,
        translated,
        errors,
        batchNum,
        lastKey: batchKeys[batchKeys.length - 1],
        lastUpdate: new Date().toISOString()
      });
    } catch (err) {
      errors++;
      log(`❌ ${lang} batch ${batchNum}/${totalBatches} failed: ${err.message}`);
      if (errors > 10) {
        log(`💥 Too many errors (${errors}), giving up on ${lang}`);
        break;
      }
    }

    await sleep(delayMs);
  }

  // Final check
  const finalData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
  const remainingKeys = Object.keys(finalData).filter(k => {
    const v = finalData[k];
    return typeof v === 'string' && v.startsWith('TRANSLATE:');
  });

  if (remainingKeys.length === 0) {
    log(`🎉 ${lang}: Complete! ${translated} keys translated.`);
    saveProgress(lang, { status: 'done', totalKeys, remaining: 0 });
  } else {
    log(`⚠️ ${lang}: ${remainingKeys.length} keys remaining after all batches.`);
    saveProgress(lang, {
      status: 'incomplete',
      totalKeys,
      remaining: remainingKeys.length,
      translated,
      errors,
      lastUpdate: new Date().toISOString()
    });
  }
}

main().catch(err => {
  log(`💥 Fatal: ${err.message}`);
  process.exit(1);
});
