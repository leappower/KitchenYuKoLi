#!/usr/bin/env node
/**
 * normalize-references.js
 * Update all HTML/JS references to moved images
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/Users/chee/Projects/KitchenYuKoLi';

const migrations = {
  // About
  '/assets/images/about-hero.webp': '/assets/images/about/hero.webp',
  '/assets/images/about-factory-bg.webp': '/assets/images/about/factory-bg.webp',
  '/assets/images/about-story-rd.webp': '/assets/images/about/story-rd.webp',
  '/assets/images/factory_gallery_1.webp': '/assets/images/about/factory-gallery-1.webp',
  '/assets/images/factory_gallery_2.webp': '/assets/images/about/factory-gallery-2.webp',
  '/assets/images/factory_gallery_3.webp': '/assets/images/about/factory-gallery-3.webp',
  '/assets/images/factory_gallery_4.webp': '/assets/images/about/factory-gallery-4.webp',
  '/assets/images/factory_video_poster.webp': '/assets/images/about/factory-video-poster.webp',
  '/assets/images/wechat-qr.webp': '/assets/images/about/wechat-qr.webp',
  '/assets/images/workshop_bgm.webp': '/assets/images/about/workshop-bgm.webp',
  '/assets/images/world-map.svg': '/assets/images/about/world-map.svg',
  // Contact
  '/assets/images/contact-factory-bg.webp': '/assets/images/contact/factory-bg.webp',
  '/assets/images/contact-hero.webp': '/assets/images/contact/hero.webp',
  '/assets/images/contact-partner-tour.webp': '/assets/images/contact/partner-tour.webp',
  '/assets/images/contact-partner.webp': '/assets/images/contact/partner.webp',
  '/assets/images/contact-product-robot.webp': '/assets/images/contact/product-robot.webp',
  '/assets/images/contact-quality-control.webp': '/assets/images/contact/quality-control.webp',
  // Home
  '/assets/images/hero_main.webp': '/assets/images/home/hero-main.webp',
  '/assets/images/og-home.webp': '/assets/images/home/og-image.webp',
  '/assets/images/product_compact.webp': '/assets/images/home/product-compact.webp',
  '/assets/images/product_industrial.webp': '/assets/images/home/product-industrial.webp',
  '/assets/images/product_professional.webp': '/assets/images/home/product-professional.webp',
  // Support
  '/assets/images/support-hero-engineer.webp': '/assets/images/support/hero-engineer.webp',
  '/assets/images/support-hero-faq.webp': '/assets/images/support/hero-faq.webp',
  '/assets/images/support-hero-overview.webp': '/assets/images/support/hero-overview.webp',
  '/assets/images/support-hero-spare-parts.webp': '/assets/images/support/hero-spare-parts.webp',
  '/assets/images/support-hero-training.webp': '/assets/images/support/hero-training.webp',
  '/assets/images/support-hero-warranty.webp': '/assets/images/support/hero-warranty.webp',
  '/assets/images/support-install-hero.webp': '/assets/images/support/install-hero.webp',
  '/assets/images/support-service-engineer.webp': '/assets/images/support/service-engineer.webp',
  // Certs
  '/assets/images/cert_1.webp': '/assets/images/certs/cert-1.webp',
  '/assets/images/cert_2.webp': '/assets/images/certs/cert-2.webp',
  '/assets/images/cert_3.webp': '/assets/images/certs/cert-3.webp',
  '/assets/images/cert_4.webp': '/assets/images/certs/cert-4.webp',
  '/assets/images/cert_5.webp': '/assets/images/certs/cert-5.webp',
  '/assets/images/cert_6.webp': '/assets/images/certs/cert-6.webp',
  // Logo
  '/assets/images/logo.webp': '/assets/images/logo/logo.webp',
  '/assets/images/logo_dark.webp': '/assets/images/logo/logo-dark.webp',
  // Default
  '/assets/images/default.webp': '/assets/images/products/default.webp',
};

// Collect all .html and .js files in src/
function collectFiles(dir) {
  var results = [];
  if (!fs.existsSync(dir)) return results;
  var items = fs.readdirSync(dir);
  for (var i = 0; i < items.length; i++) {
    if (items[i] === 'node_modules' || items[i] === 'dist') continue;
    var full = path.join(dir, items[i]);
    var stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(collectFiles(full));
    } else if (/\.(html|js)$/i.test(items[i])) {
      results.push(full);
    }
  }
  return results;
}

var srcFiles = collectFiles(path.join(ROOT, 'src'));
console.log('Total source files to scan:', srcFiles.length);

var totalChanges = 0;
var totalFilesChanged = 0;

for (var fi = 0; fi < srcFiles.length; fi++) {
  var f = srcFiles[fi];
  var content = fs.readFileSync(f, 'utf-8');
  var changed = false;
  
  for (var old in migrations) {
    var idx;
    var c = 0;
    while ((idx = content.indexOf(old)) !== -1) {
      content = content.substring(0, idx) + migrations[old] + content.substring(idx + old.length);
      c++;
      changed = true;
      totalChanges++;
    }
    if (c > 0) {
      console.log('  ' + f.replace(ROOT, '') + ': ' + old + ' → ' + migrations[old] + ' (' + c + 'x)');
    }
  }
  
  if (changed) {
    fs.writeFileSync(f, content);
    totalFilesChanged++;
  }
}

console.log('\nDone!');
console.log('Files modified:', totalFilesChanged);
console.log('Total replacements:', totalChanges);
