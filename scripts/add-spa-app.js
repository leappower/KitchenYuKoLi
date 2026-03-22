#!/usr/bin/env node
/**
 * add-spa-app.js — Add SPA App script to all HTML pages
 *
 * This script adds the spa-app.js script to all main HTML files.
 * It replaces turbolinks.js if present, as spa-app.js provides similar functionality.
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');
const SPA_SCRIPT = '<script src="/assets/js/spa-app.js"></script>';

function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findHtmlFiles(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function addSpaScript(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has spa-app.js
  if (content.includes('spa-app.js')) {
    console.log(`  Already has spa-app.js: ${path.relative(PAGES_DIR, filePath)}`);
    return;
  }

  // Replace turbolinks.js with spa-app.js
  if (content.includes('turbolinks.js')) {
    content = content.replace(
      /<script[^>]*src="[^"]*turbolinks\.js"[^>]*><\/script>/,
      SPA_SCRIPT
    );
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  Replaced turbolinks with spa-app: ${path.relative(PAGES_DIR, filePath)}`);
    return;
  }

  // Add after lang-registry.js
  const langRegistryMatch = content.match(/<script[^>]*src="[^"]*lang-registry\.js"[^>]*><\/script>/);
  if (langRegistryMatch) {
    const insertPos = langRegistryMatch.index + langRegistryMatch[0].length;
    content = content.slice(0, insertPos) + '\n' + SPA_SCRIPT + content.slice(insertPos);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  Added spa-app.js: ${path.relative(PAGES_DIR, filePath)}`);
    return;
  }

  console.log(`  Could not find insertion point: ${path.relative(PAGES_DIR, filePath)}`);
}

function main() {
  console.log('Adding SPA App script to HTML files...\n');

  const htmlFiles = findHtmlFiles(PAGES_DIR);
  console.log(`Found ${htmlFiles.length} HTML files\n`);

  let updated = 0;
  let skipped = 0;

  for (const file of htmlFiles) {
    // Skip non-main pages
    if (file.includes('/emails/') || file.includes('/linkedin/')) {
      console.log(`  Skipping (non-main): ${path.relative(PAGES_DIR, file)}`);
      skipped++;
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('spa-app.js')) {
      console.log(`  Already has spa-app.js: ${path.relative(PAGES_DIR, file)}`);
      skipped++;
      continue;
    }

    addSpaScript(file);
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

main();
