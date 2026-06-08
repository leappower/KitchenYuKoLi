#!/usr/bin/env node
/**
 * inject-device-redirect.js — device-redirect 脚本注入
 *
 * v9 — serve 对 .html 做 301，文件名检测兼容有无后缀
 */

'use strict';
const fs = require('fs');
const path = require('path');
var SRC_DIR = path.resolve(__dirname, '..', 'src', 'pages');
var DIST_DIR = path.resolve(__dirname, '..', 'dist');

var SCRIPT_JS = [
  '    <script>',
  '    (function checkDevice(){',
  '      if(window.__redirectChecked)return;',
  '      if(window.__spaNavigating)return;',
  '      window.__redirectChecked=true;',
  '      var u=new URLSearchParams(location.search);',
  '      var c=u.get("clean-url");',
  '      if(c){',
  '        history.replaceState({},"",c);',
  '        return;',
  '      }',
  '      var f=location.pathname.split("/").pop();',
  '      var dir=location.pathname.replace(/[^\\/]*$/,"");',
  '      // 设备版页面（有或无 .html 后缀）→ 不做任何操作',
  '      if(f.match(/^index-(pc|mobile|tablet)(\\.html)?$/))return;',
  '      // 目录 URL → 跳到对应设备版本（不带 .html 后缀，避免 serve 301）',
  '      function getTarget(){',
  '        var mq=window.matchMedia;',
  '        var isPc=mq("(min-width:1024px)").matches;',
  '        var isTb=mq("(min-width:768px) and (max-width:1023px)").matches;',
  '        var isMb=mq("(max-width:767px)").matches;',
  '        if(mq&&mq("(pointer:coarse)").matches&&!isPc){isMb=true;isTb=false;}',
  '        return isPc?"index-pc":isTb?"index-tablet":"index-mobile";',
  '      }',
  '      location.replace(dir+getTarget()+"?clean-url="+encodeURIComponent(dir));',
  '    })();',
  '    </script>'
].join('\n');

function findHtmlFiles(dir) {
  var results = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var fp = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) results = results.concat(findHtmlFiles(fp));
    else if (entries[i].name.endsWith('.html')) results.push(fp);
  }
  return results;
}
function needsRedirect(fp) {
  if (fp.indexOf('/products/detail/index.html') !== -1) return false;
  if (/products\/[^/]+\/[^/]+\//.test(fp)) return false;
  return /<main|navigator/.test(fs.readFileSync(fp, 'utf-8'));
}
function inject(fp) {
  var content = fs.readFileSync(fp, 'utf-8'), orig = content;
  if (/__redirectChecked/.test(content))
    content = content.replace(/[\s]*<script>\s*\(function\s+checkDevice\(\)[\s\S]*?__redirectChecked[\s\S]*?<\/script>\s*/i, '\n' + SCRIPT_JS + '\n');
  else {
    var m = content.match(/<link\s+rel="alternate"[^>]*>/g);
    content = content.replace(m ? m[m.length-1] : '</head>', (m ? m[m.length-1] : '</head>').replace('</head>', '') + '\n' + SCRIPT_JS + (m ? '' : '\n  </head>'));
    if (!m) content = content.replace(/^/, '  ') + '\n</head>';
  }
  if (content !== orig) { fs.writeFileSync(fp, content); return true; }
  return false;
}
function main() {
  var dirs = [SRC_DIR];
  if (fs.existsSync(DIST_DIR)) dirs.push(DIST_DIR, ...fs.readdirSync(DIST_DIR).filter(c => c !== 'assets' && c !== 'pages' && fs.statSync(path.join(DIST_DIR, c)).isDirectory()).map(c => path.join(DIST_DIR, c)));
  var total = 0, err = 0;
  dirs.forEach(d => { console.log('Scanning: ' + path.relative(__dirname, d)); findHtmlFiles(d).forEach(fp => { try { if (needsRedirect(fp) && inject(fp)) { console.log('  ✓ ' + path.relative(__dirname, fp)); total++; } } catch(e) { console.error('  ✗ ' + fp + ': ' + e.message); err++; } }); });
  console.log('\nDone. Injected: ' + total + ', Errors: ' + err);
}
main();
