#!/usr/bin/env node
/**
 * generate-spa-product-routes.js
 *
 * 为所有 SPA 产品详情页生成 index.html 文件，解决 GitHub Pages 纯静态部署 404 问题。
 *
 * 问题: Swup SPA 路由 `/products/{category}/{model}/` 在 GH Pages 上返回 404
 * 原因: 没有对应的 HTML 文件，GH Pages 无法处理动态路由
 * 方案: 为每个产品生成一个 index.html，通过 <meta refresh> 重定向到 SPA shell
 *
 * 用法:
 *   node scripts/generate-spa-product-routes.js [distDir]
 *   默认: ./dist
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIST_DIR = process.argv[2] || path.join(__dirname, '..', 'dist');

// ─── 品类名 → URL slug 映射 ───
const CATEGORY_SLUGS = {
  '翻炒系列': 'stirfry',
  '炖煮系列': 'stewing',
  '煎炸系列': 'frying',
  '蒸煮系列': 'steaming',
  '切配系列': 'cutting',
   '辅助系列': 'other',
};

// ─── 读取产品数据 ───
const pdtPath = path.join(DIST_DIR, 'assets', 'js', 'product-data-table.js');
if (!fs.existsSync(pdtPath)) {
  console.error('[spa-routes] product-data-table.js not found at', pdtPath);
  process.exit(1);
}

const pdtContent = fs.readFileSync(pdtPath, 'utf-8');
const startIdx = pdtContent.indexOf('[');
const endIdx = pdtContent.lastIndexOf('];') + 1;
const products = eval('(' + pdtContent.substring(startIdx, endIdx) + ')');

// ─── 生成 SPA shell index.html ───
// 模板: 直接展示 SPA shell（与 dist/index.html 类似），而不是 404
// GitHub Pages 会自动用这个文件响应 products/{cat}/{model}/ 的请求
const spaShellPath = path.join(DIST_DIR, 'index.html');
if (!fs.existsSync(spaShellPath)) {
  console.error('[spa-routes] SPA shell (dist/index.html) not found');
  process.exit(1);
}
const spaShell = fs.readFileSync(spaShellPath, 'utf-8');

let generated = 0;
let skipped = 0;
let errors = 0;

products.forEach(product => {
  const model = product.model;
  const category = product.category;
  const slug = CATEGORY_SLUGS[category];

  if (!slug) {
    console.warn('[spa-routes] Unknown category:', category, 'for', model);
    skipped++;
    return;
  }

  // 创建目录: dist/products/{slug}/{model}/
  const dir = path.join(DIST_DIR, 'products', slug, encodeURIComponent(model));
  
  try {
    fs.mkdirSync(dir, { recursive: true });
    // 写入 SPA shell
    fs.writeFileSync(path.join(dir, 'index.html'), spaShell);
    generated++;
  } catch (e) {
    console.error('[spa-routes] Failed to create', dir, ':', e.message);
    errors++;
  }
});

console.log('[spa-routes] Generated', generated, 'SPA product routes,', skipped, 'skipped,', errors, 'errors');
