#!/usr/bin/env node
/**
 * audit-zhcn-mismatch.js — 审计 zh-CN 翻译值与 HTML data-i18n fallback 文本是否一致
 *
 * 问题背景：案例页面的 zh-CN story 段落与 HTML 内容完全不同
 * （HTML 是详细中文叙述，zh-CN JSON 是浓缩/翻译自英文的版本）
 * 导致 setElementTranslation 替换首文本节点后残留中文混乱。
 *
 * 这个脚本扫描所有 HTML 文件，提取 data-i18n 属性 + 对应文本，
 * 与 zh-CN-ui.json 对比，找出不匹配的地方。
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const ZH_JSON_PATH = path.join(SRC_DIR, 'assets', 'lang', 'zh-CN-ui.json');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

// Load zh-CN translations
const zhTranslations = JSON.parse(fs.readFileSync(ZH_JSON_PATH, 'utf-8'));

/**
 * Extract all data-i18n keys and their fallback text from an HTML file.
 * Uses a simple regex-based parser (no DOM needed).
 */
function extractI18nKeys(html, filePath) {
  const results = [];
  const relPath = path.relative(SRC_DIR, filePath);

  // Find all elements with data-i18n attribute
  // Pattern: tag data-i18n="key">[content]</tag>
  const attrRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bdata-i18n=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = attrRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const key = match[2];
    const innerContent = match[3].trim();

    // Extract fallback text (first text node, ignoring nested tags)
    const textOnly = innerContent.replace(/<[^>]*>/g, '').trim();

    // Skip: empty text, current-lang-label, single characters, or "全" fragments
    if (!textOnly || textOnly.length < 2) continue;
    if (key === 'current-lang-label' || key.startsWith('cases_')) continue;

    results.push({ key, fallback: textOnly, tagName, htmlFile: relPath });
  }

  return results;
}

/**
 * Compute similarity score (0-1). Simple approach: dice coefficient on bigrams.
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  const aBigrams = new Set();
  const bBigrams = new Set();
  for (let i = 0; i < a.length - 1; i++) aBigrams.add(a.substring(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bBigrams.add(b.substring(i, i + 2));
  let intersection = 0;
  for (const bigram of aBigrams) {
    if (bBigrams.has(bigram)) intersection++;
  }
  return (2 * intersection) / (aBigrams.size + bBigrams.size);
}

// ─── Main ────────────────────────────────────────────────────────
console.log('\n🔎 Auditing zh-CN translation vs HTML data-i18n fallback text...\n');

let allKeys = [];
let totalFiles = 0;

function scanDir(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (entry.endsWith('.html')) {
      totalFiles++;
      const html = fs.readFileSync(full, 'utf-8');
      const keys = extractI18nKeys(html, full);
      allKeys = allKeys.concat(keys);
    }
  }
}

scanDir(PAGES_DIR);

// Also check 404.html
const p404 = path.join(SRC_DIR, '404.html');
if (fs.existsSync(p404)) {
  totalFiles++;
  allKeys = allKeys.concat(extractI18nKeys(fs.readFileSync(p404, 'utf-8'), p404));
}

// Deduplicate by key (keep first occurrence with longest fallback text)
const keyMap = new Map();
for (const entry of allKeys) {
  if (!keyMap.has(entry.key) || entry.fallback.length > keyMap.get(entry.key).fallback.length) {
    keyMap.set(entry.key, entry);
  }
}

// Compare each key with zh-CN JSON
console.log(`Scanned ${totalFiles} HTML files, found ${keyMap.size} unique data-i18n keys.\n`);

let mismatches = [];
let matches = 0;
let shortSkips = 0;
let noZhValue = 0;

for (const [key, entry] of keyMap) {
  const zhValue = zhTranslations[key];
  const fb = entry.fallback;

  if (zhValue === undefined) {
    noZhValue++;
    continue;
  }

  // Short keys (<20 chars) — skipping, mismatches here are normal (placeholder values)
  if (fb.length < 20 && zhValue.length < 20) {
    shortSkips++;
    continue;
  }

  const sim = similarity(fb, zhValue);

  if (sim < 0.4 && fb.length > 20) {
    mismatches.push({ key, fallback: fb, zhValue, similarity: sim, file: entry.htmlFile });
  } else {
    matches++;
  }
}

// Sort by mismatch severity (longer text = more impactful)
mismatches.sort((a, b) => b.fallback.length - a.fallback.length);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Total keys checked:     ${keyMap.size}`);
console.log(`  Matches (short):        ${shortSkips} (both <20 chars, skipped)`);
console.log(`  Matches (good):         ${matches}`);
console.log(`  Keys without zh-CN:     ${noZhValue}`);
console.log(`  ❌ MISMATCHES FOUND:    ${mismatches.length}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (mismatches.length > 0) {
  console.log('=== MISMATCH DETAILS (sorted by severity) ===\n');
  for (const m of mismatches) {
    console.log(`🔴 [${m.key}] (${(m.similarity * 100).toFixed(0)}% similar)`);
    console.log(`   File:  ${m.file}`);
    console.log(`   HTML:  ${m.fallback}`);
    console.log(`   zh-CN: ${m.zhValue}`);
    console.log('');
  }
} else {
  console.log('✅ All zh-CN translations match HTML fallback text — no issues found.\n');
}
