#!/usr/bin/env node
/**
 * convert-to-spa.js — Convert HTML pages to SPA structure
 *
 * This script transforms existing HTML pages to support the SPA router:
 * - Wraps content in <main id="spa-content">
 * - Keeps header/footer outside the content area
 * - Adds spa-router.js
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

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

function convertPage(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already converted
  if (content.includes('id="spa-content"')) {
    console.log(`  Already converted: ${path.relative(PAGES_DIR, filePath)}`);
    return;
  }
  
  // Skip non-main pages (emails, etc.)
  if (filePath.includes('/emails/') || filePath.includes('/linkedin/')) {
    console.log(`  Skipping (non-main page): ${path.relative(PAGES_DIR, filePath)}`);
    return;
  }
  
  // Find the body content
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) {
    console.log(`  Skipping (no body): ${path.relative(PAGES_DIR, filePath)}`);
    return;
  }
  
  const originalBody = bodyMatch[1];
  
  // Extract header component placeholder (support legacy and new navigator)
  var headerMatch = null;
  headerMatch = originalBody.match(/<navigator[^>]*data-component="navigator"[^>]*>[\s\S]*?<\/navigator>/i);
  if (!headerMatch) {
    headerMatch = originalBody.match(/<div[^>]*data-component="(?:max-display-header|min-display-header|navigator)"[^>]*>[\s\S]*?<\/div>/i);
  }
  const headerHtml = headerMatch ? headerMatch[0] : '';
  
  // Extract footer component placeholder (if exists)
  // Footer: support new <footer data-component="footer"> and legacy min-display-footer
  var footerMatch = originalBody.match(/<footer[^>]*data-component="footer"[^>]*>[\s\S]*?<\/footer>/i);
  if (!footerMatch) {
    footerMatch = originalBody.match(/<div[^>]*data-component="min-display-footer"[^>]*>[\s\S]*?<\/div>/i);
  }
  const footerHtml = footerMatch ? footerMatch[0] : '';
  
  // Remove header and footer from body content to get main content
  let mainContent = originalBody;
  if (headerHtml) {
    mainContent = mainContent.replace(headerHtml, '');
  }
  if (footerHtml) {
    mainContent = mainContent.replace(footerHtml, '');
  }
  
  // Trim whitespace
  mainContent = mainContent.trim();
  
  // Wrap main content in spa-content
  const wrappedContent = headerHtml + '\n<main id="spa-content">\n' + mainContent + '\n</main>\n' + footerHtml;
  
  // Replace body content
  const newContent = content.replace(bodyMatch[1], '\n' + wrappedContent + '\n');
  
  // Add spa-router.js after turbolinks.js or before other scripts
  let finalContent = newContent;
  if (!newContent.includes('spa-router.js')) {
    // Replace turbolinks.js with spa-router.js (SPA mode takes precedence)
    if (newContent.includes('turbolinks.js')) {
      finalContent = newContent.replace(
        /<script[^>]*src="[^"]*turbolinks\.js"[^>]*><\/script>/,
        '<script src="/assets/js/spa-router.js"></script>'
      );
    } else {
      // Add after lang-registry.js
      finalContent = newContent.replace(
        /(<script[^>]*src="[^"]*lang-registry\.js"[^>]*><\/script>)/,
        '$1\n<script src="/assets/js/spa-router.js"></script>'
      );
    }
  }
  
  fs.writeFileSync(filePath, finalContent, 'utf-8');
  console.log(`  Converted: ${path.relative(PAGES_DIR, filePath)}`);
}

function main() {
  console.log('Converting pages to SPA structure...\n');
  
  const htmlFiles = findHtmlFiles(PAGES_DIR);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  let converted = 0;
  let skipped = 0;
  
  for (const file of htmlFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('id="spa-content"')) {
        console.log(`  Already converted: ${path.relative(PAGES_DIR, file)}`);
        skipped++;
        continue;
      }
      
      if (file.includes('/emails/') || file.includes('/linkedin/')) {
        console.log(`  Skipping (non-main): ${path.relative(PAGES_DIR, file)}`);
        skipped++;
        continue;
      }
      
      convertPage(file);
      converted++;
    } catch (error) {
      console.error(`  Error converting ${file}:`, error.message);
    }
  }
  
  console.log(`\nDone! Converted: ${converted}, Skipped: ${skipped}`);
}

main();
