'use strict';

const { getDb, logAudit } = require('../db/init');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const ALLOWED_MIME = new Set([
  'image/webp', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'video/mp4', 'application/pdf'
]);

const ALLOWED_EXT = new Set(['webp', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'pdf']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  defParamCharset: 'utf8',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error(`File type .${ext} not allowed`), false);
    }
    cb(null, true);
  }
});

function mediaRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAuth } = require('./auth');

  // GET /media — list with optional filters
  router.get('/media', (req, res) => {
    const { search, page, limit, product_id, group_by, category_id } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (m.original_name LIKE ? OR m.filename LIKE ? OR p.model LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (product_id) {
      where += ' AND m.product_id = ?';
      params.push(parseInt(product_id));
    }

    if (category_id) {
      where += ' AND p.category_id = ?';
      params.push(parseInt(category_id));
    }

    // group_by=category — return media grouped by product category
    if (group_by === 'category') {
      const rows = db.prepare(`
        SELECT pc.id AS category_id, pc.name AS category_name, pc.slug,
               COUNT(*) AS media_count,
               GROUP_CONCAT(m.id) AS media_ids
        FROM media_library m
        LEFT JOIN products p ON m.product_id = p.id
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        ${where}
        GROUP BY COALESCE(pc.id, 0)
        ORDER BY pc.sort_order, pc.id
      `).all(...params);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.json({ groups: rows, total: rows.length });
    }

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM media_library m LEFT JOIN products p ON m.product_id = p.id ${where}`
    ).get(...params);

    const rows = db.prepare(`
      SELECT m.*,
             p.id AS product_db_id, p.model AS product_model, p.name AS product_name,
             pc.name AS category_name, pc.slug AS category_slug
      FROM media_library m
      LEFT JOIN products p ON m.product_id = p.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      ${where}
      ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ media: rows, total: countRow.total, page: pageNum, limit: limitNum });
  });

  // GET /media/categories — list product categories that have media
  router.get('/media/categories', (req, res) => {
    const rows = db.prepare(`
      SELECT DISTINCT pc.id, pc.name, pc.slug, pc.sort_order,
             COUNT(m.id) AS media_count
      FROM product_categories pc
      INNER JOIN products p ON p.category_id = pc.id
      INNER JOIN media_library m ON m.product_id = p.id
      GROUP BY pc.id
      ORDER BY pc.sort_order, pc.id
    `).all();

    // Also count media without a product
    const unlinked = db.prepare(
      'SELECT COUNT(*) AS media_count FROM media_library WHERE product_id IS NULL AND mime_type LIKE ?'
    ).get('image%');

    const result = rows;
    if (unlinked && unlinked.media_count > 0) {
      result.push({ id: 0, name: '未分类', slug: '_unlinked', sort_order: 9999, media_count: unlinked.media_count });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ categories: result });
  });

  router.post('/media/upload', requireAuth, upload.array('files', 20), (req, res) => {
    const productId = req.query.product_id ? parseInt(req.query.product_id) : null;
    const uploaded = [];
    for (const file of req.files) {
      const row = db.prepare(
        'INSERT INTO media_library (filename, original_name, mime_type, file_size, file_path, product_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(file.filename, file.originalname, file.mimetype, file.size, `/admin/uploads/${file.filename}`, productId);

      logAudit(db, req.user.userId, req.user.username, 'upload', 'media_library', row.lastInsertRowid, null, { filename: file.originalname, size: file.size, product_id: productId });

      uploaded.push({
        id: row.lastInsertRowid,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        file_path: `/admin/uploads/${file.filename}`,
        product_id: productId
      });
    }
    res.json({ media: uploaded });
  });

  router.delete('/media/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const media = db.prepare('SELECT * FROM media_library WHERE id = ?').get(id);
    if (!media) return res.status(404).json({ error: 'Media not found' });

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, media.filename);
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

    db.prepare('DELETE FROM media_library WHERE id = ?').run(id);
    logAudit(db, req.user.userId, req.user.username, 'delete', 'media_library', id, media, null);
    res.json({ message: 'Media deleted' });
  });

  return router;
}

module.exports = { mediaRoutes, upload };
