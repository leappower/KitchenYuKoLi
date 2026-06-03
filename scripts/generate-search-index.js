#!/usr/bin/env node
/**
 * generate-search-index.js
 *
 * 从 src/pages/ 的 HTML 文件中提取可搜索内容，生成 dist/search-index.json
 * 支持 25 种语言：中文、英文、日文、韩文、泰文、越南文、印尼文、
 * 马来文、菲律宾文（他加禄语）、高棉文（柬埔寨）、老挝文、缅甸文、
 * 阿拉伯文、希伯来文、印地文、荷兰文、法文、德文、意大利文、
 * 葡萄牙文、西班牙文、波兰文、俄文、土耳其文、乌克兰文
 */

var fs = require("fs");
var path = require("path");

var SRC = path.join(__dirname, "..", "src", "pages");
var DIST = path.join(__dirname, "..", "dist");
var LANG = path.join(__dirname, "..", "src", "assets", "lang");

// 支持的语言列表（文件名前缀）
var SUPPORTED_LANGS = [
  "zh-CN", "en", "ja", "ko", "th", "vi", "id", "ms", "fil",
  "km", "lo", "my", "ar", "he", "hi", "nl", "fr", "de",
  "it", "pt", "es", "pl", "ru", "tr", "zh-TW"
];

// 加载所有语言的 UI 翻译
var langUI = {};
SUPPORTED_LANGS.forEach(function (code) {
  var filePrefix = code === "zh-CN" ? "zh-CN" : code;
  // 英文名对照：用于合成 title/Meta 字段名
  try {
    langUI[code] = JSON.parse(fs.readFileSync(path.join(LANG, filePrefix + "-ui.json"), "utf8"));
  } catch (e) {
    langUI[code] = {};
  }
});

var PAGE_CATALOG = [
  { route: "cases", type: "case", labelKey: "search_type_case", labelFallback: "案例" },
  { route: "applications", type: "page", labelKey: "search_type_solution", labelFallback: "解决方案" },
  {
    route: "support/faq",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeys: { "en": "support_faq_title", "zh-CN": "support_faq_title" },
  },
  {
    route: "support/installation",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeys: { "en": "support_install_hero_title_1" },
  },
  {
    route: "support/services",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeys: { "en": "support_card_services_title" },
  },
  {
    route: "support/spare-parts",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeys: { "en": "support_spare_category_title" },
  },
  {
    route: "support/training",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeys: { "en": "support_card_training_title" },
  },
  {
    route: "support/warranty",
    type: "page",
    labelKey: "search_type_support",
    labelFallback: "支持",
    titleKeys: { "en": "support_warranty_hero_title_prefix" },
  },
  { route: "about", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "contact", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "quote", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "profit-calculator", type: "page", labelKey: "search_type_page", labelFallback: "页面" },
  { route: "news", type: "page", labelKey: "search_type_news", labelFallback: "资讯" },
];

var CASE_SLUGS = ["bangkok", "cebu", "hanoi", "hcmc", "jakarta", "kl", "manila", "surabaya"];
var APP_SLUGS = [
  "canteen", "central-kitchen", "chain-restaurant", "cloud-kitchen",
  "food-factory", "menu-lab", "small-restaurant",
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
  "small-restaurant": "small_restaurant_hero_title",   // 已修正：去掉 _1
};

// 页面级标题 i18n key 映射（用于 /about/ 等列表页）
var PAGE_TITLE_KEYS = {
  "about": { "en": "about_page_title", "th": "about_page_title", "vi": "about_page_title", "id": "about_page_title" },
  "contact": { "en": "contact_page_title", "th": "contact_page_title", "vi": "contact_page_title", "id": "contact_page_title" },
  "cases": { "en": "cases_hero_title", "th": "cases_hero_title", "vi": "cases_hero_title", "id": "cases_hero_title" },
  "applications": { "en": "applications_hero_title", "th": "applications_hero_title", "vi": "applications_hero_title", "id": "applications_hero_title" },
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

  // Extract data-i18n keys from the page
  var i18nKeys = [];
  var keyRe = /data-i18n="([^"]+)"/g;
  var m;
  while ((m = keyRe.exec(html)) !== null) i18nKeys.push(m[1]);

  return { title: title, description: desc, i18nKeys: i18nKeys };
}

/**
 * 根据 i18n keys 从指定语言的 ui.json 中提取所有翻译文本
 */
function buildLangText(i18nKeys, langCode) {
  if (!i18nKeys || !i18nKeys.length) return "";
  var ui = langUI[langCode];
  if (!ui) return "";
  var texts = [];
  var seen = {};
  i18nKeys.forEach(function (key) {
    if (seen[key]) return;
    seen[key] = true;
    var val = ui[key];
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

/**
 * 获取指定语言页面标题（通过 i18n key 翻译）
 */
function getPageTitleInLang(i18nKeys, langCode, defaultTitle) {
  var ui = langUI[langCode];
  if (!ui) return "";
  // 找第一个不以 _desc/_subtitle/_btn 结尾且有翻译的 key
  for (var i = 0; i < i18nKeys.length; i++) {
    var key = i18nKeys[i];
    if (/_desc$|_subtitle$|_btn/.test(key)) continue;
    var val = ui[key];
    if (val && typeof val === "string") {
      var clean = val.replace(/<[^>]+>/g, "").trim();
      if (clean.length > 3 && clean.length < 120) return clean;
    }
  }
  return defaultTitle || "";
}

var entries = [];

PAGE_CATALOG.forEach(function (cat) {
  var pcFile = path.join(SRC, cat.route, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  // 中文内容
  var zhKeywords = buildLangText(data.i18nKeys, "zh-CN");
  // 英文内容
  var enKeywords = buildLangText(data.i18nKeys, "en");
  // 英文标题：优先 titleKeys 映射
  var enTitle = "";
  if (cat.titleKeys && cat.titleKeys["en"]) enTitle = langUI["en"][cat.titleKeys["en"]] || "";
  if (!enTitle && cat.titleKeys) {
    // 尝试从 PAGE_TITLE_KEYS 获取
    var ptk = PAGE_TITLE_KEYS[cat.route];
    if (ptk && ptk["en"]) enTitle = langUI["en"][ptk["en"]] || "";
  }
  if (!enTitle) enTitle = getPageTitleInLang(data.i18nKeys, "en", "");
  // 英文 snippet：尝试从页面 i18n keys 提取描述性翻译
  var enSnippet = "";
  for (var ek in data.i18nKeys) {
    var key = data.i18nKeys[ek];
    if (/desc|subtitle/.test(key) && langUI["en"][key]) {
      enSnippet = langUI["en"][key].replace(/<[^>]+>/g, "").trim().substring(0, 160);
      if (enSnippet.length > 10) break;
    }
  }

  var entry = {
    type: cat.type,
    labelKey: cat.labelKey,
    labelFallback: cat.labelFallback,
    path: "/" + cat.route + "/",
    title: data.title,
    snippet: data.description || "",
    titleEn: enTitle,
    snippetEn: enSnippet,
    keywords: zhKeywords,
    keywordsEn: enKeywords,
  };

  // 为每个非中英文语言添加 title/snippet/keywords 字段
  SUPPORTED_LANGS.forEach(function (code) {
    if (code === "zh-CN" || code === "en") return;
    var prefix = code.charAt(0).toUpperCase() + code.slice(1).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
    // 标题：优先 titleKeys 映射
    var langTitle = "";
    if (cat.titleKeys && cat.titleKeys[code]) langTitle = langUI[code][cat.titleKeys[code]] || "";
    if (!langTitle) {
      var ptk = PAGE_TITLE_KEYS[cat.route];
      if (ptk && ptk[code]) langTitle = langUI[code][ptk[code]] || "";
    }
    if (!langTitle) langTitle = getPageTitleInLang(data.i18nKeys, code, "");
    if (langTitle) entry["title" + prefix] = langTitle.replace(/<[^>]+>/g, '').trim();

    // 描述 snippet
    var langSnippet = "";
    for (var lk in data.i18nKeys) {
      var lkey = data.i18nKeys[lk];
      if (/desc|subtitle/.test(lkey) && langUI[code][lkey]) {
        langSnippet = langUI[code][lkey].replace(/<[^>]+>/g, "").trim().substring(0, 160);
        if (langSnippet.length > 10) break;
      }
    }
    if (langSnippet) entry["snippet" + prefix] = langSnippet;

    // 关键词
    var langKws = buildLangText(data.i18nKeys, code);
    if (langKws) entry["keywords" + prefix] = langKws;
  });

  entries.push(entry);
});

// Case sub-pages
CASE_SLUGS.forEach(function (slug) {
  var pcFile = path.join(SRC, "cases", slug, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  var titleKey = CASE_TITLE_KEYS[slug] || "";

  var entry = {
    type: "case",
    labelKey: "search_type_case",
    labelFallback: "案例",
    path: "/cases/" + slug + "/",
    title: data.title,
    snippet: data.description || "",
    titleEn: (langUI["en"][titleKey] || getPageTitleInLang(data.i18nKeys, "en", "")).replace(/<[^>]+>/g, '').trim(),
    snippetEn: "",
    keywords: buildLangText(data.i18nKeys, "zh-CN"),
    keywordsEn: buildLangText(data.i18nKeys, "en"),
  };

  // 多语言扩展
  SUPPORTED_LANGS.forEach(function (code) {
    if (code === "zh-CN" || code === "en") return;
    var prefix = code.charAt(0).toUpperCase() + code.slice(1).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
    var langTitle = langUI[code][titleKey] || getPageTitleInLang(data.i18nKeys, code, "");
    if (langTitle) entry["title" + prefix] = langTitle.replace(/<[^>]+>/g, '').trim();
    var langKws = buildLangText(data.i18nKeys, code);
    if (langKws) entry["keywords" + prefix] = langKws;
    // snippet
    var langSnippet = "";
    for (var lk in data.i18nKeys) {
      var lkey = data.i18nKeys[lk];
      if (/desc|subtitle/.test(lkey) && langUI[code][lkey]) {
        langSnippet = langUI[code][lkey].replace(/<[^>]+>/g, "").trim().substring(0, 160);
        if (langSnippet.length > 10) break;
      }
    }
    if (langSnippet) entry["snippet" + prefix] = langSnippet;
  });

  entries.push(entry);
});

// Application sub-pages
APP_SLUGS.forEach(function (slug) {
  var pcFile = path.join(SRC, "applications", slug, "index-pc.html");
  var data = extractFromHtml(pcFile);
  if (!data) return;

  var titleKey = APP_TITLE_KEYS[slug] || "";

  var entry = {
    type: "page",
    labelKey: "search_type_solution",
    labelFallback: "解决方案",
    path: "/applications/" + slug + "/",
    title: data.title,
    snippet: data.description || "",
    titleEn: (langUI["en"][titleKey] || getPageTitleInLang(data.i18nKeys, "en", "")).replace(/<[^>]+>/g, '').trim(),
    snippetEn: "",
    keywords: buildLangText(data.i18nKeys, "zh-CN"),
    keywordsEn: buildLangText(data.i18nKeys, "en"),
  };

  // 多语言扩展
  SUPPORTED_LANGS.forEach(function (code) {
    if (code === "zh-CN" || code === "en") return;
    var prefix = code.charAt(0).toUpperCase() + code.slice(1).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
    var langTitle = langUI[code][titleKey] || getPageTitleInLang(data.i18nKeys, code, "");
    if (langTitle) entry["title" + prefix] = langTitle.replace(/<[^>]+>/g, '').trim();
    var langKws = buildLangText(data.i18nKeys, code);
    if (langKws) entry["keywords" + prefix] = langKws;
    // snippet
    var langSnippet = "";
    for (var lk in data.i18nKeys) {
      var lkey = data.i18nKeys[lk];
      if (/desc|subtitle/.test(lkey) && langUI[code][lkey]) {
        langSnippet = langUI[code][lkey].replace(/<[^>]+>/g, "").trim().substring(0, 160);
        if (langSnippet.length > 10) break;
      }
    }
    if (langSnippet) entry["snippet" + prefix] = langSnippet;
  });

  entries.push(entry);
});

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
var output = JSON.stringify(entries, null, 2);
fs.writeFileSync(path.join(DIST, "search-index.json"), output, "utf8");

console.log("✅ search-index.json: " + entries.length + " entries");
// 统计每种语言的覆盖情况
SUPPORTED_LANGS.forEach(function (code) {
  var prefix = code.charAt(0).toUpperCase() + code.slice(1).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
  var count = 0;
  if (code === "zh-CN") count = entries.filter(function (e) { return e.keywords && e.keywords.length > 0; }).length;
  else if (code === "en") count = entries.filter(function (e) { return e.keywordsEn && e.keywordsEn.length > 0; }).length;
  else count = entries.filter(function (e) { return e["keywords" + prefix] && e["keywords" + prefix].length > 0; }).length;
  var label = code;
  if (count > 0) console.log("   " + label + ": " + count + "/" + entries.length + " entries with keywords");
});
