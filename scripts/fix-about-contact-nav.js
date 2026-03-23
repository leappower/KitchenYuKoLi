#!/usr/bin/env node
/**
 * 修复 about 和 contact 页面的 data-active
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

function fixNav(pages, activeValue) {
  pages.forEach(page => {
    const filePath = path.join(PAGES_DIR, page);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/data-active="[^"]*"/g, `data-active="${activeValue}"`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${page} -> data-active="${activeValue}"`);
    }
  });
}

// 修复 about 页面
fixNav([
  'about/index-mobile.html',
  'about/index-tablet.html',
  'about/index-pc.html'
], 'about');

// 修复 contact 页面
fixNav([
  'contact/index-mobile.html',
  'contact/index-tablet.html',
  'contact/index-pc.html'
], 'contact');

console.log('\n✅ About and Contact navigation restored!');
