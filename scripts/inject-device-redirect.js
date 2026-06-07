#!/usr/bin/env node
/**
 * inject-device-redirect.js — 注入/更新所有页面的自包含设备重定向脚本
 *
 * 重定向逻辑（自包含，零依赖）：
 *   1. 检测 viewport 宽度判断设备类型
 *   2. 目录 URL（如 /home/）→ location.replace 跳到对应设备版本（不留历史）
 *   3. 已在设备版本（如 index-pc.html）→ replaceState 清理 URL（去掉 .html 后缀）
 *   4. SPA 导航中（__spaNavigating）→ 跳过
 *   5. ssg-device meta → 跳过
 *
 * 此脚本作为 build.sh 的一部分运行，每次构建都会执行。
 */

'use strict';

const fs = require('fs');
const path = require('path');

var SRC_DIR = path.resolve(__dirname, '..', 'src', 'pages');
var DIST_DIR = path.resolve(__dirname, '..', 'dist');

// ═══ 自包含重定向脚本 ═══════════════════════════════════════════════
// 行为：
//   目录 URL → location.replace 到对应设备版本（无历史记录）
//   设备版本 URL → replaceState 清理 URL（去掉 .html 后缀，显示干净路径）
//   SPA 导航 / ssg-device → 跳过
var REDIRECT_SCRIPT =
  '    <script>\n' +
  '    (function checkDevice(){\n' +
  '      if(window.__redirectChecked){return;}\n' +
  '      if(document.querySelector("meta[name=ssg-device]")){return;}\n' +
  '      window.__redirectChecked=true;\n' +
  '      var u=new URLSearchParams(location.search);\n' +
  '      var c=u.get("clean-url");\n' +
  '      if(c){history.replaceState({},"",c);return}\n' +
  '      if(window.__spaNavigating){return;}\n' +
  '      var f=location.pathname.split("/").pop();\n' +
  '      var dir=location.pathname.replace(/[^\\/]*$/,"");\n' +
  '      function getTarget(){\n' +
  '        var mq=window.matchMedia;\n' +
  '        var isPc=mq("(min-width:1024px)").matches;\n' +
  '        var isTb=mq("(min-width:768px) and (max-width:1023px)").matches;\n' +
  '        var isMb=mq("(max-width:767px)").matches;\n' +
  '        if(mq&&mq("(pointer:coarse)").matches&&!isPc){isMb=true;isTb=false;}\n' +
  '        return isPc?"index-pc.html":isTb?"index-tablet.html":"index-mobile.html";\n' +
  '      }\n' +
  '      var t=getTarget();\n' +
  '      if(!f||!f.match(/\\.html$/)){\n' +
  '        // 目录 URL → replace 跳到对应设备版本（不留历史记录）\n' +
  '        location.replace(dir+t);\n' +
  '        return;\n' +
  '      }\n' +
  '      if(f.match(/^index-(pc|mobile|tablet)\\.html$/)){\n' +
  '        // 已在设备版本 → replaceState 清理 URL，显示干净路径\n' +
  '        var clean=dir;\n' +
  '        if(location.pathname!==clean){history.replaceState({},"",clean);}\n' +
  '        return;\n' +
  '      }\n' +
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
  var rel = filePath.replace(/^.*?\/products\//, 'products/');
  var parts = rel.split('/').filter(Boolean);
  if (rel.startsWith('products/') && parts.length >= 4) return false;
  var content = fs.readFileSync(filePath, 'utf-8');
  return content.indexOf('<main') !== -1 || content.indexOf('navigator') !== -1;
}

// ═══ 注入 ═══════════════════════════════════════════════════════════

function injectRedirect(filePath) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var original = content;

  var hasOld = /__redirectChecked/.test(content);

  if (hasOld) {
    content = content.replace(
      /[\s]*<script>\s*\(function\s+checkDevice\(\)[\s\S]*?__redirectChecked[\s\S]*?<\/script>\s*/i,
      '\n' + REDIRECT_SCRIPT + '\n'
    );
  } else {
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
  if (fs.existsSync(DIST_DIR)) {
    var pagesDist = path.join(DIST_DIR, 'pages');
    if (fs.existsSync(pagesDist)) targetDirs.push(pagesDist);
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
