#!/usr/bin/env node
/**
 * export-products-static.js — 从 kitchenyuKoLiServer 导出产品数据 + 图片为本地静态文件
 *
 * 用法: node scripts/export-products-static.js [API_URL]
 *   默认 API_URL = https://127.0.0.1:8000
 *
 * 输出:
 *   src/assets/data/products.json — 扁平化 model 数组
 *   src/assets/images/products/  — 产品图片
 *
 * build 时调用 → dist/assets/data/ + dist/assets/images/products/ 随部署走
 */
'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = process.argv[2] || 'https://127.0.0.1:8000';
const PRODUCTS_API = API_URL + '/api/public/products-data';
const OUTPUT_JSON = path.resolve(__dirname, '..', 'src', 'assets', 'data', 'products.json');
const OUTPUT_IMG_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'products');

const agent = new https.Agent({ rejectUnauthorized: false });

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const opts = url.startsWith('https') ? { agent } : {};
    client.get(url, opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ': ' + body.substring(0, 200)));
        } else {
          resolve(JSON.parse(body));
        }
      });
    }).on('error', reject);
  });
}

function flattenProducts(treeData) {
  const models = [];
  function walk(arr) {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (item.models && Array.isArray(item.models)) {
        item.models.forEach((m) => {
          const product = Object.assign({}, m);
          if (product.is_active !== undefined && product.isActive === undefined) {
            product.isActive = product.is_active;
          }
          models.push(product);
        });
      }
      if (item.children) walk(item.children);
    });
  }
  walk(treeData);
  return models;
}

function downloadImage(filepath) {
  return new Promise((resolve) => {
    const filename = path.basename(filepath);
    const dest = path.join(OUTPUT_IMG_DIR, filename);
    if (fs.existsSync(dest)) return resolve({ filepath, status: 'skipped' });

    const url = API_URL + filepath;
    const client = url.startsWith('https') ? https : http;
    const opts = url.startsWith('https') ? { agent, timeout: 10000 } : { timeout: 10000 };
    client.get(url, opts, (res) => {
      if (res.statusCode !== 200) return resolve({ filepath, status: 'HTTP ' + res.statusCode });
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync(dest, Buffer.concat(chunks));
        resolve({ filepath, status: 'downloaded' });
      });
    }).on('error', (e) => resolve({ filepath, status: e.message }));
  });
}

(async () => {
  console.log('[export-products] Fetching from', PRODUCTS_API);
  try {
    const treeData = await fetch(PRODUCTS_API);
    const models = flattenProducts(treeData);

    // Write JSON
    const outputDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(models), 'utf-8');
    console.log('[export-products] ✅', models.length, 'products →', OUTPUT_JSON);

    // Download images
    if (!fs.existsSync(OUTPUT_IMG_DIR)) fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });

    const tasks = [];
    const seen = new Set();
    for (const m of models) {
      for (const img of (m.images || [])) {
        if (img.filePath && !seen.has(img.filePath)) {
          seen.add(img.filePath);
          tasks.push(downloadImage(img.filePath));
        }
      }
    }

    let downloaded = 0, skipped = 0, failed = 0;
    for (let i = 0; i < tasks.length; i += 5) {
      const batch = tasks.slice(i, i + 5);
      const results = await Promise.all(batch);
      results.forEach((r) => {
        if (r.status === 'downloaded') downloaded++;
        else if (r.status === 'skipped') skipped++;
        else { failed++; console.warn('[export-products] ⚠️', r.filepath, r.status); }
      });
      if ((downloaded + skipped + failed) % 50 === 0) {
        console.log('[export-products] Images:', downloaded + skipped, '/', tasks.length);
      }
    }

    const totalFiles = fs.readdirSync(OUTPUT_IMG_DIR).length;
    console.log('[export-products] ✅ Images:', downloaded, 'downloaded,', skipped, 'skipped,', failed, 'failed');
    console.log('[export-products] Total files in', OUTPUT_IMG_DIR + ':', totalFiles);
  } catch (err) {
    console.error('[export-products] ❌ Failed:', err.message);
    process.exit(1);
  }
})();
