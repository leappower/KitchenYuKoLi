#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Removing tailwind.cdn.js references...\n');

// Find all HTML files that reference tailwind.cdn.js
const cmd = 'grep -r "tailwind\\.cdn\\.js" src/pages src/internal --include="*.html" -l 2>/dev/null || true';
const result = execSync(cmd, { encoding: 'utf-8' });
const files = result.trim().split('\n').filter(f => f);

console.log(`Found ${files.length} files to update:\n`);

let updated = 0;

files.forEach(file => {
  if (!file) return;
  
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;
  
  // Remove the entire line: <script src="/assets/js/tailwind.cdn.js"></script>
  content = content.replace(/<script src="\/assets\/js\/tailwind\.cdn\.js"><\/script>\n?/g, '');
  content = content.replace(/<script src="\/assets\/js\/tailwind\.cdn\.js"><\/script>/g, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`  ✅ ${path.relative('.', file)}`);
    updated++;
  }
});

console.log(`\n✨ Updated ${updated} files\n`);

// Also add proper tailwind.css link if not present
console.log('📦 Checking for tailwind.css links...\n');

files.forEach(file => {
  if (!file) return;
  
  let content = fs.readFileSync(file, 'utf-8');
  
  // Check if tailwind.css is already linked
  if (!content.includes('/assets/css/tailwind.css')) {
    // Find where to insert (after local-fonts.css)
    if (content.includes('local-fonts.css')) {
      const insertion = '<link rel="stylesheet" href="/assets/css/tailwind.css">\n';
      content = content.replace(
        /(<link[^>]*local-fonts\.css[^>]*>\n)/,
        '$1' + insertion
      );
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`  ✅ Added tailwind.css to ${path.relative('.', file)}`);
    }
  }
});

console.log('\n🎉 Done! Tailwind CDN references removed.\n');
