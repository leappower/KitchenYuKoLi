const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { feishuProTables } = require('./scripts/generate-products-data-table.js');
const {
  runFeishuSyncOnce,
  startDailyFeishuSyncScheduler,
  buildFeishuConfigFromEnv,
  validateFeishuConfig
} = feishuProTables;

const app = express();

// Security middleware with comprehensive protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'https:', 'http:'],
      connectSrc: ['\'self\''],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Enable gzip/brotli compression with optimized settings
app.use(compression({
  level: 6, // Good balance between compression and speed
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Don't compress already compressed assets
    if (req.path.match(/\.(gz|br|zip|rar|7z)$/)) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Allowed origins for CORS (same-origin + production domain)
const ALLOWED_ORIGINS = new Set([
  'https://www.yukoli.com',
  'https://yukoli.com',
]);

// Additional security and performance headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // CORS — allow requests from same origin and production domain
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24h preflight cache
    res.setHeader('Vary', 'Origin');
  }

  // Handle OPTIONS preflight immediately — no further processing needed
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Remove server header for security
  res.removeHeader('X-Powered-By');

  next();
});

// Advanced caching middleware with content-based cache keys
app.use((req, res, next) => {
  // ─── Development: disable ALL HTTP caching for live reload ───
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    return next();
  }
  next();
});

// Production-only caching middleware with content-based cache keys
app.use((req, res, next) => {
  const isAsset = req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$/);
  const isTranslation = req.path.includes('/translations/');
  const isHtmlPage = req.path.match(/\.html$/i) || req.path === '/' || req.path === '/index.html';

  if (req.path === '/' || req.path === '/index.html') {
    // Main HTML entry - short cache to allow updates
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (isHtmlPage) {
    // All HTML pages - short cache to prevent stale content issues during back navigation
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (isTranslation) {
    // Translation files - keep short to avoid serving stale language files during updates
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
  } else if (isAsset) {
    // Static assets - long-term cache with immutable
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
    res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
  } else {
    // Other routes - short cache
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
  }

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Trailing slash redirect for known route directories
// Handles /home → /home/, /catalog → /catalog/, etc.
app.use((req, res, next) => {
  // Skip if path already ends with /
  if (req.path.endsWith('/')) return next();

  var cleanPath = req.path.replace(/\/+$/, '');
  if (cleanPath && cleanPath !== '/') {
    var dirPath = path.join(__dirname, 'dist', cleanPath);
    try {
      if (require('fs').statSync(dirPath).isDirectory()) {
        var target = cleanPath + '/' + (req.url.slice(req.path.length) || '');
        return res.redirect(301, target);
      }
    } catch (e) {
      // not a directory, continue
    }
  }
  next();
});

// Serve static files with advanced optimizations
// IMPORTANT: Disable index option to prevent Express from serving home/index.html
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: true,
  lastModified: true,
  maxAge: 0, // Let Cache-Control header handle caching
  index: false, // Disable default index file serving - we handle it explicitly
  setHeaders: (res, path) => {
    // Development: no cache at all
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      return;
    }
    const ext = path.split('.').pop().toLowerCase();

    // Set specific cache headers based on file type
    // Only allow long-term immutable caching for assets that include a content hash
    const isHashedAsset = /[.-][a-f0-9]{8,}\./i.test(path);

    if (['css', 'js'].includes(ext)) {
      if (isHashedAsset) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year for hashed assets
      } else {
        // Non-hashed JS/CSS should be short-lived to avoid stale clients
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
      }
    } else if (['png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2'].includes(ext)) {
      // Images: reasonable mid-term caching
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    } else if (ext === 'json') {
      // JSON (e.g. translations) should be short-lived unless versioned
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
    }

    // Removed incorrect preload hint for translations
  }
}));

// Explicit root route - serve SPA entry with SPA navigation
// The entry handler script in index.html will handle device-specific routing
// without page redirect, maintaining header/body/footer structure
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// SPA fallback with proper 404 handling
// Known SPA routes — always serve the root SPA shell, let the frontend router handle them
const SPA_ROUTES = ['/home', '/catalog', '/solutions', '/about', '/contact', '/quote',
  '/applications', '/thank-you', '/landing', '/pdp', '/roi-calculator'];

app.get('*', (req, res) => {
  // Only look inside dist/ — never expose project root files (scripts/, .env, etc.)
  const filePath = path.join(__dirname, 'dist', req.path);

  // Check if it's an exact file match (CSS, JS, images, etc.)
  if (require('fs').existsSync(filePath) && require('fs').statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  // Check if the path matches a known SPA route (with or without trailing slash)
  const cleanPath = req.path.replace(/\/+$/, '') || '/';
  if (SPA_ROUTES.includes(cleanPath)) {
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Check if path is a directory with index.html (e.g. /some/route/)
  const indexPath = path.join(__dirname, 'dist', req.path, 'index.html');
  if (require('fs').existsSync(indexPath) && require('fs').statSync(indexPath).isFile()) {
    res.sendFile(indexPath);
  } else {
    // For unknown routes, serve root SPA shell (SPA router will show 404 if needed)
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Global error handling middleware
app.use((err, req, res, _next) => {
  console.error('Server error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
const SSL_PORT = parseInt(process.env.SSL_PORT) || 5443;
const https = require('https');
const sslOptions = {
  key: fs.readFileSync('/Users/chee/certs/192.168.3.181-key.pem'),
  cert: fs.readFileSync('/Users/chee/certs/192.168.3.181-new.pem'),
};

// Start server with error handling
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }

  console.log(`🚀 Optimized static server running on http://localhost:${PORT}`);
  console.log('📦 Compression: Enabled');
  console.log('🔒 Security headers: Enhanced');
  console.log('💾 Advanced caching: Enabled');
  console.log('🛡️  Rate limiting: Enabled');
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);

  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode: Error details enabled');
  }

  const feishuConfig = buildFeishuConfigFromEnv();
  if (validateFeishuConfig(feishuConfig)) {
    runFeishuSyncOnce()
      .then((result) => {
        console.log('[feishu-sync] initial sync finished:', JSON.stringify(result));
      })
      .catch((err) => {
        console.error('[feishu-sync] initial sync failed:', err.message);
      });
  } else {
    console.log('[feishu-sync] initial sync skipped: missing FEISHU env config');
  }

  startDailyFeishuSyncScheduler();
  console.log('[feishu-sync] daily scheduler enabled (04:00)');

  // Start HTTPS server
  const httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(SSL_PORT, (err) => {
    if (err) { console.error('Failed to start HTTPS server:', err); return; }
    console.log(`🔒 HTTPS running on https://192.168.3.181:${SSL_PORT}`);
  });
});

// Graceful shutdown with connection draining
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully`);

  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
