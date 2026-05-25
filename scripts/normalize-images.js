#!/usr/bin/env node
/**
 * normalize-images.js
 * 
 * Phase 1: Analyze all non-standard image locations
 * Phase 2: Build migration map
 * Phase 3: Move files + update all references
 * Phase 4: Verify
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/Users/chee/Projects/KitchenYuKoLi';
const IMG = path.join(ROOT, 'src/assets/images');

// ─── Helpers ───
function ls(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => !fs.statSync(path.join(dir, f)).isDirectory());
}
function allFiles(dir) {
  let result = [];
  if (!fs.existsSync(dir)) return result;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== '_backup') result = result.concat(allFiles(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

// ─── Phase 1: Scan root images ───
const rootImages = ls(IMG).filter(f => /\.(webp|png|svg|jpg|jpeg)$/i.test(f));
const products = ls(path.join(IMG, 'products')).filter(f => /\.(webp|png)$/i.test(f));
const homeDir = ls(path.join(IMG, 'home')).filter(f => /\.(webp|png)$/i.test(f));
const aboutDir = ls(path.join(IMG, 'about')).filter(f => /\.(webp|png)$/i.test(f));
const certsDir = ls(path.join(IMG, 'certs')).filter(f => /\.(webp|png)$/i.test(f));
const supportDir = ls(path.join(IMG, 'support')).filter(f => /\.(webp|png)$/i.test(f));

console.log('=== Phase 1: Analysis ===');
console.log(`Root images: ${rootImages.length}`);
console.log(`products/: ${products.length}`);
console.log(`home/: ${homeDir.length}`);
console.log(`about/: ${aboutDir.length}`);
console.log(`certs/: ${certsDir.length}`);
console.log(`support/: ${supportDir.length}`);

// Categorize root images
const productRootImgs = rootImages.filter(f => /^[a-z]+_\d+_1\./.test(f) || /^esl_/.test(f) || /^[b-gj-lm-t-yz]\d/.test(f));
const pageRootImgs = rootImages.filter(f => /^about-|^contact-|^support-|^factory_|^hero_|^cert_|^og-|^product_|^wechat|^workshop|^default/.test(f));
const specialImgs = rootImages.filter(f => /^logo|^world-map/.test(f));
const unknownImgs = rootImages.filter(f => !productRootImgs.includes(f) && !pageRootImgs.includes(f) && !specialImgs.includes(f));

console.log(`\nCategorization:`);
console.log(`  Products (belongs in products/): ${productRootImgs.length}`);
console.log(`  Pages (belongs in about/home/support/etc): ${pageRootImgs.length}`);
console.log(`  Special (logo, etc): ${specialImgs.length}`);
console.log(`  Unknown: ${unknownImgs.length}`);
if (unknownImgs.length > 0) {
  console.log(`  Unknown files: ${unknownImgs.slice(0,10).join(', ')}`);
}

// ─── Phase 1b: Find all references in source files ───
console.log(`\n=== Scanning for image references in HTML/JS ===`);

const refs = {};

function findRefs(filePath) {
  const ext = path.extname(filePath);
  if (!['.html', '.js'].includes(ext)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  // Find /assets/images/xxx patterns (no subdirectory before .webp/.png)
  const regex = /\/assets\/images\/([\w-]+\.(?:webp|png|svg|jpg))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const fn = match[1];
    if (!refs[fn]) refs[fn] = [];
    refs[fn].push(filePath.replace(ROOT, ''));
  }
}

const srcFiles = allFiles(path.join(ROOT, 'src')).filter(f => /\.(html|js)$/i.test(f));
for (const f of srcFiles) findRefs(f);

console.log(`Referenced files with /assets/images/ direct:`);
const refKeys = Object.keys(refs);
refKeys.sort().forEach(fn => {
  const count = refs[fn].length;
  const samples = refs[fn].slice(0,3).map(p => p.substring(0,60)).join(', ');
  console.log(`  ${fn.padEnd(35)} ${count} refs`);
});

// Also check root-referenced images to find files referenced from products/ prefix
console.log(`\n=== Check for products/ prefix references ===`);
const prodRefRegex = /\/assets\/images\/products\/([\w-]+\.(?:webp|png|svg|jpg))/g;
const prodRefs = {};
for (const f of srcFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  let m;
  while ((m = prodRefRegex.exec(content)) !== null) {
    if (!prodRefs[m[1]]) prodRefs[m[1]] = [];
    prodRefs[m[1]].push(f.replace(ROOT, ''));
  }
}
Object.keys(prodRefs).sort().forEach(fn => {
  console.log(`  ${fn.padEnd(35)} ${prodRefs[fn].length} refs`);
});

// Read product-data-table.js to check its filePaths
console.log(`\n=== product-data-table.js filePath check ===`);
const pdtPath = path.join(ROOT, 'src/assets/js/product-data-table.js');
if (fs.existsSync(pdtPath)) {
  const pdt = fs.readFileSync(pdtPath, 'utf-8');
  const fpMatches = pdt.match(/"filePath":"([^"]+)"/g);
  if (fpMatches) {
    const unique = new Set(fpMatches);
    console.log(`Total filePath entries: ${fpMatches.length}, unique: ${unique.size}`);
    const samplePaths = [...unique].slice(0,5);
    samplePaths.forEach(p => console.log(`  ${p}`));
  }
}

// Check init-products.js for path logic
console.log(`\n=== init-products.js path logic check ===`);
const initPath = path.join(ROOT, 'scripts/init-products.js');
if (fs.existsSync(initPath)) {
  const init = fs.readFileSync(initPath, 'utf-8');
  const imgLines = init.split('\n').filter(l => l.includes('image') || l.includes('Image') || l.includes('assets/images') || l.includes('filePath') || l.includes('scanProduct'));
  imgLines.forEach(l => console.log(`  ${l.trim()}`));
}

console.log(`\n=== Phase 1 Complete ===`);
console.log(`Total root images to migrate: ${productRootImgs.length + pageRootImgs.length}`);
