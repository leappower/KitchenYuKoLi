'use strict';

const path = require('path');
const fs = require('fs');

function i18nRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('./auth');
  const { logAudit } = require('../db/init');

  const LANG_DIR = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'lang');

  // Resolve lang file: zh-CN + ui → zh-CN-ui.json, fallback to zh-CN.json
  function resolveFile(lang, type) {
    var f = path.join(LANG_DIR, lang + '-' + type + '.json');
    if (fs.existsSync(f)) return f;
    f = path.join(LANG_DIR, lang + '.json');
    if (fs.existsSync(f)) return f;
    return null;
  }

  // GET /i18n/keys — 搜索翻译键（分页）
  router.get('/i18n/keys', (req, res) => {
    try {
      var lang = req.query.lang || 'zh-CN';
      var type = req.query.type || 'ui';
      var search = req.query.search || '';
      var page = parseInt(req.query.page) || 1;
      var limit = parseInt(req.query.limit) || 50;
      if (limit > 200) limit = 200;

      var file = resolveFile(lang, type);
      if (!file) return res.json({ keys: [], total: 0 });

      var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      var entries = Object.entries(data);

      if (search) {
        var q = search.toLowerCase();
        entries = entries.filter(function(pair) {
          return pair[0].toLowerCase().includes(q) || String(pair[1]).toLowerCase().includes(q);
        });
      }

      var total = entries.length;
      var start = (page - 1) * limit;
      var paged = entries.slice(start, start + limit);

      res.json({
        keys: paged.map(function(pair) { return { key: pair[0], value: pair[1] }; }),
        total: total
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /i18n/batch — 批量更新翻译
  router.put('/i18n/batch', requireAdmin, (req, res) => {
    try {
      var lang = req.body.lang || 'zh-CN';
      var type = req.body.type || 'ui';
      var updates = req.body.updates;
      if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });

      var file = resolveFile(lang, type);
      if (!file) return res.status(404).json({ error: 'Language file not found: ' + lang + '-' + type });

      var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      var count = 0;
      updates.forEach(function(u) {
        if (u.key && u.value !== undefined) {
          data[u.key] = u.value;
          count++;
        }
      });
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      logAudit(db, req.user.userId, req.user.username, 'update', 'i18n', null, null, { lang: lang, type: type, count: count });
      res.json({ message: '已更新 ' + count + ' 条翻译', count: count });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /i18n/export — 导出语言文件
  router.get('/i18n/export', (req, res) => {
    try {
      var lang = req.query.lang || 'zh-CN';
      var type = req.query.type || 'ui';
      var file = resolveFile(lang, type);
      if (!file) return res.status(404).json({ error: 'File not found' });
      var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /i18n/import — 导入语言文件（merge or replace）
  router.post('/i18n/import', requireAdmin, (req, res) => {
    try {
      var lang = req.body.lang || 'zh-CN';
      var type = req.body.type || 'ui';
      var importData = req.body.data;
      var mode = req.body.mode || 'merge';
      if (!importData || typeof importData !== 'object') return res.status(400).json({ error: 'data object required' });

      var file = resolveFile(lang, type);
      if (!file) return res.status(404).json({ error: 'Language file not found' });

      if (mode === 'replace') {
        fs.writeFileSync(file, JSON.stringify(importData, null, 2) + '\n', 'utf-8');
      } else {
        var existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
        Object.keys(importData).forEach(function(k) { existing[k] = importData[k]; });
        fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
      }

      var count = Object.keys(importData).length;
      logAudit(db, req.user.userId, req.user.username, 'import', 'i18n', null, null, { lang: lang, type: type, mode: mode, count: count });
      res.json({ message: '已导入 ' + count + ' 条翻译' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { i18nRoutes };
