/* global loadProductTranslations, CATEGORY_SLUG_MAP, product */
/**
 * PDP Renderer - product detail page (SPA-safe)
 * URL: /products/detail/<model>/ or /products/detail/?model=<model>
 * Self-contained: creates #product-content and #related-products if missing
 *
 * NOTE: /products/<category>/ (cutting, stirfry, etc.) are PRODUCT LISTING pages,
 *       NOT PDP pages. Only render PDP for /products/detail/<model>/ paths.
 */
(function () {
  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  // Category slugs used for product listing — NOT PDP pages
  var CATEGORY_SLUGS = ["all", "cutting", "stirfry", "frying", "stewing", "steaming", "other"];

  // Chinese category name (from PRODUCT_DATA_TABLE) → URL slug
  var CATEGORY_NAME_TO_SLUG = {
    翻炒系列: "stirfry",
    切配系列: "cutting",
    煎炸系列: "frying",
    炖煮系列: "stewing",
    蒸煮系列: "steaming",
    辅助系列: "other",
  };

  // MODEL_TO_SLUG: 从 product-data-table 生成的硬编码映射，不依赖任何运行时数据
  // 防止 API 实时数据覆盖后回查失效
  var MODEL_TO_SLUG = {
    B4RTD: "stewing",
    B6RBD: "stewing",
    B8RBD: "stewing",
    "DLB-4BQ30": "stirfry",
    "DLB-4QBQ30": "stirfry",
    "DLB-A2800": "other",
    "DLB-A3600": "other",
    "DLB-A4600": "other",
    "DLB-A5400": "other",
    "DLB-A60-G": "other",
    "DLB-A60-J": "other",
    "DLB-A60-Z": "other",
    "DLB-A6200": "other",
    "DLB-BQ40T": "stirfry",
    "DLB-BXC800": "stirfry",
    "DLB-GB50": "stirfry",
    "DLB-GB60": "stirfry",
    "DLB-GB60R": "stirfry",
    "DLB-GB70": "stirfry",
    "DLB-GB70R": "stirfry",
    "DLB-GB80": "stirfry",
    "DLB-GB80R": "stirfry",
    "DLB-GB90": "stirfry",
    "DLB-GB90R": "stirfry",
    "DLB-GC50": "stirfry",
    "DLB-GC60": "stirfry",
    "DLB-GC60R": "stirfry",
    "DLB-GC70": "stirfry",
    "DLB-GC70R": "stirfry",
    "DLB-GC80": "stirfry",
    "DLB-GC80R": "stirfry",
    "DLB-GC90": "stirfry",
    "DLB-GC90R": "stirfry",
    "DLB-GD30": "stirfry",
    "DLB-GD36": "stirfry",
    "DLB-GD36/9": "stirfry",
    "DLB-GQ30": "stirfry",
    "DLB-GQ30J": "stirfry",
    "DLB-GQ30T": "stirfry",
    "DLB-GQ35T": "stirfry",
    "DLB-GQ36": "stirfry",
    "DLB-GQ36J": "stirfry",
    "DLB-GQ36J/9": "stirfry",
    "DLB-GQ50": "stirfry",
    "DLB-GQ60": "stirfry",
    "DLB-GQ60R": "stirfry",
    "DLB-GQ70": "stirfry",
    "DLB-GQ70R": "stirfry",
    "DLB-GQ80": "stirfry",
    "DLB-GQ80R": "stirfry",
    "DLB-GQ90": "stirfry",
    "DLB-GQ90R": "stirfry",
    "DLB-PZJ80": "steaming",
    "DLB-PZJ100": "steaming",
    "DLB-PZJ120": "steaming",
    "DLB-PZJ200": "steaming",
    "DLB-PZJ400": "steaming",
    "DLB-QXC80": "stewing",
    "DLB-QXC80R": "stewing",
    "DLB-QXC100": "stewing",
    "DLB-QXC100R": "stewing",
    "DLB-QXC120": "stewing",
    "DLB-QXC120R": "stewing",
    "DLB-TBQ30": "stirfry",
    "DLB-TBS30": "stirfry",
    "DLB-TBS40": "stirfry",
    "DLB-TBS50": "stirfry",
    "DLB-TGD30": "stirfry",
    "DLB-TGD36": "stirfry",
    "DLB-TGD36/9": "stirfry",
    "DLB-TGD40": "stirfry",
    "DLB-TGQ30": "stirfry",
    "DLB-TGQ30J": "stirfry",
    "DLB-TGQ36J": "stirfry",
    "DLB-TGQ36J/9": "stirfry",
    "DLB-TGQ40": "stirfry",
    "DLB-TGQ40J": "stirfry",
    "DLB-TGS30": "stirfry",
    "DLB-TQBQ30": "stirfry",
    "DLB-TZS40": "stirfry",
    "DLB-TZS50": "stirfry",
    "DLB-XC80": "stewing",
    "DLB-XC80R": "stewing",
    "DLB-XC100": "stewing",
    "DLB-XC100R": "stewing",
    "DLB-XC120": "stewing",
    "DLB-XC120R": "stewing",
    "DLB-ZNT": "stewing",
    "DLB-ZNY": "stewing",
    F32F1C: "stirfry",
    G26D1A: "stirfry",
    G26D1R: "stirfry",
    G26DAA: "stirfry",
    G26DAG: "stirfry",
    G26DAR: "stirfry",
    G26DAS: "stirfry",
    G30D1A: "stirfry",
    G30D1R: "stirfry",
    G30D1T: "stirfry",
    G30DAA: "stirfry",
    G30DAG: "stirfry",
    G30DAR: "stirfry",
    G30DAS: "stirfry",
    G30DFA: "stirfry",
    G36D1A: "stirfry",
    G36D1R: "stirfry",
    G36DAA: "stirfry",
    G36DAG: "stirfry",
    G36DAR: "stirfry",
    G36DAS: "stirfry",
    G50AAB: "stirfry",
    G50AAC: "stirfry",
    G50GAT: "stirfry",
    G60EAC: "stirfry",
    G60EAS: "stirfry",
    G70EAC: "stirfry",
    G70EAS: "stirfry",
    G80EAC: "stirfry",
    G80EAS: "stirfry",
    GT1D1B: "frying",
    GT2D1B: "frying",
    HKDQJ300: "cutting",
    "HKDQJ300-VII": "cutting",
    HKFBJ: "cutting",
    "HKJGJ380-VI": "cutting",
    "HKQPJ-300": "cutting",
    "HKQPJ400-VIII": "cutting",
    "HKQPJ500-VIII": "cutting",
    "HKQTJ200-VII": "cutting",
    HKQTJ300: "cutting",
    "HKQTJ600-VII": "cutting",
    "HKXQJ-400": "cutting",
    J40CBB: "stirfry",
    LZ80D1B: "stewing",
    M3DAD: "stewing",
    "M4DAD+1": "stewing",
    "M4DAD+2": "stewing",
    M6DAD: "stewing",
    M6DBD: "stewing",
    M6RAD: "stewing",
    "XC-0006": "cutting",
    "XC-0888": "cutting",
    "XC-0988": "cutting",
    "XC-1088": "cutting",
    "XC-1288": "cutting",
    "XC-6344": "cutting",
    Y12D1C: "frying",
    Y12D2C: "frying",
    Y24C1C: "frying",
    Y50D1C: "frying",
    Z6FCB: "steaming",
    "Z8FCB/Z12FCB": "steaming",
    "\u7535\u78c1\uff1aDLB-GQ40\u71c3\u6c14\uff1aDLB-GQ40R": "stirfry",
  };
  if (typeof window !== "undefined") window.MODEL_TO_SLUG = MODEL_TO_SLUG;

  function isCategorySlug(slug) {
    return CATEGORY_SLUGS.indexOf(slug) >= 0;
  }

  function tl(key, fallback) {
    if (typeof window.t === "function") {
      var result = window.t(key);
      if (result && result !== key) return result;
    }
    return fallback || key;
  }

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function modelToSnake(m) {
    // Use raw model name with hyphens (matching actual file naming)
    // Files are like DLB-BQ40T-1.webp, not dlb_bq40t_1.webp
    return (m || "").replace(/[/:+]+/g, "_").replace(/_+/g, "_");
  }

  function _legacyModelToSnake(m) {
    return (m || "")
      .toLowerCase()
      .replace(/\//g, "")
      .replace(/\+/g, "_p")
      .replace(/-/g, "_")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/__+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function getAllProducts() {
    var table = window.PRODUCT_DATA_TABLE || [];
    if (!table.length) return [];
    // Flat format: table[0].model exists → each item is a product
    if (table[0].model) {
      return table;
    }
    // Nested format (legacy API): table[i].products exists
    var flat = [];
    for (var i = 0; i < table.length; i++) {
      var ps = table[i].products || [];
      var catName = table[i].categoryName || table[i].category || "";
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j];
        if (!p._categoryName && catName) p._categoryName = catName;
        flat.push(p);
      }
    }
    return flat;
  }

  function findProduct(model) {
    var products = getAllProducts();
    for (var i = 0; i < products.length; i++) {
      if (products[i].model === model) return products[i];
    }
    return null;
  }

  function buildRelatedCard(rp, idx) {
    // 统一用 model.webp，不信任 API 的 filePath
    var rImg = "/assets/images/products/" + (rp.model || "") + ".webp";
    var gradients = [
      "from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/30",
      "from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20",
      "from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20",
    ];
    var grad = gradients[idx % gradients.length];
    var catSlug = (rp && rp.category && CATEGORY_NAME_TO_SLUG[rp.category]) || "";
    // fallback 1: 从不可变 MODEL_TO_SLUG 映射查找
    if (!catSlug && rp && rp.model && MODEL_TO_SLUG) {
      catSlug = MODEL_TO_SLUG[rp.model] || "";
    }
    // fallback 2: 从 PRODUCT_DATA_TABLE 回查（API 可能覆盖后数据差异时兜底）
    if (!catSlug && rp && rp.model && window.PRODUCT_DATA_TABLE) {
      var _all = window.PRODUCT_DATA_TABLE;
      if (_all && _all.length) {
        for (var _i = 0; _i < _all.length; _i++) {
          if (_all[_i].model === rp.model) {
            catSlug = CATEGORY_NAME_TO_SLUG[_all[_i].category] || "";
            break;
          }
        }
      }
    }
    return (
      '<a href="/products/' +
      (catSlug ? catSlug + "/" : "") +
      encodeURIComponent(rp.model) +
      "/" +
      '" class="group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700">' +
      '<div class="aspect-[4/3] bg-white relative overflow-hidden flex items-center justify-center">' +
      '<img loading="lazy" alt="' +
      esc(rp.model) +
      '" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" src="' +
      rImg +
      '" onerror="this.style.display=\'none\'">' +
      '</div><div class="p-4"><h4 class="font-bold text-sm mb-1">' +
      esc(rp.model) +
      '</h4><p class="text-xs text-slate-500 dark:text-slate-400 mb-2">' +
      esc(getCategoryName(rp)) +
      '</p><span class="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-2 transition-all">' +
      tl("btn_view_details", "查看详情") +
      '<span class="material-symbols-outlined text-sm">arrow_forward</span></span></div></a>'
    );
  }

  function renderRelated(product) {
    var allProducts = getAllProducts();
    var el = document.getElementById("related-products");
    if (!el) return;
    var cards = "",
      count = 0,
      max = 8;

    // Plan A: manual related (if configured)
    if (product.relatedProducts && product.relatedProducts.length > 0) {
      var map = {};
      allProducts.forEach(function (p) {
        map[p.model] = p;
      });
      product.relatedProducts.forEach(function (m) {
        if (count >= max) return;
        var rp = map[m];
        if (rp && rp.model !== product.model) {
          cards += buildRelatedCard(rp, count++);
        }
      });
    }
    // Plan B: auto fallback — same category
    if (count < max) {
      var shown = new Set(product.relatedProducts || []);
      shown.add(product.model);
      for (var i = 0; i < allProducts.length && count < max; i++) {
        var rp = allProducts[i];
        if (shown.has(rp.model)) continue;
        if (rp.category === product.category) {
          cards += buildRelatedCard(rp, count++);
          shown.add(rp.model);
        }
      }
    }
    // Plan C: last resort — fill with any remaining products
    if (count < max) {
      var shown2 = new Set(product.relatedProducts || []);
      shown2.add(product.model);
      /* eslint-disable no-redeclare */
      for (var i = 0; i < allProducts.length; i++) {
        var rp0 = allProducts[i];
        if (rp0.category === product.category) shown2.add(rp0.model);
      }
      for (var i2 = 0; i2 < allProducts.length && count < max; i2++) {
        var rp = allProducts[i2];
        if (shown2.has(rp.model)) continue;
        cards += buildRelatedCard(rp, count++);
        shown2.add(rp.model);
        /* eslint-enable no-redeclare */
      }
    }
    if (cards) el.innerHTML = cards;
    else el.parentElement.style.display = "none";
  }

  function ensureContainers() {
    var ce = document.getElementById("product-content");
    var re = document.getElementById("related-products");
    var bc = document.getElementById("pdp-breadcrumb");

    // PDP containers already exist — nothing to do
    if (ce && re) return;

    // Only hide product-grid on PDP URLs, not on listing pages
    // Check if current path is a PDP (has model in path, not just category slug)
    var _path = window.location.pathname.replace(/\/$/, "");
    var _segs = _path.replace(/^\/products\//, "").split("/");
    // Account for SSG device files (/products/stirfry/index-pc.html → segs=["stirfry","index-pc.html"])
    // which should be treated as listing pages
    var _listingPage =
      (_segs.length === 1 || (_segs.length === 2 && /^index-(pc|mobile|tablet)\.html$/.test(_segs[1]))) &&
      isCategorySlug(_segs[0]);

    // Ensure breadcrumb container exists regardless of product-content state
    if (!bc) {
      var container = ce ? ce.parentElement : document.querySelector("main") || document.body;
      bc = document.createElement("div");
      bc.id = "pdp-breadcrumb";
      bc.className = "w-full";
      container.insertBefore(bc, ce || container.firstChild);
    }

    if (!ce || !re) {
      // Products listing page has #products-section; hide it and create PDP containers
      var listing = _listingPage
        ? null
        : document.getElementById("products-section") || document.getElementById("product-grid");
      container = listing
        ? listing.parentElement
        : document.getElementById("app") || document.querySelector("main") || document.body;
      if (listing) listing.style.display = "none";

      if (!ce) {
        // Insert breadcrumb bar before product-content
        bc = document.getElementById("pdp-breadcrumb");
        if (!bc) {
          bc = document.createElement("div");
          bc.id = "pdp-breadcrumb";
          bc.className = "w-full";
          container.insertBefore(bc, container.firstChild);
        }
        ce = document.createElement("div");
        ce.id = "product-content";
        ce.className = "w-full py-10 md:py-14";
        container.insertBefore(ce, bc.nextSibling);
      }
      if (!re) {
        var section = document.createElement("section");
        section.className = "fullwidth-bg py-12 lg:py-16";
        section.innerHTML =
          '<div class="section-content">' +
          '<h2 class="text-xl font-bold mb-4 flex items-center gap-2">' +
          '<span class="material-symbols-outlined text-primary">recommend</span> ' +
          tl("detail_recommended", "推荐产品") +
          "</h2>" +
          '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" id="related-products" data-i18n-container></div>' +
          "</div>";
        // Find the container's parent to append
        var target = ce.parentElement || container;
        target.appendChild(section);
      }
    }
  }

  function renderPDP() {
    // 只在产品详情页执行（路径匹配 /products/{cat}/{model}/ ）
    var _pdpPath = window.location.pathname;
    if (!/^\/products\/[^/]+\/[^/]+\/$/.test(_pdpPath)) return;
    // 确保 PRODUCT_DATA_TABLE 就绪
    if (!window.PRODUCT_DATA_TABLE || !window.PRODUCT_DATA_TABLE.length) {
      if (!renderPDP._pdtRetry) renderPDP._pdtRetry = 0;
      if (renderPDP._pdtRetry < 5) {
        renderPDP._pdtRetry++;
        setTimeout(renderPDP, 200);
      }
      return;
    }
    if (renderPDP._pending) return;
    renderPDP._pending = true;
    requestAnimationFrame(function () {
      renderPDP._pending = false;
    });
    // Check if language changed — reload translations before rendering
    var currentLang = (
      window.CURRENT_LANG ||
      (window.translationManager && window.translationManager.currentLanguage) ||
      (window.t && window.t.currentLanguage) ||
      localStorage.getItem("userLanguage") ||
      document.documentElement.lang ||
      "en"
    ).replace("_", "-");
    var needsProductTx =
      currentLang !== "zh-CN" &&
      currentLang !== "zh" &&
      (!window._productTranslationsByModel || Object.keys(window._productTranslationsByModel).length === 0);

    if (
      needsProductTx ||
      (currentLang !== (renderPDP._lastLang || "") && currentLang !== "zh-CN" && currentLang !== "zh")
    ) {
      renderPDP._lastLang = currentLang;
      if (typeof loadProductTranslations === "function") {
        // Prevent infinite loop: only attempt translation once per language
        if (!renderPDP._txAttempted) renderPDP._txAttempted = {};
        if (renderPDP._txAttempted[currentLang]) {
          // Already attempted, proceed normally
        } else {
          renderPDP._txAttempted[currentLang] = true;
          renderPDP._lastLang = currentLang;
          loadProductTranslations(currentLang, function () {
            renderPDP._pending = false;
            renderPDP._lastLang = currentLang;
            renderPDP._txAttempted[currentLang] = true;
            renderPDP();
          });
          return;
        }
      }
    }
    renderPDP._lastLang = currentLang;

    // Read model from path:
    //   /products/{slug}/{model}/   (new canonical)
    //   /products/detail/{model}/  (old detail path)
    //   /products/{model}/         (legacy, skip category slugs)
    //   /products/{model}/index-pc.html  (device redirect)
    var path = window.location.pathname.replace(/\/$/, "");
    var model = null;

    // First try: ?model= query string (/products/detail/?model=xxx)
    var qsMatch = (window.location.search || "").match(/[?&]model=([^&]+)/);
    if (qsMatch) {
      model = decodeURIComponent(qsMatch[1]);
    }

    if (!model) {
      // Try: /products/{category}/{model}/ (new canonical)
      var m = path.match(/^\/products\/([^/]+)\/([^/]+)$/);
      if (m && isCategorySlug(m[1])) {
        // /products/stirfry/DLB-TBQ30/ → slug=m[1], model=m[2]
        model = decodeURIComponent(m[2]);
      } else if (m && !isCategorySlug(m[1]) && /^index-(pc|mobile|tablet)\.html$/.test(m[2])) {
        // /products/DLB-TBQ30/index-pc.html → device redirect, model=m[1]
        model = decodeURIComponent(m[1]);
      } else {
        // /products/stirfry/DLB-TBQ30/index-pc.html → 4-segment device redirect
        var m4 = path.match(/^\/products\/([^/]+)\/([^/]+)\/index-(pc|mobile|tablet)\.html$/);
        if (m4) {
          model = decodeURIComponent(m4[2]);
        } else {
          m = path.match(/^\/products\/detail\/([^/]+)$/);
          if (m) {
            model = decodeURIComponent(m[1]);
          } else {
            // Legacy path: /products/<model>/ — skip category slugs
            m = path.match(/^\/products\/([^/]+)$/);
            if (m && !isCategorySlug(m[1])) {
              model = decodeURIComponent(m[1]);
            }
          }
        }
      }
    }
    // Fallback: try to rebuild model from URL segments for models containing "/"
    // e.g., /products/DLB-TGD36/9/ → encodeURIComponent("DLB-TGD36/9") is %2F,
    // but browser decodes %2F back to literal /, splitting the path.
    if (!model) {
      var segs = path.replace(/^\/products\//, "").split("/");
      if (segs.length >= 2) {
        var reconstructed = decodeURIComponent(segs.slice(0, -1).join("/"));
        if (reconstructed && window.PRODUCT_DATA_TABLE) {
          var found = window.PRODUCT_DATA_TABLE.some(function (p) {
            return p.model === reconstructed;
          });
          if (found) model = reconstructed;
        }
      }
    }
    // Also check meta tag (injected by server.js for direct page loads)
    if (!model) {
      var meta = document.querySelector('meta[name="product-model"]');
      if (meta) model = meta.getAttribute("content");
    }
    if (!model) return; // Not a PDP URL, skip silently

    var product = findProduct(model);
    if (!product) {
      ensureContainers();
      var ce = document.getElementById("product-content");
      if (ce)
        ce.innerHTML =
          '<div class="max-w-3xl mx-auto px-4 py-16 text-center">' +
          '<div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">' +
          '<span class="material-symbols-outlined text-3xl text-slate-400">search_off</span></div>' +
          '<h2 class="text-xl font-bold mb-3">' +
          tl("pd_product_not_found", "产品未找到") +
          "</h2>" +
          '<p class="text-slate-500 mb-6">' +
          tl("pd_product_not_found_desc", "抱歉，未找到该产品。") +
          "</p>" +
          '<a href="/products/" class="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all">' +
          '<span class="material-symbols-outlined">arrow_back</span> ' +
          tl("pd_back_to_products", "返回产品中心") +
          "</a></div>";
      return;
    }

    // Ensure containers exist (for products listing page)
    ensureContainers();

    // Render breadcrumb using Breadcrumb module if available
    (function () {
      var bcEl = document.getElementById("pdp-breadcrumb");
      if (!bcEl) return;
      var catKey = product.category || "";
      // Map Chinese category name (e.g. "翻炒系列") to i18n key via slug
      var catSlug = CATEGORY_NAME_TO_SLUG[catKey] || "";
      var bp = window.Breadcrumb || {};
      var catI18nKey = catSlug
        ? ((bp.PRODUCT_SLUGS || {})[catSlug] && (bp.PRODUCT_SLUGS || {})[catSlug].key) || ""
        : "";
      var slugMap = (window.Breadcrumb && window.Breadcrumb.CATEGORY_KEY_TO_SLUG) || {};
      var slug = slugMap[catI18nKey] || catSlug;
      var catInfo =
        slug && window.Breadcrumb && window.Breadcrumb.PRODUCT_SLUGS ? window.Breadcrumb.PRODUCT_SLUGS[slug] : {};
      var catLabel = catInfo.label || "";
      var catIcon = catInfo.icon || "inventory_2";
      // Track referrer for back navigation
      if (slug) sessionStorage.setItem("pdp_referrer", "/products/" + slug + "/");
      var model = product.model || "";
      // PC/Tablet breadcrumb — 统一三层 Products / 分类 / 型号
      var chevron = '<span class="mx-1.5 text-slate-300 dark:text-slate-600">/</span>';
      var badgeHtml =
        catLabel && slug
          ? chevron +
            '<a href="/products/' +
            slug +
            '/" data-no-swup class="hover:text-primary transition-colors">' +
            esc(catLabel) +
            "</a>"
          : "";
      var html =
        '<div class="section-content pt-4 pb-0 hidden md:block" style="padding-inline:var(--container-px,0.75rem)">' +
        '<nav class="breadcrumb-nav text-sm text-slate-500 dark:text-slate-400 py-4" aria-label="Breadcrumb">' +
        '<ol class="flex items-center gap-1 flex-wrap">' +
        '<li><a href="/products/" data-no-swup class="hover:text-primary transition-colors">' +
        esc(tl("nav_products", "Products")) +
        "</a></li>" +
        (badgeHtml ? badgeHtml : "") +
        (badgeHtml ? chevron : "") +
        '<li><span class="text-slate-900 dark:text-white font-medium">' +
        esc(getProductField(product, "name") || model) +
        "</span></li>" +
        "</ol></nav></div>";
      // Mobile breadcrumb — 统一返回按钮 + 可点击链接
      var mChevron = '<span class="mx-1 text-slate-300 text-xs">/</span>';
      html +=
        '<div class="section-content pt-4 pb-2 md:hidden" style="padding-inline:var(--container-px,0.75rem)">' +
        '<div class="flex items-center gap-2">' +
        '<button onclick="window.Breadcrumb&&window.Breadcrumb.goBack()" class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-400 transition-all flex-shrink-0" aria-label="' +
        tl("pd_back", "返回") +
        '">' +
        '<span class="material-symbols-outlined text-lg">arrow_back</span></button>' +
        '<div class="flex items-center gap-1 flex-wrap">' +
        '<a href="/products/" class="text-xs text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">' +
        esc(tl("nav_products", "Products")) +
        "</a>" +
        (catLabel
          ? mChevron +
            '<a href="/products/' +
            esc(catSlug) +
            '/" class="text-xs text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">' +
            esc(catLabel) +
            "</a>"
          : "") +
        mChevron +
        '<span class="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[160px]">' +
        esc(getProductField(product, "name") || model) +
        "</span>" +
        "</div></div>";
      bcEl.innerHTML = html;
    })();

    // Image: CMS upload > static
    // 统一用 model.webp，不信任 API 或数据表 filePath（命名格式不统一）
    var imgSrc = "/assets/images/products/" + (product.model || "") + ".webp";
    document.title = product.model + " | Yukoli Smart Commercial Kitchen";

    // Highlight matching category in navigator dropdown
    if (product.category && window.Navigator && typeof window.Navigator.highlightCategory === "function") {
      window.Navigator.highlightCategory(product.category);
    }

    // Spec fields — values use getProductField() for i18n
    /* global getProductField */
    var specs = [
      { l: tl("pd_spec_model", "型号"), v: product.model },
      { l: tl("pd_spec_category", "分类"), v: getCategoryName(product) },
      {
        l: tl("pd_spec_subcategory", "子分类"),
        v: translateSubCategory(product) || getProductField(product, "sub_category") || product.subCategory,
      },
      { l: tl("pd_spec_tier", "等级"), v: getProductField(product, "tier") || product.tier },
      { l: tl("pd_spec_power", "功率"), v: product.power },
      { l: tl("pd_spec_capacity", "容量"), v: getProductField(product, "throughput") || product.throughput },
      { l: tl("pd_spec_voltage", "电压"), v: product.voltage },
      { l: tl("pd_spec_frequency", "频率"), v: product.frequency },
      { l: tl("pd_spec_material", "材质"), v: getProductField(product, "material") || product.material },
      {
        l: tl("pd_spec_dimensions", "尺寸"),
        v: getProductField(product, "product_dimensions") || product.productDimensions,
      },
      { l: tl("pd_spec_color", "颜色"), v: getProductField(product, "color") || product.color },
      { l: tl("pd_spec_control", "控制方式"), v: getProductField(product, "control_method") || product.controlMethod },
    ];
    // Add specifications as full-width description card if present
    if (product.specifications) {
      specs.unshift({
        l: tl("pd_spec_specifications", "配置"),
        v: getProductField(product, "specifications") || product.specifications,
        full: true,
      });
    }
    var specCards = "";
    for (var s = 0; s < specs.length; s++) {
      if (!specs[s].v) continue;
      if (specs[s].full) {
        specCards +=
          '<div class="md:col-span-2 py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-left">' +
          '<span class="text-sm text-slate-500 dark:text-slate-400 font-medium block mb-1">' +
          esc(specs[s].l) +
          "</span>" +
          '<span class="text-sm font-semibold whitespace-pre-line">' +
          esc(specs[s].v) +
          "</span></div>";
      } else {
        specCards +=
          '<div class="flex justify-between items-start py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">' +
          '<span class="text-sm text-slate-500 dark:text-slate-400 font-medium">' +
          esc(specs[s].l) +
          "</span>" +
          '<span class="text-sm font-semibold text-right">' +
          esc(specs[s].v) +
          "</span></div>";
      }
    }

    var tier = product.tier
      ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' +
        esc(getProductField(product, "tier")) +
        "</span>"
      : "";
    var badge = product.badge
      ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">' +
        esc(product.badge) +
        "</span>"
      : "";
    var hlBadges = "";
    if (product.highlights) {
      var hlList = product.highlights.split(" · ");
      hlList.forEach(function (h, i) {
        if (i >= 4) return;
        hlBadges +=
          '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">' +
          '<span class="material-symbols-outlined text-[12px]">check_circle</span> ' +
          esc(h) +
          "</span>";
      });
    }
    var wa = window.Contacts ? window.Contacts.whatsapp : "8613163756465";

    // Video support: product.video or product.videoUrl from CMS
    var videoUrl = product.video || product.videoUrl || "";
    var isVideo = !!videoUrl;
    var isYouTube = /youtu\.?be(\/|\.com\/)/.test(videoUrl);
    var embedUrl = "";
    if (isYouTube) {
      /* eslint-disable-next-line no-redeclare */
      var m = videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
      if (m) embedUrl = "https://www.youtube.com/embed/" + m[1] + "?autoplay=1&rel=0";
    }

    // --- Media HTML (with aspect-ratio + object-contain) ---
    var mediaHtml;
    if (isVideo) {
      var videoContainerClass =
        "relative aspect-[4/3] lg:aspect-[3/2] rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center group";
      if (isYouTube) {
        mediaHtml =
          '<div class="' +
          videoContainerClass +
          '"' +
          " onclick=\"(function(el){var f=document.createElement('iframe');f.src='" +
          embedUrl +
          "';f.className='absolute inset-0 w-full h-full';f.allow='autoplay;encrypted-media';f.allowFullscreen=true;f.style.border='none';el.querySelector('.pdp-play-btn').style.display='none';el.querySelector('img').style.display='none';el.appendChild(f);})(this)\">" +
          '<img loading="eager" alt="' +
          esc(product.model) +
          '" class="w-full h-full object-contain p-4 lg:p-6" src="' +
          imgSrc +
          '"' +
          " onerror=\"this.src='/assets/images/products/default.webp'\">" +
          '<div class="pdp-play-btn absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">' +
          '<div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">' +
          '<span class="material-symbols-outlined text-3xl text-primary ml-1">play_arrow</span>' +
          "</div></div>";
      } else {
        mediaHtml =
          '<div class="' +
          videoContainerClass +
          '"' +
          " onclick=\"(function(el){var v=document.createElement('video');v.src='" +
          videoUrl +
          "';v.className='absolute inset-0 w-full h-full object-cover';v.controls=true;v.autoplay=true;v.playsInline=true;el.querySelector('.pdp-play-btn').style.display='none';el.querySelector('img').style.display='none';el.appendChild(v);v.play();})(this)\">" +
          '<img loading="eager" alt="' +
          esc(product.model) +
          '" class="w-full h-full object-contain p-4 lg:p-6" src="' +
          imgSrc +
          '"' +
          " onerror=\"this.src='/assets/images/products/default.webp'\">" +
          '<div class="pdp-play-btn absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">' +
          '<div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">' +
          '<span class="material-symbols-outlined text-3xl text-primary ml-1">play_arrow</span>' +
          "</div></div></div>";
      }
    } else {
      mediaHtml =
        '<div class="relative aspect-[4/3] lg:aspect-[3/2] rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center group">' +
        '<img loading="eager" alt="' +
        esc(product.model) +
        '"' +
        ' class="w-full h-full object-contain p-4 lg:p-6" src="' +
        imgSrc +
        '"' +
        " onerror=\"this.src='/assets/images/products/default.webp'\">" +
        // Zoom hint overlay (PC only)
        '<div class="hidden lg:flex absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">' +
        '<span class="material-symbols-outlined text-sm text-slate-600">zoom_in</span></div>';
      // Check for additional images (gallery)
      if (product.images && product.images.length > 1) {
        mediaHtml += '<div class="absolute bottom-3 left-3 flex gap-1.5">';
        for (var im = 0; im < Math.min(product.images.length, 5); im++) {
          var isActive = product.images[im].isPrimary || im === 0;
          mediaHtml += '<div class="w-2 h-2 rounded-full ' + (isActive ? "bg-white" : "bg-white/50") + '"></div>';
        }
        mediaHtml += "</div>";
      }
      mediaHtml += "</div>";
    }

    // --- Quick specs row ---
    var quickSpecs = "";
    if (product.power) {
      quickSpecs +=
        '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' +
        '<span class="material-symbols-outlined text-[14px]">bolt</span>' +
        esc(product.power) +
        "</span>";
    }
    if (product.voltage) {
      quickSpecs +=
        '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' +
        '<span class="material-symbols-outlined text-[14px]">power</span>' +
        esc(product.voltage) +
        "</span>";
    }
    var dimensionsValue = getProductField(product, "product_dimensions") || product.productDimensions;
    if (dimensionsValue) {
      quickSpecs +=
        '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' +
        '<span class="material-symbols-outlined text-[14px]">straighten</span>' +
        esc(dimensionsValue) +
        "</span>";
    }
    var quickSpecsHtml = quickSpecs ? '<div class="flex flex-wrap items-center gap-2">' + quickSpecs + "</div>" : "";

    // --- Usage description box ---
    var usageValue = getProductField(product, "usage") || product.usage;
    var usageHtml = usageValue
      ? '<div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mt-1 border border-slate-100 dark:border-slate-700">' +
        '<p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">' +
        esc(usageValue) +
        "</p></div>"
      : "";

    // --- Main layout ---
    var html =
      // Hero section
      '<section class="fullwidth-bg bg-gradient-to-br from-primary/[0.03] via-transparent to-orange-50/50 dark:from-primary/[0.06] dark:to-orange-900/10">' +
      '<div class="section-content"><div class="flex flex-col lg:flex-row gap-8 lg:items-start">' +
      // Image column
      '<div class="lg:w-1/2">' +
      mediaHtml +
      "</div>" +
      // Info column
      '<div class="lg:w-1/2 flex flex-col gap-5"><div>' +
      '<div class="flex items-center gap-3 mb-2">' +
      '<span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">' +
      esc(translateSubCategory(product) || getCategoryName(product)) +
      "</span>" +
      badge +
      tier +
      "</div>" +
      '<h1 id="detail-title" class="text-2xl lg:text-3xl font-black tracking-tight mb-2">' +
      esc(getProductField(product, "name") || product.model) +
      "</h1>" +
      // Model subtitle
      (product.model && product.name && product.name !== product.model
        ? '<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">' +
          tl("pd_spec_model", "型号") +
          ": " +
          esc(product.model) +
          "</p>"
        : "") +
      // Highlights badges row
      (hlBadges ? '<div class="flex flex-wrap gap-2 mt-2">' + hlBadges + "</div>" : "") +
      // Category name
      '<p class="text-base text-slate-500 dark:text-slate-400 mt-2">' +
      esc(getCategoryName(product)) +
      "</p>" +
      // Quick specs row
      quickSpecsHtml +
      // Usage description
      usageHtml +
      "</div>" +
      // CTA buttons (3:1 ratio)
      '<div class="flex items-center gap-3">' +
      '<a href="/quote/?model=' +
      encodeURIComponent(product.model) +
      '"' +
      ' class="flex-[3] bg-primary text-white px-6 py-3.5 rounded-xl font-bold' +
      ' flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">request_quote</span> ' +
      tl("pd_get_quote", "获取报价") +
      "</a>" +
      '<a href="https://wa.me/' +
      wa +
      "?text=" +
      encodeURIComponent(
        (product.subCategory || getCategoryName(product)
          ? (product.subCategory || getCategoryName(product)) + " "
          : "") + product.model
      ) +
      '" target="_blank"' +
      ' class="flex-1 px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2' +
      ' border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">chat</span> ' +
      tl("pd_contact_sales", "联系销售") +
      "</a></div></div></div></div></section>" +
      // Specs section
      '<section class="fullwidth-bg py-12 lg:py-16">' +
      '<div class="section-content">' +
      '<h2 class="text-xl font-bold mb-4 flex items-center gap-2">' +
      '<span class="material-symbols-outlined text-primary">specifications</span> ' +
      tl("pd_spec_product_specs", "产品规格") +
      "</h2>" +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
      specCards +
      "</div></div></section>" +
      // CTA section (full-width primary bg)
      '<section class="fullwidth-bg bg-primary py-12 lg:py-16 overflow-hidden">' +
      '<div class="section-content text-center">' +
      '<h2 class="text-xl font-black text-white mb-3">' +
      tl("pd_custom_solution", "需要定制方案？") +
      "</h2>" +
      '<p class="text-white/80 mb-6 text-sm">' +
      tl("pd_custom_solution_desc", "告诉我们您的需求，我们为您提供专属解决方案。") +
      "</p>" +
      '<a href="/quote/" class="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all">' +
      '<span class="material-symbols-outlined">arrow_forward</span> ' +
      tl("pd_get_quote", "获取报价") +
      "</a></div></section>";

    ce = document.getElementById("product-content");
    if (ce) ce.innerHTML = html;

    // Static specs grid
    var sg2 = document.getElementById("specs-grid");
    if (sg2) sg2.innerHTML = specCards;

    // Related products
    renderRelated(product);

    // Inject responsive srcset for all rendered images
    var lazyMod = window.app && window.app.modules && window.app.modules.get("lazyLoading");
    if (lazyMod && typeof lazyMod.reInjectSrcset === "function") {
      lazyMod.reInjectSrcset(document.getElementById("product-content") || document);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderPDP._pending = false;
    renderPDP();
  });
  document.addEventListener("product-data-ready", function () {
    var path = window.location.pathname;
    if (!/^\/products\/[^/]+\/[^/]+\/$/.test(path)) return;
    renderPDP();
  });
  // Get translated category name (from UI i18n, not product_translations)
  function getCategoryName(product) {
    var cat = product.category || product.categoryName || "";
    if (!cat) return "";
    // Priority: product._categoryName (enriched from parent) > i18n translate > product.categoryName > raw key
    if (product._categoryName) return product._categoryName;
    var CATEGORY_I18N_MAP = {
      翻炒系列: "nav_products_stirfry",
      炖煮系列: "nav_products_stewing",
      蒸煮系列: "nav_products_steaming",
      煎炸系列: "nav_products_frying",
      切配系列: "nav_products_cutting",
      辅助系列: "nav_products_other",
    };
    var i18nKey = CATEGORY_I18N_MAP[cat];
    // fallback: 通过 model 从 MODEL_TO_SLUG 反查标准分类名
    if (!i18nKey && product.model && window.MODEL_TO_SLUG) {
      var slug = window.MODEL_TO_SLUG[product.model];
      if (slug) {
        var slugToName = {
          stirfry: "nav_products_stirfry",
          cutting: "nav_products_cutting",
          frying: "nav_products_frying",
          stewing: "nav_products_stewing",
          steaming: "nav_products_steaming",
          other: "nav_products_other",
        };
        var nameKey = slugToName[slug];
        if (nameKey) i18nKey = nameKey;
      }
    }
    if (i18nKey) {
      var translated = tl(i18nKey, "");
      if (translated) return translated;
    }
    return product.categoryName || cat;
  }

  // Get translated subCategory (e.g. "搅拌炒菜机" → "Stirring Cooking Machine")
  // Static map: Chinese subCategory → English translation
  // Derived from src/assets/lang/en-product.json (keys: product_subcat_{slug}_{chinese})
  var SUBCAT_I18N_MAP = {
    搅拌炒菜机: "Stirring Cooking Machine",
    滚筒炒菜机: "Drum Stir-Fry Machine",
    团餐滚筒炒菜机: "Catering Drum Wok",
    搅拌炒锅炖烩机: "Stir-fry Pot / Stewing Machine",
    汤锅: "Stock Pot",
    压力锅: "Pressure Cooker",
    煮面炉: "Noodle Cooker",
    煲仔炉: "Clay Pot Cooker",
    卤煮炉: "Braising Stew Pot",
    智能蒸饭机: "Smart Rice Steamer",
    自动漂烫焯水油炸机: "Automatic Blanching / Scalding / Frying Machine",
    油炸炉: "Deep Fryer",
    锅贴机: "Pot Sticker Machine",
    流水化自动机: "Automated Inline Machine",
    揭盖式洗碗机: "Lift-Lid Dishwasher",
    长龙洗碗机: "Long Conveyor Dishwasher",
    切菜机: "Vegetable Cutting Machine",
    切肉机: "Meat Cutting Machine",
    锯骨机: "Bone Saw Machine",
    切丁机: "Dicing Machine",
    切片机: "Slicing Machine",
    绞肉机: "Meat Grinder",
  };

  function translateSubCategory(product) {
    var subCat = product.subCategory;
    if (!subCat) return "";
    // Try per-model translation first (getProductField)
    if (typeof getProductField === "function") {
      var pf = getProductField(product, "sub_category");
      if (pf && pf !== product.subCategory) return pf;
    }
    // Static map
    if (SUBCAT_I18N_MAP[subCat]) return SUBCAT_I18N_MAP[subCat];
    return subCat;
  }

  // Usage: getProductField is now defined in utils.js (always loaded before this file)
  // This file only provides loadProductTranslations for async translation loading on PDP
  // Load translations for a language by fetching {lang}-product.json
  window.loadProductTranslations = function (lang, callback) {
    var normalizedLang = lang.replace("_", "-");
    // zh-CN uses product-data-table directly (Chinese is the source)
    if (normalizedLang === "zh-CN" || normalizedLang === "zh") {
      window._productTranslations = {};
      window._productTranslationsByModel = {};
      if (callback) callback();
      return;
    }
    // Fetch {lang}-product.json
    var baseUrl = (window.BASE_PATH || "") + "/assets/lang/";
    var url = baseUrl + normalizedLang + "-product.json";
    fetch(url, { cache: "default" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        // Convert flat keys to model-based lookup
        // JSON keys: product_dlb_tbs30_name → model=DLB-TBS30, field=name
        var byModel = {};
        var products = getAllProducts();
        var modelMap = {};
        products.forEach(function (p) {
          var key = (p.model || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
          if (key) modelMap[key] = p.model;
        });
        Object.keys(json).forEach(function (key) {
          // Parse: product_{model}_{field}
          var m = key.match(
            /^product_([a-z0-9]+(?:_[a-z0-9]+)*)_(name|specifications|usage|throughput|material|sub_category|tier|badge|control_method|product_dimensions|color|highlights)$/i
          );
          if (!m) return;
          var modelKey = m[1];
          var field = m[2].toLowerCase();
          var model = modelMap[modelKey];
          if (!model) return;
          if (!byModel[model]) byModel[model] = {};
          byModel[model][field] = json[key];
        });
        window._productTranslations = byModel;
        window._productTranslationsByModel = byModel;
        if (callback) callback();
        // Dispatch event for other listeners
        document.dispatchEvent(new CustomEvent("productTranslationsLoaded"));
      })
      .catch(function (e) {
        window._productTranslations = {};
        window._productTranslationsByModel = {};
        if (callback) callback();
      });
  };

  _spaOn(window, "languageChanged", renderPDP, "languageChanged");
  document.addEventListener("productTranslationsLoaded", renderPDP);
  document.addEventListener("spa:load", function () {
    var segs = location.pathname.split("/").filter(Boolean);
    if (segs[0] !== "products") return;
    var shouldRender =
      (segs[1] === "detail" && segs[2]) ||
      (segs[1] && segs[1] !== "compare" && !isCategorySlug(segs[1])) ||
      (isCategorySlug(segs[1]) && segs[2]);
    if (!shouldRender) return;
    if (window.translationManager && !window.translationManager.isInitialized) {
      var onReady = function () {
        document.removeEventListener("spa:ready", onReady);
        renderPDP();
      };
      document.addEventListener("spa:ready", onReady);
    } else {
      renderPDP();
    }
  });
  // Fallback: re-render on popstate (browser back/forward via Swup)
  window.addEventListener("popstate", function () {
    renderPDP();
  });
  _spaOn(
    document,
    "spa:ready",
    function () {
      var segs = location.pathname.split("/").filter(Boolean);
      if (segs[0] !== "products") return;
      var shouldRender =
        (segs[1] === "detail" && segs[2]) ||
        (segs[1] && segs[1] !== "compare" && !isCategorySlug(segs[1])) ||
        (isCategorySlug(segs[1]) && segs[2]);
      if (!shouldRender) return;
      renderPDP();
    },
    "spa:ready:renderPDP"
  );

  // Expose for debugging and external calls
  window.renderPDP = renderPDP;

  // Auto-run on page load (defensive: DOMContentLoaded may race with product-data-ready)
  if (document.readyState !== "loading") {
    renderPDP._pending = false;
    renderPDP();
  }
})();
