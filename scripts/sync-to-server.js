#!/usr/bin/env node
'use strict';

/**
 * Sync product translations from KitchenYuKoLi JSON → KitchenYuKoLiServer SQLite
 *
 * Usage:
 *   node scripts/sync-to-server.js [--dry-run] [--lang=ja]
 */

const path = require('path');
const fs = require('fs');
const { syncProductTranslationsToServer } = require(path.join(__dirname, '..', 'src', 'admin', 'api', 'sync-server'));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const langArg = args.find(a => a.startsWith('--lang='));
const lang = langArg ? langArg.split('=')[1] : null;

// Discover available product language files
const langDir = path.join(__dirname, '..', 'src', 'assets', 'lang');
const files = fs.readdirSync(langDir).filter(f => f.endsWith('-product.json'));

let langs;
if (lang) {
  const target = lang + '-product.json';
  if (files.includes(target)) {
    langs = [lang];
  } else {
    console.error('No product file for lang: ' + lang);
    process.exit(1);
  }
} else {
  langs = files.map(f => f.replace('-product.json', ''));
}

if (dryRun) console.log('=== DRY RUN ===\n');

let totalUpserted = 0;
let totalMissing = 0;

for (const l of langs) {
  const r = syncProductTranslationsToServer(l, { dryRun: dryRun });
  const note = r.total === 0 ? ' (no product data in JSON)' : (!r.dbFound ? ' (DB not found, skipped)' : '');
  console.log(r.lang + ': ' + r.upserted + ' upserted' + (r.missing.length ? ', ' + r.missing.length + ' missing products: ' + r.missing.join(',') : '') + note);
  totalUpserted += r.upserted;
  totalMissing += r.missing.length;
}

console.log('\nTotal: ' + totalUpserted + ' upserted, ' + totalMissing + ' missing');
