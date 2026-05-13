#!/usr/bin/env node
/**
 * merge-translations.js — Merge translated values into a language file
 *
 * Usage: node scripts/merge-translations.js <lang-code> <input-json-file>
 *
 * Reads translations from input JSON file and merges them into the target language file.
 * Only updates keys that exist in the target file.
 */

const fs = require('fs');
const path = require('path');

const langCode = process.argv[2];
const inputFile = process.argv[3];

if (!langCode || !inputFile) {
  console.error('Usage: node scripts/merge-translations.js <lang-code> <input-json-file>');
  process.exit(1);
}

const filePath = path.join(__dirname, '..', 'src', 'assets', 'lang', `${langCode}-ui.json`);
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const translations = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

let updated = 0;
let skipped = 0;

for (const [key, value] of Object.entries(translations)) {
  if (!(key in data)) {
    console.warn(`Warning: key "${key}" not found in ${langCode}-ui.json, skipping`);
    skipped++;
    continue;
  }
  if (typeof value !== 'string' || !value.trim()) {
    console.warn(`Warning: empty or invalid value for key "${key}", skipping`);
    skipped++;
    continue;
  }
  data[key] = value;
  updated++;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
console.log(`Merged ${updated} translations into ${langCode}-ui.json (${skipped} skipped)`);

// Clean up input file
try {
  fs.unlinkSync(inputFile);
} catch (e) {
  // Ignore cleanup errors
}
