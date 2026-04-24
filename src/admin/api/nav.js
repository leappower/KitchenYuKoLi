'use strict';

const { getDb, logAudit } = require('../db/init');

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
      const result = db.prepare(
        'INSERT INTO nav_items (parent_id, sort_order, is_active, i18n_key, default_label, path, icon, badge, target, group_key) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).run(parent_id || null, sort_order || 0, is_active !== undefined ? is_active : 1, i18n_key, default_label || '', path || '', icon || '', badge || 0, target || '', group_key || '');
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

  return router;
}

module.exports = { navRoutes };
