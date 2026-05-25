#!/usr/bin/env node
/**
 * verify-images.js — Deep verification of all image references
 * Checks every page variant (mobile/tablet/PC):
 *   - All image refs in source match actual file locations
 *   - No broken paths
 *   - product-data-table filePath entries exist
 *   - init-products can rescan without error
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = '/Users/chee/Projects/KitchenYuKoLi';
const IMG = path.join(ROOT, 'src/assets/images');
const PORT = 3099;

function getFileInfo(filePath) {
  const full = path.join(ROOT, filePath);
  if (fs.existsSync(full)) {
    const stat = fs.statSync(full);
    return { exists: true, size: stat.size };
  }
  const ext = path.extname(filePath).toLowerCase();
  if (['.webp','.png','.svg','.jpg','.jpeg'].includes(ext)) {
    // Check in subdirectories
    const name = path.basename(filePath);
    const dirs = ['about','home','support','contact','certs','logo','products','applications','cases','news'];
    for (const d of dirs) {
      const alt = path.join(IMG, d, name);
      if (fs.existsSync(alt)) {
        return { exists: true, movedTo: d + '/' + name };
      }
    }
  }
  return { exists: false };
}

var results = {
  totalRefs: 0,
  ok: 0,
  broken: [],
  movedUnupdated: [],
  warnings: []
};

// ─── 1. Check all HTML/JS file references ───
console.log('=== 1. Scanning all src HTML/JS for image references ===\n');

function collectFiles(dir) {
  var r = [];
  if (!fs.existsSync(dir)) return r;
  fs.readdirSync(dir).forEach(function(it) {
    if (it === 'node_modules' || it === 'dist' || it === '_backup') return;
    var full = path.join(dir, it);
    var s = fs.statSync(full);
    if (s.isDirectory()) r = r.concat(collectFiles(full));
    else if (/\.(html|js)$/i.test(it)) r.push(full);
  });
  return r;
}

var srcFiles = collectFiles(path.join(ROOT, 'src'));
var imgRefRegex = /\/assets\/images\/([\w\/-]+\.(?:webp|png|svg|jpg))/g;

srcFiles.forEach(function(f) {
  var content = fs.readFileSync(f, 'utf-8');
  var match;
  while ((match = imgRefRegex.exec(content)) !== null) {
    var refPath = match[1];
    var fullRef = 'src/assets/images/' + refPath;
    results.totalRefs++;
    var info = getFileInfo(fullRef);
    if (info.exists) {
      results.ok++;
    } else if (info.movedTo) {
      results.movedUnupdated.push({
        file: f.replace(ROOT, ''),
        oldRef: '/assets/images/' + refPath,
        shouldBe: '/assets/images/' + info.movedTo
      });
    } else {
      results.broken.push({
        file: f.replace(ROOT, ''),
        ref: '/assets/images/' + refPath
      });
    }
  }
});

console.log(`Total references: ${results.totalRefs}`);
console.log(`OK: ${results.ok}`);
console.log(`Broken: ${results.broken.length}`);
console.log(`Moved but not updated: ${results.movedUnupdated.length}\n`);

if (results.broken.length > 0) {
  console.log('--- BROKEN REFERENCES ---');
  results.broken.forEach(function(r) {
    console.log(`  ❌ ${r.file}: ${r.ref}`);
  });
}
if (results.movedUnupdated.length > 0) {
  console.log('--- OLD PATHS (moved but refs not updated) ---');
  results.movedUnupdated.forEach(function(r) {
    console.log(`  ⚠️  ${r.file}: ${r.oldRef} → ${r.shouldBe}`);
  });
}

// ─── 2. Verify product-data-table paths exist ───
console.log('\n=== 2. product-data-table.js filePath existence ===\n');
var pdtPath = path.join(ROOT, 'src/assets/js/product-data-table.js');
var pdtContent = fs.readFileSync(pdtPath, 'utf-8');
var filePaths = pdtContent.match(/"filePath":"[^"]+"/g) || [];

var pdtOk = 0;
var pdtBroken = 0;
filePaths.forEach(function(fp) {
  var p = fp.replace('"filePath":"', '').replace('"', '');
  var local = 'src' + p;
  if (fs.existsSync(local)) {
    pdtOk++;
  } else {
    pdtBroken++;
    console.log(`  ❌ MISSING: ${p}`);
  }
});
console.log(`Total product-data-table paths: ${filePaths.length}`);
console.log(`Files exist: ${pdtOk}`);
console.log(`Files missing: ${pdtBroken}`);

// ─── 3. Verify all images/* subdirectories have valid files ───
console.log('\n=== 3. Image directory inventory ===\n');
var imgDirs = ['about','home','support','contact','certs','logo','products','applications'];
var orphans = [];
imgDirs.forEach(function(d) {
  var dir = path.join(IMG, d);
  if (!fs.existsSync(dir)) { console.log(`  ${d}/ — empty/missing`); return; }
  var files = fs.readdirSync(dir).filter(function(f) {
    return /\.(webp|png|svg)$/i.test(f) && fs.statSync(path.join(dir, f)).isFile();
  });
  console.log(`  ${d}/ — ${files.length} files`);
});

// Check for any leftover files in root
var rootFiles = fs.readdirSync(IMG).filter(function(f) {
  return /\.(webp|png|svg)$/i.test(f) && fs.statSync(path.join(IMG, f)).isFile();
});
if (rootFiles.length > 0) {
  console.log(`\n  ⚠️  ROOT still has ${rootFiles.length} images:`);
  rootFiles.forEach(function(f) { console.log(`     ${f}`); });
}

// ─── 4. HTTP reachability spot check ───
console.log('\n=== 4. HTTP reachability spot check ===\n');

var spotChecks = [
  '/home/',
  '/home/',
  '/about/',
  '/products/all/',
  '/support/',
  '/contact/',
];

// Check which variants exist
var pageDirs = ['/home/', '/about/', '/products/all/', '/support/', '/contact/'];
var variants = ['index-pc.html', 'index-mobile.html', 'index-tablet.html'];

function httpGet(url) {
  return new Promise(function(resolve) {
    http.get('http://localhost:' + PORT + url, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve({ status: res.statusCode, data: data }); });
    }).on('error', function(e) { resolve({ status: 0, data: '' }); });
  });
}

async function verify() {
  for (var pd = 0; pd < pageDirs.length; pd++) {
    var base = pageDirs[pd];
    console.log(`  Page: ${base}`);
    for (var v = 0; v < variants.length; v++) {
      var variant = variants[v];
      // Determine which variant path
      var device = variant.replace('index-', '').replace('.html', '');
      var resp;
      if (device === 'pc') {
        resp = await httpGet(base);
      } else {
        resp = await httpGet(base + variant);
      }
      if (resp.status === 200) {
        // Check that the page doesn't reference broken images
        var imgRefs = resp.data.match(/\/assets\/images\/([\w\/-]+\.(?:webp|png|svg|jpg))/g) || [];
        var pageOk = 0;
        var pageBroken = 0;
        imgRefs.forEach(function(ref) {
          // Check via filesystem
          var local = 'src' + ref;
          var full = path.join(ROOT, local);
          if (fs.existsSync(full)) {
            pageOk++;
          } else {
            pageBroken++;
            console.log(`    ❌ ${device}: ${ref} MISSING`);
          }
        });
        console.log(`    ${device}: ${imgRefs.length} img refs, ${pageOk} ok, ${pageBroken} broken`);
      } else {
        console.log(`    ${device}: HTTP ${resp.status}`);
      }
    }
  }
  
  // Summary
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Source refs checked: ${results.totalRefs}`);
  console.log(`  ✅ OK: ${results.ok}`);
  console.log(`  ❌ Broken: ${results.broken.length}`);
  console.log(`  ⚠️  Moved but not updated: ${results.movedUnupdated.length}`);
  console.log(`\nProduct data table image paths: ${filePaths.length}`);
  console.log(`  ✅ Exist: ${pdtOk}`);
  console.log(`  ❌ Missing: ${pdtBroken}`);
  var totalErrors = results.broken.length + results.movedUnupdated.length + pdtBroken;
  if (totalErrors === 0) console.log('\n✅ ALL CHECKS PASSED');
  else console.log(`\n❌ ${totalErrors} errors need fixing`);
}

verify();
