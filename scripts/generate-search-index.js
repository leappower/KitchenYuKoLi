#!/usr/bin/env node
/**
 * generate-search-index.js
 *
 * 从 src/pages/ 的 HTML 文件中提取可搜索内容，生成 dist/search-index.json
 * 覆盖：案例、应用场景、Support 子页、About、News、Profit Calculator
 * 不含：产品（已有 PRODUCT_DATA_TABLE）
 */

var fs = require("fs");
var path = require("path");

var SRC = path.join(__dirname, "..", "src", "pages");
var DIST = path.join(__dirname, "..", "dist");

// ─── 页面分类配置 ────────────────────────────────────────────────
// route: SSG 路由路径
// labelKey: i18n key for category label
// labelFallback: fallback label (Chinese)
// subRoutes: 子路由（如 cases/bangkok）
var PAGE_CATALOG = [
  // 案例
  { route: "cases", type: "case", labelKey: "search_type_case", labelFallback: "案例" },
  // 应用场景
  { route: "applications", type: "page", labelKey: "search_type_solution", labelFallback: "解决方案" },
  // Support 子页
  { route: "support/faq", type: "page", labelKey: "search_type_support", labelFallback: "支持" },
  { route: "support/installation", type: "page", labelKey: "search_type_support", labelFallback: "支持" },
  { route: "support/services", type: "page", labelKey: "search_type_support", labelFallback: "支持" },
  { route: "support/spare-parts", type: "page", labelKey: "search_type_support", labelFallback: "支持" },
  { route: "support/training", type: "page", labelKey: "search_type_support", labelFallback: "支持" },
  { route: "support/warranty", type: "page", labelKey: "search_type_support", labelFallback: "支持" },
  // 其他页面
  { route: "about", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "contact", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "quote", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "profit-calculator", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "news", type: "page", labelKey: "search_type_news", labelFallback: "资讯" },
];

// 案例子目录
var CASE_SLUGS = [
  "bangkok",
  "cebu",
  "hanoi",
  "hcmc",
  "jakarta",
  "kl",
  "manila",
  "surabaya",
];

// 应用场景子目录
var APP_SLUGS = [
  "canteen",
  "central-kitchen",
  "chain-restaurant",
  "cloud-kitchen",
  "food-factory",
  "menu-lab",
  "small-restaurant",
];

// ─── HTML 提取工具 ───────────────────────────────────────────────

function stripTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFromHtml(htmlPath) {
  if (!fs.existsSync(htmlPath)) return null;

  var html = fs.readFileSync(htmlPath, "utf8");
  var title =
    (html.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  // Clean title: remove site name suffix
  title = title.replace(/\s*[|–—]\s*YuKoLi.*$/i, "").replace(/\s*\|.*/, "").trim();

  var desc =
    (html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/
    ) || [])[1] || "";

  // Extract h1/h2 headings as keywords
  var headings = [];
  var hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  var m;
  while ((m = hRe.exec(html)) !== null) {
    var text = stripTags(m[1]).substring(0, 120);
    if (text.length > 3) headings.push(text);
  }

  // Extract data-i18n text content for richer search
  var i18nTexts = [];
  var i18nRe = /data-i18n="[^"]*"[^>]*>([^<]{3,})</gi;
  while ((m = i18nRe.exec(html)) !== null) {
    var t = m[1].trim().substring(0, 80);
    if (t.length > 3) i18nTexts.push(t);
  }

  // 如果 title 为空，从 description 或 h1 提取
  if (!title && desc) {
    title = desc.split(/[—\-,，。]/)[0].trim().substring(0, 60);
  }
  if (!title && headings.length > 0) {
    title = headings[0].substring(0, 60);
  }

  return {
    title: title,
    description: desc,
    headings: headings,
    i18nTexts: i18nTexts,
  };
}

// ─── 构建索引 ────────────────────────────────────────────────────

var entries = [];

PAGE_CATALOG.forEach(function (cat) {
  var pcFile = path.join(SRC, cat.route, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  var entry = {
    type: cat.type,
    labelKey: cat.labelKey,
    labelFallback: cat.labelFallback,
    path: "/" + cat.route + "/",
    title: data.title,
    snippet: data.description || "",
    keywords: data.headings.concat(data.i18nTexts).join(" "),
  };

  entries.push(entry);
});

// 案例子页
CASE_SLUGS.forEach(function (slug) {
  var pcFile = path.join(SRC, "cases", slug, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  entries.push({
    type: "case",
    labelKey: "search_type_case",
    labelFallback: "案例",
    path: "/cases/" + slug + "/",
    title: data.title,
    snippet: data.description || "",
    keywords: data.headings.concat(data.i18nTexts).join(" "),
  });
});

// 应用场景子页
APP_SLUGS.forEach(function (slug) {
  var pcFile = path.join(SRC, "applications", slug, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  entries.push({
    type: "page",
    labelKey: "search_type_solution",
    labelFallback: "解决方案",
    path: "/applications/" + slug + "/",
    title: data.title,
    snippet: data.description || "",
    keywords: data.headings.concat(data.i18nTexts).join(" "),
  });
});

// ─── 输出 ────────────────────────────────────────────────────────

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

var output = JSON.stringify(entries, null, 2);
fs.writeFileSync(path.join(DIST, "search-index.json"), output, "utf8");

console.log("✅ search-index.json: " + entries.length + " entries");
entries.forEach(function (e) {
  console.log("  " + e.type + " | " + e.path + " | " + (e.title || "(untitled)").substring(0, 40));
});
