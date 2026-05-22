#!/usr/bin/env node
/**
 * build-ssg.js - Static Site Generator for GitHub Pages deployment
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * WHAT IS SSG AND WHY DO WE NEED IT?
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * SSG (Static Site Generation) converts the SPA (Single Page Application)
 * into a collection of static HTML files, one per route. This is necessary
 * because GitHub Pages is a pure static file server — it cannot run
 * server-side routing or SPA fallback (no .htaccess, no Express middleware).
 *
 * WITHOUT SSG (SPA mode):
 *   - User visits yukoli.com/catalog → GitHub Pages returns 404 (no such file)
 *   - SPA fallback (_redirects) doesn't work on GitHub Pages
 *   - Page refresh on any route breaks the site
 *   - Search engines may not index hash-based URLs (/#/catalog)
 *
 * WITH SSG (this script):
 *   - User visits yukoli.com/catalog/ → GitHub Pages serves dist/catalog/index.html ✅
 *   - Page refresh works everywhere ✅
 *   - Each page has real <title>, <meta>, OG tags for SEO ✅
 *   - First contentful paint is faster (no JS routing needed) ✅
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * HOW IT WORKS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This script runs AFTER webpack build. It:
 *
 * 1. For each route (home, catalog, case-studies, ...):
 *    - Reads src/pages/<route>/index.html (responsive entry)
 *    - Updates canonical URL and OG tags to directory format (/catalog/)
 *    - Writes to dist/<route>/index.html
 *    - Copies device files from dist/pages/<route>/ to dist/<route>/
 *
 * 2. Generates dist/index.html (root entry):
 *    - Redirects to /home/ based on screen width
 *    - This is the page served when visiting yukoli.com/
 *
 * 3. Generates dist/404.html:
 *    - Handles missing trailing slash (/home → /home/)
 *    - Redirects unknown routes to /home/
 *    - This is the page GitHub Pages uses for unmatched URLs
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * OUTPUT DIRECTORY STRUCTURE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *   dist/
 *     index.html          → / (redirects to /home/)
 *     404.html            → handles /home → /home/ redirect
 *     home/
 *       index.html        → /home/ (responsive redirect)
 *       index-pc.html     → /home/index-pc.html
 *       index-mobile.html → /home/index-mobile.html
 *       index-tablet.html → /home/index-tablet.html
 *     catalog/
 *       index.html        → /catalog/
 *       ...
 *     assets/             → /assets/ (JS, CSS, images, lang files)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * URL CHANGES
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *   Before (SPA):   yukoli.com/catalog     → 404 on GitHub Pages
 *   After (SSG):    yukoli.com/catalog/    → loads real HTML ✅
 *
 *   Note: URLs without trailing slash (/home) are handled by 404.html,
 *   which automatically redirects to /home/.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Prerequisite: Run webpack build first (this works with the dist/ output)
 *
 * Usage:
 *   node scripts/build-ssg.js [--clean]
 *
 * Options:
 *   --clean  Remove old route directories from dist before generating
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SRC_PAGES_DIR = path.resolve(__dirname, '..', 'src', 'pages');

// ─── Case slug alias map ──────────────────────────────────────────────
// Maps SSG directory names (derived from src/pages/cases/<city>/) to the
// SEO-friendly slug used in case-grid.js and roi-data.js.
// These generate alias directories at dist/cases/<slug>/ so that
// links like /cases/manila-lunchbox-studio-2025/ resolve correctly.
// ⚠️ Keep this in sync with src/assets/js/case-grid.js ROI_CASES[].slug
var CASE_SLUG_MAP = {
  'manila': 'manila-lunchbox-studio-2025',
  'jakarta': 'jakarta-catering-hub-2025',
  'hcmc': 'hcmc-cloud-kitchen-compact',
  'bangkok': 'bangkok-chain-8-stores',
  'kl': 'kl-canteen-2000-meals',
  'cebu': 'cebu-small-resto-payback',
  'surabaya': 'surabaya-central-automation',
  'hanoi': 'hanoi-street-food-modern',
};

// ─── Auto-discover routes from src/pages/ directory ───────
// Scans src/pages/ recursively for directories containing HTML files.
// Adding a new page directory under src/pages/ is all that's needed.
// Excludes: news/detail (dynamic SPA template, not a static route).
function discoverRoutes() {
  var routes = [];
  var excludeDirs = ['node_modules', '.git', 'assets'];
  var excludeSlugs = ['news/detail']; // dynamic SPA template, not a static route

  function walk(dir, prefix) {
    if (!fs.existsSync(dir)) return;
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      if (!entries[i].isDirectory()) continue;
      if (excludeDirs.indexOf(entries[i].name) !== -1) continue;
      var fullPath = path.join(dir, entries[i].name);
      var slug = prefix ? prefix + '/' + entries[i].name : entries[i].name;
      if (excludeSlugs.indexOf(slug) !== -1) { walk(fullPath, slug); continue; }
      var htmlFiles = fs.readdirSync(fullPath).filter(function (f) { return f.endsWith('.html'); });
      if (htmlFiles.length > 0) {
        var topSection = slug.split('/')[0];
        routes.push({ slug: slug, navId: topSection });
      }
      walk(fullPath, slug);
    }
  }

  walk(SRC_PAGES_DIR, '');
  routes.sort(function (a, b) {
    var aParts = a.slug.split('/'), bParts = b.slug.split('/');
    for (var i = 0; i < Math.min(aParts.length, bParts.length); i++) {
      if (aParts[i] !== bParts[i]) return aParts[i].localeCompare(bParts[i]);
    }
    return aParts.length - bParts.length;
  });
  return routes;
}

const ROUTES = discoverRoutes();

// Parse CLI args
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');
// basePath: prefix for sub-directory deployments (e.g. /KitchenYuKoLi)
// Affects all asset href/src paths and URL redirects in generated HTML.
const basePathArg = args.find(function (a) { return a.startsWith('--base-path='); });
const BASE_PATH = basePathArg ? basePathArg.replace('--base-path=', '').replace(/\/$/, '') : '';

function log(msg) {
  console.log('[build-ssg] ' + msg);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Patch HTML content to replace root-absolute asset paths with basePath-prefixed paths.
 *
 * When BASE_PATH is '/KitchenYuKoLi':
 *   src="/assets/js/foo.js" → src="/KitchenYuKoLi/assets/js/foo.js"
 *   href="/assets/css/bar.css" → href="/KitchenYuKoLi/assets/css/bar.css"
 *   href="/home/" → href="/KitchenYuKoLi/home/"
 *
 * Only modifies paths starting with "/" that are NOT:
 *   - protocol-relative (//...)
 *   - hash-only (/#...)
 *   - already prefixed with BASE_PATH
 *   - HTML anchor-only references (e.g. href="#section")
 *
 * Also handles inline script content like location.href = '/home/';
 */
function patchHtmlPaths(html) {
  if (!BASE_PATH) return html;

  // Ensure BASE_PATH doesn't have trailing slash for consistent replacement
  var bp = BASE_PATH.replace(/\/$/, '');
  // Extract the path part for negative lookahead (e.g., 'KitchenYuKoLi' from '/KitchenYuKoLi')
  var bpName = bp.replace(/^\//, '');

  // 0. Inject window.BASE_PATH for JS files to use
  // Insert after <head> tag
  var basePathScript = '<script>window.BASE_PATH="' + bp + '";</script>';
  html = html.replace(/<head>/i, '<head>\n' + basePathScript);

  // 1. Patch src= and href= attributes in HTML tags
  //    Match: src="/path" or href="/path" (not //, not /#, not already prefixed)
  //    $2 captures the leading "/", so we prepend bp (without extra slash)
  //    Only apply negative lookahead if bpName is not empty
  var attrPattern = bpName
    ? '((?:src|href)\\s*=\\s*")(\\/(?!\\/|#))(?!' + bpName + '\\/)'
    : '((?:src|href)\\s*=\\s*")(\\/(?!\\/|#))';
  var attrRegex = new RegExp(attrPattern, 'g');
  html = html.replace(attrRegex, '$1' + bp + '$2');

  // 2. Patch inline JS: location.href = '/home/' and similar redirects
  //    Matches: location.href = '/path', window.location.replace('/path')
  var jsPattern1 = bpName
    ? "(location\\.href\\s*=\\s*'|window\\.location\\.replace\\(['\"])(\\/(?!\\/|#))(?!" + bpName + ")"
    : "(location\\.href\\s*=\\s*'|window\\.location\\.replace\\(['\"])(\\/(?!\\/|#))";
  var jsRegex1 = new RegExp(jsPattern1, 'g');
  html = html.replace(jsRegex1, '$1' + bp + '$2');

  // 3. Patch inline JS: history.replaceState(null, '', '/path')
  var jsPattern2 = bpName
    ? "(history\\.(?:push|replace)State\\([^,]*,\\s*[^,]*,\\s*')(" + bpName + ")"
    : "(history\\.(?:push|replace)State\\([^,]*,\\s*[^,]*,\\s*')";
  var jsRegex2 = new RegExp(jsPattern2, 'g');
  html = html.replace(jsRegex2, '$1' + bp + '$2');

  return html;
}

/**
 * Inject lang-registry.js script tag before translations.js in HTML content.
 * This ensures all pages have lang-registry available before translations initializes,
 * regardless of whether the source HTML already includes it (idempotent check).
 *
 * The script is injected with `defer` to match the pattern used in pages that
 * already include it statically (e.g. home, landing, 404).
 */
function injectLangUrlSync(html) {
  // Already injected — skip (idempotent)
  if (/\[i18n-url-sync\]/.test(html)) return html;
  // Inject a synchronous script right after <head> that reads ?lang= URL parameter
  // and sets localStorage("userLanguage") so translations.js picks it up.
  // Must run BEFORE lang-registry.js / translations.js.
  var tag = '<script>/*[i18n-url-sync]*/(function(){var p=new URLSearchParams(location.search),l=p.get("lang");if(l){localStorage.setItem("userLanguage",l);document.documentElement.lang=l}})();</script>';
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/(<head[^>]*>)/i, '$1\n  ' + tag);
  } else {
    html = tag + '\n' + html;
  }
  return html;
}

function injectLangRegistry(html) {
  // Already has lang-registry.js — skip (idempotent)
  if (/lang-registry\.js/.test(html)) return html;

  // Insert before translations.js (which navigator.js depends on)
  // Pattern: <script ... src="/assets/js/translations.js">
  var bp = BASE_PATH ? BASE_PATH.replace(/\/$/, '') : '';
  var tag = '<script defer src="' + bp + '/assets/js/lang-registry.js"></script>\n    ';
  html = html.replace(
    /(\s*)(<script[^>]*src=["'][^"']*\/assets\/js\/translations\.js[^>]*>[^<]*<\/script>)/i,
    '$1' + tag + '$2'
  );

  return html;
}

function injectTranslationsDropdown(html) {
  // Already has translations-dropdown-template.js — skip (idempotent)
  if (/translations-dropdown-template\.js/.test(html)) return html;
  var bp = BASE_PATH ? BASE_PATH.replace(/\/$/, '') : '';
  var tag = '<script defer src="' + bp + '/assets/js/translations-dropdown-template.js"></script>';
  // Insert right after translations.js
  html = html.replace(
    /(\s*)(<script[^>]*src=["'][^"']*\/assets\/js\/translations\.js[^>]*>[^<]*<\/script>)/i,
    '$1$2\n    ' + tag
  );
  return html;
}

function injectSwupScripts(html) {
  // Already has swup.min.js — skip (idempotent)
  if (/swup\.min\.js/.test(html)) return html;

  var bp = BASE_PATH ? BASE_PATH.replace(/\/$/, '') : '';
  var swupTag =
    '    <script defer src="' + bp + '/assets/js/swup.min.js"></script>\n' +
    '    <script defer src="' + bp + '/assets/js/swup-head-plugin.min.js"></script>\n' +
    '    <script defer src="' + bp + '/assets/js/swup-preload-plugin.min.js"></script>';

  // Preferred: insert before spa-router.js
  var spaRouterPattern = /(<script[^>]*src=["'][^"']*\/assets\/js\/spa-router\.js[^>]*>[^<]*<\/script>)/i;
  if (spaRouterPattern.test(html)) {
    return html.replace(spaRouterPattern, swupTag + '\n    ' + '$1');
  }

  // Fallback: insert before </body>
  return html.replace(/<\/body>/i, swupTag + '\n  </body>');
}

/**
 * Normalize #spa-content container classes across all SSG pages.
 * Swup only replaces container INNER content, so container-level classes
 * must be consistent across pages to avoid layout breaks on SPA navigation.
 */
function normalizeSpaContent(html) {
  // Normalize main#spa-content: ensure flex-1 + overflow-x-clip.
  // Use overflow-x:clip instead of hidden — CSS spec forces
  // overflow-y:auto when overflow-x is hidden, creating a nested
  // vertical scrollbar inside main at 2048px+ wide viewports.
  // Append to existing class instead of replacing, so unique classes
  // (e.g. mobile pages' max-w-[1024px] mx-auto) are preserved.
  var required = ['flex-1', 'overflow-x-clip'];
  html = html.replace(
    /(<main\s+id="spa-content")(\s+class="([^"]*)")?/gi,
    function(match, open, classAttr, existing) {
      var merged = existing || '';
      for (var i = 0; i < required.length; i++) {
        if (merged.indexOf(required[i]) === -1) {
          merged += (merged ? ' ' : '') + required[i];
        }
      }
      return open + ' class="' + merged + '"';
    }
  );
  return html;
}

/**
 * Generate a minimal responsive entry page for routes that have device-specific
 * HTML files (index-pc.html etc.) but no src/pages/<route>/index.html entry point.
 *
 * This creates a responsive redirect similar to what the SPA normally does:
 * load device-specific file based on screen width.
 */
function generateResponsiveEntry(route) {
  var srcDir = path.join(SRC_PAGES_DIR, route.slug);
  var srcFile = path.join(srcDir, 'index-pc.html');
  if (!fs.existsSync(srcFile)) {
    srcFile = path.join(srcDir, 'index-mobile.html');
  }

  if (fs.existsSync(srcFile)) {
    var html = fs.readFileSync(srcFile, 'utf-8');
    var bp = BASE_PATH || '';
    var canonicalUrl = 'https://www.kitchen.yukoli.com/' + (bp ? bp.replace(/^\//, '') + '/' : '') + route.slug + '/';

    // Device-aware redirect: inject inline script to jump to correct version
    // on direct SSG hit (SPA fetch uses index-mobile.html etc. and skips this).
    // Device-aware redirect script (SSG直出时根据屏幕宽度跳转到正确版本)
    // SPA fetch不经过此路径，不会触发跳转
    // Note: JS string中 \\/ 输出为 \/，在HTML中成为正则字面量 \/index\.html$
        html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      '<link rel="canonical" href="' + canonicalUrl + '"/>'
    );
    html = html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*>/gi,
      '<meta property="og:url" content="' + canonicalUrl + '">'
    );
    html = injectLangUrlSync(html);
    html = injectLangRegistry(html);
    html = injectTranslationsDropdown(html);
    if (BASE_PATH) {
      html = patchHtmlPaths(html);
    }
    html = injectSwupScripts(html);
    html = normalizeSpaContent(html);
    return html;
  }

  // Fallback: minimal redirect (should never happen)
  var bp = BASE_PATH || '';
  var slug = route.slug;
  var canonicalUrl = 'https://www.kitchen.yukoli.com/' + (bp ? bp.replace(/^\//, '') + '/' : '') + slug + '/';
  var title = 'YuKoLi | Smart Kitchen Solutions - ' + slug.split('/').pop().replace(/-/g, ' ').replace(/\w\S*/g, function(w){return w.charAt(0).toUpperCase()+w.substr(1);});
  return [
    '<!DOCTYPE html>',
    '<html class="light" lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>' + title + '</title>',
    '  <link rel="canonical" href="' + canonicalUrl + '"/>',
    '  <meta property="og:url" content="' + canonicalUrl + '">',
    '  <meta property="og:type" content="website">',
    '  <meta property="og:title" content="' + title + '">',
    '  <meta name="robots" content="index, follow">',
    '  <script defer src="' + bp + '/assets/js/ui/navigator.js"></script>',
    '  <script defer src="' + bp + '/assets/js/lang-registry.js"></script>',
    '  <script defer src="' + bp + '/assets/js/translations.js"></script>',
    '  <script defer src="' + bp + '/assets/js/translations-dropdown-template.js"></script>',
    '</head>',
    '<body>',
    '  <navigator data-component="navigator" data-active="' + route.slug.split('/')[0] + '" data-search="true"></navigator>',
    '  <main id="spa-content" class="flex-1 overflow-x-hidden"></main>',
    '  <footer data-component="footer" data-active="' + route.slug.split('/')[0] + '"></footer>',
    '  <noscript>',
    '    <meta http-equiv="refresh" content="0;url=index-mobile.html?lang=en">',
    '  </noscript>',
    '  <p>Loading...</p>',
    '  <script defer src="' + bp + '/assets/js/spa-router.js"></script>',
    '</body>',
    '</html>'
  ].join('\n');
}

/**
 * Generate a route-specific index.html that serves as the directory entry.
 *
 * This file is similar to src/pages/<route>/index.html but with:
 * - Updated canonical URLs (clean directory paths)
 * - Updated OG URLs
 * - Same responsive redirect logic
 * - Correct asset paths (root-relative)
 */
function generateRouteIndex(route) {
  const srcDir = path.join(SRC_PAGES_DIR, route.slug);
  const srcEntryFile = path.join(srcDir, 'index.html');

  if (!fs.existsSync(srcEntryFile)) {
    // Auto-generate a responsive entry for routes without index.html
    // (e.g., case city pages like cases/manila/)
    log('AUTO: Generating responsive entry for route: ' + route.slug);
    const autoHtml = generateResponsiveEntry(route);
    const distRouteDir = path.join(DIST_DIR, route.slug);
    ensureDir(distRouteDir);
    const distFile = path.join(distRouteDir, 'index.html');
    fs.writeFileSync(distFile, autoHtml, 'utf-8');
    return true;
  }

  // Read the source entry file
  let html = fs.readFileSync(srcEntryFile, 'utf-8');

  // Update canonical URL to clean directory path
  const basePathPart = BASE_PATH ? BASE_PATH.replace(/^\//, '') + '/' : '';
  const canonicalUrl = 'https://www.kitchen.yukoli.com/' + basePathPart + route.slug + '/';
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    '<link rel="canonical" href="' + canonicalUrl + '"/>'
  );

  // Update OG URLs to clean directory path
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*>/gi,
    '<meta property="og:url" content="' + canonicalUrl + '">'
  );

  // Inject URL ?lang= parameter sync script (must be before lang-registry)
  html = injectLangUrlSync(html);
  // Inject lang-registry.js before translations.js (if not already present)
  html = injectLangRegistry(html);
  html = injectTranslationsDropdown(html);
  html = injectSwupScripts(html);
  html = normalizeSpaContent(html);

  // Patch all root-absolute paths with BASE_PATH prefix
  html = patchHtmlPaths(html);

  // Ensure the responsive redirect uses relative paths (it already does in source)
  // No change needed — 'index-mobile.html' etc. are relative

  // Write to dist/<slug>/index.html
  const distRouteDir = path.join(DIST_DIR, route.slug);
  ensureDir(distRouteDir);
  const distFile = path.join(distRouteDir, 'index.html');

  fs.writeFileSync(distFile, html, 'utf-8');
  return true;
}

/**
 * Copy device-specific files (index-pc.html, index-mobile.html, index-tablet.html)
 * from dist/pages/<route>/ to dist/<route>/
 *
 * Source is src/pages/<route>/
 * We copy them to dist/<route>/ so the directory URL structure works
 */
function copyDeviceFiles(route) {
  const srcPagesDir = path.join(SRC_PAGES_DIR, route.slug);
  const destRouteDir = path.join(DIST_DIR, route.slug);

  if (!fs.existsSync(srcPagesDir)) {
    log('WARN: No src/pages/' + route.slug + '/ directory found');
    return 0;
  }



  ensureDir(destRouteDir);

  let copied = 0;
  const files = fs.readdirSync(srcPagesDir);
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    // Skip index.html — we generate our own with updated URLs
    // Also skip src/pages/index.html (the SPA shell) — handled separately
    if (file === 'index.html') continue;

    const srcFile = path.join(srcPagesDir, file);
    const destFile = path.join(destRouteDir, file);

    let content = fs.readFileSync(srcFile, 'utf-8');
    // Inject URL ?lang= parameter sync script (must be before lang-registry)
    content = injectLangUrlSync(content);
    // Inject lang-registry.js before translations.js (if not already present)
    content = injectLangRegistry(content);
    content = injectTranslationsDropdown(content);
    content = injectSwupScripts(content);
    content = normalizeSpaContent(content);
    if (BASE_PATH) {
      content = patchHtmlPaths(content);
    }
    fs.writeFileSync(destFile, content, 'utf-8');
    copied++;

  }

  return copied;
}

/**
 * Generate the root index.html (SPA Shell)
 * Uses src/index.html as the base — the SPA shell with navigator, spa-content, footer.
 * SSG script only patches canonical/OG URLs; the SPA router handles navigation.
 */
function generateRootIndex() {
  // Use the SPA shell as base (not the MPA home entry)
  const spaShell = path.join(__dirname, '..', 'src', 'index.html');
  if (!fs.existsSync(spaShell)) {
    log('ERROR: src/index.html (SPA shell) not found');
    return false;
  }

  let html = fs.readFileSync(spaShell, 'utf-8');

  // Update canonical URL to root
  var rootCanonical = 'https://www.kitchen.yukoli.com/' + (BASE_PATH ? BASE_PATH.replace(/^\//, '') + '/' : '');
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    '<link rel="canonical" href="' + rootCanonical + '"/>'
  );

  // Update OG URLs
  html = html.replace(
    /<meta\s+property="og:url"\s*content="[^"]*"\s*>/gi,
    '<meta property="og:url" content="' + rootCanonical + '">'
  );

  // Patch all root-absolute paths with BASE_PATH prefix
  html = patchHtmlPaths(html);

  // Write to dist/index.html
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf-8');
  return true;
}

/**
 * Generate a 404.html that:
 * 1. Adds BASE_PATH prefix to all asset references
 * 2. Handles URL without trailing slash (/home → /home/)
 * 3. For known routes without trailing slash, redirects to the correct path
 * 4. For truly unknown routes, does NOT redirect (shows 404 page)
 *
 * GitHub Pages uses 404.html for any unmatched URL.
 */
function generate404() {
  var bp = BASE_PATH;
  // Include both SSG routes + case slug aliases for 404 redirect handling
  var allRoutes = ROUTES.map(function (r) { return r.slug; });
  // Add case slug aliases so /cases/manila-lunchbox-studio-2025 → /cases/manila-lunchbox-studio-2025/
  for (var _city in CASE_SLUG_MAP) {
    allRoutes.push('cases/' + CASE_SLUG_MAP[_city]);
  }
  var routesJson = JSON.stringify(allRoutes);
  var src404 = path.resolve(__dirname, '..', 'src', '404.html');
  if (!fs.existsSync(src404)) {
    log('  WARN: src/404.html not found, skipping 404 generation');
    return false;
  }
  var html = fs.readFileSync(src404, 'utf-8');

  var redirectScript =
    '  <!-- SSG redirect: missing trailing slash -->\n' +
    '  <script>\n' +
    '  (function () {\n' +
    '    var base = "' + (bp || '') + '";\n' +
    '    var path = window.location.pathname;\n' +
    '    var normalized = path.replace(/\\/$/, "");\n' +
    '    var routes = ' + routesJson + ';\n' +
    '    var categorySlugs = ["cutting","stirfry","frying","stewing","steaming","other","all","detail","compare"];\n' +
    '    if (/^\\/products\\//.test(path)) {\n' +
    '      var productSegment = path.replace(/^\\/products\\//, "").replace(/\\/$/, "");\n' +
    '      if (categorySlugs.indexOf(productSegment) !== -1 || productSegment) {\n' +
    '        window.location.replace(base + "/?redirect=" + encodeURIComponent(path));\n' +
    '      }\n' +
    '    }\n' +
    '    var stripped = normalized.replace(/^\\//, "");\n' +
    '    if (routes.indexOf(stripped) !== -1) {\n' +
    '      window.location.replace(base + "/" + stripped + "/");\n' +
    '    } else {\n' +
    '      var segment = normalized.split("/").pop();\n' +
    '      if (routes.indexOf(segment) !== -1) {\n' +
    '        window.location.replace(base + "/" + segment + "/");\n' +
    '      }\n' +
    '    }\n' +
    '  }());\n' +
    '  </script>';

  html = html.replace('</head>', redirectScript + '\n  </head>');
  if (bp) { html = patchHtmlPaths(html); }
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), html, 'utf-8');
  return true;
}

// ─── Main ────────────────────────────────────────────────────────

function main() {
  log('Starting SSG build...');
  log('Dist directory: ' + DIST_DIR);

  if (!fs.existsSync(DIST_DIR)) {
    log('ERROR: dist/ directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  if (shouldClean) {
    log('Cleaning old route directories from dist...');
    for (const route of ROUTES) {
      const routeDir = path.join(DIST_DIR, route.slug);
      if (fs.existsSync(routeDir)) {
        fs.rmSync(routeDir, { recursive: true });
        log('  Removed: ' + route.slug + '/');
      }
    }
    // Also clean case slug alias directories (from previous runs)
    for (const cityName of Object.keys(CASE_SLUG_MAP)) {
      const slugName = CASE_SLUG_MAP[cityName];
      const aliasDir = path.join(DIST_DIR, 'cases', slugName);
      if (fs.existsSync(aliasDir)) {
        fs.rmSync(aliasDir, { recursive: true });
        log('  Removed: cases/' + slugName + '/ (slug alias)');
      }
    }
    // Also clean root index.html and 404.html
    const rootIndex = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(rootIndex)) {
      fs.unlinkSync(rootIndex);
      log('  Removed: index.html (root)');
    }
    const notFoundFile = path.join(DIST_DIR, '404.html');
    if (fs.existsSync(notFoundFile)) {
      fs.unlinkSync(notFoundFile);
      log('  Removed: 404.html');
    }
  }

  // Step 1: Generate route entry points
  log('\nStep 1: Generating route entry points...');
  let generatedRoutes = 0;
  for (const route of ROUTES) {
    const ok = generateRouteIndex(route);
    if (ok) {
      generatedRoutes++;
      log('  ✓ ' + route.slug + '/');
    }
  }

  // Step 2: Copy device-specific files from dist/pages/<route>/ to dist/<route>/
  log('\nStep 2: Copying device-specific files...');
  let totalCopied = 0;
  for (const route of ROUTES) {
    const n = copyDeviceFiles(route);
    if (n > 0) {
      log('  ✓ ' + route.slug + '/ (' + n + ' device files)');
      totalCopied += n;
    }
  }

  // Step 2.5: Create case slug alias directories (hard links)
  // This makes /cases/manila-lunchbox-studio-2025/ resolve to the same
  // content as /cases/manila/ without duplicating files on disk.
  log('\nStep 2.5: Creating case slug alias directories...');
  let aliasCount = 0;
  // Find all cases sub-routes from ROUTES
  for (const route of ROUTES) {
    const parts = route.slug.split('/');
    if (parts.length === 2 && parts[0] === 'cases') {
      const cityName = parts[1];
      const slugName = CASE_SLUG_MAP[cityName];
      if (slugName) {
        const srcPath = path.join(DIST_DIR, route.slug);
        const dstPath = path.join(DIST_DIR, 'cases', slugName);
        if (!fs.existsSync(srcPath)) {
          log('  WARN: Source dir not found: ' + route.slug + '/');
          continue;
        }
        // Skip if alias already exists (e.g. from a previous run)
        if (fs.existsSync(dstPath)) {
          log('  ~ ' + 'cases/' + slugName + '/ (already exists)');
        } else {
          ensureDir(dstPath);
          // Hard-link all files from city dir to slug dir
          const files = fs.readdirSync(srcPath);
          let linked = 0;
          for (const file of files) {
            const srcFile = path.join(srcPath, file);
            const dstFile = path.join(dstPath, file);
            try {
              fs.linkSync(srcFile, dstFile);
              linked++;
            } catch (e) {
              // Fallback: copy if link fails (e.g. across filesystems)
              fs.copyFileSync(srcFile, dstFile);
              linked++;
            }
          }
          log('  ✓ ' + 'cases/' + slugName + '/ (' + linked + ' files, hardlinked)');
          aliasCount++;
        }
      } else {
        log('  WARN: No slug alias for case city: ' + cityName);
      }
    }
  }
  if (aliasCount === 0) {
    log('  (none needed)');
  }

  // Step 3: Generate root index.html
  log('\nStep 3: Generating root index.html...');
  const rootOk = generateRootIndex();
  if (rootOk) {
    log('  ✓ / → redirects to /home/');
  }

  // Step 4: Generate 404.html (handles /home → /home/ redirects)
  log('\nStep 4: Generating 404.html...');
  var notFoundOk = generate404();
  if (notFoundOk) {
    log('  ✓ 404.html → redirects /home → /home/ and unknown → /home/');
  }

  // Step 5: Copy language files to dist/assets/lang/
  log('\nStep 5: Copying language files...');
  const srcLangDir = path.resolve(__dirname, '..', 'src', 'assets', 'lang');
  const distLangDir = path.join(DIST_DIR, 'assets', 'lang');
  if (fs.existsSync(srcLangDir)) {
    if (!fs.existsSync(distLangDir)) {
      fs.mkdirSync(distLangDir, { recursive: true });
    }
    const langFiles = fs.readdirSync(srcLangDir);
    let copiedLangFiles = 0;
    for (const file of langFiles) {
      const srcFile = path.join(srcLangDir, file);
      const destFile = path.join(distLangDir, file);
      fs.copyFileSync(srcFile, destFile);
      copiedLangFiles++;
    }
    log('  ✓ Copied ' + copiedLangFiles + ' language files to assets/lang/');
  } else {
    log('  ⚠ Language directory not found: ' + srcLangDir);
  }

  // Step 5.5: Overwrite JS files that webpack may have minified from stale cache.
  // CopyWebpackPlugin copies src/assets/js/* but webpack production mode can
  // re-minify them from a stale compilation, losing recent edits.
  log('\nStep 5.5: Copying fresh JS files from src...');
  var _srcJsDir = path.resolve(__dirname, '..', 'src', 'assets', 'js');
  var _distJsDir = path.join(DIST_DIR, 'assets', 'js');
  var _jsCopied = 0;
  function copyJsRecursive(srcDir, dstDir) {
    if (!fs.existsSync(srcDir)) return;
    if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
    var entries = fs.readdirSync(srcDir);
    for (var i = 0; i < entries.length; i++) {
      var srcPath = path.join(srcDir, entries[i]);
      var dstPath = path.join(dstDir, entries[i]);
      if (fs.statSync(srcPath).isDirectory()) {
        copyJsRecursive(srcPath, dstPath);
      } else if (entries[i].endsWith('.js')) {
        fs.copyFileSync(srcPath, dstPath);
        _jsCopied++;
      }
    }
  }
  copyJsRecursive(_srcJsDir, _distJsDir);
  if (_jsCopied > 0) log('  ✓ Copied ' + _jsCopied + ' JS files to assets/js/');

  // Step 5.6: Copy Swup + plugins from node_modules (for build:production / build:dev)
  var swupVendors = [
    { src: 'node_modules/swup/dist/Swup.umd.js', dest: 'swup.min.js' },
    { src: 'node_modules/@swup/head-plugin/dist/index.umd.js', dest: 'swup-head-plugin.min.js' },
    { src: 'node_modules/@swup/preload-plugin/dist/index.umd.js', dest: 'swup-preload-plugin.min.js' },
  ];
  var swupJsDir = path.join(DIST_DIR, 'assets', 'js');
  if (!fs.existsSync(swupJsDir)) fs.mkdirSync(swupJsDir, { recursive: true });
  for (var s = 0; s < swupVendors.length; s++) {
    var vSrc = path.resolve(__dirname, '..', swupVendors[s].src);
    var vDst = path.join(swupJsDir, swupVendors[s].dest);
    if (fs.existsSync(vSrc)) {
      fs.copyFileSync(vSrc, vDst);
      log('  ✓ swup vendor: ' + swupVendors[s].dest);
    }
  }

  // Step 6: Patch CSS files for basePath (font URLs in local-fonts.css)
  if (BASE_PATH) {
    log('\nStep 6: Patching CSS files for basePath...');
    const _cssDir = path.join(DIST_DIR, 'assets', 'css');
    const fontsCssPath = path.join(DIST_DIR, 'assets', 'fonts', 'local-fonts.css');
    
    // Patch local-fonts.css font URLs
    if (fs.existsSync(fontsCssPath)) {
      let cssContent = fs.readFileSync(fontsCssPath, 'utf-8');
      const bp = BASE_PATH.replace(/\/$/, '');
      // Replace url('/assets/fonts/...') with url('/KitchenYuKoLi/assets/fonts/...')
      // Match url('...') or url("...") or url(...)
      cssContent = cssContent.replace(/url\((['"])\/assets\/fonts\//g, 'url($1' + bp + '/assets/fonts/');
      fs.writeFileSync(fontsCssPath, cssContent, 'utf-8');
      log('  ✓ Patched local-fonts.css font URLs');
    }
  }

// Step 6.5: Inject components.css into all SSG pages and SPA shell
  // This replaces previously dynamic injectStyles() calls with static CSS.
  log('\nStep 6.5: Injecting components.css...');
  var _componentsCssPath = path.join(DIST_DIR, 'assets', 'css', 'components.css');
  var _componentsInjected = 0;

  // Copy components.css from src to dist
  var _srcComponentsCss = path.resolve(__dirname, '..', 'src', 'assets', 'css', 'components.css');
  if (fs.existsSync(_srcComponentsCss)) {
    fs.copyFileSync(_srcComponentsCss, _componentsCssPath);
    log('  ✓ Copied components.css to dist/assets/css/');
  } else {
    log('  ⚠ components.css not found at src/assets/css/components.css');
  }

  // Inject <link> into all HTML files in dist/
  function _injectComponentsCss(html) {
    if (html.indexOf('components.css') !== -1) return html; // already injected
    // Insert as the LAST <link> before </head> to ensure highest priority
    // (same as original JS injectStyles which appended <style> after all CSS)
    var tag = '  <link rel="stylesheet" href="/assets/css/components.css" />';
    // Insert before </head>
    html = html.replace('</head>', '  ' + tag + '\n</head>');
    return html;
  }

  // Ensure core CSS files (tailwind, styles) are present in all HTML files
  function _injectCoreCss(html) {
    var coreCss = [
      '/assets/css/styles.css',
      '/assets/css/tailwind.css',
      '/assets/css/z-index-system.css',
      '/assets/css/performance-optimizations.css',
    ];
    for (var ci = 0; ci < coreCss.length; ci++) {
      if (html.indexOf(coreCss[ci]) === -1) {
        // Find the last <link> tag before </head> and insert after it
        // This avoids matching substrings in href values of other links
        var linkPattern = /<link[^>]*href="[^"]*\.css"[^>]*\/>/gi;
        var matches = html.match(linkPattern);
        if (matches && matches.length > 0) {
          var lastLink = matches[matches.length - 1];
          html = html.replace(
            lastLink,
            lastLink + '\n    <link rel="stylesheet" href="' + coreCss[ci] + '" />'
          );
        } else {
          html = html.replace('</head>', '  <link rel="stylesheet" href="' + coreCss[ci] + '" />\n  </head>');
        }
      }
    }
    return html;
  }

  // Walk dist/ for all .html files
  function _injectLazyLoading(html) {
    // Add loading="lazy" to <img> tags that don't have loading= already.
    // Skip images with loading="eager" (hero images, above-the-fold).
    // Match <img ...> or <img ... /> closing patterns.
    html = html.replace(/<img\s+((?:(?!loading=)[^>])*)>/gi, function(match, attrs) {
      return '<img ' + attrs.trim() + ' loading="lazy">';
    });
    return html;
  }

  // Walk dist/ for all .html files
  function _walkHtml(dir) {
    if (!fs.existsSync(dir)) return;
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    var _lazyInjected = 0;
    entries.forEach(function (entry) {
      var fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        _walkHtml(fullPath);
      } else if (entry.name.endsWith('.html')) {
        var html = fs.readFileSync(fullPath, 'utf-8');
        var modified = _injectComponentsCss(html);
        modified = _injectCoreCss(modified);
        var lazyModified = _injectLazyLoading(modified);
        if (lazyModified !== modified) {
          _lazyInjected++;
          modified = lazyModified;
        }
        if (modified !== html) {
          fs.writeFileSync(fullPath, modified);
          _componentsInjected++;
        } else if (html.indexOf('/assets/css/styles.css') === -1 || html.indexOf('/assets/css/tailwind.css') === -1) {
          // Force inject core CSS even if _injectCoreCss returned unchanged.
          // Can happen if components.css link's href value was matched as substring.
          var coreCss2 = [
            '/assets/css/styles.css',
            '/assets/css/tailwind.css',
            '/assets/css/z-index-system.css',
            '/assets/css/performance-optimizations.css',
          ];
          var fixed = html;
          for (var ci2 = 0; ci2 < coreCss2.length; ci2++) {
            if (fixed.indexOf(coreCss2[ci2]) === -1) {
              fixed = fixed.replace('</head>', '  <link rel="stylesheet" href="' + coreCss2[ci2] + '" />\n  </head>');
            }
          }
          if (fixed !== html) {
            fs.writeFileSync(fullPath, fixed);
            _componentsInjected++;
          }
        }
      }
    });
    if (_lazyInjected > 0) log('  ✓ Injected loading=lazy into ' + _lazyInjected + ' HTML files');
  }

  _walkHtml(DIST_DIR);
  log('  ✓ Injected components.css into ' + _componentsInjected + ' HTML files');

  // Summary
  log('\n────────────────────────────────────────');
  log('SSG build complete!');
  log('  Routes generated: ' + generatedRoutes);
  log('  Device files copied: ' + totalCopied);
  log('  Root entry: ' + (rootOk ? 'OK' : 'FAILED'));
  log('  404 handler: ' + (notFoundOk ? 'OK' : 'FAILED'));
  log('');
  log('Directory structure:');
  log('  dist/');
  log('    index.html          → / (redirects to /home/)');
  log('    404.html            → handles /home → /home/ (no-trailing-slash)');
  for (var _ri = 0; _ri < ROUTES.length; _ri++) {
    log('    ' + ROUTES[_ri].slug + '/');
    log('      index.html        → /' + ROUTES[_ri].slug + '/');
    log('      index-pc.html     → /' + ROUTES[_ri].slug + '/index-pc.html');
    log('      index-mobile.html → /' + ROUTES[_ri].slug + '/index-mobile.html');
    log('      index-tablet.html → /' + ROUTES[_ri].slug + '/index-tablet.html');
  }
  log('    assets/               → /assets/ (JS, CSS, images, lang)');
}

main();
