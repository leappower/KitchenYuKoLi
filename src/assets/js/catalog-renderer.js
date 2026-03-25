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

    // Key spec fields to display as badges, in priority order
    var KEY_SPEC_FIELDS = [
      { field: "power", i18nKey: "catalog_spec_power" },
      { field: "voltage", i18nKey: "catalog_spec_voltage" },
      { field: "throughput", i18nKey: "catalog_spec_capacity" },
      { field: "productDimensions", i18nKey: "catalog_spec_dimension" },
    ];

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

    /**
     * Build spec badge HTML for a product.
     * Reads from p[spec.field] or p.i18n[spec.field]["zh-CN"] and returns
     * up to maxCount badges.
     */
    function buildSpecBadges(p, maxCount) {
      var badges = [];
      for (var i = 0; i < KEY_SPEC_FIELDS.length && badges.length < maxCount; i++) {
        var spec = KEY_SPEC_FIELDS[i];
        var value = p[spec.field];
        // Fallback to i18n zh-CN value if top-level is missing
        if (!value && p.i18n && p.i18n[spec.field] && p.i18n[spec.field]["zh-CN"]) {
          value = p.i18n[spec.field]["zh-CN"];
        }
        if (value) {
          var label = tr(spec.i18nKey, spec.field);
          badges.push(
            '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">' +
            '<span class="font-medium">' + esc(label) + '</span>' +
            '<span>' + esc(value) + '</span>' +
            '</span>'
          );
        }
      }
      return badges.join("");
    }

    var activeCategory = "all";

    // 支持 URL 参数预选分类：/catalog/?cat=cutting
    var catParam = new URLSearchParams(window.location.search).get("cat");
    if (catParam) {
      var catKeyMap = {
        cutting: "nav_products_cutting",
        stirfry: "nav_products_stirfry",
        frying: "nav_products_frying",
        stewing: "nav_products_stewing",
        steaming: "nav_products_steaming",
        other: "nav_products_other",
      };
      if (catKeyMap[catParam]) {
        activeCategory = catKeyMap[catParam];
      }
    }

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
      var emptyTitle = document.getElementById("catalog-empty-title");
      var emptyDesc = document.getElementById("catalog-empty-desc");
      var countEl = document.getElementById("catalog-results-count");

      if (!grid) return;

      if (filtered.length === 0) {
        grid.innerHTML = "";
        if (empty) empty.classList.remove("hidden");

        // Context-aware empty messaging
        if (emptyTitle) {
          if (activeCategory !== "all") {
            emptyTitle.textContent = tr(
              "catalog_empty_category_title",
              "该分类暂无产品"
            );
          } else if (searchTerm) {
            emptyTitle.textContent = tr(
              "catalog_empty_search_title",
              "未找到匹配的产品"
            );
          } else {
            emptyTitle.textContent = tr(
              "catalog_empty_title",
              "未找到匹配的产品"
            );
          }
        }
        if (emptyDesc) {
          if (activeCategory !== "all" && !searchTerm) {
            emptyDesc.textContent = tr(
              "catalog_empty_category_desc",
              "该分类下暂无产品，请查看其他分类或联系销售获取推荐。"
            );
          } else if (searchTerm) {
            emptyDesc.textContent = tr(
              "catalog_empty_search_desc",
              "请尝试其他关键词或清除搜索条件。"
            );
          } else {
            emptyDesc.textContent = tr(
              "catalog_empty_desc",
              "请尝试其他关键词或筛选条件"
            );
          }
        }

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

        // Build spec badges (up to 3)
        var specBadgesHtml = buildSpecBadges(p, 3);

        // Build action buttons
        var viewDetailUrl = "/pdp/?model=" + encodeURIComponent(p.model);
        var quoteUrl = "/quote/";
        var actionHtml =
          '<div class="flex items-center gap-2 mt-4">' +
          '<a href="' + viewDetailUrl + '" class="flex-1 text-center px-3 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors">' +
          '<span data-i18n="catalog_view_detail">' + tr("catalog_view_detail", "查看详情") + '</span>' +
          '</a>' +
          '<a href="' + quoteUrl + '" class="flex-1 text-center px-3 py-2 rounded-lg text-sm font-bold border border-primary text-primary hover:bg-primary/10 transition-colors">' +
          '<span data-i18n="catalog_get_quote">' + tr("catalog_get_quote", "获取报价") + '</span>' +
          '</a>' +
          '</div>';

        html +=
          '<div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all group">' +
          '<a href="' + viewDetailUrl + '" class="block">' +
          '<div class="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">' +
          badgeHtml +
          '<img loading="lazy" alt="' +
          esc(p.name || p.model) +
          '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="/assets/images/products/' +
          imgKey +
          '.webp" onerror="this.style.display=\'none\'">' +
          '</div></a>' +
          '<div class="p-5">' +
          '<div class="flex items-center gap-2 mb-1">' +
          '<span class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">' +
          esc(p.subCategory || p.category || "") +
          "</span></div>" +
          '<a href="' + viewDetailUrl + '" class="block">' +
          '<h3 class="font-bold text-lg mb-1 group-hover:text-primary transition-colors">' +
          esc(p.name || p.model) +
          "</h3>" +
          '<p class="text-sm text-slate-500 dark:text-slate-400">' +
          esc(p.model) +
          "</p>" +
          '</a>' +
          (specBadgesHtml
            ? '<div class="flex flex-wrap gap-1.5 mt-3">' + specBadgesHtml + '</div>'
            : '') +
          actionHtml +
          "</div></div>";
      });
      grid.innerHTML = html;
    }

    renderProducts();
  });
})();
