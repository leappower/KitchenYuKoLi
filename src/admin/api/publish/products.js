'use strict';

// Product data publishing routes.
// Handles product table generation, ETag caching, and JS file output.

const path = require('path');
const fs = require('fs');
const { logAudit } = require('../../db/init');

// Shared: build product data table from DB
function buildProductTable(db) {
  const categories = db.prepare('SELECT * FROM product_categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
  // Build slug → display name map
  const catNameMap = {};
  categories.forEach(cat => { catNameMap[cat.slug] = cat.name || cat.slug; });
  const allProducts = db.prepare(
      'SELECT p.*, c.slug as category_slug, c.i18n_key as category_i18n_key FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.is_active = 1 ORDER BY p.sort_order ASC, p.id ASC'
    ).all();
    const allImages = db.prepare('SELECT * FROM product_images ORDER BY sort_order ASC').all();

    // Group images by product_id
    const imgMap = {};
    allImages.forEach(img => {
      if (!imgMap[img.product_id]) imgMap[img.product_id] = [];
      imgMap[img.product_id].push(img);
    });

    // Load manual related products (product_id → [related_model, ...])
    const relatedMap = {};
    const relatedRows = db.prepare(
      'SELECT rp.product_id, p.model FROM related_products rp JOIN products p ON p.id = rp.related_id ORDER BY rp.sort_order'
    ).all();
    relatedRows.forEach(r => {
      if (!relatedMap[r.product_id]) relatedMap[r.product_id] = [];
      relatedMap[r.product_id].push(r.model);
    });

    // Group products by category
    const catMap = {};
    allProducts.forEach(p => {
      const catId = p.category_id || 0;
      const catSlug = p.category_slug || 'Uncategorized';
      if (!catMap[catSlug]) {
        catMap[catSlug] = { category: p.category_i18n_key || p.category_slug, categoryName: catNameMap[catSlug] || p.category_slug, products: [] };
      }
      catMap[catSlug].products.push({
        category: p.category_i18n_key || p.category_slug,
        subCategory: p.sub_category || null,
        model: p.model,
        name: p.name || '',
        specifications: p.specifications || '',
        status: p.status,
        is_active: p.is_active ? true : false,
        badge: p.badge || null,
        badgeColor: p.badge_color || null,
        power: p.power || null,
        throughput: p.throughput || null,
        averageTime: p.average_time || null,
        voltage: p.voltage || null,
        frequency: p.frequency || null,
        material: p.material || null,
        productDimensions: p.product_dimensions || null,
        color: p.color || null,
        controlMethod: p.control_method || null,
        launchTime: p.launch_time || null,
        tier: p.tier || '',
        sort_order: p.sort_order || 0,
        is_home_core: p.is_home_core ? true : false,
        created_at: p.created_at || null,
        updated_at: p.updated_at || null,
        relatedProducts: relatedMap[p.id] || null,
        images: (imgMap[p.id] || []).map(i => ({
          filePath: i.file_path,
          isPrimary: !!i.is_primary,
          sortOrder: i.sort_order
        }))
      });
    });

    const table = [];
    // Add ALL active categories (including empty ones)
    const usedCatSlugs = new Set(Object.keys(catMap));
    categories.forEach(cat => {
      if (catMap[cat.slug]) {
        table.push(catMap[cat.slug]);
      } else {
        // Empty category — still include it so the frontend can show it
        table.push({
          category: cat.i18n_key || cat.slug,
          categoryName: catNameMap[cat.slug] || cat.slug,
          products: []
        });
      }
    });
    // Add any categories that exist in products but not in categories table
    Object.keys(catMap).forEach(slug => {
      if (!categories.find(c => c.slug === slug)) {
        table.push(catMap[slug]);
      }
    });

    return { table, homeCoreProducts: allProducts.filter(p => p.is_home_core).map(p => {
      const prod = catMap[p.category_slug || 'Uncategorized']?.products.find(x => x.model === p.model);
      return prod || { model: p.model, images: (imgMap[p.id] || []).map(i => ({ filePath: i.file_path, isPrimary: !!i.is_primary, sortOrder: i.sort_order })) };
    }), categories: categories.length, products: allProducts.length, images: allImages.length };
  }

function productsRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('../auth');

  // Public API: GET /products-data — fetch product data with ETag caching (no auth required)
  router.get('/products-data', (req, res) => {
    try {
      const result = buildProductTable(db);
      const json = JSON.stringify(result.table);
      const etag = '"' + require('crypto').createHash('md5').update(json).digest('hex').slice(0, 12) + '"';

      // 304 Not Modified if ETag matches
      if (req.headers['if-none-match'] === etag) return res.status(304).end();

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60'); // cache 1 min, revalidate
      res.setHeader('ETag', etag);
      res.json(result.table);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/publish/products', requireAdmin, (req, res) => {
    try {
      const result = buildProductTable(db);

      // Generate JS file (fallback for offline / static hosting)
      const publishVersion = String(Date.now());
      const output = `// product-data-table.js — Auto-generated by CMS (${new Date().toISOString()})\n// DO NOT EDIT MANUALLY — Changes will be overwritten on next publish\nwindow.PRODUCT_DATA_VERSION = '${publishVersion}';\nwindow.PRODUCT_DATA_TABLE = ${JSON.stringify(result.table, null, 2)};\nwindow.HOME_CORE_PRODUCTS = ${JSON.stringify(result.homeCoreProducts, null, 2)};\n`;

      const targetPath = path.join(__dirname, '..', '..', '..', '..', 'src', 'assets', 'js', 'product-data-table.js');
      fs.writeFileSync(targetPath, output, 'utf-8');

      // Also write to dist/ so the SPA loads the latest data immediately (no rebuild needed)
      const distPath = path.join(__dirname, '..', '..', '..', '..', 'dist', 'assets', 'js', 'product-data-table.js');
      fs.mkdirSync(path.dirname(distPath), { recursive: true });
      fs.writeFileSync(distPath, output, 'utf-8');

      logAudit(db, req.user.userId, req.user.username, 'publish', 'products', null, null, {
        categories: result.categories,
        products: result.products,
        images: result.images
      });

      res.json({
        message: 'Published successfully',
        stats: { categories: result.categories, products: result.products, images: result.images }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { productsRoutes, buildProductTable };
