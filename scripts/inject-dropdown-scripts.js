#!/usr/bin/env node
/**
 * inject-dropdown-scripts.js — 给缺少 dropdown 模块的页面补全导航下拉脚本
 *
 * 问题：case slug 页面等二级页面的 SSG 模板不包含 dropdown 相关脚本，
 * 导致 mountNavigator 找不到 dropdown 模块，降级为纯文本链接（箭头消失、无法点击）。
 *
 * 运行时机：在 build-ssg.js 和 inject-device-redirect.js 之后执行。
 *
 * 关键修复（2026-05-23）：
 * - 所有子页面脚本已改为 defer，defer 脚本按 HTML 出现顺序执行。
 * - navigator.js 是 defer，若 dropdown defer 脚本排在 navigator.js 之后，
 *   则 navigator.js 先执行，dropdown 模块尚未注册，触发降级。
 * - 修复：将 dropdown 脚本注入到 navigator.js 的 <script> 标签之前。
 * - 若页面无 navigator.js，回退到 </body> 前注入。
 * - 此脚本作为 build-ssg.js 中 _injectDropdownScripts 的二次保护。
 */
(function () {
  "use strict";

  var fs = require("fs");
  var path = require("path");
  var DIST_DIR = path.resolve(__dirname, "..", "dist");

  if (!fs.existsSync(DIST_DIR)) {
    console.error("[inject-dropdown-scripts] dist/ not found.");
    process.exit(1);
  }

  var scripts = [
    '<script defer src="/assets/js/ui/dropdown-base.js"></script>',
    '<script defer src="/assets/js/ui/products-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/applications-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/support-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/about-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/dropdown-styles.js"></script>',
  ];
  var tag = scripts.join("\n    ");

  var count = 0;
  var skipped = 0;
  var replacedBeforeNav = 0;

  function walk(dir) {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(function (entry) {
      var fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".html")) {
        var html = fs.readFileSync(fullPath, "utf-8");
        // Skip if already has dropdown scripts
        if (html.indexOf("products-dropdown.js") !== -1) {
          skipped++;
          return;
        }

        var result = null;

        // Strategy A: inject BEFORE navigator.js
        if (html.indexOf("navigator.js") !== -1) {
          var navPattern = /([ \t]*<script[^>]*navigator\.js[^>]*>[ \t]*\n?)/;
          var match = html.match(navPattern);
          if (match) {
            result = html.replace(match[0], tag + "\n" + match[0]);
            if (result !== html) {
              replacedBeforeNav++;
            }
          }
        }

        // Strategy B: fallback — inject before </body>
        if (!result) {
          if (html.indexOf("</body>") === -1) {
            skipped++;
            return;
          }
          result = html.replace("</body>", tag + "\n  </body>");
        }

        if (result !== html) {
          fs.writeFileSync(fullPath, result, "utf-8");
          count++;
        } else {
          skipped++;
        }
      }
    });
  }

  walk(DIST_DIR);
  console.log("  \u2713 Injected dropdown scripts into " + count + " files (" + replacedBeforeNav + " before navigator.js, skipped " + skipped + ")");
})();
