#!/usr/bin/env node
/**
 * inject-device-redirect.js — 注入/更新所有页面的自包含设备重定向脚本
 *
 * 替换 PC/Tablet/Mobile 页面中旧的 redirect 脚本（依赖 DeviceUtils），
 * 注入新的自包含脚本（不依赖任何外部 JS，仅用 window.innerWidth）。
 *
 * 同时为缺失脚本的页面（applications/index-pc.html、case studies）
 * 补充完整的 redirect 脚本。
 *
 * 此脚本作为 build.sh 的一部分运行，每次构建都会执行。
 *
 * 重定向逻辑（自包含，零依赖）：
 *   1. 读取当前 viewport 宽度（window.innerWidth）
 *   2. <768 → 期望 index-mobile.html
 *   3. 768-1279 → 期望 index-tablet.html
 *   4. >=1280 → 期望 index-pc.html
 *   5. 如果 URL 有文件名部分且等于期望 → 不跳转
 *   6. 否则（文件名不对、目录 URL、无 .html）→ 跳转到期望文件
 */

'use strict';

const fs = require('fs');
const path = require('path');

var SRC_DIR = path.resolve(__dirname, '..', 'src', 'pages');
var DIST_DIR = path.resolve(__dirname, '..', 'dist');

// ═══ 自包含重定向脚本 ═══════════════════════════════════════════════
// 零外部依赖。逻辑：
//   v = viewport 宽度
//   e = 当前设备对应的期望文件名（index-mobile/tablet/pc.html）
//   f = URL 中的文件名部分
//   如果有文件名且匹配 → 不跳转（已在正确版本）
//   否则（目录 URL、文件名不匹配）→ 跳转到期望文件
var REDIRECT_SCRIPT =
  '    <script>\n' +
  '    (function checkDevice(){\n' +
  '      if(window.__redirectChecked)return;\n' +
  '      if(document.querySelector("meta[name=ssg-device]"))return;\n' +
  '      window.__redirectChecked=true;\n' +
  '      var u=new URLSearchParams(location.search);\n' +
  '      var c=u.get("clean-url");\n' +
  '      if(c){history.replaceState({},"",c);return}\n' +
  '      if(window.__spaNavigating)return;\n' +
  '      var f=location.pathname.split("/").pop();\n' +
  '      if(!f||!f.match(/\.html$/)){\n' +
  '        // 目录 URL — 直接跳转到对应设备文件\n' +
  '        console.debug("[device-debug] dir URL, calling doRedirect",{f:f,path:location.pathname});\n' +
  '        doRedirect();\n' +
  '        return;\n' +
  '      }\n' +
  '      if(f.match(/^index-(pc|mobile|tablet)\.html$/))return;\n' +
  '      function doRedirect(){\n' +
  '        var mq = window.matchMedia;\n' +
  '        var isTouch = mq && mq("(pointer:coarse)").matches;\n' +
  '        var isMb = mq("(max-width:767px)").matches;\n' +
  '        var isTb = mq("(min-width:768px) and (max-width:1023px)").matches;\n' +
  '        var isPc = mq("(min-width:1024px)").matches;\n' +
  '        if (isTouch && !isPc) { isMb = true; isTb = false; }\n' +
  '        var e = isPc ? "index-pc.html" : isTb ? "index-tablet.html" : "index-mobile.html";\n' +
  '        console.debug("[device-debug] doRedirect",{f:f,e:e,mobile:isMb,tablet:isTb,pc:isPc,innerW:window.innerWidth,isTouch:isTouch});\n' +
  '        if(f===e){console.debug("[device-debug] skip, already on correct version");return;}\n' +
  '        var newUrl=location.pathname.replace(/[^\\/]*\.html$/,"")+e;\n' +
  '        console.debug("[device-debug] redirecting to",newUrl);\n' +
  '        location.href=newUrl;\n' +
  '      }\n' +
  '      doRedirect();\n' +
  '    })();\n' +
  '    </script>';


// ═══ 工具函数 ═══════════════════════════════════════════════════════

function findHtmlFiles(dir) {
  var results = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var fullPath = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath));
    } else if (entries[i].name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function needsRedirect(filePath) {
  // 跳过 entry-only 文件（无页面结构）
  if (filePath.indexOf('/products/detail/index.html') !== -1) return false;
  // 跳过产品详情页（SPA 路由，无设备三屏版本）
  // 路径模式：/products/{category}/{model}/index.html（三级路径 = 详情页）
  var rel = filePath.replace(/^.*?\/products\//, 'products/');
  var parts = rel.split('/').filter(Boolean);
  // products/stirfry/DLB-BQ40T/index.html → ['products','stirfry','DLB-BQ40T','index.html'] = 4 parts
  if (rel.startsWith('products/') && parts.length >= 4) return false;
  var content = fs.readFileSync(filePath, 'utf-8');
  return content.indexOf('<main') !== -1 || content.indexOf('navigator') !== -1;
}

// ═══ 注入 ═══════════════════════════════════════════════════════════

function injectRedirect(filePath) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var original = content;

  // Step 1: 是否已有旧的 redirect 脚本（包含 __redirectChecked）？
  var hasOld = /__redirectChecked/.test(content);

  if (hasOld) {
    // 替换包含 __redirectChecked 的 device-check <script> 块。
    // 需要精确匹配该 script 块，不能跨越其他 <script> 标签。
    // 注意：当前页面可能有 i18n-url-sync 等 script 在它前面。
    // 使用更精确的模式：匹配包含 checkDevice 函数定义的 <script>...</script>。
    content = content.replace(
      /[\s]*<script>\s*\(function\s+checkDevice\(\)[\s\S]*?__redirectChecked[\s\S]*?<\/script>\s*/i,
      '\n' + REDIRECT_SCRIPT + '\n'
    );
  } else {
    // 没有旧脚本：在最后一个 <link rel="alternate"> 后插入
    // 或直接在 </head> 前插入
    if (/<link\s+rel="alternate"/.test(content)) {
      var altLinks = content.match(/<link\s+rel="alternate"[^>]*>/g);
      var lastAlt = altLinks[altLinks.length - 1];
      content = content.replace(lastAlt, lastAlt + '\n' + REDIRECT_SCRIPT);
    } else {
      content = content.replace('</head>', '  ' + REDIRECT_SCRIPT + '\n  </head>');
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

// ═══ Main ═══════════════════════════════════════════════════════════

function main() {
  var targetDirs = [SRC_DIR];
  // If dist exists, also process dist subdirectories (SSG-generated route dirs)
  if (fs.existsSync(DIST_DIR)) {
    var pagesDist = path.join(DIST_DIR, 'pages');
    if (fs.existsSync(pagesDist)) targetDirs.push(pagesDist);
    // Also scan dist/ for SSG-generated files (excluding assets/ and pages/)
    var distChildren = fs.readdirSync(DIST_DIR);
    for (var di = 0; di < distChildren.length; di++) {
      var child = path.join(DIST_DIR, distChildren[di]);
      if (fs.statSync(child).isDirectory() && distChildren[di] !== 'assets' && distChildren[di] !== 'pages') {
        targetDirs.push(child);
      }
    }
  }

  var totalInjected = 0;
  var totalSkipped = 0;
  var totalErrors = 0;

  for (var d = 0; d < targetDirs.length; d++) {
    var dir = targetDirs[d];
    var relRoot = path.relative(path.resolve(__dirname, '..'), dir);
    console.log('[inject-device-redirect] Scanning: ' + relRoot);

    var files = findHtmlFiles(dir);
    var dirInjected = 0;
    var dirSkipped = 0;

    for (var i = 0; i < files.length; i++) {
      var filePath = files[i];
      var rel = path.relative(path.resolve(__dirname, '..'), filePath);

      try {
        if (needsRedirect(filePath)) {
          if (injectRedirect(filePath)) {
            console.log('  ✓ ' + rel);
            dirInjected++;
          } else {
            dirSkipped++;
          }
        }
      } catch (e) {
        console.error('  ✗ ' + rel + ': ' + e.message);
        totalErrors++;
      }
    }

    totalInjected += dirInjected;
    totalSkipped += dirSkipped;
    console.log('  → ' + dirInjected + ' injected, ' + dirSkipped + ' skipped');
  }

  console.log('');
  console.log('[inject-device-redirect] Done.');
  console.log('  Injected: ' + totalInjected + ' files');
  console.log('  Errors: ' + totalErrors);
}

main();