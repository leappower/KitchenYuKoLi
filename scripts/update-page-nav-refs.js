#!/usr/bin/env node
/**
 * 更新所有页面中的 navigator data-active 引用
 * 移除旧的 about/contact，添加 applications
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.join(__dirname, '..', 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

// 有效的 data-active 值
const VALID_ACTIVE_VALUES = ['home', 'catalog', 'applications', 'solutions', 'support', 'case-studies', 'pdp', 'esg', 'thank-you', 'landing', 'quote', 'roi', ''];

function updatePageNavRefs() {
  // 查找所有 HTML 文件
  const htmlFiles = glob.sync('**/*.html', { cwd: PAGES_DIR, absolute: true });
  
  let updatedCount = 0;
  
  htmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 1. 更新 navigator 的 data-active
    // 将 about -> '' (空，不在主导航中)
    // 将 contact -> '' (空，不在主导航中)
    // applications 页面使用 data-active="applications"
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    
    // 根据文件路径判断应该使用什么 data-active
    let expectedActive = '';
    if (relativePath.includes('home')) {
      expectedActive = 'home';
    } else if (relativePath.includes('catalog')) {
      expectedActive = 'catalog';
    } else if (relativePath.includes('applications')) {
      expectedActive = 'applications';
    } else if (relativePath.includes('solutions')) {
      expectedActive = 'solutions';
    } else if (relativePath.includes('support')) {
      expectedActive = 'support';
    } else if (relativePath.includes('cases')) {
      expectedActive = 'case-studies';
    } else if (relativePath.includes('roi')) {
      expectedActive = 'roi';
    } else if (relativePath.includes('about')) {
      expectedActive = ''; // about 不在主导航中
    } else if (relativePath.includes('contact')) {
      expectedActive = ''; // contact 不在主导航中
    }
    
    // 替换 data-active 值
    if (expectedActive !== undefined) {
      // 匹配 data-active="xxx" 或 data-active='xxx'
      content = content.replace(/data-active="[^"]*"/g, `data-active="${expectedActive}"`);
      content = content.replace(/data-active='[^']*'/g, `data-active="${expectedActive}"`);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${relativePath} -> data-active="${expectedActive}"`);
      updatedCount++;
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files`);
}

// 简单实现 glob
function simpleGlob(pattern, options) {
  const { cwd, absolute } = options || {};
  const baseDir = cwd || process.cwd();
  
  function walkDir(dir, results = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, results);
      } else if (item.endsWith('.html')) {
        results.push(absolute ? fullPath : path.relative(baseDir, fullPath));
      }
    }
    return results;
  }
  
  return walkDir(baseDir);
}

// 主函数
function main() {
  console.log('🚀 Updating page navigator references...\n');
  
  // 使用简单实现
  const htmlFiles = simpleGlob('**/*.html', { cwd: PAGES_DIR, absolute: true });
  
  let updatedCount = 0;
  
  htmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    
    // 根据文件路径判断应该使用什么 data-active
    let expectedActive = '';
    if (relativePath.includes('home')) {
      expectedActive = 'home';
    } else if (relativePath.includes('catalog')) {
      expectedActive = 'catalog';
    } else if (relativePath.includes('applications')) {
      expectedActive = 'applications';
    } else if (relativePath.includes('solutions')) {
      expectedActive = 'solutions';
    } else if (relativePath.includes('support')) {
      expectedActive = 'support';
    } else if (relativePath.includes('cases')) {
      expectedActive = 'case-studies';
    } else if (relativePath.includes('roi')) {
      expectedActive = 'roi';
    } else if (relativePath.includes('about')) {
      expectedActive = '';
    } else if (relativePath.includes('contact')) {
      expectedActive = '';
    }
    
    // 替换 data-active 值
    if (expectedActive !== undefined) {
      content = content.replace(/data-active="[^"]*"/g, `data-active="${expectedActive}"`);
      content = content.replace(/data-active='[^']*'/g, `data-active="${expectedActive}"`);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${relativePath} -> data-active="${expectedActive}"`);
      updatedCount++;
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files`);
}

main();
