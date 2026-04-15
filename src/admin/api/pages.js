'use strict';

function pagesRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('./auth');
  const { logAudit } = require('../db/init');

  // GET /pages — list all managed pages with section count
  router.get('/pages', (req, res) => {
    try {
      var pages = [
        { page_id: 'home', label: '首页', icon: '🏠' },
        { page_id: 'about', label: '关于我们', icon: '🏢' },
        { page_id: 'solutions/fast-food', label: '快餐连锁方案', icon: '🍔' },
        { page_id: 'solutions/cloud-kitchen', label: '中央厨房方案', icon: '🏭' },
        { page_id: 'solutions/canteen', label: '食堂方案', icon: '🏫' },
        { page_id: 'solutions/southeast-asian', label: '东南亚方案', icon: '🌏' },
        { page_id: 'applications/cases', label: '客户案例', icon: '📸' }
      ];
      // Add section count for each
      pages = pages.map(function(p) {
        var count = db.prepare('SELECT COUNT(*) as c FROM page_sections WHERE page_id = ?').get(p.page_id);
        p.section_count = count.c;
        return p;
      });
      res.json({ pages: pages });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /pages/:pageId — get all sections for a page
  router.get('/pages/:pageId', (req, res) => {
    try {
      var pageId = decodeURIComponent(req.params.pageId);
      var sections = db.prepare('SELECT * FROM page_sections WHERE page_id = ? ORDER BY sort_order ASC').all(pageId);
      // Parse content_json
      sections = sections.map(function(s) {
        try { s.content = JSON.parse(s.content_json); } catch(e) { s.content = {}; }
        // Also get images for this section
        var imgs = db.prepare('SELECT * FROM page_images WHERE page_id = ? AND section_key = ? ORDER BY sort_order ASC').all(pageId, s.section_key);
        s.images = imgs;
        return s;
      });
      res.json({ page_id: pageId, sections: sections });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT /pages/:pageId/sections/:sectionKey — upsert section content
  router.put('/pages/:pageId/sections/:sectionKey', requireAdmin, (req, res) => {
    try {
      var pageId = decodeURIComponent(req.params.pageId);
      var sectionKey = req.params.sectionKey;
      var { section_type, content, sort_order, is_active } = req.body;
      var contentJson = JSON.stringify(content || {});
      var existing = db.prepare('SELECT id FROM page_sections WHERE page_id = ? AND section_key = ?').get(pageId, sectionKey);
      if (existing) {
        db.prepare('UPDATE page_sections SET section_type = ?, content_json = ?, sort_order = ?, is_active = ?, updated_at = datetime("now") WHERE id = ?')
          .run(section_type || 'text', contentJson, parseInt(sort_order) || 0, is_active !== undefined ? parseInt(is_active) : 1, existing.id);
      } else {
        db.prepare('INSERT INTO page_sections (page_id, section_key, section_type, content_json, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)')
          .run(pageId, sectionKey, section_type || 'text', contentJson, parseInt(sort_order) || 0);
      }
      logAudit(db, req.user.userId, req.user.username, 'update', 'page_section', null, null, { page_id: pageId, section_key: sectionKey });
      res.json({ message: '已保存' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT /pages/:pageId/sections/:sectionKey/images — batch update images for a section
  router.put('/pages/:pageId/sections/:sectionKey/images', requireAdmin, (req, res) => {
    try {
      var pageId = decodeURIComponent(req.params.pageId);
      var sectionKey = req.params.sectionKey;
      var images = req.body.images; // [{ image_url, alt_text, sort_order }, ...]
      if (!Array.isArray(images)) return res.status(400).json({ error: 'images array required' });
      // Delete existing images for this section
      db.prepare('DELETE FROM page_images WHERE page_id = ? AND section_key = ?').run(pageId, sectionKey);
      // Insert new images
      images.forEach(function(img) {
        db.prepare('INSERT INTO page_images (page_id, section_key, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)')
          .run(pageId, sectionKey, img.image_url || '', img.alt_text || '', parseInt(img.sort_order) || 0);
      });
      logAudit(db, req.user.userId, req.user.username, 'update', 'page_images', null, null, { page_id: pageId, section_key: sectionKey, count: images.length });
      res.json({ message: '已保存 ' + images.length + ' 张图片' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /pages/:pageId/sync — sync page HTML to extract current content (auto-detect)
  router.post('/pages/:pageId/sync', requireAdmin, (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      var pageId = decodeURIComponent(req.params.pageId);
      var htmlPath = path.join(__dirname, '..', '..', '..', 'src', 'pages', pageId, 'index-pc.html');
      if (!fs.existsSync(htmlPath)) return res.status(404).json({ error: 'HTML file not found: ' + htmlPath });
      var html = fs.readFileSync(htmlPath, 'utf-8');
      // Extract all data-i18n keys and their text content
      var i18nRegex = /data-i18n="([^"]+)">([^<]{2,})</g;
      var sections = [];
      var match;
      while ((match = i18nRegex.exec(html)) !== null) {
        sections.push({
          section_key: match[1],
          section_type: 'i18n_text',
          content: { current_text: match[2].trim() }
        });
      }
      // Extract all img src
      var imgRegex = /src="([^"]*\.(webp|jpg|jpeg|png))"/gi;
      while ((match = imgRegex.exec(html)) !== null) {
        sections.push({
          section_key: 'img_' + sections.length,
          section_type: 'image',
          content: { image_url: match[1] }
        });
      }
      res.json({ page_id: pageId, detected_sections: sections.length, sections: sections });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

module.exports = { pagesRoutes };
