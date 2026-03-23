#!/usr/bin/env node
'use strict';

/**
 * fix-solutions-pages.js
 * 1. 为 6 个 solutions 子目录生成缺失的 index.html（SSG 入口）
 * 2. 修复所有 solutions 子页面的脚本引用（env.js/main.js → router.js + floating-actions.js）
 * 3. 为 automation 页面补充缺失的 OG 标签
 * 4. 修复 404 路由支持嵌套路径（solutions/fast-food）
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.resolve(__dirname, '..', 'src', 'pages');
const SOLUTIONS_DIR = path.join(PAGES_DIR, 'solutions');

const SUB_ROUTES = [
  'fast-food',
  'hotpot',
  'cloud-kitchen',
  'canteen',
  'southeast-asian',
  'automation',
];

function generateIndexHtml(slug) {
  var pcFile = path.join(SOLUTIONS_DIR, slug, 'index-pc.html');
  var title = 'Yukoli | Solutions';
  var description = '';
  try {
    var pcContent = fs.readFileSync(pcFile, 'utf-8');
    var titleMatch = pcContent.match(/<title>([^<]*)<\/title>/);
    if (titleMatch) title = titleMatch[1];
    var descMatch = pcContent.match(/<meta\s+name="description"\s+content="([^"]*)"/);
    if (descMatch) description = descMatch[1];
  } catch (e) { /* use defaults */ }

  var descTag = description
    ? '<meta name="description" content="' + description.replace(/"/g, '&quot;') + '">'
    : '';

  return '<!DOCTYPE html>\n' +
    '<html class="light" lang="zh-CN">\n' +
    '<head>\n' +
    '<meta charset="utf-8"/>\n' +
    '<link rel="canonical" href="/solutions/' + slug + '/"/>\n' +
    '<link rel="alternate" media="only screen and (max-width: 767px)" href="/solutions/' + slug + '/index-mobile.html"/>\n' +
    '<link rel="alternate" media="only screen and (min-width: 768px) and (max-width: 1279px)" href="/solutions/' + slug + '/index-tablet.html"/>\n' +
    '<link rel="alternate" media="only screen and (min-width: 1280px)" href="/solutions/' + slug + '/index-pc.html"/>\n' +
    '<meta content="width=device-width, initial-scale=1.0" name="viewport"/>\n' +
    '<title>' + title + '</title>\n' +
    (descTag ? descTag + '\n' : '') +
    '<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">\n' +
    '<script>\n' +
    '/* Responsive Entry — redirect to device-specific page */\n' +
    '(function(){\n' +
    '  if (window.__redirectChecked) return;\n' +
    '  window.__redirectChecked = true;\n' +
    '  var w = window.innerWidth;\n' +
    '  var target = w < 768 ? "index-mobile.html" : w < 1280 ? "index-tablet.html" : "index-pc.html";\n' +
    '  location.replace(target);\n' +
    '})();\n' +
    '</script>\n' +
    '</head>\n' +
    '<body class="bg-background-light dark:bg-background-dark">\n' +
    '<noscript><meta http-equiv="refresh" content="0;url=index-pc.html"></noscript>\n' +
    '<p>Loading...</p>\n' +
    '</body>\n' +
    '</html>';
}

function fixScriptReferences() {
  var fixed = 0;
  for (var si = 0; si < SUB_ROUTES.length; si++) {
    var slug = SUB_ROUTES[si];
    var dir = path.join(SOLUTIONS_DIR, slug);
    var files = fs.readdirSync(dir);
    for (var fi = 0; fi < files.length; fi++) {
      var file = files[fi];
      if (!file.endsWith('.html')) continue;
      var filePath = path.join(dir, file);
      var content = fs.readFileSync(filePath, 'utf-8');
      var changed = false;

      // Replace env.js with router.js
      if (content.indexOf('<script src="/assets/js/env.js"></script>') !== -1) {
        content = content.replace(
          '<script src="/assets/js/env.js"></script>',
          '<script defer src="/assets/js/router.js"></script>'
        );
        changed = true;
      }

      // Replace main.js with floating-actions.js
      if (content.indexOf('<script src="/assets/js/main.js"></script>') !== -1) {
        content = content.replace(
          '<script src="/assets/js/main.js"></script>',
          '<script defer src="/assets/js/ui/floating-actions.js"></script>'
        );
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        fixed++;
      }
    }
  }
  console.log('  Fixed script references in ' + fixed + ' files');
}

function fixOgTags(slug, title, description) {
  var variants = ['pc', 'tablet', 'mobile'];
  for (var vi = 0; vi < variants.length; vi++) {
    var vFile = path.join(SOLUTIONS_DIR, slug, 'index-' + variants[vi] + '.html');
    if (!fs.existsSync(vFile)) continue;
    var content = fs.readFileSync(vFile, 'utf-8');

    // Ensure og:type
    if (content.indexOf('og:type') === -1) {
      content = content.replace(
        '<meta property="og:title"',
        '<meta property="og:type" content="website">\n<meta property="og:title"'
      );
    }

    // Ensure og:url
    if (content.indexOf('og:url') === -1) {
      content = content.replace(
        '<meta property="og:title"',
        '<meta property="og:url" content="https://www.kitchen.yukoli.com/solutions/' + slug + '/">\n<meta property="og:title"'
      );
    }

    // Ensure og:image
    if (content.indexOf('og:image') === -1) {
      content = content.replace(
        '<meta property="og:title"',
        '<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-' + slug + '-solution.webp">\n<meta property="og:title"'
      );
    }

    // Ensure og:description
    if (content.indexOf('og:description') === -1) {
      content = content.replace(
        '<meta property="og:title" content="' + title + '">',
        '<meta property="og:title" content="' + title + '">\n<meta property="og:description" content="' + description + '">'
      );
    }

    fs.writeFileSync(vFile, content, 'utf-8');
    console.log('  Fixed OG tags: solutions/' + slug + '/index-' + variants[vi] + '.html');
  }
}

function fix404Routing() {
  var ssgFile = path.resolve(__dirname, '..', 'scripts', 'build-ssg.js');
  var content = fs.readFileSync(ssgFile, 'utf-8');

  var oldLogic = '    var segment = normalized.split("/").pop();\n' +
    '    if (routes.indexOf(segment) !== -1) {\n' +
    '      window.location.replace(base + "/" + segment + "/");\n' +
    '    }';

  var newLogic = '    // Try full path first (for nested routes like solutions/fast-food)\n' +
    '    var stripped = normalized.replace(/^\\//, "");\n' +
    '    if (routes.indexOf(stripped) !== -1) {\n' +
    '      window.location.replace(base + "/" + stripped + "/");\n' +
    '    } else {\n' +
    '      // Fallback: try last segment only\n' +
    '      var segment = normalized.split("/").pop();\n' +
    '      if (routes.indexOf(segment) !== -1) {\n' +
    '        window.location.replace(base + "/" + segment + "/");\n' +
    '      }\n' +
    '    }';

  if (content.indexOf(oldLogic) !== -1) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync(ssgFile, content, 'utf-8');
    console.log('  Fixed 404 routing for nested paths');
  } else {
    console.log('  404 routing already fixed or pattern not found');
  }
}

// ─── Main ───
console.log('=== Fix Solutions Pages ===\n');

// Step 1: Generate index.html for each sub-route
console.log('Step 1: Generating missing index.html entry files...');
for (var i = 0; i < SUB_ROUTES.length; i++) {
  var slug = SUB_ROUTES[i];
  var indexFile = path.join(SOLUTIONS_DIR, slug, 'index.html');
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(indexFile, generateIndexHtml(slug), 'utf-8');
    console.log('  Created: solutions/' + slug + '/index.html');
  } else {
    console.log('  Exists: solutions/' + slug + '/index.html');
  }
}

// Step 2: Fix script references
console.log('\nStep 2: Fixing script references...');
fixScriptReferences();

// Step 3: Fix OG tags for pages that are missing them
console.log('\nStep 3: Fixing missing OG tags...');
fixOgTags('automation', 'Yukoli | 降本增效智能厨房解决方案', '适用于各类餐饮场景的自动化改造方案，平均12-18个月收回投资成本，3年ROI达200%。');

// Step 4: Fix 404 routing
console.log('\nStep 4: Fixing 404 routing...');
fix404Routing();

console.log('\n=== Done ===');
