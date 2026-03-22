#!/usr/bin/env node
/**
 * serve-static.js
 * Lightweight dev server for src/ (static multi-page HTML).
 * No extra dependencies — uses Node.js built-in http + fs.
 *
 * Usage:
 *   node scripts/serve-static.js [port]
 *   npm run dev:static
 *
 * Routes:
 *   /                        → /pages/home/index.html  (responsive entry, auto-routes by screen)
 *   everything else          → serve file from src/ or 404
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || process.env.PORT || '4000', 10);
const ROOT = path.join(__dirname, '..', 'src');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp4':  'video/mp4',
};

function getMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]; // strip query string

  // --- Redirects ---
  if (urlPath === '/' || urlPath === '/index.html') {
    res.writeHead(302, { Location: '/pages/home/index.html' });
    res.end();
    return;
  }

  // --- Serve file ---
  const filePath = path.join(ROOT, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  let target = filePath;

  // If directory, look for index.html
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }

  if (!fs.existsSync(target) || fs.statSync(target).isFile() === false) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + urlPath);
    return;
  }

  const content = fs.readFileSync(target);
  res.writeHead(200, {
    'Content-Type': getMime(target),
    'Cache-Control': 'no-cache',
  });
  res.end(content);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  \u{1F680} Static dev server running');
  console.log('  \u{1F4C2} Serving: src/');
  console.log('');
  console.log('  \u{1F517} http://localhost:' + PORT + '               \u2192 pages/home/index.html (responsive auto-routes)');
  console.log('  \u{1F517} http://localhost:' + PORT + '/router-test.html \u2192 preview / router test hub');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
