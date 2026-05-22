#!/usr/bin/env node
/**
 * inject-dropdown-scripts.js — 给缺少 dropdown 模块的页面补全导航下拉脚本
 *
 * 问题：case slug 页面等二级页面的 SSG 模板不包含 dropdown 相关脚本，
 * 导致 mountNavigator 找不到 dropdown 模块，降级为纯文本链接（箭头消失、无法点击）。
 *
 * 运行时机：在 build-ssg.js 和 inject-device-redirect.js 之后执行。
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
    '<script src="/assets/js/ui/dropdown-base.js"></script>',
    '<script defer src="/assets/js/ui/products-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/applications-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/support-dropdown.js"></script>',
    '<script defer src="/assets/js/ui/about-dropdown.js"></script>',
    '<script src="/assets/js/ui/dropdown-styles.js"></script>',
  ];
  var tag = scripts.join("\n    ");

  var count = 0;
  var skipped = 0;

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
        if (html.indexOf("</body>") === -1) {
          skipped++;
          return;
        }
        var result = html.replace("</body>", tag + "\n  </body>");
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
  console.log("  \u2713 Injected dropdown scripts into " + count + " files (skipped " + skipped + ")");
})();
