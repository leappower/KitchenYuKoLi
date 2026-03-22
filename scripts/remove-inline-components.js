#!/usr/bin/env node
/**
 * remove-inline-components.js
 *
 * 自动化脚本：批量移除所有页面的内联 Header 和 Footer
 * 
 * 操作：
 * 1. 移除 <header data-component="max-display-header"> 及其内容
 * 2. 移除 <div data-component="min-display-header"> 及其内容
 * 3. 移除 <footer data-component="min-display-footer"> 及其内容
 * 4. 移除内联的 <footer>...</footer> 标签
 * 5. 移除相关的 <script> 标签
 */

const fs = require('fs');
const path = require('path');

// 递归查找所有 HTML 文件
function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      findHtmlFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 处理单个 HTML 文件
function processHtmlFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 1. 移除 <header data-component="max-display-header">...</header>
  const maxHeaderPattern = /<header[^>]*data-component="max-display-header"[^>]*>[\s\S]*?<\/header>/gi;
  const beforeMaxHeader = content.length;
  content = content.replace(maxHeaderPattern, '');
  if (content.length !== beforeMaxHeader) {
    console.log('  ✓ Removed max-display-header');
    modified = true;
  }
  
  // 2. 移除 <div data-component="min-display-header">...</div>
  const minHeaderPattern = /<div[^>]*data-component="min-display-header"[^>]*>[\s\S]*?<\/div>/gi;
  const beforeMinHeader = content.length;
  content = content.replace(minHeaderPattern, '');
  if (content.length !== beforeMinHeader) {
    console.log('  ✓ Removed min-display-header');
    modified = true;
  }
  
  // 3. 移除 <div data-component="min-display-footer">...</div>
  const minFooterPattern = /<div[^>]*data-component="min-display-footer"[^>]*>[\s\S]*?<\/div>/gi;
  const beforeMinFooter = content.length;
  content = content.replace(minFooterPattern, '');
  if (content.length !== beforeMinFooter) {
    console.log('  ✓ Removed min-display-footer');
    modified = true;
  }
  
  // 4. 移除内联的 <footer>...</footer> 标签（非组件的）
  // 匹配不包含 data-component 属性的 footer 标签
  const inlineFooterPattern = /<footer[^>]*>(?!.*data-component=)[\s\S]*?<\/footer>/gi;
  const beforeInlineFooter = content.length;
  content = content.replace(inlineFooterPattern, '');
  if (content.length !== beforeInlineFooter) {
    console.log('  ✓ Removed inline footer');
    modified = true;
  }
  
  // 5. 移除相关的 script 标签
  const scriptPatterns = [
    /<script[^>]*src="[^"]*max-display-header\.js"[^>]*><\/script>/gi,
    /<script[^>]*src="[^"]*min-display-header\.js"[^>]*><\/script>/gi,
    /<script[^>]*src="[^"]*min-display-footer\.js"[^>]*><\/script>/gi,
  ];
  
  for (const pattern of scriptPatterns) {
    const beforeScript = content.length;
    content = content.replace(pattern, '');
    if (content.length !== beforeScript) {
      console.log('  ✓ Removed related script');
      modified = true;
    }
  }
  
  // 如果有修改，写回文件
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  → File updated\n');
  } else {
    console.log('  → No changes needed\n');
  }
}

// 主函数
function main() {
  const pagesDir = path.join(__dirname, '..', 'src', 'pages');
  
  console.log('='.repeat(60));
  console.log('Remove Inline Components Script');
  console.log('='.repeat(60));
  console.log(`Target directory: ${pagesDir}`);
  console.log('');
  
  if (!fs.existsSync(pagesDir)) {
    console.error(`Error: Directory not found: ${pagesDir}`);
    process.exit(1);
  }
  
  const htmlFiles = findHtmlFiles(pagesDir);
  console.log(`Found ${htmlFiles.length} HTML files to process`);
  console.log('');
  
  let modifiedCount = 0;
  for (const filePath of htmlFiles) {
    processHtmlFile(filePath);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Processing complete!');
  console.log('='.repeat(60));
}

// 执行主函数
main();
