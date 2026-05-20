#!/usr/bin/env node
/**
 * generate-search-index.js — Generate search-index.json for client-side search
 *
 * Scans dist/pages/ for all index-pc.html files and extracts
 * title, description, headings, and path for client-side search.
 *
 * Usage: node scripts/generate-search-index.js
 */
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const htmlFiles = [];

function collect(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (f) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      collect(fp);
    } else if (f === 'index-pc.html') {
      htmlFiles.push(fp);
    }
  });
}

collect(path.join(DIST_DIR, 'pages'));

const index = [];

htmlFiles.forEach(function (fp) {
  const c = fs.readFileSync(fp, 'utf-8');

  const rel = path.relative(DIST_DIR, fp).replace(/\\/g, '/');
  let urlPath = '/' + path.dirname(rel).replace(/^pages\//, '') + '/';
  if (urlPath === '//') urlPath = '/';

  const tMatch = c.match(/<title>([^<]*)<\/title>/i);
  const title = tMatch ? tMatch[1].trim() : '';

  const dMatch = c.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*\/?>/i);
  const description = dMatch ? dMatch[1].trim() : '';

  const headings = [];
  var h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  var m1;
  while ((m1 = h1Re.exec(c)) !== null) {
    var h = m1[1].replace(/<[^>]*>/g, '').trim();
    if (h) headings.push(h);
  }
  var h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  var m2;
  while ((m2 = h2Re.exec(c)) !== null) {
    var h2 = m2[1].replace(/<[^>]*>/g, '').trim();
    if (h2 && headings.length < 5) headings.push(h2);
  }

  const pathParts = urlPath.split('/').filter(Boolean);
  const category = pathParts[0] || '';

  if (title || description) {
    index.push({
      path: urlPath,
      title: title,
      description: description,
      headings: headings.slice(0, 5),
      category: category,
    });
  }
});

const dataDir = path.join(DIST_DIR, 'assets', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
fs.writeFileSync(path.join(dataDir, 'search-index.json'), JSON.stringify(index, null, 2), 'utf-8');
console.log('  ✓ search-index.json with ' + index.length + ' entries');
