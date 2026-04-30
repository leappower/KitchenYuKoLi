'use strict';

const { getDb } = require('../db/init');

function translationsRoutes(db) {
  const express = require('express');
  const router = express.Router();

  // GET /translations — get translations for a language (public, for frontend)
  // Query: ?lang=en
  router.get('/translations', (req, res) => {
    try {
      const { lang } = req.query;
      if (!lang) return res.status(400).json({ error: 'lang parameter is required' });

      const translations = db.prepare(
        'SELECT product_id, lang, name, specifications, usage, throughput FROM product_translations WHERE lang = ?'
      ).all(lang);

      // Build map: product_id → translation object
      const map = {};
      translations.forEach(t => {
        map[t.product_id] = {
          lang: t.lang,
          name: t.name || '',
          specifications: t.specifications || '',
          usage: t.usage || '',
          throughput: t.throughput || ''
        };
      });

      res.set('Cache-Control', 'public, max-age=3600');
      res.set('ETag', '"' + lang + '-' + translations.length + '-' + new Date().toISOString().slice(0, 13) + '"');
      res.json({ lang, translations: map, count: translations.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

module.exports = { translationsRoutes };
