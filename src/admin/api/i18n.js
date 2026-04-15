'use strict';

const path = require('path');
const fs = require('fs');

function i18nRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('./auth');
  const { logAudit } = require('../db/init');

  const LANG_DIR = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'lang');

  // GET /i18n/keys — 搜索翻译键
  router.get('/i18n/keys', (req, res) => {
    try {
      const { lang = 'zh-CN', search, page = '1', limit = '50' } = req.query;
      const file = path.join(LANG_DIR, `${lang}-ui.json`);
      if (!fs.existsSync(file)) return res.json({ keys: [], total: 0 });
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      let entries = Object.entries(data);
      if (search) {
        const q = search.toLowerCase();
        entries = entries.filter(([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q));
      }
      const total = entries.length;
      const start = (parseInt(page) - 1) * parseInt(limit);
      const paged = entries.slice(start, start + parseInt(limit));
      res.json({ keys: paged.map(([key, value]) => ({ key, value })), total });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /i18n/batch — 批量更新翻译
  router.put('/i18n/batch', requireAdmin, (req, res) => {
    try {
      const { lang = 'zh-CN', type = 'ui', updates } = req.body;
      if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });
      const file = path.join(LANG_DIR, `${lang}-${type}.json`);
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      let count = 0;
      updates.forEach(({ key, value }) => {
        if (key && value !== undefined) {
          data[key] = value;
          count++;
        }
      });
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      logAudit(db, req.user.userId, req.user.username, 'update', 'i18n', null, null, { lang, type, count });
      res.json({ message: `已更新 ${count} 条翻译`, count });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /i18n/export — 导出语言文件
  router.get('/i18n/export', (req, res) => {
    try {
      const { lang = 'zh-CN', type = 'ui' } = req.query;
      const file = path.join(LANG_DIR, `${lang}-${type}.json`);
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /i18n/import — 导入语言文件
  router.post('/i18n/import', requireAdmin, (req, res) => {
    try {
      const { lang = 'zh-CN', type = 'ui', data, mode = 'merge' } = req.body;
      const file = path.join(LANG_DIR, `${lang}-${type}.json`);
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
      const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (mode === 'replace') {
        fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      } else {
        Object.assign(existing, data);
        fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
      }
      logAudit(db, req.user.userId, req.user.username, 'import', 'i18n', null, null, { lang, type, mode, count: Object.keys(data).length });
      res.json({ message: `已导入 ${Object.keys(data).length} 条翻译` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { i18nRoutes };
