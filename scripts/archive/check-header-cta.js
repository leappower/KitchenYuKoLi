#!/usr/bin/env node

/**
 * Ensure all max-display-header components have CTA button configuration
 */

const fs = require('fs');
const path = require('path');

const srcDir = '/Volumes/Extend HD/HTML-YuQL-Test/src/pages';

function findHtmlFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      files.push(...findHtmlFiles(itemPath));
    } else if (item.endsWith('.html')) {
      files.push(itemPath);
    }
  }
  
  return files;
}

function checkHeaderConfig(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find header component (supports navigator and legacy variants)
  const headerRegex = /<div data-component="(?:max-display-header|min-display-header|navigator)"[\s\S]*?<\/div>/;
  const match = content.match(headerRegex);
  
  if (!match) return null;
  
  const headerBlock = match[0];
  
  // Check if data-cta is set to false
  if (headerBlock.includes('data-cta="false"')) {
    console.log(`❌ Found data-cta="false" in: ${path.relative(srcDir, filePath)}`);
    return { type: 'cta-false', file: filePath };
  }
  
  // Check if CTA config is missing
  if (!headerBlock.includes('data-cta-text-key') || !headerBlock.includes('data-cta-href')) {
    console.log(`⚠️  Missing CTA config in: ${path.relative(srcDir, filePath)}`);
    return { type: 'missing-config', file: filePath };
  }
  
  return null;
}

console.log('🔍 Checking header (navigator/max/min) CTA configuration...\n');

const htmlFiles = findHtmlFiles(srcDir);
const issues = [];

for (const file of htmlFiles) {
  const issue = checkHeaderConfig(file);
  if (issue) {
    issues.push(issue);
  }
}

console.log('\n📊 Summary:');
console.log(`   - Total files checked: ${htmlFiles.length}`);
console.log(`   - Issues found: ${issues.length}`);

if (issues.length === 0) {
  console.log('\n✅ All headers have proper CTA configuration!');
} else {
  console.log(`\n🔧 ${issues.length} file(s) need attention`);
}
