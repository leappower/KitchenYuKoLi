#!/usr/bin/env node
/**
 * validate-product-categories.js
 *
 * 校验产品分类数据一致性。
 * product-data-table.js 是唯一的事实来源（category 必须是 6 个合法值之一）。
 * products.json 作为补充数据源，其 category 仅用于一致性检查。
 *
 * 用法:
 *   node scripts/validate-product-categories.js
 *
 * 退出码:
 *   0 — 全部通过
 *   1 — 有校验失败
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PDT_FILE = path.join(ROOT, 'src', 'assets', 'js', 'product-data-table.js');
const JSON_FILE = path.join(ROOT, 'src', 'assets', 'data', 'products.json');

// ─── 合法的 category 值 ────────────────────────────────
const VALID_CATEGORIES = [
  '翻炒系列',
  '切配系列',
  '煎炸系列',
  '炖煮系列',
  '蒸煮系列',
  '辅助系列',
];

// ─── 解析 product-data-table.js ────────────────────────
function parsePDT(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const products = [];

  // 按 {} 切割对象
  const objRe = /\{([^}]+)\}/g;
  let m;
  while ((m = objRe.exec(content)) !== null) {
    const objStr = m[1];
    // 跳过函数对象、条件块等
    const model = extractVal(objStr, 'model');
    const category = extractVal(objStr, 'category');
    const name = extractVal(objStr, 'name');
    const nameEn = extractVal(objStr, 'nameEn');
    if (model && category) {
      products.push({ model, category, name, nameEn, source: 'PDT' });
    }
  }

  return products;
}

// ─── 解析 products.json ─────────────────────────────────
function parseJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return data.map(p => ({
      model: p.model || '',
      category: p.category || '',
      name: p.name || '',
      source: 'JSON',
    }));
  } catch (e) {
    console.error('  ⚠️  products.json 解析失败:', e.message);
    return [];
  }
}

function extractVal(objStr, key) {
  const re = new RegExp(key + '\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
  const m = objStr.match(re);
  return m ? m[1] : null;
}

// ─── 检查 model 一致性 ─────────────────────────────────
function checkModelConsistency(pdtProducts, jsonProducts) {
  const issues = [];

  const pdtModels = new Map(pdtProducts.map(p => [p.model, p]));
  const jsonModels = new Map(jsonProducts.map(p => [p.model, p]));

  // PDT 有但 JSON 没有
  for (const [model, p] of pdtModels) {
    if (!jsonModels.has(model)) {
      issues.push({ type: 'missing_in_json', model, name: p.name, category: p.category });
    }
  }

  // JSON 有但 PDT 没有
  for (const [model, p] of jsonModels) {
    if (!pdtModels.has(model)) {
      issues.push({ type: 'extra_in_json', model, name: p.name, category: p.category });
    }
  }

  return issues;
}

// ─── 主流程 ─────────────────────────────────────────────
function main() {
  const startTime = Date.now();
  let exitCode = 0;
  const errors = [];

  console.log('');
  console.log('🔍 校验产品分类数据一致性');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ─── 1. 校验 product-data-table.js ──────────────────
  console.log('');
  console.log('📋 数据源 A: product-data-table.js');
  if (!fs.existsSync(PDT_FILE)) {
    console.error('  ❌ 文件不存在:', PDT_FILE);
    process.exit(1);
  }

  const pdtProducts = parsePDT(PDT_FILE);
  console.log(`  解析到 ${pdtProducts.length} 个产品`);

  const invalidCats = [];
  for (const p of pdtProducts) {
    if (!VALID_CATEGORIES.includes(p.category)) {
      invalidCats.push(p);
    }
  }

  if (invalidCats.length > 0) {
    errors.push(`product-data-table.js 中有 ${invalidCats.length} 个非法 category 值:`);
    for (const p of invalidCats.slice(0, 10)) {
      errors.push(`  ${p.model}: category="${p.category}" name="${(p.name || '').substring(0, 40)}"`);
    }
    if (invalidCats.length > 10) {
      errors.push(`  ... 还有 ${invalidCats.length - 10} 个`);
    }
  } else {
    console.log('  ✅ 所有 category 值合法');
  }

  // ─── 2. 校验 products.json ─────────────────────────
  console.log('');
  console.log('📋 数据源 B: products.json');

  const jsonProducts = parseJSON(JSON_FILE);
  if (jsonProducts.length === 0) {
    console.log('  ⚠️  products.json 为空或不存在（跳过校验）');
  } else {
    console.log(`  解析到 ${jsonProducts.length} 个产品`);

    // 分类分布统计
    const catDist = {};
    for (const p of jsonProducts) {
      catDist[p.category] = (catDist[p.category] || 0) + 1;
    }
    console.log('  分类分布:');
    for (const [c, n] of Object.entries(catDist).sort((a, b) => b[1] - a[1])) {
      const flag = VALID_CATEGORIES.includes(c) ? ' ✅' : ' ⚠️';
      console.log(`    ${n.toString().padStart(4)} ${c}${flag}`);
    }

    // 检查 category 合法性
    const jsonInvalid = jsonProducts.filter(p => !VALID_CATEGORIES.includes(p.category) && p.category);
    if (jsonInvalid.length > 0) {
      console.log(`  ⚠️  ${jsonInvalid.length} 个产品的 category 不是标准分类名`);
      console.log('    （运行时会被 PDT 数据覆盖，建议同步修复）');
    }
  }

  // ─── 3. 校验 model 一致性 ──────────────────────────
  console.log('');
  console.log('📊 数据一致性检查');
  if (jsonProducts.length > 0) {
    const inconsistency = checkModelConsistency(pdtProducts, jsonProducts);
    const missingInJson = inconsistency.filter(i => i.type === 'missing_in_json');
    const extraInJson = inconsistency.filter(i => i.type === 'extra_in_json');

    if (missingInJson.length > 0) {
      console.log(`  ⚠️  PDT 有但 products.json 没有 (${missingInJson.length}):`);
      for (const i of missingInJson.slice(0, 5)) {
        console.log(`       ${i.model} — ${(i.name || '').substring(0, 40)}`);
      }
      if (missingInJson.length > 5) console.log(`       ... 还有 ${missingInJson.length - 5} 个`);
    }

    if (extraInJson.length > 0) {
      console.log(`  ⚠️  products.json 有但 PDT 没有 (${extraInJson.length}):`);
      for (const i of extraInJson.slice(0, 5)) {
        console.log(`       ${i.model} — ${(i.name || '').substring(0, 40)}`);
      }
      if (extraInJson.length > 5) console.log(`       ... 还有 ${extraInJson.length - 5} 个`);
    }

    if (missingInJson.length === 0 && extraInJson.length === 0) {
      console.log('  ✅ 两数据源的 model 列表完全一致');
    }
  }

  // ─── 结果 ──────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errors.length > 0) {
    console.log('');
    for (const err of errors) {
      console.log('❌ ' + err);
    }
    console.log('');
    console.log('❌ 校验未通过！耗时 ' + elapsed + 's');
    process.exit(1);
  }

  console.log('✅ 全部校验通过！耗时 ' + elapsed + 's');
  process.exit(0);
}

main();
