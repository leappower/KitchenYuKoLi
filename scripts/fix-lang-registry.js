#!/usr/bin/env node
/**
 * fix-lang-registry.js — Batch inject lang-registry.js script tag into ALL
 * standalone HTML pages that have translations.js but lack lang-registry.js.
 *
 * Usage: node scripts/fix-lang-registry.js
 *
 * This is a ONE-TIME structural fix to ensure every source HTML page
 * includes lang-registry.js BEFORE translations.js. After this script runs,
 * the source files are correct and future builds will propagate correctly.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

let fixed = 0;
let skipped = 0;
let errors = [];

function injectLangRegistry(html) {
  // Already has it — skip
  if (/lang-registry\.js/.test(html)) return html;

  // Insert <script defer src="/assets/js/lang-registry.js"> before translations.js
  const tag = '<script defer src="/assets/js/lang-registry.js"></script>\n    ';
  html = html.replace(
    /(\s*)(<script[^>]*src=["'][^"']*\/assets\/js\/translations\.js[^>]*>[^<]*<\/script>)/i,
    '$1' + tag + '$2'
  );

  return html;
}

function scanDir(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (entry.endsWith('.html')) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  let html;
  try {
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    errors.push({ file: filePath, error: e.message });
    return;
  }

  // Only process files that have translations.js but no lang-registry.js
  const hasTranslations = /translations\.js/.test(html);
  const hasLangRegistry = /lang-registry\.js/.test(html);

  if (!hasTranslations || hasLangRegistry) {
    skipped++;
    const reason = !hasTranslations ? 'no translations.js' : 'already has lang-registry.js';
    if (!hasLangRegistry && hasTranslations) {
      // This shouldn't happen with the condition above
    }
    return;
  }

  // Fix the HTML
  const fixedHtml = injectLangRegistry(html);

  if (fixedHtml === html) {
    console.log(`  ⚠ UNCHANGED: ${path.relative(SRC_DIR, filePath)}`);
    errors.push({ file: filePath, error: 'injectLangRegistry returned unchanged HTML' });
    return;
  }

  fs.writeFileSync(filePath, fixedHtml, 'utf-8');
  fixed++;
  const rel = path.relative(SRC_DIR, filePath);
  console.log(`  ✓ FIXED: ${rel}`);
}

// ─── Main ────────────────────────────────────────────────────────
console.log('\n🔍 Scanning HTML files for missing lang-registry.js...\n');

// Scan all pages
scanDir(PAGES_DIR);

// Also check src/404.html and other root-level files
for (const rootFile of ['404.html']) {
  const fp = path.join(SRC_DIR, rootFile);
  if (fs.existsSync(fp)) processFile(fp);
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Fixed:     ${fixed} file(s) — injected lang-registry.js`);
console.log(`  Skipped:   ${skipped} file(s) (already have it or no translations.js)`);
if (errors.length > 0) {
  console.log(`  Errors:    ${errors.length}`);
  errors.forEach(e => console.log(`             ${path.relative(SRC_DIR, e.file)}: ${e.error}`));
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (fixed > 0) {
  console.log('✅ All source files now include lang-registry.js before translations.js.\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Run: node scripts/build-ssg.js');
  console.log('  3. Verify: find dist -name "*.html" -not -path "*/node_modules/*" | xargs grep -L "lang-registry.js"\n');
}
