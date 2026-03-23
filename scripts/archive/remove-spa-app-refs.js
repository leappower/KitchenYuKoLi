#!/usr/bin/env node
/**
 * remove-spa-app-refs.js - 移除所有页面中的spa-app.js引用
 *
 * 问题：项目中同时存在spa-app.js和spa-router.js两个SPA系统，导致冲突
 * 解决：删除所有页面中的spa-app.js引用，统一使用spa-router.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const PAGES_DIR = path.join(__dirname, '../src/pages');
const PATTERN = '**/*.html';

// 要删除的脚本引用模式
const SPA_APP_PATTERNS = [
  /<script\s+src="[^"]*spa-app\.js"[^>]*>\s*<\/script>\s*\n?/g,
  /<script\s+src='[^']*spa-app\.js'[^>]*>\s*<\/script>\s*\n?/g,
];

console.log('🔍 搜索spa-app.js引用...');

// 查找所有HTML文件
const files = glob.sync(PATTERN, { cwd: PAGES_DIR });
console.log(`找到 ${files.length} 个HTML文件`);

let modifiedCount = 0;
let skippedCount = 0;

files.forEach(file => {
  const filePath = path.join(PAGES_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;
  let newContent = content;
  
  // 检查是否包含spa-app.js引用
  const hasSpaApp = SPA_APP_PATTERNS.some(pattern => pattern.test(content));
  
  if (!hasSpaApp) {
    skippedCount++;
    return;
  }
  
  // 删除spa-app.js引用
  SPA_APP_PATTERNS.forEach(pattern => {
    newContent = newContent.replace(pattern, '');
    if (newContent !== content) {
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedCount++;
    console.log(`✅ 已更新: ${file}`);
  } else {
    skippedCount++;
  }
});

console.log('\n📊 完成！');
console.log(`✅ 已更新: ${modifiedCount} 个文件`);
console.log(`⏭️  跳过: ${skippedCount} 个文件`);
console.log(`总计: ${files.length} 个文件`);
