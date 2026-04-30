#!/usr/bin/env node
'use strict';

/**
 * i18n-audit.js — CLI tool for i18n key audit
 *
 * Usage: node scripts/i18n-audit.js [--type ui|product] [--json]
 *
 * Prints per-language stats, orphaned keys, missing keys, total coverage %.
 * No external dependencies — Node.js builtins only.
 */

const path = require('path');
const fs = require('fs');

// ── Config ─────────────────────────────────────────────────────────
var args = process.argv.slice(2);
var argType = 'ui';
var jsonOutput = false;

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) { argType = args[++i]; }
  if (args[i] === '--json') { jsonOutput = true; }
}

var PROJECT_ROOT = path.resolve(__dirname, '..');
var LANG_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'lang');
var PAGES_DIR = path.join(PROJECT_ROOT, 'src', 'pages');

// ── Helpers ────────────────────────────────────────────────────────
function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var full = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) walkDir(full, cb);
    else cb(full);
  }
}

function scanHtmlKeys() {
  var keys = {};
  walkDir(PAGES_DIR, function(filePath) {
    if (!/\.html?$/.test(filePath)) return;
    var content = fs.readFileSync(filePath, 'utf-8');
    var re = /data-i18n="([^"]+)"/g;
    var m;
    while ((m = re.exec(content)) !== null) {
      keys[m[1]] = true;
    }
  });
  return Object.keys(keys);
}

function resolveFiles(type) {
  return fs.readdirSync(LANG_DIR)
    .filter(function(f) { return f.endsWith('-' + type + '.json'); })
    .sort();
}

// ── Main ───────────────────────────────────────────────────────────
var htmlKeys = scanHtmlKeys();
var files = resolveFiles(argType);

if (files.length === 0) {
  console.error('No language files found for type "' + argType + '" in ' + LANG_DIR);
  process.exit(1);
}

var results = [];
var allOrphaned = {};
var allMissing = {};

files.forEach(function(f) {
  var langCode = f.slice(0, -(argType.length + 6)); // strip "-type.json"
  var fp = path.join(LANG_DIR, f);
  var data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  var jsonKeys = Object.keys(data);
  var emptyCount = 0;

  jsonKeys.forEach(function(k) {
    if (!data[k] || !String(data[k]).trim()) emptyCount++;
  });

  var jsonSet = {};
  jsonKeys.forEach(function(k) { jsonSet[k] = true; });

  var orphaned = jsonKeys.filter(function(k) { return htmlKeys.indexOf(k) === -1; });
  orphaned.forEach(function(k) { allOrphaned[k] = true; });

  var missing = htmlKeys.filter(function(k) { return !jsonSet[k]; });
  missing.forEach(function(k) { allMissing[k] = true; });

  var matched = htmlKeys.filter(function(k) { return data[k] && String(data[k]).trim(); });
  var coverage = htmlKeys.length > 0 ? Math.round(matched.length / htmlKeys.length * 1000) / 10 : 0;

  results.push({
    file: f,
    lang: langCode,
    total_keys: jsonKeys.length,
    empty_keys: emptyCount,
    translated_keys: jsonKeys.length - emptyCount,
    orphaned_count: orphaned.length,
    missing_count: missing.length,
    orphaned_keys: orphaned,
    missing_keys: missing,
    coverage_percent: coverage
  });
});

// ── Output ─────────────────────────────────────────────────────────
if (jsonOutput) {
  console.log(JSON.stringify({
    html_unique_keys: htmlKeys.length,
    total_orphaned: Object.keys(allOrphaned).length,
    total_missing: Object.keys(allMissing).length,
    languages: results
  }, null, 2));
} else {
  console.log('══════════════════════════════════════════════════');
  console.log('  i18n Audit Report — type: ' + argType);
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('HTML unique data-i18n keys: ' + htmlKeys.length);
  console.log('Total orphaned (JSON only): ' + Object.keys(allOrphaned).length);
  console.log('Total missing  (HTML only): ' + Object.keys(allMissing).length);
  console.log('');

  // Per-language table
  var header = 'Lang          Total   Trans   Empty   Orphaned  Missing  Coverage';
  console.log('─────────────────────────────────────────────────────');
  console.log(header);
  console.log('─────────────────────────────────────────────────────');

  results.forEach(function(r) {
    var lang = r.lang.padEnd(13);
    console.log(
      lang +
      String(r.total_keys).padStart(7) +
      String(r.translated_keys).padStart(8) +
      String(r.empty_keys).padStart(8) +
      String(r.orphaned_count).padStart(9) +
      String(r.missing_count).padStart(9) +
      ('' + r.coverage_percent + '%').padStart(9)
    );
  });
  console.log('─────────────────────────────────────────────────────');
  console.log('');

  // Orphaned keys (union)
  var orphanedKeys = Object.keys(allOrphaned);
  if (orphanedKeys.length > 0) {
    console.log('⚠ Orphaned keys (in JSON but not in any HTML):');
    orphanedKeys.sort().forEach(function(k) { console.log('  - ' + k); });
    console.log('');
  } else {
    console.log('✓ No orphaned keys found.');
    console.log('');
  }

  // Missing keys (union)
  var missingKeys = Object.keys(allMissing);
  if (missingKeys.length > 0) {
    console.log('✗ Missing keys (in HTML but not in JSON):');
    missingKeys.sort().forEach(function(k) { console.log('  - ' + k); });
    console.log('');
  } else {
    console.log('✓ No missing keys found.');
    console.log('');
  }
}
