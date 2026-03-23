#!/usr/bin/env node
/**
 * 更新 applications 页面的 data-active 为 "applications"
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

function fixApplicationsNav() {
  const appsDir = path.join(PAGES_DIR, 'applications');
  const files = ['index-mobile.html', 'index-tablet.html', 'index-pc.html'];
  
  files.forEach(file => {
    const filePath = path.join(appsDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 替换 data-active 为 applications
      content = content.replace(/data-active="[^"]*"/g, 'data-active="applications"');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: applications/${file} -> data-active="applications"`);
    }
  });
}

fixApplicationsNav();
