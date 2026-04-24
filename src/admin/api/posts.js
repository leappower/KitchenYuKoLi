'use strict';

const path = require('path');
const fs = require('fs');

function postsRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('./auth');
  const { logAudit } = require('../db/init');

  // GET /posts — list posts with optional filters
  router.get('/posts', (req, res) => {
    try {
      const { category = 'all', active = '1', page = '1', limit = '20', search } = req.query;
      var where = [];
      var params = [];
      if (category !== 'all') { where.push('category = ?'); params.push(category); }
      if (active !== 'all') { where.push('is_active = ?'); params.push(parseInt(active)); }
      if (search) { where.push('(title LIKE ? OR slug LIKE ?)'); params.push('%' + search + '%', '%' + search + '%'); }
      var whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      var pg = parseInt(page);
      var lim = parseInt(limit);
      var offset = (pg - 1) * lim;
      var rows = db.prepare('SELECT * FROM posts ' + whereClause + ' ORDER BY sort_order ASC, published_at DESC LIMIT ? OFFSET ?').all(...params, lim, offset);
      var countRow = db.prepare('SELECT COUNT(*) as total FROM posts ' + whereClause).get(...params);
      res.json({ posts: rows, total: countRow.total, page: pg, limit: lim });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /posts/:id — single post
  router.get('/posts/:id', (req, res) => {
    try {
      var row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Post not found' });
      res.json(row);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /posts — create
  router.post('/posts', requireAdmin, (req, res) => {
    try {
      var { title, slug, excerpt, content_markdown, cover_image, category, sort_order } = req.body;
      if (!title) return res.status(400).json({ error: 'title required' });
      slug = slug || title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
      var result = db.prepare('INSERT INTO posts (title, slug, excerpt, content_markdown, cover_image, category, sort_order, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))').run(title, slug, excerpt || '', content_markdown || '', cover_image || '', category || 'news', parseInt(sort_order) || 0);
      var post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
      logAudit(db, req.user.userId, req.user.username, 'create', 'post', post.id, null, { title: title, slug: slug });
      res.json({ post: post });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT /posts/:id — update
  router.put('/posts/:id', requireAdmin, (req, res) => {
    try {
      var { title, slug, excerpt, content_markdown, cover_image, category, sort_order, is_active } = req.body;
      var existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Post not found' });
      var newSlug = slug || existing.slug;
      if (title) db.prepare('UPDATE posts SET title = ?, slug = ?, excerpt = ?, content_markdown = ?, cover_image = ?, category = ?, sort_order = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?').run(title, newSlug, excerpt !== undefined ? excerpt : existing.excerpt, content_markdown !== undefined ? content_markdown : existing.content_markdown, cover_image !== undefined ? cover_image : existing.cover_image, category !== undefined ? category : existing.category, sort_order !== undefined ? parseInt(sort_order) : existing.sort_order, is_active !== undefined ? parseInt(is_active) : existing.is_active, req.params.id);
      var post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      logAudit(db, req.user.userId, req.user.username, 'update', 'post', req.params.id, null, { title: title });
      res.json({ post: post });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /posts/:id
  router.delete('/posts/:id', requireAdmin, (req, res) => {
    try {
      var existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Post not found' });
      db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
      logAudit(db, req.user.userId, req.user.username, 'delete', 'post', req.params.id, null, { title: existing.title });
      res.json({ message: '已删除' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /posts/:id/publish — set published_at
  router.post('/posts/:id/publish', requireAdmin, (req, res) => {
    try {
      db.prepare('UPDATE posts SET published_at = datetime("now"), is_active = 1, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
      var post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      logAudit(db, req.user.userId, req.user.username, 'publish', 'post', req.params.id, null, { slug: post.slug });
      res.json({ post: post });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

module.exports = { postsRoutes };
