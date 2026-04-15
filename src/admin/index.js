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
