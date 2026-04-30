#!/usr/bin/env node
/**
 * deploy-lang-sync.js — Sync lang files from KitchenYuKoLi CMS to KitchenYuKoLiServer
 *
 * Usage:
 *   node scripts/deploy-lang-sync.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run   Show what would change without copying
 *   --force     Sync all files (default: only files that differ)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- Config ---
const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.dirname(SCRIPT_DIR);
const SOURCE_DIR = path.join(PROJECT_DIR, 'src', 'assets', 'lang');
const TARGET_PROJECT_DIR = process.env.KITCHEN_YUKOLI_SERVER || path.resolve(PROJECT_DIR, '..', 'KitchenYuKoLiServer');
const TARGET_DIR = path.join(TARGET_PROJECT_DIR, 'src', 'assets', 'lang');

// --- Parse args ---
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

if (args.includes('-h') || args.includes('--help')) {
  console.log('Usage: node scripts/deploy-lang-sync.js [--dry-run] [--force]');
  console.log('  --dry-run   Show what would change without copying');
  console.log('  --force     Sync all files (default: only files that differ)');
  console.log('');
  console.log(`Source:      ${SOURCE_DIR}/*.json`);
  console.log(`Target:      ${TARGET_DIR}/*.json`);
  console.log(`Target proj: ${TARGET_PROJECT_DIR}`);
  process.exit(0);
}

// --- Helpers ---
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Validate ---
if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(TARGET_PROJECT_DIR)) {
  console.error(`❌ Target project not found: ${TARGET_PROJECT_DIR}`);
  console.error('   Set KITCHEN_YUKOLI_SERVER env to override the default path');
  process.exit(1);
}

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`📁 Created target directory: ${TARGET_DIR}`);
}

// --- Collect files ---
const sourceFiles = fs.readdirSync(SOURCE_DIR)
  .filter(f => f.endsWith('.json'))
  .sort();

const targetFiles = new Set(
  fs.existsSync(TARGET_DIR)
    ? fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.json'))
    : []
);

// --- Process ---
const dryLabel = DRY_RUN ? '[DRY RUN] ' : '';
const results = { changed: [], added: [], removed: [], skipped: [], invalid: [] };

console.log(`\n🔍 ${dryLabel}Comparing lang files...`);
console.log(`   Source: ${SOURCE_DIR}`);
console.log(`   Target: ${TARGET_DIR}\n`);

// Sync source → target
for (const filename of sourceFiles) {
  const srcPath = path.join(SOURCE_DIR, filename);
  const tgtPath = path.join(TARGET_DIR, filename);

  // Validate JSON
  const validation = validateJson(srcPath);
  if (!validation.valid) {
    results.invalid.push({ file: filename, error: validation.error });
    console.log(`   ⚠️  SKIP ${filename} — invalid JSON: ${validation.error}`);
    continue;
  }

  const srcStat = fs.statSync(srcPath);
  const srcHash = hashFile(srcPath);

  if (!targetFiles.has(filename)) {
    // New file
    results.added.push({ file: filename, size: srcStat.size });
    if (!DRY_RUN) {
      fs.copyFileSync(srcPath, tgtPath);
    }
  } else if (FORCE) {
    // Force copy
    results.changed.push({ file: filename, size: srcStat.size });
    if (!DRY_RUN) {
      fs.copyFileSync(srcPath, tgtPath);
    }
  } else {
    // Compare
    const tgtHash = hashFile(tgtPath);
    if (srcHash !== tgtHash) {
      const tgtStat = fs.statSync(tgtPath);
      results.changed.push({ file: filename, size: srcStat.size, oldSize: tgtStat.size });
      if (!DRY_RUN) {
        fs.copyFileSync(srcPath, tgtPath);
      }
    } else {
      results.skipped.push({ file: filename, size: srcStat.size });
    }
  }
}

// Check for removed files (only with --force)
if (FORCE) {
  for (const filename of targetFiles) {
    if (!sourceFiles.includes(filename)) {
      const tgtPath = path.join(TARGET_DIR, filename);
      const tgtStat = fs.statSync(tgtPath);
      results.removed.push({ file: filename, size: tgtStat.size });
      if (!DRY_RUN) {
        fs.unlinkSync(tgtPath);
      }
    }
  }
}

// --- Summary Table ---
console.log('─────────────────────────────────────────────────────────');

const totalActions = results.changed.length + results.added.length + results.removed.length;

if (totalActions === 0 && results.invalid.length === 0) {
  console.log('✅ All lang files are already in sync.');
  console.log(`   ${results.skipped.length} file(s) checked, 0 changes needed.`);
} else {
  if (results.invalid.length > 0) {
    console.log(`\n⚠️  Invalid JSON files (${results.invalid.length}):`);
    for (const { file, error } of results.invalid) {
      console.log(`   ❌ ${file}: ${error}`);
    }
  }

  if (results.changed.length > 0) {
    console.log(`\n📝 Changed (${results.changed.length}):`);
    for (const { file, size, oldSize } of results.changed) {
      const sizeDiff = oldSize ? `${formatSize(oldSize)} → ${formatSize(size)}` : formatSize(size);
      console.log(`   📝 ${file}  (${sizeDiff})`);
    }
  }

  if (results.added.length > 0) {
    console.log(`\n➕ Added (${results.added.length}):`);
    for (const { file, size } of results.added) {
      console.log(`   ➕ ${file}  (${formatSize(size)})`);
    }
  }

  if (results.removed.length > 0) {
    console.log(`\n➖ Removed (${results.removed.length}):`);
    for (const { file, size } of results.removed) {
      console.log(`   ➖ ${file}  (${formatSize(size)})`);
    }
  }

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  Skipped (${results.skipped.length}):`);
    for (const { file } of results.skipped) {
      console.log(`   ⏭️  ${file}`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`✅ ${dryLabel}Lang sync complete!`);
  console.log(`   📝 Changed: ${results.changed.length}  ➕ Added: ${results.added.length}  ➖ Removed: ${results.removed.length}  ⏭️  Skipped: ${results.skipped.length}`);
}

if (DRY_RUN) {
  console.log('\n💡 Remove --dry-run to apply changes');
}

if (results.invalid.length > 0) {
  process.exit(1);
}
