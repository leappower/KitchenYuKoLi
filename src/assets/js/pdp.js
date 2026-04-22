/**
 * PDP Renderer — 产品详情页渲染逻辑
 * 从 PDP PC 内联脚本提取，供 mobile/tablet 变体共用
 */
(function () {

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

  // Flatten nested PRODUCT_DATA_TABLE into flat array of products
  function getAllProducts() {
    var table = window.PRODUCT_DATA_TABLE || [];
    var flat = [];
    for (var i = 0; i < table.length; i++) {
      var products = table[i].products || [];
      for (var j = 0; j < products.length; j++) {
        flat.push(products[j]);
      }
    }
    return flat;
  }

  // Find a product by model from the flat list
  function findProduct(model) {
    var products = getAllProducts();
    for (var i = 0; i < products.length; i++) {
      if (products[i].model === model) return products[i];
    }
    return null;
  }

  function renderPDP() {
    var params = new URLSearchParams(window.location.search);
    var model = params.get("model");
    if (!model) {
      window.location.href = "/products/";
      return;
    }

    var product = findProduct(model);

    if (!product) {
      var contentEl = document.getElementById("product-content");
      if (contentEl) {
        contentEl.innerHTML =
          '<div class="max-w-3xl mx-auto px-4 py-16 text-center">' +
          '<div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">' +
          '<span class="material-symbols-outlined text-3xl text-slate-400">search_off</span></div>' +
          '<h2 class="text-xl font-bold mb-3">产品未找到</h2>' +
          '<p class="text-slate-500 mb-6">抱歉，未找到该产品。请浏览我们的产品目录。</p>' +
          '<a href="/products/" class="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all">' +
          '<span class="material-symbols-outlined">arrow_back</span> 返回产品中心</a></div>';
      }
      return;
    }

    var imgKey = modelToSnake(product.model) + "_1";
    var imgSrc = "/assets/images/products/" + imgKey + ".webp";

    // Use uploaded image if available (from CMS)
    if (product.images && product.images.length > 0) {
      var primaryImg = product.images.find(function(i) { return i.isPrimary; }) || product.images[0];
      if (primaryImg && primaryImg.filePath) {
        imgSrc = primaryImg.filePath;
      }
    }

    document.title = (product.model) + " | Yukoli 智能商厨设备";

    // Update JSON-LD
    (function () {
      var el = document.getElementById("product-jsonld");
      if (!el) return;
      var schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.model,
        image: "https://www.kitchen.yukoli.com" + imgSrc,
        brand: { "@type": "Brand", name: "YuKoLi" },
        manufacturer: { "@type": "Organization", name: "YuKoLi 跃迁力科技" },
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
        },
      };
      el.textContent = JSON.stringify(schema, null, 2);
    })();

    var highlights = Array.isArray(product.highlights) ? product.highlights : [];
    var scenarios = Array.isArray(product.scenarios) ? product.scenarios : [];
    var category = product.category || "";
    var categoryName = product.categoryName || category;
    var subCategory = product.subCategory || "";
    var tier = product.tier || "";

    var specFields = [
      { label: "型号", value: product.model },
      { label: "分类", value: categoryName },
      { label: "子分类", value: subCategory },
      { label: "等级", value: tier },
      { label: "功率", value: product.power },
      { label: "产能", value: product.throughput },
      { label: "平均用时", value: product.averageTime },
      { label: "电压", value: product.voltage },
      { label: "频率", value: product.frequency },
      { label: "材质", value: product.material },
      { label: "产品尺寸", value: product.productDimensions },
      { label: "颜色", value: product.color },
      { label: "控制方式", value: product.controlMethod },
      { label: "状态", value: product.status },
    ];

    var specCards = "";
    for (var s = 0; s < specFields.length; s++) {
      if (specFields[s].value) {
        specCards +=
          '<div class="flex justify-between items-start py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">' +
          '<span class="text-sm text-slate-500 dark:text-slate-400 font-medium">' +
          esc(specFields[s].label) +
          "</span>" +
          '<span class="text-sm font-semibold text-right">' +
          esc(specFields[s].value) +
          "</span></div>";
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

    var whatsappNumber = window.Contacts ? window.Contacts.whatsapp : "8613163756465";

    var html =
      '<div class="max-w-5xl mx-auto px-4 py-6">' +
      '<div class="flex flex-col lg:flex-row gap-8">' +
      '<div class="lg:w-1/2">' +
      '<div class="rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg">' +
      '<div class="relative">' +
      '<img loading="eager" alt="' + esc(product.model) + '" class="w-full h-[360px] object-cover" src="' + imgSrc + '" onerror="this.src=\'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop\'">' +
      "</div></div></div>" +
      '<div class="lg:w-1/2 flex flex-col gap-5">' +
      "<div>" +
      '<div class="flex items-center gap-3 mb-2">' +
      '<span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">' +
      esc(subCategory || categoryName) +
      "</span>" +
      badgeHtml +
      (tier ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' + esc(tier) + '</span>' : '') +
      "</div>" +
      '<h1 class="text-2xl lg:text-3xl font-black tracking-tight mb-2">' +
      esc(product.model) +
      "</h1>" +
      '<p class="text-base text-slate-500 dark:text-slate-400">' +
      esc(categoryName) +
      "</p>" +
      "</div>" +
      '<div class="flex items-center gap-3">' +
      '<a href="/quote/?model=' + encodeURIComponent(product.model) + '" class="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">request_quote</span> 获取报价</a>' +
      '<a href="https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent("Hi, I am interested in " + product.model) + '" target="_blank" class="px-6 py-3 rounded-xl font-bold flex items-center gap-2 border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary transition-all text-sm">' +
      '<span class="material-symbols-outlined text-lg">chat</span> 联系销售</a>' +
      "</div>" +
      (scenarios.length > 0 ? '<div class="flex flex-wrap gap-2">' + scenarioItems + "</div>" : "") +
      "</div></div>" +
      (specCards ? '<section class="mt-8"><h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">specifications</span> 产品规格</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + specCards + "</div></section>" : "") +
      (highlights.length > 0
        ? '<section class="mt-8"><h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">star</span> 产品亮点</h2><ul class="space-y-3 max-w-3xl">' +
          highlightItems +
          "</ul></section>"
        : "") +
      '<section class="mt-12 bg-primary rounded-xl p-8 text-center"><h2 class="text-xl font-black text-white mb-3">需要定制方案？</h2><p class="text-white/80 mb-6 text-sm">告诉我们您的需求，我们为您提供专属解决方案。</p><a href="/quote/" class="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"><span class="material-symbols-outlined">arrow_forward</span> 获取报价</a></section>' +
      "</div>";

    var contentEl = document.getElementById("product-content");
    if (contentEl) contentEl.innerHTML = html;

    // --- Populate static specs grid ---
    var specsGrid = document.getElementById("specs-grid");
    if (specsGrid && specCards) {
      specsGrid.innerHTML = specCards;
    }

    // --- Related products ---
    var allProducts = getAllProducts();
    var relatedEl = document.getElementById("related-products");
    if (relatedEl) {
      var relatedCards = "";
      var cardCount = 0;
      var gradients = [
        "from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/30",
        "from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20",
        "from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20",
      ];
      for (var r = 0; r < allProducts.length && cardCount < 3; r++) {
        var rp = allProducts[r];
        if (rp.model === product.model) continue;
        if (rp.category === product.category) {
          var rImg = rp.images && rp.images.length > 0 ? (rp.images.find(function(i){return i.isPrimary}) || rp.images[0]).filePath : ("/assets/images/products/" + modelToSnake(rp.model) + "_1.webp");
          var grad = gradients[cardCount % gradients.length];
          relatedCards +=
            '<a href="/pdp/?model=' +
            encodeURIComponent(rp.model) +
            '" class="group block bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700">' +
            '<div class="h-36 bg-gradient-to-br ' +
            grad +
            ' relative overflow-hidden">' +
            '<img loading="lazy" alt="' +
            esc(rp.model) +
            '" class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="' + rImg + '" onerror="this.style.display=\'none\'">' +
            '</div><div class="p-4">' +
            '<h4 class="font-bold text-sm mb-1">' +
            esc(rp.model) +
            "</h4>" +
            '<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">' +
            esc(rp.categoryName || rp.category) +
            "</p>" +
            '<span class="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">' +
            '查看详情' +
            '<span class="material-symbols-outlined text-sm">arrow_forward</span>' +
            "</span></div></a>";
          cardCount++;
        }
      }
      if (relatedCards) relatedEl.innerHTML = relatedCards;
    }
  }

  // Run on DOMContentLoaded (initial page load)
  document.addEventListener("DOMContentLoaded", renderPDP);

  // Run on SPA navigation
  window.addEventListener("product-data-ready", renderPDP);

  // Also listen for SPA load events (for hash-based or custom routing)
  window.addEventListener("spa:load", function() {
    if (location.pathname.indexOf("/pdp") >= 0) {
      // Give PRODUCT_DATA_TABLE time to load if needed
      setTimeout(renderPDP, 100);
    }
  });

})();
