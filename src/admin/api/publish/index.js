'use strict';

// Main publish router — mounts product, SSG, and deploy sub-routes.
// Exported as publishRoutes with the same signature as the original single file.

const { productsRoutes } = require('./products');
const { ssgRoutes } = require('./ssg');
const { deployRoutes } = require('./deploy');

function publishRoutes(db) {
  const express = require('express');
  const router = express.Router();

  router.use(productsRoutes(db));
  router.use(ssgRoutes(db));
  router.use(deployRoutes(db));

  return router;
}

module.exports = { publishRoutes };
