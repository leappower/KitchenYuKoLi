#!/usr/bin/env node
/**
 * Auto-fill product data gaps by inference
 * 
 * What we fill:
 * 1. USAGE — inherit from sibling products in the same subCategory
 * 2. POWER — infer from model type / name patterns
 * 3. VOLTAGE — standardize: induction→380V, gas→220V for controls, small devices→220V
 * 4. MATERIAL — inherit from same subCategory majority value
 * 5. SPECIFICATIONS — for cutting equipment, generate from model type
 * 6. productDimensions — fill from model/name where known
 * 7. subCategory — infer from category for gaps
 */
'use strict';

var fs = require('fs');
var content = fs.readFileSync('src/assets/js/product-data-table.js', 'utf-8');
var data = eval('(' + content.slice(content.indexOf('['), content.lastIndexOf(']')+1) + ')');

var stats = { filled: {} };

// ─── Helper: get majority value from sibling products ───
function majorityField(products, field, filterFn) {
  var counts = {};
  products.forEach(function(p) {
    if (filterFn && !filterFn(p)) return;
    var v = p[field];
    if (v && String(v).trim().length > 3 && String(v).trim().length < 200) {
      var key = String(v).trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  var best = '';
  var bestCount = 0;
  Object.keys(counts).forEach(function(k) {
    if (counts[k] > bestCount) { bestCount = counts[k]; best = k; }
  });
  return best;
}

function initStats(key) { if (!stats.filled[key]) stats.filled[key] = 0; }

// ════════════════════════════════════════════════════
// 1. FILL USAGE from sibling subCategory products
// ════════════════════════════════════════════════════
console.log('=== Filling USAGE ===');
initStats('usage');

var hasUsage = data.filter(function(p){ return p.usage && p.usage.trim(); });
var usageBySubcat = {};
hasUsage.forEach(function(p) {
  var sc = p.subCategory || 'unknown';
  if (!usageBySubcat[sc]) usageBySubcat[sc] = [];
  usageBySubcat[sc].push(p.usage);
});

data.forEach(function(p) {
  if (p.usage && p.usage.trim()) return;
  var sc = p.subCategory || 'unknown';
  var candidates = usageBySubcat[sc];
  if (candidates && candidates.length) {
    p.usage = candidates[0];
    p.scenarios = candidates[0];
    p.usageEn = ''; // clear — will regenerate from en-product.json later
    stats.filled.usage++;
  }
});

console.log('  Filled: ' + stats.filled.usage + '/' + data.filter(function(p){ return !p.usage; }).length + ' remaining');

// ════════════════════════════════════════════════════
// 2. FILL POWER from model naming and sibling products
// ════════════════════════════════════════════════════
console.log('\n=== Filling POWER ===');
initStats('power');
data.forEach(function(p) {
  if (p.power && p.power.trim()) return;
  var model = p.model || '';
  var name = p.name || '';
  
  // Infer from similar models in same subCategory
  var sc = p.subCategory || 'unknown';
  var scProducts = data.filter(function(x){ return x.subCategory === sc && x.power && x.power.trim(); });
  var majorityPower = majorityField(scProducts, 'power');
  
  if (majorityPower) {
    p.power = majorityPower;
    stats.filled.power++;
    return;
  }
  
  // Gas burners: no power needed (or just control power 220V is enough)
  if (model.indexOf('B') === 0 && name.indexOf('燃气') >= 0) {
    p.power = '0.5kW';
    stats.filled.power++;
    return;
  }
  
  // Steamer
  if (model.indexOf('Z') === 0 && (name.indexOf('蒸饭') >= 0)) {
    p.power = '12kW';
    stats.filled.power++;
    return;
  }
  
  // Cutting equipment: small motor
  if (model.indexOf('HK') === 0) {
    p.power = '1.5kW';
    stats.filled.power++;
    return;
  }
});

console.log('  Filled: ' + stats.filled.power + '/' + data.filter(function(p){ return !p.power; }).length + ' remaining');

// ════════════════════════════════════════════════════
// 3. FILL VOLTAGE with standardization
// ════════════════════════════════════════════════════
console.log('\n=== Filling VOLTAGE ===');
initStats('voltage');

// First, normalize existing messy voltage values
data.forEach(function(p) {
  if (!p.voltage) return;
  var v = String(p.voltage).trim();
  if (/^[23]80V?/.test(v)) { p.voltage = '380V'; }
  else if (/^[^2]?220[vV]?$/.test(v)) { p.voltage = '220V'; }
  else if (/^220V/.test(v)) { p.voltage = '220V'; }
  // keep complex values like 220V/380V as-is
});

data.forEach(function(p) {
  if (p.voltage && p.voltage.trim()) return;
  var model = p.model || '';
  var name = p.name || '';
  
  // Try sibling
  var sc = p.subCategory || 'unknown';
  var scProducts = data.filter(function(x){ return x.subCategory === sc && x.voltage && x.voltage.trim(); });
  var majorityVoltage = majorityField(scProducts, 'voltage');
  
  if (majorityVoltage) {
    p.voltage = majorityVoltage;
    stats.filled.voltage++;
    return;
  }
  
  // Induction drum cookers → 380V
  if (name.indexOf('电磁') >= 0 || model.match(/[AG]C$/) || (model.indexOf('A') >= 0 && model.indexOf('R') < 0 && model.indexOf('S') < 0)) {
    p.voltage = '380V';
    stats.filled.voltage++;
    return;
  }
  
  // Gas models → 220V (for controls)
  if (name.indexOf('燃气') >= 0 || model.indexOf('R') >= 0 || model.indexOf('S') >= 0 || model.indexOf('T') >= 0) {
    p.voltage = '220V';
    stats.filled.voltage++;
    return;
  }
  
  // Cutting equipment → 220V
  if (model.indexOf('HK') === 0) {
    p.voltage = '220V';
    stats.filled.voltage++;
    return;
  }
});

console.log('  Filled: ' + stats.filled.voltage + '/' + data.filter(function(p){ return !p.voltage; }).length + ' remaining');
console.log('  Normalized voltage values:');
var vSet = {};
data.forEach(function(p){ if (p.voltage) vSet[p.voltage] = (vSet[p.voltage]||0)+1; });
Object.keys(vSet).sort().forEach(function(v){ console.log('    ' + v + ': ' + vSet[v]); });

// ════════════════════════════════════════════════════
// 4. FILL MATERIAL from same subCategory majority
// ════════════════════════════════════════════════════
console.log('\n=== Filling MATERIAL ===');
initStats('material');
data.forEach(function(p) {
  if (p.material && p.material.trim()) return;
  var sc = p.subCategory || 'unknown';
  var cat = p.category || 'unknown';
  var scProducts = data.filter(function(x){ return (x.subCategory === sc || x.category === cat) && x.material && x.material.trim(); });
  var majorityMat = majorityField(scProducts, 'material');
  
  if (majorityMat) {
    p.material = majorityMat;
    stats.filled.material++;
    return;
  }
});

console.log('  Filled: ' + stats.filled.material + '/' + data.filter(function(p){ return !p.material; }).length + ' remaining');

// ════════════════════════════════════════════════════
// 5. FILL SPECIFICATIONS for cutting (& other missing)
// ════════════════════════════════════════════════════
console.log('\n=== Filling SPECIFICATIONS ===');
initStats('specifications');
data.forEach(function(p) {
  if (p.specifications && p.specifications.trim()) return;
  var name = p.name || '';
  var model = p.model || '';
  
  // Cutters
  if (model.indexOf('HK') === 0) {
    if (name.indexOf('切片机') >= 0) {
      p.specifications = '适用于鲜肉切片；材质：不锈钢；电机功率：1.5kW；电压：220V';
      p.specificationsEn = ''; // clear for regen
    } else if (name.indexOf('切条机') >= 0) {
      p.specifications = '适用于鲜肉切条；材质：不锈钢；电机功率：1.5kW；电压：220V';
      p.specificationsEn = '';
    } else if (name.indexOf('切丁机') >= 0) {
      p.specifications = '适用于冻肉切丁；材质：不锈钢；电机功率：1.5kW；电压：220V';
      p.specificationsEn = '';
    } else if (name.indexOf('切花斜切机') >= 0) {
      p.specifications = '适用于自动切花斜切；材质：不锈钢；电机功率：1.5kW；电压：220V';
      p.specificationsEn = '';
    } else if (name.indexOf('锯骨机') >= 0) {
      p.specifications = '适用于锯骨；材质：不锈钢；电机功率：1.5kW；电压：220V；产品尺寸：660*620*1650mm';
      p.specificationsEn = '';
      if (!p.productDimensions) p.productDimensions = '660*620*1650';
    } else if (name.indexOf('猪蹄分半机') >= 0) {
      p.specifications = '适用于猪蹄分半；材质：不锈钢；电机功率：1.5kW；电压：220V；产品尺寸：800*600*1200mm';
      p.specificationsEn = '';
      if (!p.productDimensions) p.productDimensions = '800*600*1200';
    } else if (name.indexOf('熟肉切片') >= 0) {
      p.specifications = '适用于熟肉切片；材质：不锈钢；电机功率：1.5kW；电压：220V';
      p.specificationsEn = '';
    } else {
      p.specifications = '材质：不锈钢；电机功率：1.5kW；电压：220V';
      p.specificationsEn = '';
    }
    stats.filled.specifications++;
  }
});

// Also fill productDimensions for the 2 missing
data.forEach(function(p) {
  if (!p.productDimensions || !p.productDimensions.trim()) {
    if (p.model === 'HKJGJ380-VI') {
      p.productDimensions = '660*620*1650';
    } else if (p.model === 'HKFBJ') {
      p.productDimensions = '800*600*1200';
    }
  }
});

console.log('  Filled: ' + stats.filled.specifications + '/' + data.filter(function(p){ return !p.specifications; }).length + ' remaining');

// ════════════════════════════════════════════════════
// 6. FILL subCategory gap
// ════════════════════════════════════════════════════
console.log('\n=== FILLING subCategory gap ===');
var noSubcat = data.filter(function(p){ return !p.subCategory || !p.subCategory.trim(); });
noSubcat.forEach(function(p) {
  if (p.name.indexOf('炒锅') >= 0 && p.category === '翻炒系列') {
    p.subCategory = '搅拌炒菜机';
    console.log('  ' + p.model + ' → ' + p.subCategory);
  }
});
console.log('  Remaining missing subCategory: ' + data.filter(function(p){ return !p.subCategory; }).length);

// ════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════
console.log('\n=== SUMMARY ===');
var fields = ['usage','power','voltage','material','specifications','subCategory'];
fields.forEach(function(f) {
  var before = Object.keys(stats.filled).indexOf(f) >= 0 ? 'auto-filled' : 'pre-existing';
  var now = data.filter(function(p){ return p[f] && String(p[f]).trim(); }).length;
  console.log('  ' + f + ': ' + now + '/' + data.length + ' (' + (now/data.length*100).toFixed(1) + '%)');
});

// ─── Write back ───
var jsContent = [
  '// Product Data Table — Auto-generated by scripts/init-products.js',
  '// DO NOT EDIT MANUALLY',
  '// Generated: ' + new Date().toISOString(),
  'window.PRODUCT_DATA_TABLE = ' + JSON.stringify(data, null, 2) + ';',
  'window.PRODUCT_DATA_VERSION = "' + Date.now() + '";',
  ''
].join('\n');

fs.writeFileSync('src/assets/js/product-data-table.js', jsContent, 'utf-8');
console.log('\nWritten product-data-table.js');
