/**
 * PDP Renderer - product detail page (SPA-safe)
 * URL: /products/<model>/ or /product-detail/?model=<model>
 * Self-contained: creates #product-content and #related-products if missing
 */
(function () {

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function modelToSnake(m) {
    return (m || "")
      .toLowerCase().replace(/\//g, "").replace(/\+/g, "_p")
      .replace(/-/g, "_").replace(/[^a-z0-9_]/g, "_")
      .replace(/__+/g, "_").replace(/^_|_$/g, "");
  }

  function getAllProducts() {
    var table = window.PRODUCT_DATA_TABLE || [];
    var flat = [];
    for (var i = 0; i < table.length; i++) {
      var ps = table[i].products || [];
      for (var j = 0; j < ps.length; j++) flat.push(ps[j]);
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
    var rImg = rp.images && rp.images.length > 0
      ? (rp.images.find(function(i){return i.isPrimary}) || rp.images[0]).filePath
      : ("/assets/images/products/" + modelToSnake(rp.model) + "_1.webp");
    var gradients = [
      "from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/30",
      "from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20",
      "from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20",
    ];
    var grad = gradients[idx % gradients.length];
    return '<a href="/products/' + encodeURIComponent(rp.model) +
      '" class="group block bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700">' +
      '<div class="h-36 bg-gradient-to-br ' + grad + ' relative overflow-hidden">' +
      '<img loading="lazy" alt="' + esc(rp.model) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="' + rImg + '" onerror="this.style.display=\'none\'">' +
      '</div><div class="p-4"><h4 class="font-bold text-sm mb-1">' + esc(rp.model) +
      '</h4><p class="text-xs text-slate-500 dark:text-slate-400 mb-2">' + esc(rp.categoryName || rp.category) +
      '</p><span class="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-2 transition-all">' +
      '查看详情<span class="material-symbols-outlined text-sm">arrow_forward</span></span></div></a>';
  }

  function renderRelated(product) {
    var allProducts = getAllProducts();
    var el = document.getElementById("related-products");
    if (!el) return;
    var cards = "", count = 0, max = 4;

    // Plan A: manual related (if configured)
    if (product.relatedProducts && product.relatedProducts.length > 0) {
      var map = {}; allProducts.forEach(function(p){ map[p.model] = p; });
      product.relatedProducts.forEach(function(m) {
        if (count >= max) return;
        var rp = map[m];
        if (rp && rp.model !== product.model) { cards += buildRelatedCard(rp, count++); }
      });
    }
    // Plan B: auto fallback — same category
    if (count < max) {
      var shown = new Set(product.relatedProducts || []); shown.add(product.model);
      for (var i = 0; i < allProducts.length && count < max; i++) {
        var rp = allProducts[i];
        if (shown.has(rp.model)) continue;
        if (rp.category === product.category) { cards += buildRelatedCard(rp, count++); shown.add(rp.model); }
      }
    }
    // Plan C: last resort — fill with any remaining products
    if (count < max) {
      var shown2 = new Set(product.relatedProducts || []); shown2.add(product.model);
      for (var i = 0; i < allProducts.length; i++) {
        var rp = allProducts[i];
        if (rp.category === product.category) shown2.add(rp.model);
      }
      for (var i = 0; i < allProducts.length && count < max; i++) {
        var rp = allProducts[i];
        if (shown2.has(rp.model)) continue;
        cards += buildRelatedCard(rp, count++); shown2.add(rp.model);
      }
    }
    if (cards) el.innerHTML = cards;
    else el.parentElement.style.display = 'none';
  }

  function ensureContainers() {
    var ce = document.getElementById("product-content");
    var re = document.getElementById("related-products");
    if (!ce || !re) {
      // Products listing page has #products-section; hide it and create PDP containers
      var listing = document.getElementById("products-section") || document.getElementById("product-grid");
      var container = listing ? listing.parentElement : document.getElementById("app") || document.querySelector("main") || document.body;
      if (listing) listing.style.display = "none";

      if (!ce) {
        ce = document.createElement("div");
        ce.id = "product-content";
        ce.className = "w-full py-10";
        container.insertBefore(ce, container.firstChild);
      }
      if (!re) {
        var section = document.createElement("section");
        section.className = "w-full py-12";
        section.innerHTML = '<h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">recommend</span> 推荐产品</h2><div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="related-products"></div>';
        // Find the container's parent to append
        var target = ce.parentElement || container;
        target.appendChild(section);
      }
    }
  }

  function renderPDP() {
    // Read model from path: /products/<model>/
    var path = window.location.pathname.replace(/\/$/, '');
    var model = null;
    var m = path.match(/^\/products\/([^/]+)$/);
    if (m) model = decodeURIComponent(m[1]);
    console.log('[ProductDetail] renderPDP called, pathname:', window.location.pathname, 'cleanPath:', path, 'model:', model);
    if (!model) return; // Not a PDP URL, skip silently

    var product = findProduct(model);
    console.log('[ProductDetail] findProduct result:', product ? product.model + ' (category: ' + (product.category || product.categoryName) + ')' : 'NOT FOUND');
    if (!product) {
      ensureContainers();
      var ce = document.getElementById("product-content");
      if (ce) ce.innerHTML = '<div class="max-w-3xl mx-auto px-4 py-16 text-center"><div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6"><span class="material-symbols-outlined text-3xl text-slate-400">search_off</span></div><h2 class="text-xl font-bold mb-3">产品未找到</h2><p class="text-slate-500 mb-6">抱歉，未找到该产品。</p><a href="/products/" class="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg transition-all"><span class="material-symbols-outlined">arrow_back</span> 返回产品中心</a></div>';
      return;
    }

    // Ensure containers exist (for products listing page)
    ensureContainers();

    // Image: CMS upload > static
    var imgSrc = "/assets/images/products/" + modelToSnake(product.model) + "_1.webp";
    if (product.images && product.images.length > 0) {
      var pi = product.images.find(function(i){return i.isPrimary}) || product.images[0];
      if (pi && pi.filePath) imgSrc = pi.filePath;
    }
    document.title = product.model + " | Yukoli 智能商厨设备";

    // Spec fields
    var specs = [
      { l: "型号", v: product.model }, { l: "分类", v: product.categoryName || product.category },
      { l: "子分类", v: product.subCategory }, { l: "等级", v: product.tier },
      { l: "功率", v: product.power }, { l: "产能", v: product.throughput },
      { l: "电压", v: product.voltage }, { l: "频率", v: product.frequency },
      { l: "材质", v: product.material }, { l: "尺寸", v: product.productDimensions },
      { l: "颜色", v: product.color }, { l: "控制方式", v: product.controlMethod },
    ];
    var specCards = "";
    for (var s = 0; s < specs.length; s++) {
      var val = specs[s].v || '—';
      specCards += '<div class="flex justify-between items-start py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/50"><span class="text-sm text-slate-500 dark:text-slate-400 font-medium">' + esc(specs[s].l) + '</span><span class="text-sm font-semibold text-right">' + esc(val) + '</span></div>';
    }

    var tier = product.tier ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' + esc(product.tier) + '</span>' : '';
    var badge = product.badge ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">' + esc(product.badge) + '</span>' : '';
    var wa = window.Contacts ? window.Contacts.whatsapp : "8613163756465";

    var html = '<div class="flex flex-col lg:flex-row gap-8">' +
      '<div class="lg:w-1/2"><div class="rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg"><div class="relative"><img loading="eager" alt="' + esc(product.model) + '" class="w-full h-[360px] object-cover" src="' + imgSrc + '" onerror="this.src=\'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop\'"></div></div></div>' +
      '<div class="lg:w-1/2 flex flex-col gap-5"><div><div class="flex items-center gap-3 mb-2"><span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">' + esc(product.subCategory || product.categoryName) + '</span>' + badge + tier + '</div>' +
      '<h1 class="text-2xl lg:text-3xl font-black tracking-tight mb-2">' + esc(product.model) + '</h1>' +
      '<p class="text-base text-slate-500 dark:text-slate-400">' + esc(product.categoryName || product.category) + '</p></div>' +
      '<div class="flex items-center gap-3">' +
      '<a href="/quote/?model=' + encodeURIComponent(product.model) + '" class="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all text-sm"><span class="material-symbols-outlined text-lg">request_quote</span> 获取报价</a>' +
      '<a href="https://wa.me/' + wa + '?text=' + encodeURIComponent("Hi, I am interested in " + product.model) + '" target="_blank" class="px-6 py-3 rounded-xl font-bold flex items-center gap-2 border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary transition-all text-sm"><span class="material-symbols-outlined text-lg">chat</span> 联系销售</a></div></div></div>' +
      '<section class="mt-8"><h2 class="text-xl font-bold mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">specifications</span> 产品规格</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + specCards + '</div></section>' +
      '<section class="mt-12 bg-primary rounded-xl p-8 text-center"><h2 class="text-xl font-black text-white mb-3">需要定制方案？</h2><p class="text-white/80 mb-6 text-sm">告诉我们您的需求，我们为您提供专属解决方案。</p><a href="/quote/" class="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"><span class="material-symbols-outlined">arrow_forward</span> 获取报价</a></section>';

    var ce = document.getElementById("product-content");
    if (ce) ce.innerHTML = html;

    // Static specs grid
    var sg = document.getElementById("specs-grid");
    if (sg) sg.innerHTML = specCards;

    // Related products
    renderRelated(product);
  }

  document.addEventListener("DOMContentLoaded", renderPDP);
  document.addEventListener("product-data-ready", renderPDP);
  document.addEventListener("spa:load", function() {
    var segs = location.pathname.split("/").filter(Boolean);
    console.log('[ProductDetail] spa:load fired, pathname:', location.pathname, 'segs:', segs);
    console.log('[ProductDetail] PRODUCT_DATA_TABLE:', window.PRODUCT_DATA_TABLE ? window.PRODUCT_DATA_TABLE.length + ' categories' : 'MISSING');
    console.log('[ProductDetail] #product-content:', !!document.getElementById('product-content'), '#related-products:', !!document.getElementById('related-products'));
    if (segs.length === 2 && segs[0] === "products") {
      console.log('[ProductDetail] Will render PDP in 100ms');
      setTimeout(renderPDP, 100);
    } else {
      console.log('[ProductDetail] Skipping PDP render (not a product detail route)');
    }
    var segs = location.pathname.split("/").filter(Boolean);
    console.log('[ProductDetail] spa:load fired, pathname:', location.pathname, 'segs:', segs);
    console.log('[ProductDetail] PRODUCT_DATA_TABLE:', window.PRODUCT_DATA_TABLE ? window.PRODUCT_DATA_TABLE.length + ' categories' : 'MISSING');
    console.log('[ProductDetail] #product-content:', !!document.getElementById('product-content'), '#related-products:', !!document.getElementById('related-products'));
    if (segs.length === 2 && segs[0] === "products") {
      console.log('[ProductDetail] Will render PDP in 100ms');
      setTimeout(renderPDP, 100);
    } else {
      console.log('[ProductDetail] Skipping PDP render (not a product detail route)');
    }
  });
})();
