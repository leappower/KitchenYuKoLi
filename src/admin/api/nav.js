'use strict';

const { getDb, logAudit } = require('../db/init');
const path = require('path');
const fs = require('fs');

const LANG_DIR = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'lang');

const SUPPORTED_LANGS = {
  'en': 'English', 'ja': '日本語', 'ko': '한국어', 'th': 'ไทย',
  'vi': 'Tiếng Việt', 'id': 'Bahasa Indonesia', 'ms': 'Bahasa Melayu',
  'hi': 'हिन्दी', 'ar': 'العربية', 'zh-TW': '繁體中文'
};

function navRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('./auth');

  // GET /nav — 获取完整导航树
  router.get('/nav', (req, res) => {
    try {
      const items = db.prepare('SELECT * FROM nav_items ORDER BY sort_order ASC, id ASC').all();
      // Build tree
      const map = {};
      const tree = [];
      items.forEach(item => { map[item.id] = { ...item, children: [] }; });
      items.forEach(item => {
        if (item.parent_id && map[item.parent_id]) {
          map[item.parent_id].children.push(map[item.id]);
        } else {
          tree.push(map[item.id]);
        }
      });
      res.json({ items, tree });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /nav/groups — 按 group_key 分组（用于 dropdown 配置）
  router.get('/nav/groups', (req, res) => {
    try {
      const items = db.prepare('SELECT * FROM nav_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
      const groups = {};
      items.forEach(item => {
        const key = item.group_key || (item.parent_id ? 'sub' : 'main');
        if (!groups[key]) groups[key] = [];
        groups[key].push({
          id: item.id,
          parent_id: item.parent_id,
          i18n_key: item.i18n_key,
          default_label: item.default_label,
          path: item.path,
          icon: item.icon,
          badge: item.badge,
          target: item.target,
          sort_order: item.sort_order
        });
      });
      res.json(groups);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /nav — 创建导航项
  router.post('/nav', requireAdmin, (req, res) => {
    try {
      const { parent_id, sort_order, is_active, i18n_key, default_label, path, icon, badge, target, group_key } = req.body;
      if (!i18n_key) return res.status(400).json({ error: 'i18n_key is required' });
      // Check duplicate i18n_key
      const existing = db.prepare('SELECT id FROM nav_items WHERE i18n_key = ? AND id != ?').get(i18n_key, req.body.id || 0);
      if (existing) return res.status(409).json({ error: 'i18n_key "' + i18n_key + '" 已存在，请使用不同的 key' });
      // Auto-assign sort_order if not provided or is 0
      const pid = parent_id || null;
      const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM nav_items WHERE (parent_id IS ? AND ? IS NULL) OR parent_id = ?').get(pid, pid, pid);
      const autoSort = (sort_order && sort_order !== 0) ? sort_order : (maxSort.max_sort + 1);
      const result = db.prepare(
        'INSERT INTO nav_items (parent_id, sort_order, is_active, i18n_key, default_label, path, icon, badge, target, group_key) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).run(pid, autoSort, is_active !== undefined ? is_active : 1, i18n_key, default_label || '', path || '', icon || '', badge || 0, target || '', group_key || '');
      logAudit(db, req.user.userId, req.user.username, 'create', 'nav_items', result.lastInsertRowid, null, req.body);
      res.json({ id: result.lastInsertRowid, message: '已创建' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /nav/:id — 更新导航项
  router.put('/nav/:id', requireAdmin, (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fields = ['parent_id', 'sort_order', 'is_active', 'i18n_key', 'default_label', 'path', 'icon', 'badge', 'target', 'group_key'];
      const sets = [];
      const vals = [];
      fields.forEach(f => {
        if (req.body[f] !== undefined) {
          sets.push(`${f} = ?`);
          vals.push(req.body[f]);
        }
      });
      if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
      vals.push(id);
      db.prepare(`UPDATE nav_items SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      logAudit(db, req.user.userId, req.user.username, 'update', 'nav_items', id, null, req.body);
      res.json({ message: '已更新' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /nav/:id — 删除导航项
  router.delete('/nav/:id', requireAdmin, (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Also delete children
      db.prepare('DELETE FROM nav_items WHERE id = ? OR parent_id = ?').run(id, id);
      logAudit(db, req.user.userId, req.user.username, 'delete', 'nav_items', id, null, null);
      res.json({ message: '已删除' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /nav/reorder — 批量更新排序
  router.put('/nav/reorder', requireAdmin, (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
      const stmt = db.prepare('UPDATE nav_items SET sort_order = ?, parent_id = ? WHERE id = ?');
      const tx = db.transaction(() => {
        items.forEach(({ id, sort_order, parent_id }) => {
          stmt.run(sort_order || 0, parent_id || null, id);
        });
      });
      tx();
      res.json({ message: '排序已更新' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /nav/frontend-config — returns NAV_CONFIG format for frontend consumption
  router.get('/nav/frontend-config', (req, res) => {
    try {
      const items = db.prepare('SELECT * FROM nav_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
      // Build parent map
      const parents = {};
      items.forEach(item => {
        if (!item.parent_id) {
          parents[item.id] = {
            key: item.i18n_key,
            label: item.default_label || item.i18n_key,
            path: item.path || '/',
            id: item.group_key || item.i18n_key,
            hasDropdown: !!(item.i18n_key && items.some(c => c.parent_id === item.id))
          };
        }
      });
      const mainNav = items.filter(i => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order).map(p => parents[p.id]);
      // Build dropdowns
      const dropdowns = {};
      items.filter(i => i.parent_id).forEach(child => {
        const parent = parents[child.parent_id];
        if (!parent) return;
        const groupId = parent.id;
        if (!dropdowns[groupId]) dropdowns[groupId] = [];
        dropdowns[groupId].push({
          key: child.i18n_key,
          icon: child.icon || '',
          href: child.path || '',
          badge: !!child.badge,
          isWhatsApp: child.target === '_blank' && child.path && child.path.includes('whatsapp')
        });
      });
      res.json({ mainNav, dropdowns });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Nav Batch Translate ─────────────────────────────────────────
  // POST /nav/batch-translate — AI 批量翻译导航项到各语言的 i18n JSON 文件
  router.post('/nav/batch-translate', requireAdmin, async (req, res) => {
    try {
      const { target_langs, dry_run, source_lang } = req.body;
      const langs = (target_langs && target_langs.length > 0) ? target_langs : Object.keys(SUPPORTED_LANGS);
      const srcLang = source_lang || 'zh-CN';

      // 1. Get all nav items
      const items = db.prepare('SELECT id, i18n_key, default_label, icon, badge, target, path FROM nav_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
      if (!items.length) return res.json({ translated: 0, message: '没有启用的导航项' });

      // 2. Read source language file for reference labels
      const srcFile = path.join(LANG_DIR, srcLang + '-ui.json');
      let srcData = {};
      if (fs.existsSync(srcFile)) {
        srcData = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
      }

      // 3. Build text map: i18n_key → label to translate
      // Use default_label as primary, fallback to srcData[i18n_key]
      const textsToTranslate = [];
      items.forEach(item => {
        const label = item.default_label || srcData[item.i18n_key] || item.i18n_key;
        // Skip keys that already have good translations in all target langs (e.g. 'en')
        textsToTranslate.push({ key: item.i18n_key, label });
      });

      // 4. Filter out languages that already have all nav keys filled (e.g. 'en')
      const langsToProcess = langs.filter(lang => {
        if (lang === srcLang) return false;
        const langFile = path.join(LANG_DIR, lang + '-ui.json');
        if (!fs.existsSync(langFile)) return true;
        const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
        const missingKeys = textsToTranslate.filter(t => !langData[t.key] || langData[t.key].trim() === '');
        return missingKeys.length > 0;
      });

      if (langsToProcess.length === 0) {
        return res.json({ translated: 0, message: '所有目标语言已有完整翻译' });
      }

      // 5. Call translate API for each batch of languages
      const results = { total_keys: textsToTranslate.length, total_langs: langsToProcess.length, translated: 0, skipped: [], errors: [] };

      const labels = textsToTranslate.map(t => t.label);
      const BATCH_SIZE = 5; // Match translate.js default

      for (let i = 0; i < langsToProcess.length; i += BATCH_SIZE) {
        const batchLangs = langsToProcess.slice(i, i + BATCH_SIZE);

        // Call the internal translate API via localhost
        // We reuse the existing /api/cms/translate endpoint
        const translateUrl = 'http://localhost:' + (process.env.PORT || 3000) + '/api/cms/translate';
        const adminToken = req.headers.authorization;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 120000);

          const response = await fetch(translateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(adminToken ? { 'Authorization': adminToken } : {})
            },
            body: JSON.stringify({
              texts: labels,
              source_lang: srcLang,
              target_langs: batchLangs
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);
          const data = await response.json();

          if (!response.ok) {
            results.errors.push({ langs: batchLangs, error: data.error || 'API error ' + response.status });
            continue;
          }

          // 6. Write translations to language files
          const translations = data.translations || [];
          translations.forEach(tr => {
            if (tr._error || !tr.lang) return;
            const langFile = path.join(LANG_DIR, tr.lang + '-ui.json');
            if (!fs.existsSync(langFile)) return;
            const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));

            textsToTranslate.forEach(t => {
              // Map translations: the translate API returns arrays aligned with input texts
              // We need to find the right label in the response
            });
          });

          // Re-map: the translate API returns translations per language, each containing product fields
          // We need a simpler approach: translate nav labels as plain text
          // The existing translate API is designed for products, so let's use it differently
          // Actually, let's check if the response format matches what we need

          // The translate API returns: translations[].{ lang, name, specifications, throughput }
          // But for nav, we just need label translations. The 'name' field maps to our labels.
          // Since we pass labels as 'texts', and the API interprets them as product names,
          // we can use the 'name' field from each translation.

          // However, the translate API returns ONE set of fields per language, not per text.
          // The API maps all texts into a single prompt and returns translations for all of them.
          // Let me re-read the translate API response format more carefully.

          // Looking at translate.js: it returns translations array, one per target_lang.
          // Each translation has: lang, name, specifications, throughput
          // But this is for a SINGLE product (one set of texts).
          // When we pass multiple texts, the API sends them all in one prompt and expects
          // the model to translate ALL of them. The response format is per-language with fields.
          // This means we can't use the existing translate API for nav items directly —
          // it's designed for product data (name, specs, throughput), not for arbitrary label arrays.

          // We need a different approach: translate labels directly using the same provider.
          results.errors.push({ langs: batchLangs, error: 'Need custom nav translation logic' });

        } catch (e) {
          results.errors.push({ langs: batchLangs, error: e.message });
        }
      }

      res.json(results);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { navRoutes };
