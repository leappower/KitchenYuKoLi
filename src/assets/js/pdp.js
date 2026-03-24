/**
 * PDP Renderer — 产品详情页渲染逻辑
 * 从 PDP PC 内联脚本提取，供 mobile/tablet 变体共用
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(window.location.search);
    var model = params.get("model");
    if (!model) {
      window.location.href = "/products/";
      return;
    }
    var products = window.PRODUCT_DATA_TABLE || [];
    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].model === model) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      var _contentEl = document.getElementById("product-content");
      if (_contentEl) {
        contentEl.innerHTML =
          '<div class="max-w-3xl mx-auto px-4 py-16 text-center">' +
          '<div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">' +
          '<span class="material-symbols-outlined text-3xl text-slate-400">search_off</span></div>' +
          '<h2 class="text-xl font-bold mb-3" data-i18n="pdp_not_found_title">产品未找到</h2>' +
          '<p class="text-slate-500 mb-6" data-i18n="pdp_not_found_desc">抱歉，未找到该产品。请浏览我们的产品目录。</p>' +
          '<a href="/products/" class="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all">' +
          '<span class="material-symbols-outlined">arrow_back</span> <span data-i18n="pdp_back_to_products">返回产品中心</span></a></div>';
      }
      return;
    }

    function _tr(key, fallback) {
      if (window.CommonUtils && typeof window.CommonUtils.tr === "function")
        return window.CommonUtils.tr(key, fallback);
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

    var imgKey = modelToSnake(product.model) + "_1";
    var imgSrc = "/assets/images/products/" + imgKey + ".webp";

    var breadcrumbEl = document.getElementById("breadcrumb-product");
    if (breadcrumbEl) breadcrumbEl.textContent = product.name || product.model;
    document.title = (product.name || product.model) + " | Yukoli 智能商厨设备";

    // Update JSON-LD
    (function () {
      var el = document.getElementById("product-jsonld");
      if (!el) return;
      var schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name || product.model,
        description: (product.description || product.model).substring(0, 200),
        image: "https://www.kitchen.yukoli.com/assets/images/products/" + imgKey + ".webp",
        brand: { "@type": "Brand", name: "YuKoLi" },
        manufacturer: { "@type": "Organization", name: "YuKoLi 跃迁力科技" },
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          priceCurrency: "USD",
          price: product.referencePrice || "",
        },
      };
      el.textContent = JSON.stringify(schema, null, 2);
    })();

    var highlights = Array.isArray(product.highlights) ? product.highlights : [];
    var scenarios = Array.isArray(product.scenarios) ? product.scenarios : [];
    var category = product.category || "";
    var subCategory = product.subCategory || "";

    var specFields = [
      { label: "型号", value: product.model, key: "model" },
      { label: "分类", value: category, key: "category" },
      { label: "子分类", value: subCategory, key: "subCategory" },
      { label: "功率", value: product.power, key: "power" },
      { label: "产能", value: product.throughput, key: "throughput" },
      { label: "平均用时", value: product.averageTime, key: "averageTime" },
      { label: "电压", value: product.voltage, key: "voltage" },
      { label: "频率", value: product.frequency, key: "frequency" },
      { label: "材质", value: product.material, key: "material" },
      { label: "产品尺寸", value: product.productDimensions, key: "productDimensions" },
      { label: "净重", value: product.netWeight, key: "netWeight" },
      { label: "毛重", value: product.grossWeight, key: "grossWeight" },
      { label: "包装尺寸", value: product.packageDimensions, key: "packageDimensions" },
      { label: "颜色", value: product.color, key: "color" },
      { label: "认证", value: product.certification, key: "certification" },
      { label: "质保", value: product.warrantyPeriod, key: "warrantyPeriod" },
      { label: "产地", value: product.origin, key: "origin" },
      { label: "装箱数", value: product.packingQuantity, key: "packingQuantity" },
      { label: "起订量", value: product.minimumOrderQuantity, key: "minimumOrderQuantity" },
      { label: "参考价格", value: product.referencePrice, key: "referencePrice" },
    ];

    var specRows = "";
    for (var s = 0; s < specFields.length; s++) {
      if (specFields[s].value) {
        specRows +=
          '<tr class="border-b border-slate-100 dark:border-slate-700/50">' +
          '<td class="py-3 px-4 text-slate-500 dark:text-slate-400 text-sm font-medium w-1/3">' +
          esc(specFields[s].label) +
          "</td>" +
          '<td class="py-3 px-4 text-sm">' +
          esc(specFields[s].value) +
          "</td></tr>";
      }
    }

    var highlightItems = "";
    for (var h = 0; h < highlights.length; h++) {
      highlightItems +=
        '<li class="flex items-start gap-3"><span class="material-symbols-outlined text-primary mt-0.5 flex-shrink-0">check_circle</span><span>' +
        esc(highlights[h]) +
        "</span></li>";
    }

    var scenarioItems = "";
    for (var sc = 0; sc < scenarios.length; sc++) {
      scenarioItems +=
        '<span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-sm">' +
        '<span class="material-symbols-outlined text-primary text-sm">store</span>' +
        esc(scenarios[sc]) +
        "</span>";
    }

    var relatedHtml = "";
    var relatedCount = 0;
    for (var r = 0; r < products.length && relatedCount < 4; r++) {
      var rp = products[r];
      if (rp.model === product.model) continue;
      if (rp.category === product.category || rp.subCategory === product.subCategory) {
        var rImgKey = modelToSnake(rp.model) + "_1";
        relatedHtml +=
          '<a href="/pdp/?model=' +
          encodeURIComponent(rp.model) +
          '" class="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all group block">' +
          '<div class="h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden">' +
          '<img loading="lazy" alt="' +
          esc(rp.name || rp.model) +
          '" class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="/assets/images/products/' +
          rImgKey +
          '.webp" onerror="this.style.display=\'none\'">' +
          '</div><div class="p-4"><h4 class="font-bold text-sm mb-1">' +
          esc(rp.name || rp.model) +
          "</h4>" +
          '<p class="text-xs text-slate-500 dark:text-slate-400">' +
          esc(rp.model) +
          "</p></div></a>";
        relatedCount++;
      }
    }

    var badgeHtml = "";
    if (product.badge) {
      var badgeColor = product.badgeColor || "bg-primary";
      badgeHtml =
        '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ' +
        badgeColor +
        ' text-white">' +
        esc(product.badge) +
        "</span>";
    }

    var whatsappNumber = window.Contacts ? window.Contacts.whatsapp : "16478158194";

    var html =
      '<div class="max-w-5xl mx-auto px-4 py-6">' +
      '<div class="flex flex-col lg:flex-row gap-8">' +
      '<div class="lg:w-1/2">' +
      '<div class="rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg">' +
      '<div class="relative">' +
      '<img loading="eager" alt="' + esc(product.name || product.model) + '" class="w-full h-[360px] object-cover" src="' + imgSrc + '" onerror="this.src=\'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop\'">' +
      "</div></div></div>" +
      '<div class="lg:w-1/2 flex flex-col gap-5">' +
      "<div>" +
      '<div class="flex items-center gap-3 mb-2">' +
      '<span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">' +
      esc(subCategory || category) +
      "</span>" +
      badgeHtml +
      "</div>" +
      '<h1 class="text-2xl lg:text-3xl font-black tracking-tight mb-2">' +
      esc(product.name || product.model) +
      "</h1>" +
      '<p class="text-base text-slate-500 dark:text-slate-400">' +
      esc(product.model) +
      "</p>" +
      "</div>" +
      '<div class="flex items-center gap-3">' +
      '<a href="/quote/?model=' + encodeURIComponent(product.model) + '" class="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">request_quote</span> <span data-i18n="pdp_cta_quote">获取报价</span></a>' +
      '<a href="https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent("Hi, I am interested in " + (product.name || product.model)) + '" target="_blank" class="px-6 py-3 rounded-xl font-bold flex items-center gap-2 border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">chat</span> <span data-i18n="pdp_cta_contact">联系销售</span></a>' +
      "</div>" +
      (scenarios.length > 0 ? '<div class="flex flex-wrap gap-2">' + scenarioItems + "</div>" : "") +
      "</div></div>" +
      (highlights.length > 0
        ? '<section class="mt-8"><h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">star</span> <span data-i18n="pdp_highlights">产品亮点</span></h2><ul class="space-y-3 max-w-3xl">' +
          highlightItems +
          "</ul></section>"
        : "") +
      (specRows
        ? '<section class="mt-8"><h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">specifications</span> <span data-i18n="pdp_specs">产品规格</span></h2><div class="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md max-w-3xl"><table class="w-full">' +
          specRows +
          "</table></div></section>"
        : "") +
      (relatedHtml
        ? '<section class="mt-12"><h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">grid_view</span> <span data-i18n="pdp_related">相关产品</span></h2><div class="grid grid-cols-2 lg:grid-cols-4 gap-4">' +
          relatedHtml +
          "</div></section>"
        : "") +
      '<section class="mt-12 bg-primary rounded-xl p-8 text-center"><h2 class="text-xl font-black text-white mb-3" data-i18n="pdp_bottom_title">需要定制方案？</h2><p class="text-white/80 mb-6 text-sm" data-i18n="pdp_bottom_desc">告诉我们您的需求，我们为您提供专属解决方案。</p><a href="/quote/" class="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"><span class="material-symbols-outlined">arrow_forward</span> <span data-i18n="pdp_cta_quote">获取报价</span></a></section>' +
      "</div>";

    var contentEl = document.getElementById("product-content");
    if (contentEl) contentEl.innerHTML = html;
  });
})();
