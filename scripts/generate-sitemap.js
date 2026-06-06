#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.kitchen.yukoli.com';
const PAGES_DIR = path.join(__dirname, '..', 'dist');
const EXCLUDE_DIRS = ['assets', 'pages', 'node_modules'];
const EXCLUDE = ['products/detail', 'quote', 'thank-you'];
const PRIORITY_MAP = { '': 1.0, 'home': 1.0, 'products': 0.9, 'applications': 0.8, 'privacy': 0.3, 'terms': 0.3 };
const FREQ_MAP = { 'home': 'weekly', 'products': 'daily', 'applications': 'monthly', 'privacy': 'yearly', 'terms': 'yearly' };

function findPages(dir, base) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (base === undefined && EXCLUDE_DIRS.includes(entry.name)) continue;

    const full = path.join(dir, entry.name);
    const slug = base ? base + '/' + entry.name : entry.name;
    const indexPCFile = path.join(full, 'index-pc.html');

    if (fs.existsSync(indexPCFile)) {
      results.push(slug);
    }

    // Recurse for sub-routes (e.g. products/cutting/)
    results.push(...recurseRouteDir(full, slug));
  }
  return results;
}

function recurseRouteDir(dir, base) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    const slug = base + '/' + entry.name;
    const indexPCFile = path.join(full, 'index-pc.html');
    if (fs.existsSync(indexPCFile)) {
      results.push(slug);
    }
    results.push(...recurseRouteDir(full, slug));
  }
  return results;
}

const pages = findPages(PAGES_DIR).filter(p => !EXCLUDE.some(e => p.startsWith(e)));

// ─── 加入产品详情页（SPA 路由） ─────────────────────────────
const pdtPath = path.join(PAGES_DIR, 'assets', 'js', 'product-data-table.js');
var productUrls = [];
if (fs.existsSync(pdtPath)) {
  const pdtContent = fs.readFileSync(pdtPath, 'utf-8');
  const start = pdtContent.indexOf('[');
  const end = pdtContent.lastIndexOf('];') + 1;
  const vm = require('vm');
  const products = vm.runInNewContext(pdtContent.substring(start, end));
  const CATEGORY_SLUGS = {
    '翻炒系列': 'stirfry', '炖煮系列': 'stewing', '煎炸系列': 'frying',
    '蒸煮系列': 'steaming', '切配系列': 'cutting', '辅助系列': 'other',
  };
  productUrls = products.map(p => {
    var slug = CATEGORY_SLUGS[p.category];
    if (!slug) return null;
    return 'https://www.kitchen.yukoli.com/products/' + slug + '/' + encodeURIComponent(p.model) + '/';
  }).filter(Boolean);
}

const urls = pages.map(p => {
  const clean = p || '/';
  const mtime = fs.statSync(path.join(PAGES_DIR, p, 'index-pc.html')).mtime.toISOString().split('T')[0];
  const priority = Object.entries(PRIORITY_MAP).find(([k]) => clean === k || clean === `/${k}`)?.[1] || 0.7;
  const freq = Object.entries(FREQ_MAP).find(([k]) => clean.startsWith(k))?.[1] || 'monthly';
  return `  <url>\n    <loc>${BASE_URL}/${clean === '/' ? '' : clean}/</loc>\n    <lastmod>${mtime}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
});

// ─── 产品详情页 URL ───────────────────────────────────────────
const productEntries = productUrls.map(url => {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
});

const allUrls = urls.concat(productEntries);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(__dirname, '..', 'dist', 'sitemap.xml'), xml);
console.log(`✅ Generated sitemap.xml with ${pages.length} URLs`);
