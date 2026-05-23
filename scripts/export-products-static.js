#!/usr/bin/env node
/**
 * export-products-static.js — 从 kitchenyuKoLiServer 导出产品数据为静态文件
 *
 * 用法: node scripts/export-products-static.js [API_URL]
 *   默认 API_URL = https://127.0.0.1:8000
 *
 * 输出: src/assets/data/products.json
 *   - 扁平化 model 数组
 *   - 字段映射: is_active → isActive
 *   - 保留 images[].filePath 原样
 *
 * build 时调用 → dist/assets/data/products.json 随部署走
 */
'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = process.argv[2] || 'https://127.0.0.1:8000';
const PRODUCTS_API = API_URL + '/api/public/products-data';
const OUTPUT_FILE = path.resolve(__dirname, '..', 'src', 'assets', 'data', 'products.json');

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
          reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
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
          // 字段映射
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

(async () => {
  console.log('[export-products] Fetching from', PRODUCTS_API);
  try {
    const treeData = await fetch(PRODUCTS_API);
    const models = flattenProducts(treeData);
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(models), 'utf-8');
    console.log('[export-products] ✅ Exported ' + models.length + ' products to ' + OUTPUT_FILE);
  } catch (err) {
    console.error('[export-products] ❌ Failed:', err.message);
    process.exit(1);
  }
})();
