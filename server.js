// Production caching only when explicitly enabled (NODE_ENV=production)
// Default: no cache, suitable for development
const IS_PROD = process.env.NODE_ENV === 'production';
const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ─── Translation API config (load from .env if exists) ───────
try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch(e) {}
// Hardcoded fallback for translation env vars if .env missing
if (!process.env.TRANSLATE_API_KEY && fs.existsSync('.env')) {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    });
  } catch(e) {}
}
// Feishu sync removed — product data no longer sourced from Feishu

// ─── API Server Proxy ───────────────────────────────────────────────
// All API, admin, and upload requests go to KitchenYuKoLiServer.
// Configurable via API_SERVER env var (default: http://127.0.0.1:8000).
const API_SERVER = process.env.API_SERVER || 'https://127.0.0.1:8000';
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const API_PATHS = ['/api/cms', '/api/public', '/api/translations', '/api/nav-config', '/admin'];

const apiProxy = createProxyMiddleware({
  target: API_SERVER,
  changeOrigin: true,
  // pathFilter has a bug in v2.0.9 that intercepts ALL requests;
  // use manual path checking via a wrapper middleware instead.
  logLevel: !IS_PROD ? 'warn' : 'silent',
  onError: (err, req, res) => {
    console.error('[proxy] error:', err.message, req.path);
    if (!res.headersSent) res.status(502).json({ error: 'API server unavailable' });
  }
});

// Wrapper: only pass matching paths to the proxy
const apiProxyGuard = (req, res, next) => {
  if (API_PATHS.some(p => req.originalUrl.startsWith(p))) {
    apiProxy(req, res, next);
  } else {
    next();
  }
};
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "maps.googleapis.com", "cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      connectSrc: ["'self'", "wa.me", "*.googleapis.com"],
      frameSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));

app.use(apiProxyGuard);
app.set('trust proxy', 1);

// Strict CSP for main site
// Remove problematic CORS headers after helmet (for non-HTTPS LAN origins)
const REMOVE_COEP = ['Cross-Origin-Embedder-Policy', 'Cross-Origin-Opener-Policy', 'Origin-Agent-Cluster'];
app.use((req, res, next) => {
  const origWriteHead = res.writeHead;
  res.writeHead = function(...args) {
    REMOVE_COEP.forEach(h => this.removeHeader(h));
    return origWriteHead.apply(this, args);
  };
  next();
});

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin, API, and static assets (all have their own protections)
    return req.path.startsWith('/admin') ||
           req.path.startsWith('/api/') ||
           req.path.startsWith('/assets/') ||
           req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm)$/);
  }
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

// ─── Quote Submission API (proxies to Google Apps Script) ─────────────
const GOOGLE_FORM_URL = process.env.GOOGLE_FORM_URL;
const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 3,                // max 3 submissions per IP per minute
  message: { error: '提交过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post('/api/quote-submit', quoteLimiter, express.json({ limit: '100kb' }), async (req, res) => {
  if (!GOOGLE_FORM_URL) {
    return res.status(503).json({ error: 'Quote service not configured' });
  }
  // Validate required fields
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  try {
    const response = await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error('[quote-submit] upstream error:', response.status);
      return res.status(502).json({ error: 'Submission service error' });
    }
    const text = await response.text();
    res.json({ ok: true });
  } catch (err) {
    console.error('[quote-submit] fetch error:', err.message);
    res.status(502).json({ error: 'Failed to submit quote' });
  }
});

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
  if (!IS_PROD) {
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
    // Main HTML entry - no cache for dev
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (isHtmlPage) {
    // All HTML pages - no cache for dev
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (isTranslation) {
    // Translation files - no cache for dev
    res.setHeader('Cache-Control', 'no-cache');
  } else if (isAsset) {
    if (IS_PROD) {
      // Static assets - long-term cache with immutable
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
      res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    } else {
      // Dev: no cache for static assets
      res.setHeader('Cache-Control', 'no-store');
    }
  } else {
    // Other routes
    res.setHeader('Cache-Control', IS_PROD ? 'public, max-age=300, must-revalidate' : 'no-store');
  }

  next();
});

// CMS admin panel — now served by KitchenYuKoLiServer via /admin proxy
// (local admin removed — all data/API goes through API_SERVER)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ═══ Trailing slash redirect for known route directories
// Handles /home → /home/, /products → /products/, etc.
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
    if (!IS_PROD) {
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
  res.redirect(301, '/home/');
});

// ─── Universal page resolver ─────────────────────────────────────────────
//
// Architecture: file-system as single source of truth.
// No hardcoded route lists.  New pages?  Just drop the HTML into dist/pages/.
//
// Resolution order (first match wins):
//   1. Exact file in dist/              (CSS, JS, images, fonts)
//   2. Exact file in dist/pages/        (SPA router fetches like /products/index-pc.html)
//   3. dist/pages/<path>/index.html     (SSG directory index)
//   4. dist/pages/<path>/index-pc.html  (SSG device-specific index)
//   5. dist/pages/<path>-pc.html        (flat-file pattern, e.g. news/detail-pc.html)
//   6. SPA shell (dist/index.html)      (catch-all — SPA router handles the rest)
//
// Security: only serves files under dist/ (and src/ in dev mode).
//

function resolvePage(reqPath) {
  var clean = reqPath.replace(/\/+$/, '');
  if (!clean) clean = '/';

  // 1. Exact file: dist/<reqPath>  (assets, fonts, images)
  var f = path.join(__dirname, 'dist', reqPath);
  if (isFile(f)) return f;

  // 2. Exact file: dist/pages/<reqPath>  (SPA router fetches)
  f = path.join(__dirname, 'dist', 'pages', reqPath);
  if (isFile(f)) return f;

  // 3–5. Page resolution under dist/pages/
  //    Try index.html → index-pc.html → <clean>-pc.html
  var candidates = [
    path.join(__dirname, 'dist', 'pages', clean, 'index.html'),
    path.join(__dirname, 'dist', 'pages', clean, 'index-pc.html'),
    path.join(__dirname, 'dist', 'pages', clean + '-pc.html'),
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (isFile(candidates[i])) return candidates[i];
  }

  // 6. SPA shell
  return path.join(__dirname, 'dist', 'index.html');
}

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch(e) { return false; }
}

app.get('*', (req, res) => {
  // Never intercept API routes
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });

  var resolved = resolvePage(req.path);
  if (resolved.endsWith('index.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  res.sendFile(resolved);
});

// Global error handling middleware
app.use((err, req, res, _next) => {
  console.error('Server error:', err);

  // Don't leak error details in production
  const isDevelopment = !IS_PROD;

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3099;
const SSL_PORT = process.env.SSL_PORT ? parseInt(process.env.SSL_PORT) : 3000;
const ENABLE_SSL = SSL_PORT > 0;
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

  if (!IS_PROD) {
    console.log('🔧 Development mode: Error details enabled');
  }

  // Feishu daily sync removed

  // Start HTTPS server (only if SSL_PORT > 0 — skip when behind reverse proxy)
  if (ENABLE_SSL) {
    const httpsServer = https.createServer(sslOptions, app);
    httpsServer.listen(SSL_PORT, (err) => {
      if (err) { console.error('Failed to start HTTPS server:', err); return; }
      console.log(`🔒 HTTPS running on https://192.168.3.181:${SSL_PORT}`);
    });
  }
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
