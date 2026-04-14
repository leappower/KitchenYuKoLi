'use strict';

const { authRoutes } = require('./auth');
const { categoriesRoutes } = require('./categories');
const { productsRoutes } = require('./products');
const { mediaRoutes } = require('./media');
const { publishRoutes } = require('./publish');

function createApiRouter(db) {
  const express = require('express');
  const router = express.Router();

  router.use(express.json({ limit: '10mb' }));

  router.use(authRoutes(db));
  router.use(categoriesRoutes(db));
  router.use(productsRoutes(db));
  router.use(mediaRoutes(db));
  router.use(publishRoutes(db));

  return router;
}

module.exports = { createApiRouter };
