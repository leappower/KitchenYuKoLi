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

  router.get('/media', (req, res) => {
    const { search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (original_name LIKE ? OR filename LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM media_library ${where}`).get(...params);
    const rows = db.prepare(`SELECT * FROM media_library ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);
    res.json({ media: rows, total: countRow.total, page: pageNum, limit: limitNum });
  });

  router.post('/media/upload', requireAuth, upload.array('files', 20), (req, res) => {
    const uploaded = [];
    for (const file of req.files) {
      const row = db.prepare(
        'INSERT INTO media_library (filename, original_name, mime_type, file_size, file_path) VALUES (?, ?, ?, ?, ?)'
      ).run(file.filename, file.originalname, file.mimetype, file.size, `/admin/uploads/${file.filename}`);

      logAudit(db, req.user.userId, req.user.username, 'upload', 'media_library', row.lastInsertRowid, null, { filename: file.originalname, size: file.size });

      uploaded.push({
        id: row.lastInsertRowid,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        file_path: `/admin/uploads/${file.filename}`
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
