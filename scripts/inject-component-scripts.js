#!/usr/bin/env node
/**
 * inject-component-scripts.js
 *
 * Adds navigator.js, footer.js, and floating-actions.js script references
 * to all device-specific pages (index-pc.html, index-mobile.html, index-tablet.html)
 * under src/pages/<route>/
 *
 * This is needed for SSG migration — each page must be self-contained with
 * its component scripts, instead of relying on the SPA shell.
 *
 * Usage:
 *   node scripts/inject-component-scripts.js [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC_PAGES = path.resolve(__dirname, '..', 'src', 'pages');
const NAVIGATOR_SCRIPT = '<script defer src="/assets/js/ui/navigator.js"></script>';
const FOOTER_SCRIPT = '<script defer src="/assets/js/ui/footer.js"></script>';
const FLOATING_SCRIPT = '<script defer src="/assets/js/ui/floating-actions.js"></script>';

// Scripts to inject — in the correct order
// navigator.js and footer.js must load before DOMContentLoaded
// floating-actions.js must load after them
const INJECT_SCRIPTS = [
  NAVIGATOR_SCRIPT,
  FOOTER_SCRIPT,
  FLOATING_SCRIPT,
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

let modified = 0;
let skipped = 0;

function injectScripts(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already injected
  if (content.includes('navigator.js') && content.includes('footer.js')) {
    return false;
  }

  // Find the first <script> tag that loads a JS file
  // We want to inject BEFORE the first script reference
  const firstScriptMatch = content.match(/<script\s[^>]*src="[^"]*"/);

  if (!firstScriptMatch) {
    // Try to inject before </body> if no scripts found
    const scriptsBlock = '\n' + INJECT_SCRIPTS.join('\n') + '\n';
    content = content.replace('</body>', scriptsBlock + '</body>');
  } else {
    // Inject before the first script tag
    const idx = firstScriptMatch.index;
    const scriptsBlock = INJECT_SCRIPTS.join('\n') + '\n';
    content = content.slice(0, idx) + scriptsBlock + content.slice(idx);
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return true;
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const routeDir = path.join(dir, entry.name);

    for (const file of fs.readdirSync(routeDir)) {
      if (!file.match(/^index-(pc|mobile|tablet)\.html$/)) continue;

      const filePath = path.join(routeDir, file);
      const relative = path.relative(SRC_PAGES, filePath);

      const changed = injectScripts(filePath);
      if (changed) {
        modified++;
        console.log('  ✓ ' + relative);
      } else {
        skipped++;
      }
    }
  }
}

console.log((dryRun ? '[DRY RUN] ' : '') + 'Injecting component scripts into device pages...');
processDirectory(SRC_PAGES);

console.log('\nResults:');
console.log('  Modified: ' + modified);
console.log('  Skipped (already injected): ' + skipped);
