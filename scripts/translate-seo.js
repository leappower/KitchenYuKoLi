#!/usr/bin/env node
/**
 * 逐语言调用 DeepSeek API 翻译 68 个 SEO key-value
 * Usage: node scripts/translate-seo.js <lang>
 * Example: node scripts/translate-seo.js th
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const LANG_DIR = path.resolve(__dirname, '../src/assets/lang');

const LANG_NAMES = {
  ar:'Arabic (العربية)', de:'German (Deutsch)', es:'Spanish (Español)',
  fil:'Filipino', fr:'French (Français)', he:'Hebrew (עברית)',
  hi:'Hindi (हिन्दी)', id:'Indonesian (Bahasa Indonesia)', it:'Italian (Italiano)',
  ja:'Japanese (日本語)', km:'Khmer (ភាសាខ្មែរ)', ko:'Korean (한국어)',
  lo:'Lao (ລາວ)', ms:'Malay (Bahasa Melayu)', my:'Burmese (မြန်မာဘာသာ)',
  nl:'Dutch (Nederlands)', pl:'Polish (Polski)', pt:'Portuguese (Português)',
  ru:'Russian (Русский)', th:'Thai (ไทย)', tr:'Turkish (Türkçe)',
  vi:'Vietnamese (Tiếng Việt)', 'zh-TW':'Traditional Chinese (中文繁體)',
};

const lang = process.argv[2];
if (!lang || !LANG_NAMES[lang]) {
  console.error('Usage: node scripts/translate-seo.js <lang>');
  console.error('Available:', Object.keys(LANG_NAMES).join(', '));
  process.exit(1);
}

// Get API key
let apiKey = process.env.DS_API_KEY;
if (!apiKey) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.openclaw', 'openclaw.json'), 'utf8'));
    apiKey = cfg?.models?.providers?.deepseek?.apiKey;
  } catch(e) {}
}
if (!apiKey) { console.error('No API key'); process.exit(1); }

const model = process.env.DS_MODEL || 'deepseek-chat';
const langName = LANG_NAMES[lang];

// Load en-ui.json
const enData = JSON.parse(fs.readFileSync(path.join(LANG_DIR, 'en-ui.json'), 'utf8'));
const seoKeys = Object.keys(enData).filter(k => k.startsWith('page_title_') || k.startsWith('page_desc_'));
const sourcePairs = seoKeys.map(k => `${k}: ${enData[k]}`);

const prompt = `You are a professional SEO translator. Translate the following 68 SEO title/description key-value pairs from English to ${langName}.

Rules:
1. Brand "YuKoLi" and "Yukoli" NOT translated
2. Numbers, units, symbols (± → | & — . : , ) preserved
3. SEO style
4. Keep keys unchanged, only translate VALUES
5. Output ONLY valid JSON, no markdown

Source:
${sourcePairs.join('\n')}

Output the JSON:`;

function callAPI() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 16384,
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 180000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve(j);
        } catch(e) {
          reject(new Error(`Parse failed: ${e.message}\n${data.substring(0,300)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`🌐 ${langName} (${lang})...`);

  const result = await callAPI();
  const content = result.choices[0].message.content;
  const usage = result.usage;
  console.log(`   Tokens: ${usage?.total_tokens || '?'} (in:${usage?.prompt_tokens||'?'} out:${usage?.completion_tokens||'?'})`);

  // Extract JSON
  let jsonStr = content;
  const m1 = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m1) jsonStr = m1[1];
  const m2 = jsonStr.match(/\{[\s\S]*\}/);
  if (m2) jsonStr = m2[0];

  let translations;
  try { translations = JSON.parse(jsonStr); }
  catch(e) { throw new Error(`JSON parse: ${e.message}\n${content.substring(0,300)}`); }

  // Merge into lang file
  const langFile = path.join(LANG_DIR, `${lang}-ui.json`);
  let existing = fs.existsSync(langFile) ? JSON.parse(fs.readFileSync(langFile,'utf8')) : {};

  let count = 0;
  for (const key of seoKeys) {
    if (translations[key] && translations[key] !== enData[key]) {
      existing[key] = translations[key];
      count++;
    }
  }

  fs.writeFileSync(langFile, JSON.stringify(existing, null, 2) + '\n', 'utf8');

  let nonAscii = 0;
  for (const key of seoKeys) {
    if (existing[key]) {
      for (let i = 0; i < existing[key].length; i++) {
        if (existing[key].charCodeAt(i) > 255) { nonAscii++; break; }
      }
    }
  }

  console.log(`   ✅ ${count}/${seoKeys.length} keys | non-ASCII values: ${nonAscii}`);
  if (count > 0) console.log(`   Sample: ${existing[seoKeys[0]]?.substring(0,60)}...`);

  process.exit(count >= seoKeys.length * 0.5 ? 0 : 1);
}

main().catch(e => { console.error(`   ❌ ${e.message}`); process.exit(1); });
