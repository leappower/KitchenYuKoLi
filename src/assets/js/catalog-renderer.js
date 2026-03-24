/**
 * Catalog Renderer — 产品目录页面渲染逻辑
 * 从内联 JS 提取为外部文件，避免 webpack 构建清空脚本内容
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var products = window.PRODUCT_DATA_TABLE || [];
    var CATEGORIES = [
      { key: "all", label: "全部", icon: "apps" },
      { key: "nav_products_cutting", label: "切配设备", icon: "content_cut" },
      { key: "nav_products_stirfry", label: "爆炒设备", icon: "local_fire_department" },
      { key: "nav_products_frying", label: "煎炸设备", icon: "outdoor_grill" },
      { key: "nav_products_stewing", label: "炖煮设备", icon: "soup_kitchen" },
      { key: "nav_products_steaming", label: "蒸煮设备", icon: "cloud" },
      { key: "nav_products_other", label: "其他设备", icon: "more_horiz" },
    ];

    var categoryMap = {
      nav_products_cutting: ["切配"],
      nav_products_stirfry: ["爆炒"],
      nav_products_frying: ["煎炸"],
      nav_products_stewing: ["炖煮"],
      nav_products_steaming: ["蒸煮"],
      nav_products_other: [],
    };

    function tr(key, fallback) {
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

    var activeCategory = "all";
    var searchTerm = "";

    // Render filters
    var filtersEl = document.getElementById("catalog-filters");
    if (!filtersEl) return;

    CATEGORIES.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className =
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all " +
        (cat.key === "all"
          ? "bg-primary text-white shadow-md"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary");
      btn.dataset.filter = cat.key;
      btn.innerHTML =
        '<span class="material-symbols-outlined text-base">' +
        cat.icon +
        "</span>" +
        '<span data-i18n="' +
        cat.key +
        '">' +
        tr(cat.key, cat.label) +
        "</span>";
      btn.addEventListener("click", function () {
        activeCategory = this.dataset.filter;
        document.querySelectorAll("#catalog-filters button").forEach(function (b) {
          b.className =
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all " +
            (b.dataset.filter === activeCategory
              ? "bg-primary text-white shadow-md"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary");
        });
        renderProducts();
      });
      filtersEl.appendChild(btn);
    });

    // Search
    var searchEl = document.getElementById("catalog-search");
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        searchTerm = this.value.trim().toLowerCase();
        renderProducts();
      });
    }

    function filterProducts() {
      return products.filter(function (p) {
        if (!p.isActive) return false;
        if (activeCategory !== "all") {
          var matchCats = categoryMap[activeCategory] || [];
          var catMatch = matchCats.some(function (c) {
            return (p.category || "").indexOf(c) !== -1 || (p.subCategory || "").indexOf(c) !== -1;
          });
          if (!catMatch) {
            var others = categoryMap["nav_products_other"];
            if (others.length === 0) {
              var allCats = Object.keys(categoryMap).filter(function (k) {
                return k !== "nav_products_other";
              });
              var inKnown = allCats.some(function (k) {
                return (categoryMap[k] || []).some(function (c) {
                  return (p.category || "").indexOf(c) !== -1 || (p.subCategory || "").indexOf(c) !== -1;
                });
              });
              if (inKnown) return false;
            }
          }
        }
        if (searchTerm) {
          var haystack = (
            (p.model || "") +
            (p.name || "") +
            (p.category || "") +
            (p.subCategory || "")
          ).toLowerCase();
          if (haystack.indexOf(searchTerm) === -1) return false;
        }
        return true;
      });
    }

    function renderProducts() {
      var filtered = filterProducts();
      var grid = document.getElementById("catalog-grid");
      var empty = document.getElementById("catalog-empty");
      var countEl = document.getElementById("catalog-results-count");

      if (!grid) return;

      if (filtered.length === 0) {
        grid.innerHTML = "";
        if (empty) empty.classList.remove("hidden");
        if (countEl) countEl.textContent = "";
        return;
      }

      if (empty) empty.classList.add("hidden");
      if (countEl) {
        countEl.textContent =
          tr("catalog_results", "共") + " " + filtered.length + " " + tr("catalog_results_products", "款产品");
      }

      var html = "";
      filtered.forEach(function (p) {
        var imgKey = modelToSnake(p.model) + "_1";
        var badgeHtml = "";
        if (p.badge) {
          badgeHtml =
            '<span class="absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-bold ' +
            (p.badgeColor || "bg-primary") +
            ' text-white">' +
            esc(p.badge) +
            "</span>";
        }
        html +=
          '<a href="/pdp/?model=' +
          encodeURIComponent(p.model) +
          '" class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all group block">' +
          '<div class="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">' +
          badgeHtml +
          '<img loading="lazy" alt="' +
          esc(p.name || p.model) +
          '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="/assets/images/products/' +
          imgKey +
          '.webp" onerror="this.style.display=\'none\'">' +
          '</div><div class="p-5">' +
          '<div class="flex items-center gap-2 mb-1">' +
          '<span class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">' +
          esc(p.subCategory || p.category || "") +
          "</span></div>" +
          '<h3 class="font-bold text-lg mb-1 group-hover:text-primary transition-colors">' +
          esc(p.name || p.model) +
          "</h3>" +
          '<p class="text-sm text-slate-500 dark:text-slate-400">' +
          esc(p.model) +
          "</p>" +
          "</div></a>";
      });
      grid.innerHTML = html;
    }

    renderProducts();
  });
})();
