'use strict';

const { authRoutes } = require('./auth');
const { categoriesRoutes } = require('./categories');
const { productsRoutes } = require('./products');
const { mediaRoutes } = require('./media');
const { publishRoutes } = require('./publish');
const { navRoutes } = require('./nav');
const { i18nRoutes } = require('./i18n');

function createApiRouter(db) {
  const express = require('express');
  const router = express.Router();

  router.use(express.json({ limit: '10mb' }));

  router.use(authRoutes(db));
  router.use(categoriesRoutes(db));
  router.use(productsRoutes(db));
  router.use(mediaRoutes(db));
  router.use(publishRoutes(db));
  router.use(navRoutes(db));
  router.use(i18nRoutes(db));

  return router;
}

module.exports = { createApiRouter };
