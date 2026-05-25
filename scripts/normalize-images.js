#!/usr/bin/env node
/**
 * normalize-images.js — Part 2: Rename & fix remaining image issues
 *
 * What this script does:
 * 1. Rename product files: underscores → kebab-case, fix timestamps & Chinese names
 * 2. Fix wrong references: /assets/images/central-kitchen/ → /assets/images/applications/central-kitchen/
 * 3. Fix wrong references: /assets/images/chain-restaurant/ → /assets/images/applications/chain-restaurant/
 * 4. Update image-assets.js with correct subdirectory paths
 * 5. Move logo-192.png / logo-512.png into logo/ directory
 * 6. Update product-data-table.js filePath entries
 * 7. Update .image-cache.json and image-manifest.json
 *
 * Usage: node scripts/normalize-images.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMG_ROOT = path.join(ROOT, 'src/assets/images');
const PRODUCTS_DIR = path.join(IMG_ROOT, 'products');

const DRY_RUN = process.argv.includes('--dry-run');

let renamedCount = 0;
let updatedFileCount = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[normalize] ${msg}`);
}

function gitMv(oldPath, newPath) {
  if (DRY_RUN) {
    log(`  (dry-run) git mv "${path.relative(ROOT, oldPath)}" → "${path.relative(ROOT, newPath)}"`);
  } else {
    const { execSync } = require('child_process');
    execSync(`git mv "${oldPath}" "${newPath}"`, { cwd: ROOT, stdio: 'pipe' });
    log(`  git mv ${path.relative(ROOT, oldPath)} → ${path.relative(ROOT, newPath)}`);
  }
  renamedCount++;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function writeFile(filePath, content) {
  if (DRY_RUN) {
    log(`  (dry-run) would write ${path.relative(ROOT, filePath)}`);
  } else {
    fs.writeFileSync(filePath, content, 'utf-8');
    updatedFileCount++;
  }
}

function replaceInFile(filePath, search, replace) {
  if (!fs.existsSync(filePath)) return false;
  const content = readFile(filePath);
  if (!content.includes(search)) return false;
  const newContent = content.split(search).join(replace);
  if (newContent === content) return false;
  writeFile(filePath, newContent);
  log(`  updated ${path.relative(ROOT, filePath)}: "${search.slice(0, 60)}..." → "${replace.slice(0, 60)}..."`);
  return true;
}

// Find all .html and .js files recursively
function findFiles(dir, extensions, excludeDirs = ['_backup', 'node_modules', '.git']) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (excludeDirs.includes(entry.name)) continue;
      results.push(...findFiles(path.join(dir, entry.name), extensions, excludeDirs));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

// ─── Step 1: Rename product files ──────────────────────────────────────────

function renameProductFiles() {
  log('Step 1: Renaming product files in products/');

  const files = fs.readdirSync(PRODUCTS_DIR);
  // Only rename files directly in products/ (not subdirs like products/categories/)
  const directFiles = files.filter(f => {
    const fp = path.join(PRODUCTS_DIR, f);
    return fs.statSync(fp).isFile();
  });

  // Build rename map
  const renames = {};

  for (const f of directFiles) {
    let newName = f;
    let needsRename = false;

    // 1. Fix underscore → hyphen in MODEL_N and MODEL_hires patterns
    // Pattern: keep DLB-XXXXX-NNN.webp but change DLB-XXXXX_NNN.webp
    if (/_[0-9]+\.webp$/.test(f) || /_hires\.webp$/.test(f)) {
      newName = f.replace(/_/g, '-');
      needsRename = true;
    }

    // 2. Fix B-series: B4RTD_144.webp → B4RTD-144.webp
    if (/^[A-Z0-9]+_[0-9]+\.webp$/.test(f)) {
      newName = f.replace(/_/g, '-');
      needsRename = true;
    }

    // 3. Fix Chinese filename
    if (f.includes('燃气')) {
      // DLB-GQ40_燃气：DLB-GQ40R_39.webp → DLB-GQ40-DLB-GQ40R-39.webp
      // This is a weird duplicate naming. Use the meaningful part.
      newName = f.replace(/_燃气：/, '-').replace(/_/g, '-');
      needsRename = true;
    }

    // 4. Skip timestamp-named video files that have no references (just log them)
    if (/^\d{13}-[a-z0-9]+\.mp4$/.test(f)) {
      log(`  (skip) timestamp video: ${f} (no references found)`);
      continue;
    }

    // Skip files that don't need renaming
    if (!needsRename || newName === f) continue;

    // Check for collision
    const newPath = path.join(PRODUCTS_DIR, newName);
    if (fs.existsSync(newPath) && fs.statSync(newPath).isFile()) {
      log(`  (skip) collision: ${newName} already exists`);
      continue;
    }

    renames[f] = newName;
  }

  // Execute renames
  for (const [old, newN] of Object.entries(renames)) {
    const oldPath = path.join(PRODUCTS_DIR, old);
    const newPath = path.join(PRODUCTS_DIR, newN);
    gitMv(oldPath, newPath);
  }

  return renames;
}

// ─── Step 2: Fix wrong application references ────────────────────────────────

function fixWrongAppReferences() {
  log('Step 2: Fix wrong application path references');

  const htmlFiles = findFiles(path.join(ROOT, 'src'), ['.html', '.js']);

  const fixes = [
    ['/assets/images/central-kitchen/', '/assets/images/applications/central-kitchen/'],
    ['/assets/images/chain-restaurant/', '/assets/images/applications/chain-restaurant/'],
  ];

  for (const file of htmlFiles) {
    for (const [old, nw] of fixes) {
      replaceInFile(file, old, nw);
    }
  }
}

// ─── Step 3: Update image-assets.js ─────────────────────────────────────────

function updateImageAssets() {
  log('Step 3: Updating image-assets.js');

  const filePath = path.join(ROOT, 'src/assets/js/image-assets.js');
  if (!fs.existsSync(filePath)) {
    log('  image-assets.js not found, skipping');
    return;
  }

  const content = readFile(filePath);

  const pathMap = {
    '"/logo.webp"': '"/logo/logo.webp"',
    '"/logo_dark.webp"': '"/logo/logo-dark.webp"',
    '"/workshop_bgm.webp"': '"/about/workshop-bgm.webp"',
    '"/hero_main.webp"': '"/home/hero-main.webp"',
    '"/factory_video_poster.webp"': '"/about/factory-video-poster.webp"',
    '"/factory_gallery_1.webp"': '"/about/factory-gallery-1.webp"',
    '"/factory_gallery_2.webp"': '"/about/factory-gallery-2.webp"',
    '"/factory_gallery_3.webp"': '"/about/factory-gallery-3.webp"',
    '"/factory_gallery_4.webp"': '"/about/factory-gallery-4.webp"',
    '"/cert_1.webp"': '"/certs/cert-1.webp"',
    '"/cert_2.webp"': '"/certs/cert-2.webp"',
    '"/cert_3.webp"': '"/certs/cert-3.webp"',
    '"/cert_4.webp"': '"/certs/cert-4.webp"',
    '"/cert_5.webp"': '"/certs/cert-5.webp"',
    '"/cert_6.webp"': '"/certs/cert-6.webp"',
    '"/product_compact.webp"': '"/home/product-compact.webp"',
    '"/product_professional.webp"': '"/home/product-professional.webp"',
    '"/product_industrial.webp"': '"/home/product-industrial.webp"',
  };

  let newContent = content;

  // Update IMAGE_ASSETS paths
  for (const [old, nw] of Object.entries(pathMap)) {
    newContent = newContent.split(old).join(nw);
  }

  // Update NON_PRODUCT_KEYS set
  const nonProductKeysMap = {
    '"logo_dark"': '"logo_dark"', // keep as-is, key name
    '"workshop_bgm"': '"workshop_bgm"',
    '"hero_main"': '"hero_main"',
    '"factory_video_poster"': '"factory_video_poster"',
    '"factory_gallery_1"': '"factory_gallery_1"',
    '"factory_gallery_2"': '"factory_gallery_2"',
    '"factory_gallery_3"': '"factory_gallery_3"',
    '"factory_gallery_4"': '"factory_gallery_4"',
    '"cert_1"': '"cert_1"',
    '"cert_2"': '"cert_2"',
    '"cert_3"': '"cert_3"',
    '"cert_4"': '"cert_4"',
    '"cert_5"': '"cert_5"',
    '"cert_6"': '"cert_6"',
    '"product_compact"': '"product_compact"',
    '"product_professional"': '"product_professional"',
    '"product_industrial"': '"product_industrial"',
  };
  // NON_PRODUCT_KEYS names stay the same (they're JS key identifiers)

  if (newContent !== content) {
    writeFile(filePath, newContent);
  }
}

// ─── Step 4: Move logo-192.png / logo-512.png ──────────────────────────────

function moveLogoFiles() {
  log('Step 4: Move root-level logo PNGs to logo/');

  for (const f of ['logo-192.png', 'logo-512.png']) {
    const src = path.join(IMG_ROOT, f);
    const dest = path.join(IMG_ROOT, 'logo', f);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      gitMv(src, dest);
    } else if (fs.existsSync(dest)) {
      log(`  ${f} already in logo/`);
    } else {
      log(`  ${f} not found, skipping`);
    }
  }
}

// ─── Step 5: Update product-data-table.js ──────────────────────────────────

function updateProductDataTable(productRenames) {
  log('Step 5: Updating product-data-table.js');

  const filePath = path.join(ROOT, 'src/assets/js/product-data-table.js');
  if (!fs.existsSync(filePath)) {
    log('  product-data-table.js not found, skipping');
    return;
  }

  let content = readFile(filePath);
  let changed = false;

  for (const [oldName, newName] of Object.entries(productRenames)) {
    const oldPath = `/assets/images/products/${oldName}`;
    const newPath = `/assets/images/products/${newName}`;
    if (content.includes(oldPath)) {
      content = content.split(oldPath).join(newPath);
      log(`  filePath: ${oldName} → ${newName}`);
      changed = true;
    }
  }

  if (changed) {
    writeFile(filePath, content);
  }
}

// ─── Step 6: Update .image-cache.json and image-manifest.json ───────────────

function updateManifests(productRenames) {
  log('Step 6: Updating .image-cache.json and image-manifest.json');

  // .image-cache.json
  const cachePath = path.join(IMG_ROOT, '.image-cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      const cache = JSON.parse(readFile(cachePath));
      let changed = false;
      for (const [old, nw] of Object.entries(productRenames)) {
        if (cache[old]) {
          cache[nw] = cache[old];
          delete cache[old];
          changed = true;
        }
      }
      if (changed) {
        writeFile(cachePath, JSON.stringify(cache, null, 2));
      }
    } catch (e) {
      log(`  could not parse .image-cache.json: ${e.message}`);
    }
  }

  // image-manifest.json (could be in various locations)
  const manifestPaths = [
    path.join(ROOT, 'image-manifest.json'),
    path.join(ROOT, 'src/image-manifest.json'),
    path.join(IMG_ROOT, 'image-manifest.json'),
    path.join(ROOT, 'public/images/image-manifest.json'),
  ];

  for (const mp of manifestPaths) {
    if (fs.existsSync(mp)) {
      try {
        const manifest = JSON.parse(readFile(mp));
        if (Array.isArray(manifest.images)) {
          let changed = false;
          for (let i = 0; i < manifest.images.length; i++) {
            for (const [old, nw] of Object.entries(productRenames)) {
              if (manifest.images[i] === old) {
                manifest.images[i] = nw;
                changed = true;
              }
            }
          }
          if (changed) {
            writeFile(mp, JSON.stringify(manifest, null, 2));
          }
        }
      } catch (e) {
        log(`  could not parse ${path.relative(ROOT, mp)}: ${e.message}`);
      }
    }
  }
}

// ─── Step 7: Update any remaining root-level image references in HTML/JS ────

function updateAllReferences(productRenames) {
  log('Step 7: Scanning and fixing all remaining references');

  const files = findFiles(path.join(ROOT, 'src'), ['.html', '.js']);

  for (const file of files) {
    let content;
    try {
      content = readFile(file);
    } catch {
      continue;
    }

    let changed = false;

    // Fix product renames
    for (const [old, nw] of Object.entries(productRenames)) {
      const oldRef = `/assets/images/products/${old}`;
      const newRef = `/assets/images/products/${nw}`;
      if (content.includes(oldRef)) {
        content = content.split(oldRef).join(newRef);
        changed = true;
      }
    }

    // Fix remaining root-level references
    const rootLevelFixes = [
      ['/assets/images/logo-192.png', '/assets/images/logo/logo-192.png'],
      ['/assets/images/logo-512.png', '/assets/images/logo/logo-512.png'],
    ];

    for (const [old, nw] of rootLevelFixes) {
      if (content.includes(old)) {
        content = content.split(old).join(nw);
        changed = true;
      }
    }

    if (changed) {
      writeFile(file, content);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== EXECUTING ===');
  console.log('');

  // Step 1: Rename product files
  const productRenames = renameProductFiles();
  console.log(`  Renamed ${renamedCount} files\n`);

  // Step 2: Fix wrong application references
  fixWrongAppReferences();
  console.log('');

  // Step 3: Update image-assets.js
  updateImageAssets();
  console.log('');

  // Step 4: Move logo PNGs
  moveLogoFiles();
  console.log('');

  // Step 5: Update product-data-table.js
  updateProductDataTable(productRenames);
  console.log('');

  // Step 6: Update manifests
  updateManifests(productRenames);
  console.log('');

  // Step 7: Update all remaining references
  updateAllReferences(productRenames);
  console.log('');

  // Summary
  console.log('=== Summary ===');
  console.log(`  Files renamed: ${renamedCount}`);
  console.log(`  Files updated: ${updatedFileCount}`);
  console.log(DRY_RUN ? '\nRun without --dry-run to execute.' : '\nDone.');
}

main();
