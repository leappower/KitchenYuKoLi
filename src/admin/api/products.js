'use strict';

const { getDb, logAudit } = require('../db/init');
const { upload } = require('./media');

function productsRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAuth, requireAdmin } = require('./auth');

  // GET /products — list with filters and pagination
  router.get('/products', (req, res) => {
    const { category_id, search, status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];

    if (category_id) {
      where += ' AND p.category_id = ?';
      params.push(parseInt(category_id));
    }
    if (search) {
      where += ' AND (p.model LIKE ? OR p.sub_category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where += ' AND p.status = ?';
      params.push(status);
    }
    if (req.query.home_core === '1') {
      where += ' AND p.is_home_core = 1';
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM products p ${where}`).get(...params);
    const rows = db.prepare(
      `SELECT p.*, c.slug as category_slug, c.i18n_key as category_i18n_key
       FROM products p LEFT JOIN product_categories c ON p.category_id = c.id
       ${where} ORDER BY p.sort_order ASC, p.id ASC LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    // Get primary images for each product
    const imgs = db.prepare('SELECT product_id, file_path, is_primary FROM product_images WHERE is_primary = 1').all();
    const imgMap = {};
    imgs.forEach(i => { imgMap[i.product_id] = i.file_path; });
    rows.forEach(r => { r.primary_image = imgMap[r.id] || null; });

    res.json({ products: rows, total: countRow.total, page: pageNum, limit: limitNum });
  });

  // GET /products/:id — single product with images
  router.get('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = db.prepare(
      `SELECT p.*, c.slug as category_slug, c.i18n_key as category_i18n_key
       FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`
    ).get(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').all(id);
    res.json({ product });
  });

  // POST /products — create
  router.post('/products', requireAuth, (req, res) => {
    const fields = ['category_id', 'sub_category', 'model', 'name', 'specifications', 'status', 'is_active', 'badge', 'badge_color',
      'power', 'throughput', 'average_time', 'voltage', 'frequency', 'material',
      'product_dimensions', 'color', 'control_method', 'launch_time', 'tier', 'sort_order', 'is_home_core'];
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'model is required' });

    try {
      const cols = [];
      const vals = [];
      const placeholders = [];
      fields.forEach(f => {
        if (req.body[f] !== undefined) {
          cols.push(f);
          vals.push(req.body[f]);
          placeholders.push('?');
        }
      });

      const result = db.prepare(
        `INSERT INTO products (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
      ).run(...vals);

      logAudit(db, req.user.userId, req.user.username, 'create', 'products', result.lastInsertRowid, null, req.body);
      const row = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      res.json({ product: row });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Product model already exists' });
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /products/:id — update
  router.put('/products/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    try {
      const sets = [];
      const vals = [];
      const fields = ['category_id', 'sub_category', 'model', 'name', 'specifications', 'status', 'is_active', 'badge', 'badge_color',
        'power', 'throughput', 'average_time', 'voltage', 'frequency', 'material',
        'product_dimensions', 'color', 'control_method', 'launch_time', 'tier', 'sort_order', 'is_home_core'];

      fields.forEach(f => {
        if (req.body[f] !== undefined) {
          sets.push(`${f} = ?`);
          vals.push(req.body[f]);
        }
      });

      if (sets.length === 0) return res.json({ product: existing });

      sets.push("updated_at = datetime('now')");
      vals.push(id);
      db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

      logAudit(db, req.user.userId, req.user.username, 'update', 'products', id, existing, req.body);
      const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      row.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').all(id);
      res.json({ product: row });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Product model already exists' });
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /products/:id
  router.delete('/products/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    logAudit(db, req.user.userId, req.user.username, 'delete', 'products', id, existing, null);
    res.json({ message: 'Product deleted' });
  });

  // POST /products/:id/images — upload image(s) via multipart
  router.post('/products/:id/images', requireAuth, upload.array('files', 20), (req, res) => {
    const productId = parseInt(req.params.id);
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Check existing images to decide if first one should be primary
    const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ?').get(productId).cnt;
    const isAutoPrimary = existingCount === 0;

    const uploaded = [];
    for (const file of req.files) {
      const result = db.prepare(
        'INSERT INTO product_images (product_id, file_path, is_primary, sort_order) VALUES (?, ?, ?, ?)'
      ).run(productId, `/admin/uploads/${file.filename}`, isAutoPrimary && uploaded.length === 0 ? 1 : 0, existingCount + uploaded.length);

      uploaded.push({
        id: result.lastInsertRowid,
        file_path: `/admin/uploads/${file.filename}`,
        is_primary: isAutoPrimary && uploaded.length === 0 ? 1 : 0,
        sort_order: existingCount + uploaded.length
      });
    }
    res.json({ images: uploaded });
  });

  // POST /products/:id/images/url — add image by URL (from media library)
  router.post('/products/:id/images/url', requireAuth, (req, res) => {
    const productId = parseInt(req.params.id);
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { url } = req.body;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });

    const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ?').get(productId).cnt;
    const isPrimary = existingCount === 0 ? 1 : 0;

    const result = db.prepare(
      'INSERT INTO product_images (product_id, file_path, is_primary, sort_order) VALUES (?, ?, ?, ?)'
    ).run(productId, url, isPrimary, existingCount);

    res.json({ id: result.lastInsertRowid, file_path: url, is_primary: isPrimary, sort_order: existingCount });
  });

  // DELETE /products/:id/images/:imgId
  router.delete('/products/:id/images/:imgId', requireAuth, (req, res) => {
    const imgId = parseInt(req.params.imgId);
    const img = db.prepare('SELECT * FROM product_images WHERE id = ?').get(imgId);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    db.prepare('DELETE FROM product_images WHERE id = ?').run(imgId);

    // Auto-promote next image as primary if deleted was primary
    if (img.is_primary) {
      const next = db.prepare('SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1').get(img.product_id);
      if (next) {
        db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(next.id);
      }
    }

    res.json({ message: 'Image deleted' });
  });

  // PUT /products/:id/images/reorder
  router.put('/products/:id/images/reorder', requireAuth, (req, res) => {
    const productId = parseInt(req.params.id);
    const items = req.body; // [{id, sort_order, is_primary}]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array of {id, sort_order, is_primary}' });

    const update = db.prepare('UPDATE product_images SET sort_order = ?, is_primary = ? WHERE id = ? AND product_id = ?');
    const batch = db.transaction(() => {
      items.forEach(item => {
        update.run(item.sort_order || 0, item.is_primary ? 1 : 0, item.id, productId);
      });
    });
    batch();

    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').all(productId);
    res.json({ images });
  });

  // ─── Related Products (manual + auto fallback) ───────────

  // GET /products/:id/related — get manual relations + auto fallback
  router.get('/products/:id/related', requireAuth, (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      // Manual relations
      const manual = db.prepare(
        'SELECT p.id, p.model, rp.sort_order FROM related_products rp ' +
        'JOIN products p ON p.id = rp.related_id WHERE rp.product_id = ? AND p.is_active = 1 ' +
        'ORDER BY rp.sort_order ASC'
      ).all(productId);
      res.json({ manual });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT /products/:id/related — set manual related products (replaces all)
  router.put('/products/:id/related', requireAuth, (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const items = req.body; // [{id: number, sort_order: number}]
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array' });
      const del = db.prepare('DELETE FROM related_products WHERE product_id = ?');
      const ins = db.prepare('INSERT OR REPLACE INTO related_products (product_id, related_id, sort_order) VALUES (?, ?, ?)');
      const batch = db.transaction(() => {
        del.run(productId);
        items.forEach((item, i) => {
          ins.run(productId, parseInt(item.id), item.sort_order || i);
        });
      });
      batch();
      logAudit(db, req.user.userId, req.user.username, 'update', 'related_products', productId, null, { related: items });
      res.json({ message: 'Related products updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ─── Product Translations ───────────

  // GET /products/:id/translations — list all translations for a product
  router.get('/products/:id/translations', requireAuth, (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const translations = db.prepare(
        'SELECT * FROM product_translations WHERE product_id = ? ORDER BY lang ASC'
      ).all(productId);
      res.json({ translations });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT /products/:id/translations — upsert translations (bulk)
  router.put('/products/:id/translations', requireAuth, (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const items = req.body; // [{lang: 'en', name: '...', specifications: '...', usage: '...', throughput: '...'}]
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array' });

      const upsert = db.prepare(
        `INSERT INTO product_translations (product_id, lang, name, specifications, usage, throughput, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(product_id, lang) DO UPDATE SET
         name = excluded.name,
         specifications = excluded.specifications,
         usage = excluded.usage,
         throughput = excluded.throughput,
         updated_at = excluded.updated_at`
      );

      const batch = db.transaction(() => {
        items.forEach(item => {
          upsert.run(productId, item.lang, item.name || '', item.specifications || '', item.usage || '', item.throughput || '');
        });
      });
      batch();

      logAudit(db, req.user.userId, req.user.username, 'update', 'product_translations', productId, null, { translations: items });
      const translations = db.prepare(
        'SELECT * FROM product_translations WHERE product_id = ? ORDER BY lang ASC'
      ).all(productId);
      res.json({ translations });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

module.exports = { productsRoutes };
