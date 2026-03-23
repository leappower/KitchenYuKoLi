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

// Route definitions: URL path → source directory name
// Each entry has a source page directory under src/pages/
const ROUTES = [
  { slug: 'home',         navId: 'home' },
  { slug: 'catalog',      navId: 'catalog' },
  { slug: 'case-studies', navId: 'case-studies' },
  { slug: 'case-download', navId: 'case-studies' },
  { slug: 'esg',          navId: 'esg' },
  { slug: 'roi',          navId: 'roi' },
  { slug: 'quote',        navId: 'quote' },
  { slug: 'support',      navId: 'support' },
  { slug: 'pdp',          navId: 'pdp' },
  { slug: 'thank-you',    navId: 'thank-you' },
  { slug: 'landing',      navId: 'landing' },
];

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
  var attrRegex = new RegExp('((?:src|href)\\s*=\\s*")(\\/(?!\\/|#))(?!' + bpName + '\\/)', 'g');
  html = html.replace(attrRegex, '$1' + bp + '$2');

  // 2. Patch inline JS: location.href = '/home/' and similar redirects
  //    Matches: location.href = '/path', window.location.replace('/path')
  var jsRegex1 = new RegExp("(location\\.href\\s*=\\s*'|window\\.location\\.replace\\(['\"])(\\/(?!\\/|#))(?!" + bpName + ")", 'g');
  html = html.replace(jsRegex1, '$1' + bp + '$2');

  // 3. Patch inline JS: history.replaceState(null, '', '/path')
  var jsRegex2 = new RegExp("(history\\.(?:push|replace)State\\([^,]*,\\s*[^,]*,\\s*')(" + bpName + ")", 'g');
  html = html.replace(jsRegex2, '$1' + bp + '$2');

  return html;
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
    log('WARN: No index.html found for route: ' + route.slug);
    return false;
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
 * Webpack already outputs these to dist/pages/<route>/
 * We copy them to dist/<route>/ so the directory URL structure works
 */
function copyDeviceFiles(route) {
  const srcPagesDir = path.join(DIST_DIR, 'pages', route.slug);
  const destRouteDir = path.join(DIST_DIR, route.slug);

  if (!fs.existsSync(srcPagesDir)) {
    log('WARN: No dist/pages/' + route.slug + '/ directory found');
    return 0;
  }

  ensureDir(destRouteDir);

  let copied = 0;
  const files = fs.readdirSync(srcPagesDir);
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    // Skip index.html — we generate our own with updated URLs
    if (file === 'index.html') continue;

    const srcFile = path.join(srcPagesDir, file);
    const destFile = path.join(destRouteDir, file);

    if (BASE_PATH) {
      let content = fs.readFileSync(srcFile, 'utf-8');
      content = patchHtmlPaths(content);
      fs.writeFileSync(destFile, content, 'utf-8');
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
    copied++;
  }

  return copied;
}

/**
 * Generate the root index.html that redirects to /home/
 * This is needed because GitHub Pages serves / as the entry point
 */
function generateRootIndex() {
  // Read the home entry file as a base
  const homeEntry = path.join(SRC_PAGES_DIR, 'home', 'index.html');
  if (!fs.existsSync(homeEntry)) {
    log('ERROR: src/pages/home/index.html not found');
    return false;
  }

  let html = fs.readFileSync(homeEntry, 'utf-8');

  // Update canonical URL to root
  var rootCanonical = 'https://www.kitchen.yukoli.com/' + (BASE_PATH ? BASE_PATH.replace(/^\//, '') + '/' : '');
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    '<link rel="canonical" href="' + rootCanonical + '"/>'
  );

  // Update OG URLs
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*>/gi,
    '<meta property="og:url" content="' + rootCanonical + '">'
  );

  // Update title
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    '<title>Yukoli Technology - Professional Kitchen Equipment</title>'
  );

  // Update og:title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*>/gi,
    '<meta property="og:title" content="Yukoli Technology - Professional Kitchen Equipment">'
  );

  // Replace responsive redirect with a single redirect to /home/
  // When BASE_PATH is set (e.g. /KitchenYuKoLi), redirect includes the prefix.
  var homePath = (BASE_PATH ? BASE_PATH + '/' : '') + 'home/';
  html = html.replace(
    /<script>\s*\/\*\s*Responsive entry[\s\S]*?<\/script>/i,
    '<script>location.href = \'' + homePath + '\';</script>'
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
  var bp = BASE_PATH; // alias for shorter references
  var routesJson = JSON.stringify(ROUTES.map(function (r) { return r.slug; }));
  var html = [
    '<!DOCTYPE html>',
    '<html class="light" lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Page Not Found - Yukoli Technology</title>',
    '  <meta name="description" content="The page you are looking for does not exist or has been moved.">',
    '  <meta property="og:type" content="website">',
    '  <meta property="og:title" content="Page Not Found - Yukoli Technology">',
    '  <meta property="og:description" content="The page you are looking for does not exist or has been moved.">',
    '  <meta property="og:url" content="https://www.kitchen.yukoli.com/' + (bp ? bp.replace(/^\//, '') + '/' : '') + '404.html">',
    '  <meta name="robots" content="noindex, follow">',
    '',
    '  <!-- Fonts & Styles (same as other pages) -->',
    '  <link rel="preload" href="' + bp + '/assets/fonts/local-fonts.css" as="style">',
    '  <link rel="preload" href="' + bp + '/assets/css/tailwind.css" as="style">',
    '  <link href="' + bp + '/assets/fonts/local-fonts.css" rel="stylesheet"/>',
    '  <link rel="stylesheet" href="' + bp + '/assets/css/tailwind.css">',
    '  <link rel="stylesheet" href="' + bp + '/assets/css/z-index-system.css">',
    '  <link rel="stylesheet" href="' + bp + '/assets/css/performance-optimized.css"/>',
    '',
    '  <style>',
    '    body { font-family: "Public Sans", sans-serif; min-height: 100dvh; }',
    '  </style>',
    '',
    '  <!-- Dark mode -->',
    '  <script>(function(){if(localStorage.getItem("darkMode")==="true")document.documentElement.classList.add("dark")})()</script>',
    '',
    '  <!-- Redirect script: /home → /home/, unknown → show 404 -->',
    '  <script>',
    '  (function () {',
    '    var base = "' + (bp || '') + '";',
    '    var path = window.location.pathname;',
    '    var normalized = path.replace(/\\/$/, "");',
    '    var routes = ' + routesJson + ';',
    '    var segment = normalized.split("/").pop();',
    '    if (routes.indexOf(segment) !== -1) {',
    '      window.location.replace(base + "/" + segment + "/");',
    '    }',
    '    // Unknown routes stay on this 404 page (no redirect)',
    '  }());',
    '  </script>',
    '',
    '  <!-- Favicon -->',
    '  <link rel="icon" href="' + bp + '/assets/images/logo_header.webp" type="image/webp">',
    '</head>',
    '<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-x-hidden">',
    '',
    '  <!-- Navigator placeholder (rendered by navigator.js) -->',
    '  <div id="navigator" data-variant="auto"></div>',
    '',
    '  <!-- 404 Content -->',
    '  <main class="flex-1 flex items-center justify-center px-6 py-20">',
    '    <div class="text-center max-w-lg">',
    '      <div class="mb-6">',
    '        <span class="text-8xl font-black tracking-tighter text-primary/20">404</span>',
    '      </div>',
    '      <h1 class="text-3xl md:text-4xl font-black tracking-tight mb-4" data-i18n="error_404_title">Page Not Found</h1>',
    '      <p class="text-slate-500 dark:text-slate-400 text-lg mb-8" data-i18n="error_404_message">',
    '        The page you are looking for does not exist or has been moved.',
    '      </p>',
    '      <div class="flex flex-col sm:flex-row gap-4 justify-center">',
    '        <a href="' + bp + '/home/" class="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl">',
    '          <span class="material-symbols-outlined mr-2" style="font-size:20px">home</span>',
    '          <span data-i18n="nav_home">Go Home</span>',
    '        </a>',
    '        <a href="' + bp + '/catalog/" class="inline-flex items-center justify-center px-8 py-3 border-2 border-slate-200 dark:border-slate-700 font-bold rounded-lg hover:border-primary hover:text-primary transition-colors">',
    '          <span class="material-symbols-outlined mr-2" style="font-size:20px">kitchen</span>',
    '          <span data-i18n="quote_equipment">Browse Equipment</span>',
    '        </a>',
    '      </div>',
    '    </div>',
    '  </main>',
    '',
    '  <!-- Footer placeholder (rendered by footer.js) -->',
    '  <div id="footer" data-variant="auto"></div>',
    '',
    '  <!-- Shared scripts (same as other pages) -->',
    '  <script defer src="' + bp + '/assets/js/router.js"></script>',
    '  <script defer src="' + bp + '/assets/js/lang-registry.js"></script>',
    '  <script defer src="' + bp + '/assets/js/translations.js"></script>',
    '  <script src="' + bp + '/assets/js/translations-dropdown-template.js"></script>',
    '  <script defer src="' + bp + '/assets/js/ui/navigator.js"></script>',
    '  <script defer src="' + bp + '/assets/js/ui/footer.js"></script>',
    '  <script defer src="' + bp + '/assets/js/ui/floating-actions.js"></script>',
    '  <script>',
    '  document.addEventListener("DOMContentLoaded", function () {',
    '    if (window.translationManager) window.translationManager.initialize();',
    '  });',
    '  </script>',
    '</body>',
    '</html>',
  ].join('\n');

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
