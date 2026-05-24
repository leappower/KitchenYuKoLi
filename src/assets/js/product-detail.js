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
    var rImg =
      rp.images && rp.images.length > 0
        ? (function () {
            var f = (
              rp.images.find(function (i) {
                return i.isPrimary;
              }) || rp.images[0]
            ).filePath;
            // Defensive: rewrite stale CMS paths
            if (f && f.indexOf("/admin/uploads/") === 0) {
              f = "/assets/images/products/" + f.split("/").pop();
            }
            return f;
          })()
        : "/assets/images/products/" + modelToSnake(rp.model) + "_1.webp";
    var gradients = [
      "from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/30",
      "from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20",
      "from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20",
    ];
    var grad = gradients[idx % gradients.length];
    return (
      '<a href="/products/' +
      encodeURIComponent(rp.model) +
      '" class="group block bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700">' +
      '<div class="h-36 bg-gradient-to-br ' +
      grad +
      ' relative overflow-hidden">' +
      '<img loading="lazy" alt="' +
      esc(rp.model) +
      '" class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="' +
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
    if (!ce || !re) {
      // Products listing page has #products-section; hide it and create PDP containers
      var listing = document.getElementById("products-section") || document.getElementById("product-grid");
      var container = listing
        ? listing.parentElement
        : document.getElementById("app") || document.querySelector("main") || document.body;
      if (listing) listing.style.display = "none";

      if (!ce) {
        // Insert breadcrumb bar before product-content
        var bc = document.getElementById("pdp-breadcrumb");
        if (!bc) {
          bc = document.createElement("div");
          bc.id = "pdp-breadcrumb";
          bc.className = "w-full";
          container.insertBefore(bc, container.firstChild);
        }
        ce = document.createElement("div");
        ce.id = "product-content";
        ce.className = "w-full py-10";
        container.insertBefore(ce, bc.nextSibling);
      }
      if (!re) {
        var section = document.createElement("section");
        section.className = "w-full py-12";
        section.innerHTML =
          '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">' +
          '<h2 class="text-xl font-bold mb-4 flex items-center gap-2">' +
          '<span class="material-symbols-outlined text-primary">recommend</span> ' +
          tl("detail_recommended", "推荐产品") +
          "</h2>" +
          '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" id="related-products"></div>' +
          "</div>";
        // Find the container's parent to append
        var target = ce.parentElement || container;
        target.appendChild(section);
      }
    }
  }

  function renderPDP() {
    // Read model from path: /products/detail/<model>/ or legacy /products/<model>/
    var path = window.location.pathname.replace(/\/$/, "");
    var model = null;
    var m = path.match(/^\/products\/detail\/([^/]+)$/);
    if (m) {
      model = decodeURIComponent(m[1]);
    } else {
      // Legacy path: /products/<model>/ — skip category slugs
      m = path.match(/^\/products\/([^/]+)$/);
      if (m && !isCategorySlug(m[1])) {
        model = decodeURIComponent(m[1]);
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
      var slugMap = (window.Breadcrumb && window.Breadcrumb.CATEGORY_KEY_TO_SLUG) || {};
      var slugMapRev = (window.Breadcrumb && window.Breadcrumb.SLUG_TO_CATEGORY_KEY) || {};
      var slug = slugMap[catKey] || "";
      var catLabel = slug
        ? ((window.Breadcrumb && window.Breadcrumb.PRODUCT_SLUGS && window.Breadcrumb.PRODUCT_SLUGS[slug]) || {}).label
        : "";
      // Track referrer for back navigation
      if (slug) sessionStorage.setItem("pdp_referrer", "/products/" + slug + "/");
      var model = product.model || "";
      // PC/Tablet breadcrumb
      var html =
        '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0 hidden md:block">' +
        '<nav class="text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">' +
        '<ol class="flex items-center gap-1 flex-wrap">' +
        '<li><a href="/products/" class="hover:text-primary transition-colors">Products</a></li>' +
        '<li class="mx-1.5 text-slate-300 dark:text-slate-600">/</li>';
      if (catLabel && slug) {
        html +=
          '<li><a href="/products/' +
          slug +
          '/" class="hover:text-primary transition-colors">' +
          catLabel +
          "</a></li>" +
          '<li class="mx-1.5 text-slate-300 dark:text-slate-600">/</li>';
      }
      html +=
        '<li><span class="text-slate-900 dark:text-white font-medium">' + model + "</span></li>" + "</ol></nav></div>";
      // Mobile back bar
      html +=
        '<div class="max-w-7xl mx-auto px-4 pt-3 pb-0 md:hidden">' +
        '<div class="flex items-center gap-3">' +
        '<button onclick="window.Breadcrumb&&window.Breadcrumb.goBack()" class="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-400 transition-all" aria-label="' +
        tl("pd_back", "返回") +
        '">' +
        '<span class="material-symbols-outlined text-xl">arrow_back</span></button>' +
        '<div><div class="text-xs text-slate-500 dark:text-slate-400">' +
        (catLabel || tl("pd_product_center", "产品中心")) +
        "</div>" +
        '<div class="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">' +
        model +
        "</div></div>" +
        "</div></div>";
      bcEl.innerHTML = html;
    })();

    // Image: CMS upload > static
    var imgSrc = "/assets/images/products/" + modelToSnake(product.model) + "_1.webp";
    if (product.images && product.images.length > 0) {
      var pi =
        product.images.find(function (i) {
          return i.isPrimary;
        }) || product.images[0];
      if (pi && pi.filePath) {
        imgSrc = pi.filePath;
        // Defensive: rewrite stale CMS paths
        if (imgSrc.indexOf("/admin/uploads/") === 0) {
          imgSrc = "/assets/images/products/" + imgSrc.split("/").pop();
        }
      }
    }
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
      { l: tl("pd_spec_subcategory", "子分类"), v: getProductField(product, "sub_category") || product.subCategory },
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
          '<div class="md:col-span-2 py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">' +
          '<span class="text-sm text-slate-500 dark:text-slate-400 font-medium block mb-1">' +
          esc(specs[s].l) +
          "</span>" +
          '<span class="text-sm font-semibold">' +
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
        esc(product.tier) +
        "</span>"
      : "";
    var badge = product.badge
      ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">' +
        esc(product.badge) +
        "</span>"
      : "";
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

    var mediaHtml;
    if (isVideo) {
      if (isYouTube) {
        mediaHtml =
          "<div class=\"relative group cursor-pointer\" onclick=\"(function(el){var f=document.createElement('iframe');f.src='" +
          embedUrl +
          "';f.className='absolute inset-0 w-full h-full';f.allow='autoplay;encrypted-media';f.allowFullscreen=true;f.style.border='none';el.querySelector('.pdp-play-btn').style.display='none';el.querySelector('img').style.display='none';el.appendChild(f);})(this)\">" +
          '<img loading="eager" alt="' +
          esc(product.model) +
          '" class="w-full h-[360px] object-cover" src="' +
          imgSrc +
          '"' +
          " onerror=\"this.src='/assets/images/default.webp'\">" +
          '<div class="pdp-play-btn absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">' +
          '<div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">' +
          '<span class="material-symbols-outlined text-3xl text-primary ml-1">play_arrow</span>' +
          "</div></div></div>";
      } else {
        mediaHtml =
          "<div class=\"relative group cursor-pointer\" onclick=\"(function(el){var v=document.createElement('video');v.src='" +
          videoUrl +
          "';v.className='absolute inset-0 w-full h-full object-cover';v.controls=true;v.autoplay=true;v.playsInline=true;el.querySelector('.pdp-play-btn').style.display='none';el.querySelector('img').style.display='none';el.appendChild(v);v.play();})(this)\">" +
          '<img loading="eager" alt="' +
          esc(product.model) +
          '" class="w-full h-[360px] object-cover" src="' +
          imgSrc +
          '"' +
          " onerror=\"this.src='/assets/images/default.webp'\">" +
          '<div class="pdp-play-btn absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">' +
          '<div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">' +
          '<span class="material-symbols-outlined text-3xl text-primary ml-1">play_arrow</span>' +
          "</div></div></div>";
      }
    } else {
      mediaHtml =
        '<div class="relative"><img loading="eager" alt="' +
        esc(product.model) +
        '"' +
        ' class="w-full h-[360px] object-cover" src="' +
        imgSrc +
        '"' +
        " onerror=\"this.src='/assets/images/default.webp'\">";
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

    var html =
      '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex flex-col lg:flex-row gap-8 lg:items-start">' +
      '<div class="lg:w-1/2"><div class="rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg">' +
      mediaHtml +
      "</div></div>" +
      '<div class="lg:w-1/2 flex flex-col gap-5"><div>' +
      '<div class="flex items-center gap-3 mb-2">' +
      '<span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">' +
      esc(product.subCategory || getCategoryName(product)) +
      "</span>" +
      badge +
      tier +
      "</div>" +
      '<h1 id="detail-title" class="text-2xl lg:text-3xl font-black tracking-tight mb-2">' +
      esc(product.name || product.model) +
      "</h1>" +
      (product.model && product.name && product.name !== product.model
        ? '<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">' +
          tl("pd_spec_model", "型号") +
          ": " +
          esc(product.model) +
          "</p>"
        : "") +
      '<p class="text-base text-slate-500 dark:text-slate-400">' +
      esc(getCategoryName(product)) +
      "</p></div>" +
      '<div class="flex items-center gap-3">' +
      '<a href="/quote/?model=' +
      encodeURIComponent(product.model) +
      '"' +
      ' class="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold' +
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
      ' class="flex-1 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2' +
      ' border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">chat</span> ' +
      tl("pd_contact_sales", "联系销售") +
      "</a></div></div></div>" +
      '<section class="mt-8"><h2 class="text-xl font-bold mb-4 flex items-center gap-2">' +
      '<span class="material-symbols-outlined text-primary">specifications</span> ' +
      tl("pd_spec_product_specs", "产品规格") +
      "</h2>" +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
      specCards +
      "</div></section>" +
      "</div></div>" +
      '<section class="mt-12"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-primary rounded-xl p-8 text-center">' +
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
    if (ce) ce.className = "w-full py-10";
    if (ce) ce.innerHTML = html;

    // Static specs grid
    var sg2 = document.getElementById("specs-grid");
    if (sg2) sg2.innerHTML = specCards;

    // Related products
    renderRelated(product);
  }

  document.addEventListener("DOMContentLoaded", renderPDP);
  document.addEventListener("product-data-ready", renderPDP);
  // Get translated category name (from UI i18n, not product_translations)
  function getCategoryName(product) {
    var cat = product.category || product.categoryName || "";
    if (!cat) return "";
    // Priority: product._categoryName (enriched from parent) > i18n translate > product.categoryName > raw key
    if (product._categoryName) return product._categoryName;
    if (typeof window.t === "function") {
      var translated = window.t(cat);
      if (translated && translated !== cat) return translated;
    }
    return product.categoryName || cat;
  }

  // Usage: getProductField(product, 'name') → returns translated name or fallback to Chinese
  window.getProductField = function (product, field) {
    if (!product) return "";
    var lang = (window.CURRENT_LANG || document.documentElement.lang || "zh-CN").replace("_", "-");
    if (lang === "zh-CN" || lang === "zh") return product[field] || "";
    // Check translations cache (loaded via API)
    var tKey = product.model || product.id;
    var translations = window._productTranslations || {};
    var t = translations[tKey] || translations[product._productId];
    if (t && t[field]) return t[field];
    return product[field] || "";
  };

  // Load translations for a language (called when user switches language)
  window.loadProductTranslations = function (lang, callback) {
    if (lang === "zh-CN" || lang === "zh") {
      window._productTranslations = {};
      if (callback) callback();
      return;
    }
    // Extract translations from the already-loaded PRODUCT_DATA_TABLE
    var suffix =
      lang.charAt(0).toUpperCase() +
      lang.slice(1).replace(/-([a-z])/g, function (m, c) {
        return c.toUpperCase();
      });
    var products = getAllProducts();
    var map = {};
    var fields = [
      "name",
      "specifications",
      "usage",
      "throughput",
      "material",
      "sub_category",
      "tier",
      "badge",
      "control_method",
      "product_dimensions",
      "color",
    ];
    products.forEach(function (p) {
      var pid = p._productId || p.id;
      if (!pid) return;
      var entry = {};
      fields.forEach(function (f) {
        var val = p[f + suffix];
        if (val) entry[f] = val;
      });
      if (Object.keys(entry).length > 0) map[pid] = entry;
    });
    window._productTranslations = map;
    window._productTranslationsByModel = {};
    products.forEach(function (p) {
      var t = map[p._ProductId || p.id];
      if (t) window._productTranslationsByModel[p.model] = t;
    });
    if (callback) callback();
  };

  _spaOn(window, "languageChanged", renderPDP, "languageChanged");
  document.addEventListener("productTranslationsLoaded", renderPDP);
  _spaOn(
    document,
    "spa:load",
    function () {
      var segs = location.pathname.split("/").filter(Boolean);
      // Only render PDP on /products/detail/<model>/ or /products/<model>/ (non-category)
      if (segs[0] === "products") {
        if (segs[1] === "detail" && segs[2]) {
          renderPDP();
        } else if (segs[1] && segs[1] !== "compare" && !isCategorySlug(segs[1])) {
          renderPDP();
        }
      }
    },
    "spa:load:renderPDP"
  );
  _spaOn(
    document,
    "spa:ready",
    function () {
      var segs = location.pathname.split("/").filter(Boolean);
      if (segs[0] === "products") {
        if (segs[1] === "detail" && segs[2]) {
          renderPDP();
        } else if (segs[1] && segs[1] !== "compare" && !isCategorySlug(segs[1])) {
          renderPDP();
        }
      }
    },
    "spa:ready:renderPDP"
  );
})();
