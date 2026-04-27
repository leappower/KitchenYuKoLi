'use strict';

const { initDatabase, getDb } = require('./db/init');
const { createApiRouter } = require('./api/index');
const path = require('path');
const fs = require('fs');

function initCMS(app) {
  const db = initDatabase();
  console.log('[CMS] Database initialized');

  // Mount API routes
  const apiRouter = createApiRouter(db);
  app.use('/api/cms', apiRouter);
  console.log('[CMS] API routes mounted at /api/cms');

  // Public nav config endpoint (no auth required — frontend needs this)
  app.get('/api/nav-config', (req, res) => {
    try {
      const items = db.prepare('SELECT * FROM nav_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
      // Build parent map (key = the frontend dropdown id like 'products', 'solutions')
      const parents = {};
      items.forEach(item => {
        if (!item.parent_id) {
          // Derive dropdown id from group_key or i18n_key
          // nav_products -> products, nav_solutions -> solutions, nav_service -> support
          var dropId = item.group_key;
          if (dropId === 'main') {
            dropId = item.i18n_key.replace('nav_', ''); // nav_products -> products
          }
          // Special mapping to match frontend nav-config.js keys
          if (dropId === 'service') dropId = 'support';
          if (dropId === 'applications') dropId = 'applications'; // already correct
          parents[item.id] = {
            key: item.i18n_key,
            label: item.default_label || item.i18n_key,
            path: item.path || '/',
            id: dropId,
            hasDropdown: !!(item.i18n_key && items.some(c => c.parent_id === item.id))
          };
        }
      });
      const mainNav = items.filter(i => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order).map(p => parents[p.id]);
      // Build dropdowns — key must match parent's id field
      const dropdowns = {};
      items.filter(i => i.parent_id).forEach(child => {
        const parent = parents[child.parent_id];
        if (!parent) return;
        const groupId = parent.id; // e.g. 'products', 'solutions'
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

  // Serve admin panel static files
  const adminDir = path.join(__dirname);
  app.use('/admin', (req, res, next) => {
    // Serve admin panel files
    if (req.path === '/' || req.path === '') {
      return res.sendFile(path.join(adminDir, 'index.html'));
    }
    const filePath = path.join(adminDir, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    // Fallback to index.html for SPA routing
    if (!req.path.includes('.')) {
      return res.sendFile(path.join(adminDir, 'index.html'));
    }
    res.status(404).json({ error: 'Not found' });
  });

  // Serve uploaded files
  const uploadsDir = path.join(__dirname, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/admin/uploads', require('express').static(uploadsDir));
  console.log('[CMS] Admin panel available at /admin');
}

module.exports = { initCMS };
