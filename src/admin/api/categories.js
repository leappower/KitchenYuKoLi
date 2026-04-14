'use strict';

const { getDb, logAudit } = require('../db/init');

function categoriesRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAuth, requireAdmin } = require('./auth');

  router.get('/categories', (req, res) => {
    const { active } = req.query;
    let sql = 'SELECT * FROM product_categories';
    const params = [];
    if (active !== undefined) {
      sql += ' WHERE is_active = ?';
      params.push(active === '1' || active === 'true' ? 1 : 0);
    }
    sql += ' ORDER BY sort_order ASC, id ASC';
    const rows = db.prepare(sql).all(...params);
    // Count products per category
    const counts = db.prepare('SELECT category_id, COUNT(*) as cnt FROM products GROUP BY category_id').all();
    const countMap = {};
    counts.forEach(c => { countMap[c.category_id] = c.cnt; });
    rows.forEach(r => { r.product_count = countMap[r.id] || 0; });
    res.json({ categories: rows });
  });

  router.post('/categories', requireAuth, (req, res) => {
    const { slug, i18n_key, sort_order, is_active } = req.body;
    if (!slug) return res.status(400).json({ error: 'slug is required' });

    try {
      const result = db.prepare(
        'INSERT INTO product_categories (slug, i18n_key, sort_order, is_active) VALUES (?, ?, ?, ?)'
      ).run(slug, i18n_key || '', sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1);

      logAudit(db, req.user.userId, req.user.username, 'create', 'product_categories', result.lastInsertRowid, null, req.body);
      const row = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(result.lastInsertRowid);
      res.json({ category: row });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category slug already exists' });
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/categories/:id', requireAuth, (req, res) => {
    const { slug, i18n_key, sort_order, is_active } = req.body;
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    try {
      db.prepare(
        'UPDATE product_categories SET slug = COALESCE(?, slug), i18n_key = COALESCE(?, i18n_key), sort_order = COALESCE(?, sort_order), is_active = COALESCE(?, is_active), updated_at = datetime(\'now\') WHERE id = ?'
      ).run(slug, i18n_key, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

      logAudit(db, req.user.userId, req.user.username, 'update', 'product_categories', id, existing, req.body);
      const row = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id);
      res.json({ category: row });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category slug already exists' });
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/categories/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
    logAudit(db, req.user.userId, req.user.username, 'delete', 'product_categories', id, existing, null);
    res.json({ message: 'Category deleted' });
  });

  return router;
}

module.exports = { categoriesRoutes };
