// Production caching only when explicitly enabled (NODE_ENV=production)
// Default: no cache, suitable for development
const IS_PROD = process.env.NODE_ENV === "production";
const express = require("express");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ─── Translation API config (load from .env if exists) ───────
try {
  const dotenv = require("dotenv");
  dotenv.config();
} catch (e) {}
// Hardcoded fallback for translation env vars if .env missing
if (!process.env.TRANSLATE_API_KEY && fs.existsSync(".env")) {
  try {
    const envContent = fs.readFileSync(".env", "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    });
  } catch (e) {}
}
// Product sync removed — product data is now static

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "maps.googleapis.com", "cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        connectSrc: ["'self'", "wa.me", "*.googleapis.com", "script.google.com", "script.googleusercontent.com"],
        frameSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.set("trust proxy", 1);

// Strict CSP for main site
// Remove problematic CORS headers after helmet (for non-HTTPS LAN origins)
const REMOVE_COEP = ["Cross-Origin-Embedder-Policy", "Cross-Origin-Opener-Policy", "Origin-Agent-Cluster"];
app.use((req, res, next) => {
  const origWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    REMOVE_COEP.forEach((h) => this.removeHeader(h));
    return origWriteHead.apply(this, args);
  };
  next();
});

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin, API, and static assets (all have their own protections)
    return (
      req.path.startsWith("/admin") ||
      req.path.startsWith("/api/") ||
      req.path.startsWith("/assets/") ||
      req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm)$/)
    );
  },
});

app.use(limiter);

// Enable gzip/brotli compression with optimized settings
app.use(
  compression({
    level: 6, // Good balance between compression and speed
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      // Don't compress already compressed assets
      if (req.path.match(/\.(gz|br|zip|rar|7z)$/)) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// ─── Unified Form Submission API (proxies to Google Apps Script) ─────────────
const GOOGLE_FORM_URL = process.env.GOOGLE_FORM_URL;
const formLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post("/api/form-submit", formLimiter, express.json({ limit: "100kb" }), async (req, res) => {
  if (!GOOGLE_FORM_URL) {
    console.warn("[form-submit] GOOGLE_FORM_URL not configured, logging payload instead");
    console.log("[form-submit]", JSON.stringify(req.body));
    return res.status(503).json({ ok: false, error: "Form service not configured" });
  }
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }
  try {
    const response = await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "manual", // Google Apps Script returns 302 after processing; don't follow
    });
    // Google Apps Script processes doPost before redirecting, so 302 = data written successfully
    if (response.status === 302 || response.ok) {
      console.log("[form-submit] OK source=" + (body.source || "unknown"));
      return res.json({ ok: true });
    }
    console.error("[form-submit] upstream error:", response.status);
    res.status(502).json({ ok: false, error: "Submission service error" });
  } catch (err) {
    console.error("[form-submit] fetch error:", err.message);
    res.status(502).json({ ok: false, error: "Failed to submit" });
  }
});

// ─── Legacy quote-submit (backward compat, redirects to unified) ─────
const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: "提交过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post("/api/quote-submit", quoteLimiter, express.json({ limit: "100kb" }), async (req, res) => {
  if (!GOOGLE_FORM_URL) {
    return res.status(503).json({ error: "Quote service not configured" });
  }
  // Validate required fields
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }
  try {
    const response = await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "manual", // Google Apps Script returns 302 after processing; don't follow
    });
    // Google Apps Script processes doPost before redirecting, so 302 = data written successfully
    if (response.status === 302 || response.ok) {
      console.log("[quote-submit] OK source=" + (body.source || body.formType || "unknown"));
      return res.json({ ok: true });
    }
    console.error("[quote-submit] upstream error:", response.status);
    res.status(502).json({ error: "Submission service error" });
  } catch (err) {
    console.error("[quote-submit] fetch error:", err.message);
    res.status(502).json({ error: "Failed to submit quote" });
  }
});

// Allowed origins for CORS (same-origin + production domain)
const ALLOWED_ORIGINS = new Set(["https://www.yukoli.com", "https://yukoli.com"]);

// Additional security and performance headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CORS — allow requests from same origin and production domain
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    res.setHeader("Access-Control-Max-Age", "86400"); // 24h preflight cache
    res.setHeader("Vary", "Origin");
  }

  // Handle OPTIONS preflight immediately — no further processing needed
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Remove server header for security
  res.removeHeader("X-Powered-By");

  next();
});

// Advanced caching middleware with content-based cache keys
app.use((req, res, next) => {
  // ─── Development: disable ALL HTTP caching for live reload ───
  if (!IS_PROD) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    return next();
  }
  next();
});

// Production-only caching middleware with content-based cache keys
app.use((req, res, next) => {
  const isAsset = req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$/);
  const isTranslation = req.path.includes("/translations/");
  const isHtmlPage = req.path.match(/\.html$/i) || req.path === "/" || req.path === "/index.html";

  if (req.path === "/" || req.path === "/index.html") {
    // Main HTML entry - no cache for dev
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Vary", "Accept-Encoding");
  } else if (isHtmlPage) {
    // All HTML pages - no cache for dev
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Vary", "Accept-Encoding");
  } else if (isTranslation) {
    // Translation files - no cache for dev
    res.setHeader("Cache-Control", "no-cache");
  } else if (isAsset) {
    if (IS_PROD) {
      // Static assets - long-term cache with immutable
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      res.setHeader("Cache-Control", `public, max-age=${maxAge}, immutable`);
      res.setHeader("Expires", new Date(Date.now() + maxAge * 1000).toUTCString());
    } else {
      // Dev: no cache for static assets
      res.setHeader("Cache-Control", "no-store");
    }
  } else {
    // Other routes
    res.setHeader("Cache-Control", IS_PROD ? "public, max-age=300, must-revalidate" : "no-store");
  }

  next();
});

// CMS admin panel — removed (all data served locally via SSG + static files)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Known routes list (SSG-generated) — used by resolvePage for non-trailing-slash redirects ───
var ROUTE_SLUGS = [
  "home",
  "about",
  "contact",
  "privacy",
  "terms",
  "thank-you",
  "quote",
  "profit-calculator",
  "products",
  "products/all",
  "products/compare",
  "products/cutting",
  "products/detail",
  "products/frying",
  "products/other",
  "products/steaming",
  "products/stewing",
  "products/stirfry",
  "applications",
  "applications/canteen",
  "applications/central-kitchen",
  "applications/chain-restaurant",
  "applications/cloud-kitchen",
  "applications/food-factory",
  "applications/menu-lab",
  "applications/small-restaurant",
  "cases",
  "cases/bangkok",
  "cases/cebu",
  "cases/hanoi",
  "cases/hcmc",
  "cases/jakarta",
  "cases/kl",
  "cases/manila",
  "cases/surabaya",
  "support",
  "support/faq",
  "support/installation",
  "support/services",
  "support/spare-parts",
  "support/training",
  "support/warranty",
];

// ═══ Trailing slash redirect for known route directories
// Handles /home → /home/, /products → /products/, etc.
app.use((req, res, next) => {
  // Skip if path already ends with /
  if (req.path.endsWith("/")) return next();

  var cleanPath = req.path.replace(/\/+$/, "");
  if (cleanPath && cleanPath !== "/") {
    var dirPath = path.join(__dirname, "dist", cleanPath);
    try {
      if (require("fs").statSync(dirPath).isDirectory()) {
        var target = cleanPath + "/" + (req.url.slice(req.path.length) || "");
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
app.use(
  express.static(path.join(__dirname, "dist"), {
    etag: true,
    lastModified: true,
    maxAge: 0, // Let Cache-Control header handle caching
    index: false, // Disable default index file serving - we handle it explicitly
    setHeaders: (res, path) => {
      // Development: short cache for CSS/JS to avoid redundant downloads during SPA nav
      if (!IS_PROD) {
        const ext = path.split(".").pop().toLowerCase();
        if (["css", "js"].includes(ext)) {
          res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.setHeader("Pragma", "no-cache");
        }
        return;
      }
      const ext = path.split(".").pop().toLowerCase();

      // Set specific cache headers based on file type
      // Only allow long-term immutable caching for assets that include a content hash
      const isHashedAsset = /[.-][a-f0-9]{8,}\./i.test(path);

      if (["css", "js"].includes(ext)) {
        if (isHashedAsset) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 year for hashed assets
        } else {
          // Non-hashed JS/CSS should be short-lived to avoid stale clients
          res.setHeader("Cache-Control", "public, max-age=300, must-revalidate"); // 5 minutes
        }
      } else if (["png", "jpg", "jpeg", "gif", "ico", "svg", "woff", "woff2"].includes(ext)) {
        // Images: reasonable mid-term caching
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days
      } else if (ext === "json") {
        // JSON (e.g. translations) should be short-lived unless versioned
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate"); // 5 minutes
      }

      // Removed incorrect preload hint for translations
    },
  })
);

// Explicit root route - serve SPA entry with SPA navigation
// The entry handler script in index.html will handle device-specific routing
// without page redirect, maintaining header/body/footer structure
app.get("/", (req, res) => {
  res.redirect(301, "/home/");
});

// ─── Universal page resolver ─────────────────────────────────────────────
//
// Architecture: SSG-first. All pages built by build-ssg.js to dist/<route>/
// No dist/pages/ fallback — that directory is a webpack intermediate.
//
// Resolution order (first match wins):
//   1. Exact file in dist/              (CSS, JS, images, fonts)
//   2. dist/<path>/index.html           (SSG route entry — preferred)
//   2b. Variant fallback: index-{mobile,tablet,pc}.html -> index.html
//   2c. Case slug alias resolution      (SEO slug -> short-name directory)
//   3. dist/<path>-pc.html              (flat-file pattern, e.g. news/detail-pc.html)
//   4. dist/404.html                    (fallback for unknown routes)
//   5. dist/index.html                  (SPA shell, last resort)
//
// Security: only serves files under dist/ (and src/ in dev mode).
//

function isMobileUA(ua) {
  var u = (ua || "").toLowerCase();
  // Explicity tablet keywords
  if (/tablet|ipad|playbook|silk/i.test(u)) return "tablet";
  // Explicit mobile keywords
  if (/mobi|iphone|ipod|blackberry|iemobile|opera mini|fennec/i.test(u)) return "mobile";
  // Android without 'Mobile' in UA: check model names
  // True tablets: SM-T, SM-X, Lenovo Tab, Xiaomi Pad
  // Phone models: Pixel, Galaxy S/Note/Z, OnePlus, Xiaomi [number]
  if (/android/i.test(u)) {
    var mobileModels =
      /pixel|galaxy s|galaxy note|galaxy z|oneplus|mi [0-9]|redmi|oppo|vivo|huawei.*(?:p[0-9]|mate|nova)/i;
    var tabletModels = /sm-t|sm-x|tab |tb-|lenovo tab|xiaomi pad|honor pad/i;
    if (tabletModels.test(u)) return "tablet";
    if (mobileModels.test(u)) return "mobile";
    // Default Android to mobile (most Android devices are phones)
    return "mobile";
  }
  return "pc";
}

function resolvePage(reqPath, ua) {
  var clean = reqPath.replace(/\/+$/, "");
  if (!clean) clean = "/";
  var variantIdx = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };

  // 1. Exact file: dist/<reqPath>  (assets, fonts, images, index-{mobile,pc,tablet}.html)
  var f = path.join(__dirname, "dist", reqPath);
  if (isFile(f)) return f;

  // 2. dist/<path>/index.html (SSG-generated route entry)
  f = path.join(__dirname, "dist", clean, "index.html");
  if (isFile(f)) {
    // Device-aware: check UA and serve variant directly if available
    var deviceFile = path.join(__dirname, "dist", clean, variantIdx[isMobileUA(ua)]);
    if (isFile(deviceFile)) {
      return deviceFile;
    }
    return f;
  }

  // 2b. Variant fallback: index-{pc,mobile,tablet}.html → index.html
  //     When SPA fetches /cases/<city>/index-pc.html, serve index.html instead.
  if (/\/index-(pc|mobile|tablet)\.html$/.test(reqPath)) {
    var variantFallback = reqPath.replace(/\/index-(pc|mobile|tablet)\.html$/, "/index.html");
    f = path.join(__dirname, "dist", variantFallback);
    if (isFile(f)) return f;
  }

  // 2c. Case slug alias — resolve /cases/<seo-slug>/ to /cases/<short-name>/
  //     Required for dev mode (SSG hardlinks only exist after build.sh)
  var caseMatch = clean.match(/^\/cases\/([^/]+)$/);
  if (caseMatch) {
    var caseDir = caseMatch[1];
    var CASE_SLUG_MAP = {
      "manila-lunchbox-studio-2025": "manila",
      "jakarta-catering-hub-2025": "jakarta",
      "hcmc-cloud-kitchen-compact": "hcmc",
      "bangkok-chain-8-stores": "bangkok",
      "kl-canteen-2000-meals": "kl",
      "cebu-small-resto-payback": "cebu",
      "surabaya-central-automation": "surabaya",
      "hanoi-street-food-modern": "hanoi",
    };
    var shortName = CASE_SLUG_MAP[caseDir];
    if (shortName) {
      // Resolve to the short-name directory
      f = path.join(__dirname, "dist", "cases", shortName, "index.html");
      if (isFile(f)) {
        // Device-aware variant
        var variantFile = path.join(__dirname, "dist", "cases", shortName, variantIdx[isMobileUA(ua)]);
        if (isFile(variantFile)) return variantFile;
        return f;
      }
    }
  }

  // 3. dist/<path>-pc.html (flat-file pattern, e.g. news/detail-pc.html)
  f = path.join(__dirname, "dist", clean + "-pc.html");
  if (isFile(f)) return f;

  // 5. Unknown route — return 404.html.
  //    404.html is a complete page with navigator, footer, and 404 content.
  //    It also has JS that redirects known routes (e.g., /home → /home/).
  //    For truly unknown routes, it shows 'Page Not Found' without redirecting.
  var f404 = path.join(__dirname, "dist", "404.html");
  if (isFile(f404)) return f404;

  // 5. Last resort: SPA shell (fallback for servers without 404.html)
  return path.join(__dirname, "dist", "index.html");
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

app.get("*", (req, res) => {
  // Never intercept API routes
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });

  var CATEGORY_SLUGS = ["all", "cutting", "stirfry", "frying", "stewing", "steaming", "other", "compare", "detail"];
  var CATEGORY_NAME_TO_SLUG = {
    翻炒系列: "stirfry",
    切配系列: "cutting",
    煎炸系列: "frying",
    炖煮系列: "stewing",
    蒸煮系列: "steaming",
    辅助系列: "other",
  };
  var SLUG_TO_CATEGORY_NAME = {};
  Object.keys(CATEGORY_NAME_TO_SLUG).forEach(function (k) {
    SLUG_TO_CATEGORY_NAME[CATEGORY_NAME_TO_SLUG[k]] = k;
  });

  var clean = req.path.replace(/\/+$/, "");

  // New canonical route: /products/{slug}/{model}/
  var newMatch = clean.match(/^\/products\/([^/]+)\/([^/]+)$/);
  if (newMatch && CATEGORY_SLUGS.indexOf(newMatch[1]) >= 0) {
    var catSlug = newMatch[1];
    var modelSlug = newMatch[2];
    if (catSlug !== "detail" && catSlug !== "compare") {
      // Verify product exists before rendering detail template
      try {
        var _dataFile = path.join(__dirname, "src", "assets", "js", "product-data-table.js");
        if (isFile(_dataFile)) {
          var _dataContent = fs.readFileSync(_dataFile, "utf-8");
          var _lines = _dataContent.split("\n");
          var _productFound = false;
          for (var _li = 0; _li < _lines.length; _li++) {
            if (_lines[_li].indexOf(modelSlug) >= 0) {
              _productFound = true;
              break;
            }
          }
          if (!_productFound) {
            var _f404 = path.join(__dirname, "dist", "404.html");
            if (isFile(_f404)) return res.status(404).sendFile(_f404);
          }
        }
      } catch (e) {}

      var isMobile = isMobileUA(req.headers["user-agent"]);
      var variantIdx = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };
      var detailFile = path.join(__dirname, "dist", "products", "detail", variantIdx[isMobile] || "index-pc.html");
      if (!isFile(detailFile)) {
        detailFile = path.join(__dirname, "dist", "products", "detail", "index.html");
      }
      if (isFile(detailFile)) {
        var html = fs.readFileSync(detailFile, "utf-8");
        html = html.replace("<head>", '<head><meta name="product-model" content="' + modelSlug + '"/>');
        html = html.replace("<head>", '<head><meta name="product-category-slug" content="' + catSlug + '"/>');
        html = html.replace("<head>", '<head><meta name="ssg-device" content="1"/>');
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.send(html);
      }
    }
  }

  // Legacy route: /products/<model>/ (not a known category slug)
  var productMatch = clean.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    var productSlug = productMatch[1];
    if (CATEGORY_SLUGS.indexOf(productSlug) === -1) {
      // Try to look up the product's category to redirect to canonical URL
      try {
        var dataFile = path.join(__dirname, "src", "assets", "js", "product-data-table.js");
        if (isFile(dataFile)) {
          var dataContent = fs.readFileSync(dataFile, "utf-8");
          // Match JS object format:  category: "翻炒系列"
          // Also match JSON format:  "category": "翻炒系列"
          var catRegex = /["']?category["']?\s*:\s*"([^"]+)"/;
          var lines = dataContent.split("\n");
          var foundCat = null;
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(productSlug) >= 0) {
              // Search forward for the nearest category field
              for (var j = i; j < lines.length && j < i + 20; j++) {
                var cm = lines[j].match(catRegex);
                if (cm) {
                  foundCat = cm[1];
                  break;
                }
              }
              // If not found forward, try backward
              if (!foundCat) {
                for (var j = i; j >= 0 && j > i - 20; j--) {
                  var cm = lines[j].match(catRegex);
                  if (cm) {
                    foundCat = cm[1];
                    break;
                  }
                }
              }
              break;
            }
          }
          if (foundCat && CATEGORY_NAME_TO_SLUG[foundCat]) {
            var canonicalSlug = CATEGORY_NAME_TO_SLUG[foundCat];
            return res.redirect(301, "/products/" + canonicalSlug + "/" + productSlug + "/");
          }
        }
      } catch (e) {
        console.error("[product] Failed to lookup category for", productSlug, e);
      }

      // Fallback: serve detail template with redirect script
      var isMobile = isMobileUA(req.headers["user-agent"]);
      var variantIdx = { mobile: "index-mobile.html", tablet: "index-tablet.html", pc: "index-pc.html" };
      var detailFile = path.join(__dirname, "dist", "products", "detail", variantIdx[isMobile] || "index-pc.html");
      if (!isFile(detailFile)) {
        detailFile = path.join(__dirname, "dist", "products", "detail", "index.html");
      }
      if (isFile(detailFile)) {
        var html = fs.readFileSync(detailFile, "utf-8");
        html = html.replace("<head>", '<head><meta name="product-model" content="' + productSlug + '"/>');
        html = html.replace("<head>", '<head><meta name="ssg-device" content="1"/>');
        html = html.replace("<head>", '<head><meta name="product-redirect-legacy" content="1"/>');
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.send(html);
      }
    }
  }

  var resolved = resolvePage(req.path, req.headers["user-agent"]);

  // Device-aware delivery: inject ssg-device meta so client-side redirect skips
  // Note: index-mobile.html and index-tablet.html do NOT end with 'index.html',
  // so we must check the full filename pattern, not filter by endsWith first.
  if (/index-(mobile|tablet|pc)\.html$/.test(resolved)) {
    var content = fs.readFileSync(resolved, "utf-8");
    content = content.replace("<head>", '<head><meta name="ssg-device" content="1"/>');
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.send(content);
  }

  if (resolved.endsWith("index.html")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
  }
  res.sendFile(resolved);
});

// Global error handling middleware
app.use((err, req, res, _next) => {
  console.error("Server error:", err);

  // Don't leak error details in production
  const isDevelopment = !IS_PROD;

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : "Internal Server Error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = process.env.PORT || 3099;
const SSL_PORT = process.env.SSL_PORT ? parseInt(process.env.SSL_PORT) : 3000;
const ENABLE_SSL = SSL_PORT > 0;
const https = require("https");
const sslOptions = {
  key: fs.readFileSync("/Users/chee/certs/192.168.3.180-key.pem"),
  cert: fs.readFileSync("/Users/chee/certs/192.168.3.180.pem"),
};

// Start server with error handling
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }

  console.log(`🚀 Optimized static server running on http://localhost:${PORT}`);
  console.log("📦 Compression: Enabled");
  console.log("🔒 Security headers: Enhanced");
  console.log("💾 Advanced caching: Enabled");
  console.log("🛡️  Rate limiting: Enabled");
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);

  if (!IS_PROD) {
    console.log("🔧 Development mode: Error details enabled");
  }

  // Product daily sync removed

  // Start HTTPS server (only if SSL_PORT > 0 — skip when behind reverse proxy)
  if (ENABLE_SSL) {
    const httpsServer = https.createServer(sslOptions, app);
    httpsServer.listen(SSL_PORT, (err) => {
      if (err) {
        console.error("Failed to start HTTPS server:", err);
        return;
      }
      const nets = require("os").networkInterfaces();
      const localIp =
        Object.values(nets)
          .flat()
          .find((i) => i.family === "IPv4" && !i.internal)?.address || "localhost";
      console.log(`🔒 HTTPS running on https://${localIp}:${SSL_PORT}`);
    });
  }
});

// Graceful shutdown with connection draining
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully`);

  server.close((err) => {
    if (err) {
      console.error("Error during server shutdown:", err);
      process.exit(1);
    }

    console.log("Server closed successfully");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = app;
