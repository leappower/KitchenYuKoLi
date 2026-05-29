/**
 * ComparePage — renders product comparison table on /products/compare/
 * Reads selected products from localStorage YUKOLI_COMPARE_ITEMS
 * Reads product data from localStorage pdt_v2 (no API dependency)
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (key == null) key = evt + ":" + (++_spaRegs.__k || (_spaRegs.__k = 1));
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  var COMPARE_KEY = "YUKOLI_COMPARE_ITEMS";
  var DATA_KEY = "pdt_v2";
  var STORE_KEY = "PRODUCT_DATA_TABLE";
  var selected = [];

  // ─── COMPARE_ROWS definition ────────────────────────────────
  // i18n key map for COMPARE_ROWS labels
  var ROW_LABEL_KEYS = {
    name: "compare_row_name",
    model: "compare_row_model",
    category: "compare_row_category",
    power: "compare_row_power",
    voltage: "compare_row_voltage",
    dimensions: "compare_row_dimensions",
    throughput: "compare_row_throughput",
    averageTime: "compare_row_avg_time",
    weight: "compare_row_weight",
    tier: "compare_row_tier",
    highlights: "compare_row_highlights",
    specifications: "compare_row_specs",
  };
  var ROW_LABEL_DEFAULTS = {
    name: "Product Name",
    model: "Model",
    category: "Category",
    power: "Power",
    voltage: "Voltage",
    dimensions: "Dimensions",
    throughput: "Throughput",
    averageTime: "Avg Processing Time",
    weight: "Net Weight",
    tier: "Tier",
    highlights: "Highlights",
    specifications: "Specifications",
  };

  function getRowLabel(row) {
    var key = ROW_LABEL_KEYS[row.key];
    if (key && typeof window.t === "function") {
      var v = window.t(key);
      if (v && v !== key) return v;
    }
    return ROW_LABEL_DEFAULTS[row.key] || row.key;
  }

  var COMPARE_ROWS = [
    {
      key: "name",
      label: "",
      fn: function (p) {
        return p.name || p.model || "—";
      },
    },
    {
      key: "model",
      label: "",
      fn: function (p) {
        return p.model || "—";
      },
    },
    {
      key: "category",
      label: "",
      fn: function (p) {
        return p.subCategory || p._categoryName || p._category || "—";
      },
    },
    {
      key: "power",
      label: "",
      fn: function (p) {
        return p.power || "—";
      },
    },
    {
      key: "voltage",
      label: "",
      fn: function (p) {
        return p.voltage || "—";
      },
    },
    {
      key: "dimensions",
      label: "",
      fn: function (p) {
        return p.dimensions || "—";
      },
    },
    {
      key: "throughput",
      label: "",
      fn: function (p) {
        return p.throughput || "—";
      },
    },
    {
      key: "averageTime",
      label: "",
      fn: function (p) {
        return p.averageTime || "—";
      },
    },
    {
      key: "weight",
      label: "",
      fn: function (p) {
        return p.weight || "—";
      },
    },
    {
      key: "tier",
      label: "",
      fn: function (p) {
        return p.tier || "—";
      },
    },
    {
      key: "highlights",
      label: "",
      fn: function (p) {
        return p.highlights || p.description || "—";
      },
    },
    {
      key: "specifications",
      label: "",
      fn: function (p) {
        if (!p.specifications) return "—";
        if (typeof p.specifications === "string") return p.specifications;
        if (Array.isArray(p.specifications)) return p.specifications.join(", ");
        return JSON.stringify(p.specifications);
      },
    },
  ];

  // ─── Utility ────────────────────────────────────────────────
  function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getImageUrl(p) {
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      var primary =
        p.images.find(function (i) {
          return i.isPrimary;
        }) || p.images[0];
      if (primary && primary.filePath) {
        var fp = primary.filePath;
        // Defensive: rewrite stale CMS paths
        if (fp.indexOf("/admin/uploads/") === 0) {
          fp = "/assets/images/products/" + fp.split("/").pop();
        }
        return fp;
      }
    }
    if (p.image) return p.image;
    if (p.imageUrl) return p.imageUrl;
    return "/assets/images/products/" + (p.model || "default") + ".webp";
  }

  // Enrich selected items with _imageUrl and _categoryName
  function enrichProducts(items) {
    var data = getProductData();
    return items.map(function (item) {
      // If already enriched, return as-is
      if (item._imageUrl) return item;
      var cat = "";
      var catName = "";
      if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          var d = data[i];
          if (d.products) {
            for (var j = 0; j < d.products.length; j++) {
              if (d.products[j].model === item.model) {
                cat = d.category || d.slug || "";
                catName = d.categoryName || d.category || "";
                // Merge any missing fields from data
                Object.keys(d.products[j]).forEach(function (k) {
                  if (item[k] === undefined) item[k] = d.products[j][k];
                });
                break;
              }
            }
          }
        }
      }
      item._imageUrl = getImageUrl(item);
      item._category = cat;
      item._categoryName = catName;
      return item;
    });
  }

  // ─── Data loading (localStorage only) ────────────────────────
  function getProductData() {
    // Use window cache if available
    if (Array.isArray(window[STORE_KEY]) && window[STORE_KEY].length > 0) {
      return window[STORE_KEY];
    }
    // Load from localStorage pdt_v2
    try {
      var cached = JSON.parse(localStorage.getItem(DATA_KEY));
      if (Array.isArray(cached) && cached.length > 0) {
        window[STORE_KEY] = cached;
        return cached;
      }
    } catch (e) {}
    return null; // null = not found, caller should fetch
  }

  var _dataFetched = false;
  function fetchProductData() {
    if (_dataFetched) return Promise.resolve(window[STORE_KEY] || []);
    _dataFetched = true;
    // Use PRODUCT_DATA_TABLE (inlined from product-data-table.js or cached)
    if (Array.isArray(window[STORE_KEY]) && window[STORE_KEY].length > 0) {
      return Promise.resolve(window[STORE_KEY]);
    }
    // localStorage fallback
    try {
      var cached = JSON.parse(localStorage.getItem(DATA_KEY));
      if (Array.isArray(cached) && cached.length > 0) {
        window[STORE_KEY] = cached;
        return Promise.resolve(cached);
      }
    } catch (e) {}
    return Promise.resolve([]);
  }

  // ─── Selected items management ───────────────────────────────
  function loadSelected() {
    try {
      var d = localStorage.getItem(COMPARE_KEY);
      selected = d ? JSON.parse(d) : [];
    } catch (e) {
      selected = [];
    }
    selected = enrichProducts(selected);
  }

  function saveSelected() {
    try {
      if (selected.length === 0) {
        localStorage.removeItem(COMPARE_KEY);
      } else {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(selected));
      }
    } catch (e) {}
  }

  function removeSelected(model) {
    selected = selected.filter(function (s) {
      return s.model !== model;
    });
    saveSelected();
    render();
  }

  function clearSelected() {
    selected = [];
    saveSelected();
    render();
  }

  // ─── Detect device type ──────────────────────────────────────
  function getDeviceType() {
    var w = window.innerWidth;
    if (window.DeviceUtils && window.DeviceUtils.getDeviceType) return window.DeviceUtils.getDeviceType();
    if (w < 768) return "mobile";
    if (w < 1280) return "tablet";
    return "pc";
  }

  // ─── Toast ───────────────────────────────────────────────────
  function _showToast(msg) {
    var toast = document.createElement("div");
    toast.className =
      "compare-toast fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-xl z-[200] text-sm font-medium transition-all duration-300";
    toast.style.cssText = "opacity:0;transform:translate(-50%,-10px)";
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%,0)";
    });
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%,-10px)";
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2000);
  }

  // ─── Render: Comparison Table ────────────────────────────────

  // Mobile: stacked cards per parameter row
  function renderMobileTable(tableContainer) {
    var html = "";
    COMPARE_ROWS.forEach(function (row) {
      var values = selected.map(function (p) {
        return String(row.fn(p));
      });
      var allSame = values.every(function (v) {
        return v === values[0];
      });

      html +=
        '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">' +
        '<div class="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-700 dark:text-slate-300">' +
        esc(getRowLabel(row)) +
        "</div>" +
        '<div class="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">';

      selected.forEach(function (p) {
        var val = row.fn(p);
        var cellClass = !allSame ? "diff-highlight text-primary" : "text-slate-600 dark:text-slate-400";
        html +=
          '<div class="flex items-center gap-2 px-3 py-2">' +
          '<img src="' +
          esc(p._imageUrl) +
          '" class="w-6 h-6 rounded object-cover flex-shrink-0" onerror="this.src=\'/assets/images/products/default.webp\'">' +
          '<span class="text-[10px] text-slate-400 flex-shrink-0 truncate max-w-[60px]">' +
          esc(p.model) +
          "</span>" +
          '<span class="text-xs ' +
          cellClass +
          ' flex-1">' +
          esc(val) +
          "</span>" +
          "</div>";
      });

      html += "</div></div>";
    });
    tableContainer.innerHTML = html;
  }

  // Tablet / PC: horizontal table
  function renderDesktopTable(tableContainer) {
    var device = getDeviceType();
    var _colCount = selected.length;
    var isTablet = device === "tablet";

    var minW = isTablet ? "min-w-[480px]" : "min-w-[600px]";
    var thPad = isTablet ? "px-4 py-3" : "px-6 py-4";
    var thText = isTablet ? "text-xs" : "text-sm";
    var tdPad = isTablet ? "px-3 py-2.5" : "px-4 py-3";
    var tdText = isTablet ? "text-xs" : "text-sm";
    var imgSize = isTablet ? "w-20 h-20 rounded-lg" : "w-28 h-28 rounded-xl";
    var nameClass = isTablet ? "text-xs font-bold" : "text-sm font-black";
    var modelClass = isTablet ? "text-[10px] text-slate-400" : "text-xs text-slate-400";

    var headerHTML =
      '<table class="w-full ' +
      minW +
      '"><thead><tr>' +
      '<th class="text-left ' +
      thPad +
      " " +
      thText +
      ' font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 min-w-[100px]">' +
      esc(typeof window.t === "function" ? window.uiText("compare_bar_params", "Parameters") : "Parameters") +
      "</th>";
    selected.forEach(function (p) {
      headerHTML +=
        '<th class="' +
        thPad +
        ' text-center bg-slate-50 dark:bg-slate-900/50">' +
        '<div class="flex flex-col items-center gap-' +
        (isTablet ? "1" : "2") +
        '">' +
        '<img src="' +
        esc(p._imageUrl) +
        '" class="' +
        imgSize +
        ' object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
        '<p class="' +
        nameClass +
        ' text-slate-900 dark:text-white">' +
        esc(p.name || p.model) +
        "</p>" +
        (isTablet ? "" : '<p class="' + modelClass + '">' + esc(p.model) + "</p>") +
        "</div>" +
        "</th>";
    });
    headerHTML += "</tr></thead><tbody>";

    var bodyHTML = "";
    COMPARE_ROWS.forEach(function (row, ri) {
      var values = selected.map(function (p) {
        return String(row.fn(p));
      });
      var allSame = values.every(function (v) {
        return v === values[0];
      });
      var bgClass = ri % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/50";

      bodyHTML +=
        '<tr class="' +
        bgClass +
        ' border-t border-slate-100 dark:border-slate-700/50">' +
        '<td class="' +
        thPad +
        " " +
        thText +
        ' font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">' +
        esc(getRowLabel(row)) +
        "</td>";
      selected.forEach(function (p) {
        var val = row.fn(p);
        var cellClass = !allSame ? "diff-highlight text-primary" : "";
        bodyHTML += '<td class="' + tdPad + " " + tdText + " text-center " + cellClass + '">' + esc(val) + "</td>";
      });
      bodyHTML += "</tr>";
    });

    tableContainer.innerHTML = headerHTML + bodyHTML + "</tbody></table>";
  }

  function renderComparisonTable() {
    var section = document.getElementById("comparison-section");
    var tableContainer = document.getElementById("comparison-table");
    if (!section || !tableContainer) return;

    if (selected.length < 2) {
      section.classList.add("hidden");
      return;
    }
    section.classList.remove("hidden");

    var device = getDeviceType();
    if (device === "mobile") {
      renderMobileTable(tableContainer);
    } else {
      renderDesktopTable(tableContainer);
    }
  }

  // ─── Render: Compare bar (sticky, shows selected items) ──────
  function renderCompareBar() {
    var bar = document.getElementById("compare-bar");
    var itemsContainer = document.getElementById("compare-bar-items");
    var countEl = document.getElementById("compare-count");
    if (!bar || !itemsContainer) return;

    if (selected.length === 0) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    if (countEl) countEl.textContent = selected.length;

    var device = getDeviceType();
    var html = "";

    if (device === "mobile") {
      html = selected
        .map(function (p) {
          return (
            '<div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-md px-2 py-1 flex-shrink-0">' +
            '<img src="' +
            esc(p._imageUrl) +
            '" class="w-5 h-5 rounded object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
            '<span class="text-[10px] font-bold text-slate-900 dark:text-white truncate max-w-[60px]">' +
            esc(p.name || p.model) +
            "</span>" +
            '<button class="remove-compare flex-shrink-0 text-slate-400 hover:text-red-500" data-model="' +
            esc(p.model) +
            '">' +
            '<span class="material-symbols-outlined text-xs">close</span></button></div>'
          );
        })
        .join("");
    } else {
      var thumbPad = device === "tablet" ? "px-2 py-1.5 rounded-lg" : "px-3 py-2 rounded-xl";
      var thumbText = device === "tablet" ? "text-xs max-w-[80px]" : "text-sm max-w-[120px]";
      var iconSize = device === "tablet" ? "text-sm" : "text-base";
      var imgW = device === "tablet" ? "w-6 h-6 rounded" : "w-8 h-8 rounded-lg";
      html = selected
        .map(function (p) {
          return (
            '<div class="flex items-center gap-' +
            (device === "tablet" ? "1.5" : "2") +
            " bg-slate-50 dark:bg-slate-700 " +
            thumbPad +
            ' px-3 py-2 flex-shrink-0">' +
            '<img src="' +
            esc(p._imageUrl) +
            '" class="' +
            imgW +
            ' object-cover" onerror="this.src=\'/assets/images/products/default.webp\'">' +
            '<span class="' +
            thumbText +
            ' font-bold text-slate-900 dark:text-white truncate">' +
            esc(p.name || p.model) +
            "</span>" +
            '<button class="remove-compare flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors" data-model="' +
            esc(p.model) +
            '">' +
            '<span class="material-symbols-outlined ' +
            iconSize +
            '">close</span></button>' +
            "</div>"
          );
        })
        .join("");
    }

    itemsContainer.innerHTML = html;

    // Bind remove buttons
    itemsContainer.querySelectorAll(".remove-compare").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        removeSelected(this.dataset.model);
      });
    });
  }

  // ─── Render: Empty state ─────────────────────────────────────
  function updateEmptyState() {
    var empty = document.getElementById("compare-empty");
    if (!empty) return;
    if (selected.length >= 2) {
      empty.classList.add("hidden");
    } else {
      empty.classList.remove("hidden");
    }
  }

  // ─── Master render ───────────────────────────────────────────
  function render() {
    loadSelected();
    renderCompareBar();
    renderComparisonTable();
    updateEmptyState();
  }

  // ─── Init ────────────────────────────────────────────────────
  function init() {
    // Hide product-grid.js floating bar on compare page (we have our own)
    // Use classList instead of inline style so it auto-recovers on SPA navigation
    var floatBar = document.getElementById("compare-floating-bar");
    if (floatBar) floatBar.classList.remove("visible");

    var data = getProductData();
    if (!data) {
      // No cached data — fetch from API
      fetchProductData().then(function () {
        selected = enrichProducts(selected);
        render();
      });
    } else {
      window[STORE_KEY] = data;
    }

    // Bind clear button
    var clearBtn = document.getElementById("compare-clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearSelected();
      });
    }

    // Bind "add more" link (optional)
    var addMoreLink = document.getElementById("compare-add-more");
    if (addMoreLink) {
      addMoreLink.addEventListener("click", function (e) {
        e.preventDefault();
        if (window.SpaRouter && window.SpaRouter.navigate) {
          window.SpaRouter.navigate("/products/");
        } else {
          window.location.href = "/products/";
        }
      });
    }

    // Initial render
    render();

    // Listen for storage changes (e.g. from products page)
    window.addEventListener("storage", function (e) {
      if (e.key === COMPARE_KEY) {
        render();
      }
    });

    // Listen for product-data-ready (in case another script loads data)
    window.addEventListener("product-data-ready", function () {
      // Re-enrich selected items with new data
      selected = enrichProducts(selected);
      render();
    });
  }

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // SPA navigation
  _spaOn(document, "spa:load", init, "spa:load");

  // Re-render on language change
  document.addEventListener("languageChanged", function () {
    if (selected.length > 0) render();
  });

  // Public API
  window.ComparePage = {
    removeSelected: removeSelected,
    clearSelected: clearSelected,
    getSelected: function () {
      return selected;
    },
    refresh: render,
  };
})();
