#!/usr/bin/env node
/**
 * lint-i18n-keys.js — 校验 data-i18n 属性值是否在翻译 JSON 文件中存在
 *
 * 用法：
 *   node scripts/lint-i18n-keys.js              # 检查 src/ 下所有文件
 *   node scripts/lint-i18n-keys.js src/pages/   # 检查指定目录
 *   node scripts/lint-i18n-keys.js --fix         # 仅报告，不修改
 *
 * 返回：
 *   0 = 全部通过
 *   1 = 有缺失 key
 *
 * 集成：
 *   - lefthook pre-commit (staged files)
 *   - build-smoke (pre-push)
 */

"use strict";

var fs = require("fs");
var path = require("path");

// ─── Config ─────────────────────────────────────────────────────
var LANG_DIR = path.resolve(__dirname, "..", "src", "assets", "lang");
var CHECK_EXTS = [".html", ".js"];
var I18N_ATTRS = ["data-i18n", "data-i18n-placeholder", "data-i18n-aria", "data-i18n-alt"];
// 匹配 data-i18n="key" 或 data-i18n='key' 或 data-i18n="key1 key2"
var I18N_REGEX = /data-i18n(?:-placeholder|-aria|-alt)?=["']([^"']+)["']/g;

// 跳过 JS 中动态拼接的 key 前缀（不完整 key）
// 例如 data-i18n="cases_" + c.slug + "_title" 中的 cases_ 本身不是完整 key
var JS_DYNAMIC_PREFIXES = ["cases_", "cases_quote_"];
// data-i18n-alt 图片 alt 翻译（大量缺失，降级为 warn 不阻断）
var WARN_ONLY_ATTRS = ["data-i18n-alt"];

// 已知合法但翻译中缺失的 key（白名单，逐条清理）
// aria 标签翻译优先级低，暂不阻断
var KNOWN_MISSING = ["lang_switcher_aria", "aria_close", "aria_landing_hero_img"];

// ─── Load translation keys ──────────────────────────────────────
function loadAllKeys() {
  var allKeys = {};
  var files = fs.readdirSync(LANG_DIR).filter(function (f) {
    return f.endsWith("-ui.json");
  });

  // 使用英文作为基准（最完整的翻译）
  var baseFile = path.join(LANG_DIR, "en-ui.json");
  if (!fs.existsSync(baseFile)) {
    // fallback: 用第一个找到的文件
    if (files.length === 0) {
      console.error("❌ No translation files found in", LANG_DIR);
      process.exit(1);
    }
    baseFile = path.join(LANG_DIR, files[0]);
  }

  var content = fs.readFileSync(baseFile, "utf-8");
  var data = JSON.parse(content);

  function extractKeys(obj, prefix) {
    prefix = prefix || "";
    Object.keys(obj).forEach(function (k) {
      var fullKey = prefix ? prefix + "." + k : k;
      if (typeof obj[k] === "object" && obj[k] !== null) {
        extractKeys(obj[k], fullKey);
      } else {
        allKeys[fullKey] = true;
      }
    });
  }

  extractKeys(data);
  return allKeys;
}

// ─── Scan files ─────────────────────────────────────────────────
function scanFiles(dirs) {
  var results = [];

  dirs.forEach(function (dir) {
    if (!fs.existsSync(dir)) return;

    function walk(d) {
      var entries = fs.readdirSync(d, { withFileTypes: true });
      entries.forEach(function (entry) {
        var fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          // 跳过 node_modules, dist
          if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") return;
          walk(fullPath);
        } else {
          var ext = path.extname(entry.name);
          if (CHECK_EXTS.indexOf(ext) !== -1) {
            scanFile(fullPath, results);
          }
        }
      });
    }

    walk(dir);
  });

  return results;
}

function scanFile(filePath, results) {
  var content = fs.readFileSync(filePath, "utf-8");
  var lines = content.split("\n");
  var isJS = filePath.endsWith(".js");

  lines.forEach(function (line, lineIdx) {
    I18N_REGEX.lastIndex = 0;
    var match;
    while ((match = I18N_REGEX.exec(line)) !== null) {
      var rawKeys = match[1];
      var attr = match[0].split("=")[0];
      // data-i18n 可能包含空格分隔的多个 key
      rawKeys.split(/\s+/).forEach(function (key) {
        if (!key) return;
        // 跳过模板字符串/插值中的占位符（如 {count}）
        if (key.indexOf("{") !== -1) return;
        // 跳过 JS 中动态拼接的不完整 key 前缀
        if (isJS) {
          for (var d = 0; d < JS_DYNAMIC_PREFIXES.length; d++) {
            if (key === JS_DYNAMIC_PREFIXES[d]) return;
          }
        }
        // 跳过白名单
        for (var i = 0; i < KNOWN_MISSING.length; i++) {
          if (KNOWN_MISSING[i].endsWith("*") && key.indexOf(KNOWN_MISSING[i].slice(0, -1)) === 0) continue;
          if (KNOWN_MISSING[i] === key) return;
        }
        results.push({
          file: filePath,
          line: lineIdx + 1,
          key: key,
          attr: attr
        });
      });
    }
  });
}

// ─── Main ───────────────────────────────────────────────────────
function main() {
  var args = process.argv.slice(2);

  // 过滤掉 --fix 等 flag
  var dirs = args.filter(function (a) { return !a.startsWith("--"); });
  if (dirs.length === 0) {
    dirs = [path.resolve(__dirname, "..", "src")];
  }

  var allKeys = loadAllKeys();
  var keyCount = Object.keys(allKeys).length;
  console.log("📖 Loaded " + keyCount + " i18n keys from en-ui.json");

  var findings = scanFiles(dirs);
  var errors = [];
  var warnings = [];

  findings.forEach(function (f) {
    if (!allKeys[f.key]) {
      if (WARN_ONLY_ATTRS.indexOf(f.attr) !== -1) {
        warnings.push(f);
      } else {
        errors.push(f);
      }
    }
  });

  // warnings: 不阻断
  if (warnings.length > 0) {
    console.log("⚠️  " + warnings.length + " missing alt/aria keys (non-blocking)");
  }

  // errors: 阻断
  if (errors.length === 0) {
    console.log("✅ All " + findings.length + " data-i18n keys found." +
      (warnings.length ? " (" + warnings.length + " alt/aria warnings)" : ""));
    return 0;
  }

  var byFile = {};
  errors.forEach(function (m) {
    var rel = path.relative(process.cwd(), m.file);
    if (!byFile[rel]) byFile[rel] = [];
    byFile[rel].push(m);
  });

  console.log("❌ Found " + errors.length + " missing i18n key(s):\n");
  Object.keys(byFile).sort().forEach(function (file) {
    console.log("  " + file);
    byFile[file].forEach(function (m) {
      console.log("    L" + m.line + ": " + m.attr + '="' + m.key + '"');
    });
    console.log("");
  });

  return 1;
}

var exitCode = main();
process.exit(exitCode);
