/**
 * extract-dynamic-css.js — 一次性脚本
 * 从 JS 文件中的 injectStyles() 提取 CSS 模板字符串到静态 CSS 文件
 *
 * 用法: node scripts/extract-dynamic-css.js
 * 输出: src/assets/css/components.css
 */

'use strict';

const fs = require('fs');
const path = require('path');

const UI_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'js', 'ui');
const JS_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'js');
const OUT = path.resolve(__dirname, '..', 'src', 'assets', 'css', 'components.css');

// 所有需要提取 CSS 的 JS 文件
const FILES = [
  // UI 组件
  path.join(UI_DIR, 'dropdown-styles.js'),
  path.join(UI_DIR, 'products-dropdown.js'),
  path.join(UI_DIR, 'applications-dropdown.js'),
  path.join(UI_DIR, 'support-dropdown.js'),
  path.join(UI_DIR, 'about-dropdown.js'),
  path.join(UI_DIR, 'contact-dropdown.js'),
  path.join(UI_DIR, 'navigator.js'),
  path.join(UI_DIR, 'slide-menu.js'),
  path.join(UI_DIR, 'floating-actions.js'),
  path.join(UI_DIR, 'custom-select.js'),
  path.join(UI_DIR, 'search-engine.js'),
  path.join(UI_DIR, 'page-effects.js'),
  // 其他 JS
  path.join(JS_DIR, 'translations-dropdown-template.js'),
  path.join(UI_DIR, 'smart-popup.js'),
];

// 收集到的 CSS 块
const blocks = [];
let totalCssChars = 0;
let order = 0;

function parseArrayToCSS(content, sourceFile, label) {
  // 匹配 style.textContent = [ 或 ] .join("\n") 或 .join('')
  const lines = content.split('\n');
  let inArray = false;
  let cssLines = [];
  let arrayStart = 0;
  let found = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 检测数组开始: textContent = [ 或 .textContent = [
    if (/textContent\s*=\s*\[/.test(line) || /textContent\s*\+=\s*\[/.test(line)) {
      if (inArray) {
        // 嵌套数组，忽略
        continue;
      }
      // 找到数组开始
      const startIdx = line.indexOf('[');
      const afterBracket = line.substring(startIdx + 1);
      inArray = true;
      arrayStart = i;
      cssLines = [];

      // 如果]在同一行
      if (afterBracket.includes(']')) {
        const endIdx = afterBracket.indexOf(']');
        const raw = afterBracket.substring(0, endIdx).trim();
        if (raw) {
          // 去掉引号
          let cleaned = raw.replace(/^\s*['"]/, '').replace(/['"]\s*$/, '');
          if (cleaned) {
            cssLines.push(cleaned);
          }
        }
        inArray = false;
        // 输出
        if (cssLines.length > 0) {
          const css = cssLines.join('\n');
          blocks.push({
            order: order++,
            source: path.relative(__dirname, sourceFile),
            line: arrayStart + 1,
            label: label || 'style',
            css: css,
          });
          totalCssChars += css.length;
          found++;
        }
        cssLines = [];
        continue;
      }
      continue;
    }

    if (inArray) {
      // 检查是否包含结束 ]
      const closeIdx = line.indexOf(']');
      if (closeIdx !== -1 || /\]\s*,?\s*$/.test(trimmed)) {
        // 提取 ] 之前的部分
        const endIdx = closeIdx !== -1 ? closeIdx : line.length;
        const raw = line.substring(0, endIdx);
        let cleaned = raw.replace(/^\s*['"]/, '').replace(/['"]\s*$/, '').trim();
        if (cleaned) {
          cssLines.push(cleaned);
        }
        inArray = false;

        // 输出
        if (cssLines.length > 0) {
          const css = cssLines.join('\n');
          blocks.push({
            order: order++,
            source: path.relative(__dirname, sourceFile),
            line: arrayStart + 1,
            label: label || 'style',
            css: css,
          });
          totalCssChars += css.length;
          found++;
        }
        cssLines = [];
      } else {
        // 提取字符串内容
        let cleaned = trimmed.replace(/^['"]/, '').replace(/['"]\s*,?\s*$/, '');
        if (cleaned) {
          cssLines.push(cleaned);
        }
      }
    }
  }

  return found;
}

// 遍历所有文件
for (const file of FILES) {
  if (!fs.existsSync(file)) {
    console.log(`⚠  SKIP (not found): ${file}`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const basename = path.basename(file);
  const count = parseArrayToCSS(content, file, basename);
  if (count > 0) {
    console.log(`  ✓ ${basename}: ${count} CSS blocks`);
  } else {
    console.log(`  - ${basename}: no CSS blocks found`);
  }
}

// 输出到 components.css
const header = `/* ============================================================
 * components.css — 静态化 UI 组件样式
 *
 * 从 JS injectStyles() 提取的运行时样式，静态化后由 build-ssg.js
 * 注入到所有 SSG 和 SPA 页面。
 *
 * 生成时间: ${new Date().toISOString()}
 * 总 CSS 大小: ${(totalCssChars / 1024).toFixed(1)} KB
 * 来源: ${blocks.length} 个 CSS 块
 * ============================================================ */

`;

const sourceComments = {};
for (const b of blocks) {
  if (!sourceComments[b.source]) {
    sourceComments[b.source] = [];
  }
  sourceComments[b.source].push(b);
}

let output = header;

for (const [source, fileBlocks] of Object.entries(sourceComments)) {
  output += `/* ── ${source} ── */\n`;
  for (const b of fileBlocks) {
    output += `/*   L${b.line} */\n`;
    output += b.css + '\n\n';
  }
}

fs.writeFileSync(OUT, output);
console.log(`\n✅ Wrote ${(totalCssChars / 1024).toFixed(1)} KB CSS to ${path.relative(__dirname, OUT)}`);
console.log(`   ${blocks.length} CSS blocks from ${Object.keys(sourceComments).length} files`);