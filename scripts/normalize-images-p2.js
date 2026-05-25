#!/usr/bin/env node
/**
 * normalize-images.js - Phase 2 & 3: Execute migration
 * 
 * Strategy:
 * - Root product images (esl_*.webp, etc): NOT referenced by HTML/JS.
 *   Delete them. They're duplicates of what's already in products/.
 * - Page images: Move to subdirectories, update all references.
 * - product-data-table.js: Already points to products/. No change needed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/Users/chee/Projects/KitchenYuKoLi';
const IMG = path.join(ROOT, 'src/assets/images');

const HTML_DIR = path.join(ROOT, 'src/pages');
const JS_DIR = path.join(ROOT, 'src/assets/js');

// ─── Utilities ───
function rel(file) { return file.replace(ROOT, ''); }

function mv(src, dest) {
  if (!fs.existsSync(src)) { console.log(`  SKIP (missing): ${rel(src)}`); return false; }
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  try {
    execSync(`git mv "${src}" "${dest}"`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`  MOVED: ${rel(src)} → ${rel(dest)}`);
    return true;
  } catch(e) {
    // Fallback: regular mv then git add
    try { execSync(`mv "${src}" "${dest}"`, { stdio: 'pipe' }); } catch(e2) {}
    try { execSync(`git add "${dest}"`, { stdio: 'pipe' }); } catch(e3) {}
    console.log(`  MOVED (non-git): ${rel(src)} → ${rel(dest)}`);
    return true;
  }
}

function rm(file) {
  if (!fs.existsSync(file)) { return; }
  try {
    execSync(`git rm --cached "${file}" 2>/dev/null`, { cwd: ROOT, stdio: 'pipe' });
    fs.unlinkSync(file);
    console.log(`  REMOVED (from git): ${rel(file)}`);
  } catch(e) {
    try { fs.unlinkSync(file); console.log(`  REMOVED: ${rel(file)}`); } catch(e2) {}
  }
}

function replaceRef(file, from, to) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) return 0;
  let content = fs.readFileSync(fullPath, 'utf-8');
  const count = (content.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 0) {
    content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
    fs.writeFileSync(fullPath, content);
    console.log(`  UPDATED ${count}x in ${file}: ${from} → ${to}`);
  }
  return count;
}

function replaceGlob(pattern, from, to) {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && item !== 'node_modules' && item !== 'dist') walk(full);
      else if (stat.isFile() && /\.(html|js)$/i.test(item)) files.push(full);
    }
  }
  walk(pattern);
  let total = 0;
  for (const f of files) {
    const relPath = rel(f);
    total += replaceRef(relPath, from, to);
  }
  return total;
}

// ═══════════════════════════════════════════════
// Phase 2: Build migration map
// ═══════════════════════════════════════════════

// Map: old root filename → new subdirectory path
const pageMigrations = {
  // About
  'about-factory-bg.webp':    'about/factory-bg.webp',
  'about-hero.webp':          'about/hero.webp',
  'about-story-rd.webp':      'about/story-rd.webp',
  'factory_gallery_1.webp':   'about/factory-gallery-1.webp',
  'factory_gallery_2.webp':   'about/factory-gallery-2.webp',
  'factory_gallery_3.webp':   'about/factory-gallery-3.webp',
  'factory_gallery_4.webp':   'about/factory-gallery-4.webp',
  'factory_video_poster.webp':'about/factory-video-poster.webp',
  'wechat-qr.webp':           'about/wechat-qr.webp',
  'workshop_bgm.webp':        'about/workshop-bgm.webp',
  'world-map.svg':            'about/world-map.svg',
  
  // Contact
  'contact-factory-bg.webp':  'contact/factory-bg.webp',
  'contact-hero.webp':        'contact/hero.webp',
  'contact-partner-tour.webp':'contact/partner-tour.webp',
  'contact-partner.webp':     'contact/partner.webp',
  'contact-product-robot.webp':'contact/product-robot.webp',
  'contact-quality-control.webp':'contact/quality-control.webp',
  
  // Home
  'hero_main.webp':           'home/hero-main.webp',
  'og-home.webp':             'home/og-image.webp',
  'product_compact.webp':     'home/product-compact.webp',
  'product_industrial.webp':  'home/product-industrial.webp',
  'product_professional.webp':'home/product-professional.webp',
  
  // Support
  'support-hero-engineer.webp':    'support/hero-engineer.webp',
  'support-hero-faq.webp':         'support/hero-faq.webp',
  'support-hero-overview.webp':    'support/hero-overview.webp',
  'support-hero-spare-parts.webp': 'support/hero-spare-parts.webp',
  'support-hero-training.webp':    'support/hero-training.webp',
  'support-hero-warranty.webp':    'support/hero-warranty.webp',
  'support-install-hero.webp':     'support/install-hero.webp',
  'support-service-engineer.webp': 'support/service-engineer.webp',
  
  // Certs
  'cert_1.webp':  'certs/cert-1.webp',
  'cert_2.webp':  'certs/cert-2.webp',
  'cert_3.webp':  'certs/cert-3.webp',
  'cert_4.webp':  'certs/cert-4.webp',
  'cert_5.webp':  'certs/cert-5.webp',
  'cert_6.webp':  'certs/cert-6.webp',
  
  // Logo
  'logo.webp':    'logo/logo.webp',
  'logo_dark.webp':'logo/logo-dark.webp',
  
  // Products default
  'default.webp': 'products/default.webp',
};

// Product images in root (not referenced by code, duplicates of products/)
const productRootFiles = [
  'b1rac_1.webp','b4rtd_1.webp','b6rbd_1.webp','b8rbd_1.webp',
  'esl_4bq30_1.webp','esl_4qbq30_1.webp','esl_bq40t_1.webp','esl_bxc800_1.webp',
  'esl_gb50_1.webp','esl_gb60_1.webp','esl_gb70_1.webp','esl_gb80_1.webp','esl_gb90_1.webp',
  'esl_gc50_1.webp','esl_gc60_1.webp','esl_gc70_1.webp','esl_gc80_1.webp','esl_gc90_1.webp',
  'esl_gd30_1.webp','esl_gd369_1.webp','esl_gd36_1.webp',
  'esl_gq30_1.webp','esl_gq30j_1.webp','esl_gq30t_1.webp','esl_gq35t_1.webp',
  'esl_gq36_1.webp','esl_gq36j9_1.webp','esl_gq40_1.webp',
  'esl_gq50_1.webp','esl_gq60_1.webp','esl_gq70_1.webp','esl_gq80_1.webp','esl_gq90_1.webp',
  'esl_pzj100_1.webp','esl_pzj120_1.webp','esl_pzj200_1.webp','esl_pzj300_1.webp','esl_pzj400_1.webp','esl_pzj80_1.webp',
  'esl_qxc100_1.webp','esl_qxc120_1.webp','esl_qxc80_1.webp',
  'esl_tbq30_1.webp','esl_tbs30_1.webp','esl_tbs40_1.webp','esl_tbs50_1.webp',
  'esl_tgd30_1.webp','esl_tgd369_1.webp','esl_tgd36_1.webp',
  'esl_tgq30_1.webp','esl_tgq30j_1.webp','esl_tgq36j9_1.webp','esl_tgq36j_1.webp',
  'esl_tgq40_1.webp','esl_tgq40j_1.webp','esl_tgs30_1.webp','esl_tqbq30_1.webp','esl_tzs40_1.webp',
  'esl_xc100_1.webp','esl_xc120_1.webp','esl_xc80_1.webp',
  'f32f1c_1.webp','g26d1a_1.webp','g26d1r_1.webp','g26daa_1.webp','g26dar_1.webp',
  'g30d1a_1.webp','g30d1r_1.webp','g30d1t_1.webp','g30daa_1.webp','g30dag_1.webp','g30dar_1.webp','g30e1a_1.webp',
  'g36d1a_1.webp','g36d1r_1.webp','g36daa_1.webp','g36dar_1.webp',
  'g50aab_1.webp','g50aac_1.webp','g50gat_1.webp','g60eac_1.webp','g60eas_1.webp',
  'g70eac_1.webp','g70eas_1.webp','gt2d1b_1.webp',
  'j100bab_1.webp','j40_1.webp','j40cba5_1.webp','jz2ca_1.webp',
  'lz80d1b_1.webp','m3dad_1.webp','m4dad_p1_1.webp','m4dad_p2_1.webp',
  'm6dad_1.webp','m6dbd_1.webp','m6rad_1.webp',
  't21b_1.webp','y12d1c_1.webp','y12d2c_1.webp','y24c1c_1.webp','y40d2c_1.webp','y50d1c_1.webp',
  'z6fdb_1.webp','z8fcb_1.webp',
];

// Timestamp-named files in products/
const timestampFiles = [
  '1776770021777-859b3w.webp','1776770221398-mwl8vp.webp',
  '1776771332325-5qok3c.webp','1776771616119-mmvs61.webp',
  '1776829094775-fr0z7s.webp','1776837263148-oit2a1.webp',
];

// ═══════════════════════════════════════════════
// Phase 3: Execute
// ═══════════════════════════════════════════════

console.log('=== Phase 3: Execute Migration ===\n');

// Step 3a: Update reference paths in all HTML/JS files
console.log('--- 3a: Updating references in HTML/JS ---');
let totalRefUpdates = 0;

for (const [oldFile, newPath] of Object.entries(pageMigrations)) {
  const oldRef = `/assets/images/${oldFile}`;
  const newRef = `/assets/images/${newPath}`;
  
  // Update in all src files
  const count = replaceGlob(IMG, oldRef, newRef);
  totalRefUpdates += count;
  if (count > 0) console.log(`  ✓ ${oldRef} → ${newRef} (${count} refs)`);
}

console.log(`\nTotal reference updates: ${totalRefUpdates}`);

// Step 3b: Move files
console.log('\n--- 3b: Moving files ---');

for (const [oldFile, newPath] of Object.entries(pageMigrations)) {
  const src = path.join(IMG, oldFile);
  const dest = path.join(IMG, newPath);
  mv(src, dest);
}

// Step 3c: Remove orphan product images from root
console.log('\n--- 3c: Removing root product duplicates ---');
let removedCount = 0;
for (const f of productRootFiles) {
  const full = path.join(IMG, f);
  if (fs.existsSync(full)) {
    rm(full);
    removedCount++;
  }
}
console.log(`  Removed ${removedCount} root product duplicates`);

// Also remove timestamp files
console.log('\n--- 3d: Removing timestamp-named orphan files ---');
for (const f of timestampFiles) {
  const full = path.join(IMG, 'products', f);
  if (fs.existsSync(full)) {
    rm(full);
    console.log(`  REMOVED: products/${f}`);
    removedCount++;
  }
}

// Step 3e: Remove other orphan root images  
console.log('\n--- 3e: Removing remaining orphan root images ---');
const orphanRoot = ['image-manifest.json'];
for (const f of orphanRoot) {
  const full = path.join(IMG, f);
  if (fs.existsSync(full)) {
    rm(full);
    console.log(`  REMOVED: ${f}`);
  }
}

console.log('\n=== Migration complete! ===');
console.log(`Total files moved: ${Object.keys(pageMigrations).length}`);
console.log(`Total files removed: ${removedCount}`);
console.log(`Total reference updates: ${totalRefUpdates}`);
