#!/usr/bin/env node
/**
 * init-products.js — 从 Excel 初始化 KitchenYuKoLi 产品数据
 *
 * 直接解析 Excel 原始列，不依赖 KitchenYuKoLiServer。
 * 生成：
 *   src/assets/js/product-data-table.js — window.PRODUCT_DATA_TABLE（含 nameEn/specificationsEn/usageEn）
 *   src/assets/lang/zh-CN-product.json   — 完整中文产品翻译
 *   src/assets/lang/en-product.json      — 完整英文产品翻译（值留空，fallback 到中文）
 *
 * 用法:
 *   node scripts/init-products.js [xlsxPath]
 *   默认: scripts/products-table.xlsx
 */

'use strict';

const path = require('path');
const fs = require('fs');

const XLSX_PATH = process.argv[2] || path.join(__dirname, 'products-table.xlsx');
const OUT_DATA_TABLE = path.join(__dirname, '..', 'src', 'assets', 'js', 'product-data-table.js');
const LANG_DIR = path.join(__dirname, '..', 'src', 'assets', 'lang');

const EXCLUDED_NAMES = /洁碟台|污碟台|洗涤剂|架子|花洒|蒸柜|售卖/;
const EXCLUDED_MODEL_REGEX = /^[\d]+$/;
const VALID_CATEGORIES = ['翻炒系列', '炖煮系列', '煎炸系列', '蒸煮系列', '切配系列', '辅助系列'];

// ─── 解析 Excel ────────────────────────────────────────────────
function parseXlsx(xlsxPath) {
  var XLSX;
  try { XLSX = require('xlsx'); } catch(e) {
    console.error('[init] xlsx not installed. Run: npm install xlsx');
    process.exit(1);
  }
  var wb = XLSX.readFile(xlsxPath);
  var ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ─── 清洗模型名 ──────────────────────────────────────────────
function cleanModel(raw) {
  return String(raw).replace(/\s+/g, '').split('（')[0].split('(')[0].trim();
}

// ─── 从"配置"列中提取结构化字段 ──────────────────────────────
function parseConfig(rawConfig) {
  var result = {
    power: '',
    voltage: '',
    material: '',
    specifications: rawConfig || ''
  };
  if (!rawConfig) return result;
  var normalized = rawConfig.replace(/◆/g, '；');

  // 功率
  var pMatch = normalized.match(/功率[：:]\s*([^；;]+?)(?=\s*(?:[；;]|电压|材质|锅体|滚筒|显示屏|额定|电功率|电机功率|$))/);
  if (!pMatch) pMatch = normalized.match(/额定功率[（(]?.+?[）)]?[：:]\s*([^；;]+?)(?=\s*(?:[；;]|电压|材质|锅体|额定|$))/);
  if (!pMatch) pMatch = normalized.match(/电功率[：:]\s*([^；;]+?)(?=\s*(?:[；;]|额定|电压|$))/);
  if (!pMatch) pMatch = normalized.match(/电机功率[：:]\s*([^；;]+?)(?=\s*(?:[；;]|额定|电压|$))/);
  if (!pMatch) pMatch = normalized.match(/额电功率[：:]\s*([^；;]+?)(?=\s*(?:[；;]|额定|电压|$))/);
  if (pMatch) result.power = pMatch[1].trim().replace(/\s+/g, '');

  // 电压
  var vMatch = normalized.match(/电压[：:]\s*([^；;]+?)(?=\s*(?:[；;]|功率|材质|锅体|滚筒|频率|显示屏|额定|电参数|$))/);
  if (!vMatch) vMatch = normalized.match(/额定电压[：:]\s*([^；;]+?)(?=\s*(?:[；;]|功率|材质|锅体|额定|$))/);
  if (!vMatch) vMatch = normalized.match(/电参数[：:]\s*([^；;]+?)(?=\s*(?:[；;]|功率|材质|锅体|额定|$))/);
  if (vMatch) result.voltage = vMatch[1].trim().replace(/\s+/g, '');

  // 材质
  var mMatch = normalized.match(/材质[：:]\s*([^；;]+?)(?=\s*(?:[；;]|功率|电压|锅体|滚筒|清洗|显示屏|额定|$))/);
  if (!mMatch) mMatch = normalized.match(/机身材质[：:]\s*([^；;]+?)(?=\s*(?:[；;]|功率|电压|锅体|额定|$))/);
  if (!mMatch) mMatch = normalized.match(/锅体材质[：:]\s*([^；;]+?)(?=\s*(?:[；;]|功率|电压|锅体|额定|$))/);
  if (mMatch) result.material = mMatch[1].trim().replace(/\s+/g, '');

  return result;
}

// ─── 生成 i18n key ────────────────────────────────────────────
function i18nKeyForCategory(category) {
  var map = {
    '翻炒系列': 'nav_products_stirfry',
    '炖煮系列': 'nav_products_stewing',
    '煎炸系列': 'nav_products_frying',
    '蒸煮系列': 'nav_products_steaming',
    '切配系列': 'nav_products_cutting',
    '辅助系列': 'nav_products_other'
  };
  return map[category] || 'nav_products_' + category;
}

function i18nKeyForSubCategory(category, subCategory) {
  var prefixMap = {
    '翻炒系列': 'stirfry',
    '炖煮系列': 'stewing',
    '煎炸系列': 'frying',
    '蒸煮系列': 'steaming',
    '切配系列': 'cutting',
    '辅助系列': 'other'
  };
  var prefix = prefixMap[category] || category.replace('系列', '').toLowerCase();
  var suffix = subCategory.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '').toLowerCase();
  return 'product_subcat_' + prefix + '_' + suffix;
}

function i18nKeyForModel(model, field) {
  var key = 'product_' + model.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (field) key += '_' + field;
  return key;
}

// ─── 英文翻译映射（品类/子品类） ──────────────────────────────
var EN_TRANSLATIONS = {
  'nav_products_stirfry': 'Stir-Fry Series',
  'nav_products_stewing': 'Stewing Series',
  'nav_products_frying': 'Frying Series',
  'nav_products_steaming': 'Steaming Series',
  'nav_products_cutting': 'Cutting Series',
  'nav_products_other': 'Auxiliary Series',
  'product_subcat_stirfry_搅拌炒菜机': 'Stirring Cooker',
  'product_subcat_stirfry_滚筒炒菜机': 'Drum Stirring Cooker',
  'product_subcat_stirfry_团餐滚筒炒菜机': 'Bulk Drum Stirring Cooker',
  'product_subcat_stewing_搅拌炒锅炖烩机': 'Stirring Pot / Braising Machine',
  'product_subcat_stewing_汤锅': 'Soup Pot',
  'product_subcat_stewing_压力锅': 'Pressure Cooker',
  'product_subcat_stewing_煮面炉': 'Noodle Cooker',
  'product_subcat_stewing_煲仔炉': 'Clay Pot Stove',
  'product_subcat_stewing_卤煮炉': 'Stewing Stove',
  'product_subcat_steaming_自动漂烫焯水油炸机': 'Auto Blanching / Frying Machine',
  'product_subcat_steaming_智能蒸饭机': 'Smart Rice Steamer',
  'product_subcat_other_揭盖式洗碗机': 'Lift-Type Dishwasher',
  'product_subcat_other_长龙洗碗机': 'Conveyor Dishwasher',
  'product_subcat_frying_锅贴机': 'Potsticker Machine',
  'product_subcat_frying_油炸炉': 'Deep Fryer',
  'product_subcat_cutting_流水化自动机': 'Auto Flow Processing Machine'
};

// ─── 主流程 ────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error('[init] Excel not found:', XLSX_PATH);
    process.exit(1);
  }

  var rawRows = parseXlsx(XLSX_PATH);
  console.log('[init] Parsed', rawRows.length, 'rows from', XLSX_PATH);

  var models = [];
  var i18nZh = {};   // 所有翻译 key -> 中文值
  var i18nEn = {};   // 所有翻译 key -> 英文值（留空 fallback）
  var seenModels = {};

  for (var ri = 0; ri < rawRows.length; ri++) {
    var row = rawRows[ri];
    var rawModel = String(row['型号'] || '').trim();
    var model = cleanModel(rawModel);
    var name = String(row['名称'] || '').trim();
    var c1 = String(row['一级分类'] || '').trim();
    var c2 = String(row['二级分类'] || '').trim();
    var size = String(row['尺寸'] || '').trim();
    var config = String(row['配置'] || '').trim();
    var usage = String(row['用途和产能'] || '').trim();

    // 过滤
    if (!model || model === '-' || EXCLUDED_MODEL_REGEX.test(model)) continue;
    if (EXCLUDED_NAMES.test(name)) continue;
    if (seenModels[model]) continue;
    if (!VALID_CATEGORIES.includes(c1)) {
      console.warn('[init] Unknown category:', c1, 'model:', model);
      continue;
    }
    seenModels[model] = true;

    var parsed = parseConfig(config);
    var subCatI18nKey = i18nKeyForSubCategory(c1, c2);

    // i18n key for this product's name/specs/usage
    var nameKey = i18nKeyForModel(model, 'name');
    var specsKey = i18nKeyForModel(model, 'specifications');
    var usageKey = i18nKeyForModel(model, 'usage');

    var product = {
      model: model,
      name: name,
      nameEn: '',             // 英文名（留空，fallback 到 name）
      category: c1,
      subCategory: c2,
      specifications: parsed.specifications,
      specificationsEn: '',   // 英文规格（留空，fallback 到中文）
      power: parsed.power,
      voltage: parsed.voltage,
      material: parsed.material,
      productDimensions: size,
      throughput: '',
      averageTime: '',
      status: '在售',
      badge: '',
      badgeColor: '',
      isActive: true,
      images: [],
      highlights: '',
      scenarios: usage,
      usage: usage,
      usageEn: ''             // 英文用途（留空，fallback 到中文）
    };

    models.push(product);

    // ── 填充 i18n 翻译字典 ──
    // 品类翻译
    var catKey = i18nKeyForCategory(c1);
    if (!i18nZh[catKey]) {
      i18nZh[catKey] = c1;
      i18nEn[catKey] = EN_TRANSLATIONS[catKey] || '';
    }
    // 子品类翻译
    if (c2 && !i18nZh[subCatI18nKey]) {
      i18nZh[subCatI18nKey] = c2;
      i18nEn[subCatI18nKey] = EN_TRANSLATIONS[subCatI18nKey] || '';
    }
    // 产品名称翻译
    if (!i18nZh[nameKey]) {
      i18nZh[nameKey] = name;
      i18nEn[nameKey] = '';   // 英文产品名留空，后续手动填充
    }
    // 产品规格翻译
    if (parsed.specifications && !i18nZh[specsKey]) {
      i18nZh[specsKey] = parsed.specifications;
      i18nEn[specsKey] = '';
    }
    // 产品用途翻译
    if (usage && !i18nZh[usageKey]) {
      i18nZh[usageKey] = usage;
      i18nEn[usageKey] = '';
    }
  }

  // ── 从 en-product.json 读取已有翻译，注入 En 字段 ──
  var enProductPath = path.join(LANG_DIR, 'en-product.json');
  var enProductTranslations = {};
  if (fs.existsSync(enProductPath)) {
    try {
      enProductTranslations = JSON.parse(fs.readFileSync(enProductPath, 'utf-8'));
      console.log('[init] Loaded', Object.keys(enProductTranslations).length, 'keys from', path.relative(process.cwd(), enProductPath));
    } catch(e) {
      console.warn('[init] Failed to parse en-product.json:', e.message);
    }
  }

  // Inject translations into product models
  var injectedCount = { name: 0, specifications: 0, usage: 0, material: 0, throughput: 0 };
  models.forEach(function(p) {
    var nameEn = enProductTranslations[i18nKeyForModel(p.model, 'name')];
    var specsEn = enProductTranslations[i18nKeyForModel(p.model, 'specifications')];
    var usageEn = enProductTranslations[i18nKeyForModel(p.model, 'usage')];
    var materialEn = enProductTranslations[i18nKeyForModel(p.model, 'material')];
    var throughputEn = enProductTranslations[i18nKeyForModel(p.model, 'throughput')];
    if (nameEn) { p.nameEn = nameEn; injectedCount.name++; }
    if (specsEn) { p.specificationsEn = specsEn; injectedCount.specifications++; }
    if (usageEn) { p.usageEn = usageEn; injectedCount.usage++; }
    if (materialEn) { p.materialEn = materialEn; injectedCount.material++; }
    if (throughputEn) { p.throughputEn = throughputEn; injectedCount.throughput++; }
  });
  console.log('[init] Injected translations: name=' + injectedCount.name +
    ' specs=' + injectedCount.specifications + ' usage=' + injectedCount.usage +
    ' material=' + injectedCount.material + ' throughput=' + injectedCount.throughput);

  // ── 写入 product-data-table.js ──
  var jsContent = [
    '// Product Data Table — Auto-generated by scripts/init-products.js',
    '// DO NOT EDIT MANUALLY',
    '// Generated: ' + new Date().toISOString(),
    'window.PRODUCT_DATA_TABLE = ' + JSON.stringify(models, null, 2) + ';',
    'window.PRODUCT_DATA_VERSION = "' + Date.now() + '";',
    ''
  ].join('\n');

  var outDir = path.dirname(OUT_DATA_TABLE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(OUT_DATA_TABLE, jsContent, 'utf-8');
  console.log('[init] Written', models.length, 'models to', path.relative(process.cwd(), OUT_DATA_TABLE));

  // ── 写入 zh-CN-product.json（完整 146 个产品翻译） ──
  if (!fs.existsSync(LANG_DIR)) {
    fs.mkdirSync(LANG_DIR, { recursive: true });
  }
  var zhPath = path.join(LANG_DIR, 'zh-CN-product.json');
  fs.writeFileSync(zhPath, JSON.stringify(i18nZh, null, 2) + '\n', 'utf-8');
  console.log('[init] Written', Object.keys(i18nZh).length, 'keys to', path.relative(process.cwd(), zhPath));

  // ── 写入 en-product.json（保留已有翻译，合并新生成的，不删除额外 key） ──
  var enPath = path.join(LANG_DIR, 'en-product.json');
  var existingEn = {};
  if (fs.existsSync(enPath)) {
    try {
      existingEn = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
      console.log('[init] Loaded', Object.keys(existingEn).length, 'existing keys from', path.relative(process.cwd(), enPath));
    } catch(e) {}
  }
  // Merge: existing values win (manual translations preserved), i18nEn fills gaps
  var mergedEn = {};
  Object.keys(existingEn).forEach(function(k) { mergedEn[k] = existingEn[k]; });
  Object.keys(i18nEn).forEach(function(k) {
    if (!mergedEn[k] || mergedEn[k] === '') {
      mergedEn[k] = i18nEn[k] || '';
    }
  });
  // Ensure generated keys exist (set empty string as placeholder)
  Object.keys(i18nEn).forEach(function(k) {
    if (mergedEn[k] === undefined) mergedEn[k] = '';
  });

  // ── 统计 ──
  var catCounts = {};
  models.forEach(function(p) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });
  console.log('\n[init] Category distribution:');
  Object.keys(catCounts).sort(function(a,b) { return catCounts[b] - catCounts[a]; }).forEach(function(k) {
    console.log('  ' + k + ': ' + catCounts[k]);
  });

  var withSpecs = models.filter(function(p) { return p.specifications; }).length;
  var withSize = models.filter(function(p) { return p.productDimensions; }).length;
  var withUsage = models.filter(function(p) { return p.scenarios; }).length;
  var withPower = models.filter(function(p) { return p.power; }).length;
  var withVoltage = models.filter(function(p) { return p.voltage; }).length;
  var withMaterial = models.filter(function(p) { return p.material; }).length;
  var withNameEn = models.filter(function(p) { return p.nameEn !== ''; }).length;
  var prodTransKeys = Object.keys(i18nZh).length;

  console.log('\n[init] Field coverage:');
  console.log('  specifications:', withSpecs + '/' + models.length);
  console.log('  productDimensions:', withSize + '/' + models.length);
  console.log('  scenarios/usage:', withUsage + '/' + models.length);
  console.log('  power:', withPower + '/' + models.length);
  console.log('  voltage:', withVoltage + '/' + models.length);
  console.log('  material:', withMaterial + '/' + models.length);
  console.log('  nameEn (filled):', withNameEn + '/' + models.length);
  console.log('  i18n keys total:', prodTransKeys);
  console.log('    zh-CN filled:', Object.values(i18nZh).filter(function(v) { return v !== ''; }).length + '/' + prodTransKeys);
  console.log('    en filled:', Object.values(i18nEn).filter(function(v) { return v !== ''; }).length + '/' + prodTransKeys);
}

main();
