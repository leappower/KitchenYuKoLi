#!/usr/bin/env node
/**
 * add-turbolinks.js — Add Turbolinks script to all HTML pages
 *
 * This script adds the Turbolinks script tag to all HTML files in src/pages/.
 * Turbolinks should be loaded early (before other scripts) to intercept link clicks.
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');
const TURBOLINKS_SCRIPT = '<script src="/assets/js/turbolinks.js"></script>';

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

function addTurbolinksToFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already has turbolinks
  if (content.includes('turbolinks.js')) {
    console.log(`  Skipping (already has turbolinks): ${filePath}`);
    return;
  }
  
  // Find the first <script> tag in <head> or after </title>
  // Strategy: Insert after the first <script> tag in head, or before the first deferred script
  
  // Try to find position after lang-registry.js or before first deferred script
  const langRegistryMatch = content.match(/<script[^>]*src="[^"]*lang-registry\.js"[^>]*><\/script>/);
  
  if (langRegistryMatch) {
    // Insert after lang-registry.js
    const insertPos = langRegistryMatch.index + langRegistryMatch[0].length;
    content = content.slice(0, insertPos) + '\n' + TURBOLINKS_SCRIPT + content.slice(insertPos);
  } else {
    // Find first <script> tag
    const firstScriptMatch = content.match(/<script[^>]*>/);
    if (firstScriptMatch) {
      const insertPos = firstScriptMatch.index;
      content = content.slice(0, insertPos) + TURBOLINKS_SCRIPT + '\n' + content.slice(insertPos);
    } else {
      // No script tags found, skip
      console.log(`  Skipping (no script tags): ${filePath}`);
      return;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Updated: ${filePath}`);
}

function main() {
  console.log('Adding Turbolinks to HTML files...\n');
  
  const htmlFiles = findHtmlFiles(PAGES_DIR);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('turbolinks.js')) {
      console.log(`  Skipping (already has turbolinks): ${path.relative(PAGES_DIR, file)}`);
      skipped++;
      continue;
    }
    
    addTurbolinksToFile(file);
    updated++;
  }
  
  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

main();
