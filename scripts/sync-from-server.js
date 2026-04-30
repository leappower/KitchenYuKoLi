#!/usr/bin/env node
'use strict';

/**
 * Sync product translations from KitchenYuKoLiServer SQLite → KitchenYuKoLi JSON
 *
 * Usage:
 *   node scripts/sync-from-server.js [--lang=ja]
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const DB_PATH = path.resolve(__dirname, '..', '..', 'KitchenYuKoLiServer', 'src', 'admin', 'data', 'cms.db');
const LANG_DIR = path.join(__dirname, '..', 'src', 'assets', 'lang');

const args = process.argv.slice(2);
const langArg = args.find(a => a.startsWith('--lang='));
const lang = langArg ? langArg.split('=')[1] : null;

if (!fs.existsSync(DB_PATH)) {
  console.error('DB not found: ' + DB_PATH);
  process.exit(1);
}

// Determine languages to sync
let langs;
if (lang) {
  langs = [lang];
} else {
  // Get distinct languages from DB
  try {
    const out = execSync('sqlite3 "' + DB_PATH + '" "SELECT DISTINCT lang FROM product_translations ORDER BY lang"', { encoding: 'utf-8' }).trim();
    langs = out ? out.split('\n') : [];
  } catch (_) {
    console.error('Failed to query languages');
    process.exit(1);
  }
}

if (langs.length === 0) {
  console.log('No languages to sync.');
  process.exit(0);
}

let totalWritten = 0;

for (const l of langs) {
  const jsonFile = path.join(LANG_DIR, l + '-product.json');
  let existing = {};
  if (fs.existsSync(jsonFile)) {
    existing = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  }

  // Query all translations for this language
  const sql = 'SELECT product_id, name, specifications, usage, throughput FROM product_translations WHERE lang = \'' + l.replace(/'/g, "''") + "'";
  let rows;
  try {
    const out = execSync('sqlite3 "' + DB_PATH + '" "' + sql + '"', { encoding: 'utf-8' }).trim();
    if (!out) { console.log(l + ': 0 rows'); continue; }
    rows = out.split('\n').map(line => {
      const parts = line.split('|');
      return {
        product_id: parts[0],
        name: parts[1] || '',
        specifications: parts[2] || '',
        usage: parts[3] || '',
        throughput: parts[4] || ''
      };
    });
  } catch (e) {
    console.error(l + ': query failed: ' + e.message);
    continue;
  }

  let count = 0;
  for (const row of rows) {
    const pid = row.product_id;
    const fields = ['name', 'specifications', 'usage', 'throughput'];
    for (const field of fields) {
      if (row[field]) {
        existing['product_' + pid + '_' + field] = row[field];
        count++;
      }
    }
  }

  fs.writeFileSync(jsonFile, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  console.log(l + ': wrote ' + count + ' fields from ' + rows.length + ' products');
  totalWritten += count;
}

console.log('\nTotal: ' + totalWritten + ' fields written across ' + langs.length + ' languages');
