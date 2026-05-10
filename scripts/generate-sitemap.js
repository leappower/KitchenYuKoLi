#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.kitchen.yukoli.com';
const PAGES_DIR = path.join(__dirname, '..', 'dist', 'pages');
const EXCLUDE = ['products/detail', 'quote', 'thank-you', 'landing'];
const PRIORITY_MAP = { '': 1.0, 'home': 1.0, 'products': 0.9, 'applications': 0.8 };
const FREQ_MAP = { 'home': 'weekly', 'products': 'daily', 'applications': 'monthly' };

function findPages(dir, base = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...findPages(full, rel));
    } else if (entry.name === 'index-pc.html') {
      results.push(rel.replace('/index-pc.html', ''));
    }
  }
  return results;
}

const pages = findPages(PAGES_DIR).filter(p => !EXCLUDE.some(e => p.startsWith(e)));

const urls = pages.map(p => {
  const clean = p || '/';
  const mtime = fs.statSync(path.join(PAGES_DIR, p || 'home', 'index-pc.html')).mtime.toISOString().split('T')[0];
  const priority = Object.entries(PRIORITY_MAP).find(([k]) => clean === k || clean === `/${k}`)?.[1] || 0.7;
  const freq = Object.entries(FREQ_MAP).find(([k]) => clean.startsWith(k))?.[1] || 'monthly';
  return `  <url>\n    <loc>${BASE_URL}/${clean === '/' ? '' : clean}/</loc>\n    <lastmod>${mtime}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(__dirname, '..', 'dist', 'sitemap.xml'), xml);
console.log(`✅ Generated sitemap.xml with ${pages.length} URLs`);
