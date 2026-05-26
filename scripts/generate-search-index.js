#!/usr/bin/env node
/**
 * generate-search-index.js
 *
 * 从 src/pages/ 的 HTML 文件中提取可搜索内容，生成 dist/search-index.json
 * 同时提取中文和英文内容，支持跨语言搜索
 */

var fs = require("fs");
var path = require("path");

var SRC = path.join(__dirname, "..", "src", "pages");
var DIST = path.join(__dirname, "..", "dist");
var LANG = path.join(__dirname, "..", "src", "assets", "lang");

// Load English translations for page titles/descriptions
var enUI = {};
var zhUI = {};
try {
  enUI = JSON.parse(fs.readFileSync(path.join(LANG, "en-ui.json"), "utf8"));
} catch (e) {}
try {
  zhUI = JSON.parse(fs.readFileSync(path.join(LANG, "zh-CN-ui.json"), "utf8"));
} catch (e) {}

var PAGE_CATALOG = [
  { route: "cases", type: "case", labelKey: "search_type_case", labelFallback: "案例" },
  { route: "applications", type: "page", labelKey: "search_type_solution", labelFallback: "解决方案" },
  {
    route: "support/faq",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeyEn: "support_faq_title",
    titleKeyZh: "support_faq_title",
  },
  {
    route: "support/installation",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeyEn: "support_install_hero_title_1",
    titleKeyZh: null,
  },
  {
    route: "support/services",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeyEn: "support_card_services_title",
    titleKeyZh: null,
  },
  {
    route: "support/spare-parts",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeyEn: "support_spare_category_title",
    titleKeyZh: null,
  },
  {
    route: "support/training",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeyEn: "support_card_training_title",
    titleKeyZh: null,
  },
  {
    route: "support/warranty",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeyEn: "support_warranty_hero_title_prefix",
    titleKeyZh: null,
  },
  { route: "about", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "contact", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "quote", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "profit-calculator", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "news", type: "page", labelKey: "search_type_news", labelFallback: "资讯" },
];

var CASE_SLUGS = ["bangkok", "cebu", "hanoi", "hcmc", "jakarta", "kl", "manila", "surabaya"];
var APP_SLUGS = [
  "canteen",
  "central-kitchen",
  "chain-restaurant",
  "cloud-kitchen",
  "food-factory",
  "menu-lab",
  "small-restaurant",
];

// i18n key mapping for case titles
var CASE_TITLE_KEYS = {
  bangkok: "cases_bangkok_title",
  cebu: "cases_cebu_title",
  hanoi: "cases_hanoi_title",
  hcmc: "cases_hcmc_title",
  jakarta: "cases_jakarta_title",
  kl: "cases_kl_title",
  manila: "cases_manila_title",
  surabaya: "cases_surabaya_title",
};

// i18n key mapping for application page titles
var APP_TITLE_KEYS = {
  canteen: "canteen_hero_title_1",
  "central-kitchen": "central_kitchen_hero_title_1",
  "chain-restaurant": "chain_restaurant_hero_title_1",
  "cloud-kitchen": "cloud-kitchen_page_title",
  "food-factory": "food_factory_hero_title_1",
  "menu-lab": "menu_lab_hero_title_1",
  "small-restaurant": "small_restaurant_hero_title_1",
};

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

  var title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  title = title
    .replace(/\s*[|–—]\s*YuKoLi.*$/i, "")
    .replace(/\s*\|.*/, "")
    .trim();

  var desc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/) || [])[1] || "";

  if (!title && desc)
    title = desc
      .split(/[—\-,，。]/)[0]
      .trim()
      .substring(0, 60);

  // Extract data-i18n texts
  var i18nTexts = [];
  var re = /data-i18n="([^"]+)"[^>]*>([^<]{3,})</gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var key = m[1];
    var text = m[2].trim().substring(0, 80);
    if (text.length > 3) i18nTexts.push({ key: key, text: text });
  }

  // Extract i18n keys from the page for richer English lookup
  var i18nKeys = [];
  var keyRe = /data-i18n="([^"]+)"/g;
  while ((m = keyRe.exec(html)) !== null) i18nKeys.push(m[1]);

  return { title: title, description: desc, i18nTexts: i18nTexts, i18nKeys: i18nKeys };
}

// Build English searchable text from i18n keys
function buildEnglishText(i18nKeys) {
  if (!i18nKeys || !i18nKeys.length) return "";
  var texts = [];
  var seen = {};
  i18nKeys.forEach(function (key) {
    if (seen[key]) return;
    seen[key] = true;
    var val = enUI[key];
    if (val && typeof val === "string") {
      // Strip HTML tags from translations
      var clean = val
        .replace(/<[^>]+>/g, "")
        .trim()
        .substring(0, 120);
      if (clean.length > 3) texts.push(clean);
    }
  });
  return texts.join(" ");
}

// Build Chinese searchable text from i18n keys
function buildChineseText(i18nKeys) {
  if (!i18nKeys || !i18nKeys.length) return "";
  var texts = [];
  var seen = {};
  i18nKeys.forEach(function (key) {
    if (seen[key]) return;
    seen[key] = true;
    var val = zhUI[key];
    if (val && typeof val === "string") {
      var clean = val
        .replace(/<[^>]+>/g, "")
        .trim()
        .substring(0, 120);
      if (clean.length > 3) texts.push(clean);
    }
  });
  return texts.join(" ");
}

var entries = [];

PAGE_CATALOG.forEach(function (cat) {
  var pcFile = path.join(SRC, cat.route, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  var enTitle = (cat.titleKeyEn && enUI[cat.titleKeyEn]) || "";
  var enDesc = "";
  var enKeywords = buildEnglishText(data.i18nKeys);
  var zhKeywords = buildChineseText(data.i18nKeys);

  entries.push({
    type: cat.type,
    labelKey: cat.labelKey,
    labelFallback: cat.labelFallback,
    path: "/" + cat.route + "/",
    title: data.title,
    snippet: data.description || "",
    titleEn: enTitle,
    snippetEn: enDesc,
    keywords: zhKeywords,
    keywordsEn: enKeywords,
  });
});

// Case sub-pages
CASE_SLUGS.forEach(function (slug) {
  var pcFile = path.join(SRC, "cases", slug, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  var titleKey = CASE_TITLE_KEYS[slug] || "";
  var enTitle = (titleKey && enUI[titleKey]) || "";
  var enKeywords = buildEnglishText(data.i18nKeys);
  var zhKeywords = buildChineseText(data.i18nKeys);

  entries.push({
    type: "case",
    labelKey: "search_type_case",
    labelFallback: "案例",
    path: "/cases/" + slug + "/",
    title: data.title,
    snippet: data.description || "",
    titleEn: enTitle,
    snippetEn: "",
    keywords: zhKeywords,
    keywordsEn: enKeywords,
  });
});

// Application sub-pages
APP_SLUGS.forEach(function (slug) {
  var pcFile = path.join(SRC, "applications", slug, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  var titleKey = APP_TITLE_KEYS[slug] || "";
  var enTitle = (titleKey && enUI[titleKey]) || "";
  var enKeywords = buildEnglishText(data.i18nKeys);
  var zhKeywords = buildChineseText(data.i18nKeys);

  entries.push({
    type: "page",
    labelKey: "search_type_solution",
    labelFallback: "解决方案",
    path: "/applications/" + slug + "/",
    title: data.title,
    snippet: data.description || "",
    titleEn: enTitle,
    snippetEn: "",
    keywords: zhKeywords,
    keywordsEn: enKeywords,
  });
});

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
var output = JSON.stringify(entries, null, 2);
fs.writeFileSync(path.join(DIST, "search-index.json"), output, "utf8");

console.log("✅ search-index.json: " + entries.length + " entries");
var enCount = entries.filter(function (e) {
  return e.titleEn || e.keywordsEn;
}).length;
console.log("   with English content: " + enCount);
