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
      const { target_langs, source_lang } = req.body;
      const langs = (target_langs && target_langs.length > 0) ? target_langs : Object.keys(SUPPORTED_LANGS);
      const srcLang = source_lang || 'zh-CN';

      // 1. Get all nav items
      const items = db.prepare('SELECT id, i18n_key, default_label FROM nav_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
      if (!items.length) return res.json({ translated: 0, message: '没有启用的导航项' });

      // 2. Read source language file for reference labels
      const srcFile = path.join(LANG_DIR, srcLang + '-ui.json');
      let srcData = {};
      if (fs.existsSync(srcFile)) {
        srcData = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
      }

      // 3. Build key→label map (use default_label, fallback to srcData)
      const keyLabelMap = {};
      items.forEach(item => {
        const label = item.default_label || srcData[item.i18n_key] || item.i18n_key;
        if (label.trim()) keyLabelMap[item.i18n_key] = label;
      });

      // 4. For each target lang, find missing keys
      const results = { total_keys: Object.keys(keyLabelMap).length, langs: {}, translated: 0, errors: [] };

      // 5. Get translation provider config (reuse translate.js env vars)
      const apiKey = process.env.TRANSLATE_API_KEY;
      const apiUrl = (process.env.TRANSLATE_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const model = process.env.TRANSLATE_MODEL || 'gpt-4o-mini';
      if (!apiKey) return res.status(503).json({ error: '翻译服务未配置：请设置 TRANSLATE_API_KEY' });

      for (const lang of langs) {
        if (lang === srcLang) { results.skipped = (results.skipped || 0) + 1; continue; }
        const langFile = path.join(LANG_DIR, lang + '-ui.json');
        if (!fs.existsSync(langFile)) { results.errors.push(lang + ': 文件不存在'); continue; }

        const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
        const missingKeys = Object.keys(keyLabelMap).filter(k => !langData[k] || langData[k].trim() === '');

        if (missingKeys.length === 0) {
          results.langs[lang] = { status: 'already_done', count: 0 };
          continue;
        }

        // Build translation prompt for this language
        const entries = missingKeys.map(k => [k, keyLabelMap[k]]);
        const langName = SUPPORTED_LANGS[lang] || lang;

        const prompt = '将以下网站导航菜单文本从' + (srcLang === 'zh-CN' ? '简体中文' : srcLang) + '翻译成' + langName + '。\n\n' +
          '要求：\n' +
          '1. 只输出JSON，不要包含任何其他文字或markdown代码块标记\n' +
          '2. 翻译要简洁、专业、符合当地语言习惯\n' +
          '3. 保留品牌名、专有名词不变\n' +
          '4. 导航文本通常很短（2-8个字），翻译也要保持简洁\n\n' +
          entries.map(function(e, i) { return (i + 1) + '. ' + e[0] + ' = ' + e[1]; }).join('\n') + '\n\n' +
          '输出JSON格式，key为原文的i18n_key，value为翻译后的文本：\n' +
          '{ "' + entries[0][0] + '": "...", "' + entries[1][0] + '": "..." }';

        try {
          const controller = new AbortController();
          const timeout = setTimeout(function() { controller.abort(); }, 60000);

          const response = await fetch(apiUrl + '/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: '你是专业的网站本地化翻译专家。只输出JSON，不要包含任何其他文字或markdown代码块标记。' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.3,
              max_tokens: 4096,
              response_format: { type: 'json_object' }
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (!response.ok) {
            const errText = await response.text();
            results.errors.push(lang + ': API ' + response.status + ' ' + errText.substring(0, 100));
            results.langs[lang] = { status: 'error', error: 'API ' + response.status };
            continue;
          }

          const data = await response.json();
          let translated;
          try {
            const content = data.choices[0].message.content;
            translated = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
          } catch (e) {
            results.errors.push(lang + ': 解析失败');
            results.langs[lang] = { status: 'error', error: 'parse_error' };
            continue;
          }

          // Merge translations into lang file
          let written = 0;
          for (const key of missingKeys) {
            if (translated[key] && translated[key].trim()) {
              langData[key] = translated[key];
              written++;
            }
          }

          // Write back to file
          fs.writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n', 'utf-8');
          results.langs[lang] = { status: 'ok', translated: written, total: missingKeys.length };
          results.translated += written;

          // Rate limit: wait between requests
          if (langs.indexOf(lang) < langs.length - 1) {
            await new Promise(function(resolve) { setTimeout(resolve, 8000); });
          }
        } catch (e) {
          results.errors.push(lang + ': ' + e.message);
          results.langs[lang] = { status: 'error', error: e.message };
        }
      }

      logAudit(db, req.user.userId, req.user.username, 'translate', 'nav_items', null, null, results);
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { navRoutes };
