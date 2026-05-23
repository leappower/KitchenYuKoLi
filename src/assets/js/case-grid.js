/* ═══════════════════════════════════════════════════
   case-grid.js — 案例列表 + 筛选逻辑
   Pure frontend, no backend dependency
   ═══════════════════════════════════════════════════ */

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

  /* ── Mock Data ──────────────────────────────────── */
  var ROI_CASES = [
    {
      slug: "manila-lunchbox-studio-2025",
      country: "🇵🇭 Philippines",
      industry: "小型餐饮",
      volume: "200-500",
      benefit: "Fast Payback",
      dailyOutput: 320,
      laborBefore: 3,
      laborAfter: 1,
      monthlySaving: "PHP 36,000",
      payback: 5.2,
      title: "马尼拉 Liempo 快餐店：从 3 个厨师到 1 台机器",
      quote: '"开业三年一直为招不到稳定的炒锅师傅发愁。现在一个人就能搞定，出餐速度还更快了。"',
    },
    {
      slug: "jakarta-catering-hub-2025",
      country: "🇮🇩 Indonesia",
      industry: "中央厨房",
      volume: "500-1000",
      benefit: "Consistency",
      dailyOutput: 600,
      laborBefore: 12,
      laborAfter: 5,
      monthlySaving: "IDR 22M",
      payback: 8.0,
      title: "雅加达送餐中央厨房：6 家门店统一出品",
      quote: '"以前每个门店味道都不一样，客户经常投诉。现在六家店的味道完全一样，回头客明显多了。"',
    },
    {
      slug: "hcmc-cloud-kitchen-compact",
      country: "🇻🇳 Vietnam",
      industry: "云厨房",
      volume: "<200",
      benefit: "Space Saving",
      dailyOutput: 150,
      laborBefore: 3,
      laborAfter: 1,
      monthlySaving: "VND 14M",
      payback: 5.5,
      title: "胡志明市云厨房：15㎡ 完成全品类出餐",
      quote: '"空间小但能做的菜很多，客户都以为是专业大厨房。"',
    },
    {
      slug: "bangkok-chain-8-stores",
      country: "🇹🇭 Thailand",
      industry: "连锁餐饮",
      volume: "1000+",
      benefit: "Consistency",
      dailyOutput: 1200,
      laborBefore: 24,
      laborAfter: 12,
      monthlySaving: "THB 270K",
      payback: 11.3,
      title: "曼谷火锅连锁 8 店：口味标准化 + 培训周期缩短 75%",
      quote: '"新店开业第 2 周就能正常出餐，以前至少要 2 个月。"',
    },
    {
      slug: "kl-canteen-2000-meals",
      country: "🇲🇾 Malaysia",
      industry: "智慧食堂",
      volume: "1000+",
      benefit: "Fast Payback",
      dailyOutput: 2000,
      laborBefore: 15,
      laborAfter: 6,
      monthlySaving: "MYR 13,500",
      payback: 6.2,
      title: "吉隆坡工厂食堂：2000 餐/天，6.2 个月回本",
      quote: '"工人最喜欢的是清洗方便，10 分钟就能搞定。"',
    },
    {
      slug: "cebu-small-resto-payback",
      country: "🇵🇭 Philippines",
      industry: "小型餐饮",
      volume: "200-500",
      benefit: "Fast Payback",
      dailyOutput: 280,
      laborBefore: 3,
      laborAfter: 1,
      monthlySaving: "PHP 32,000",
      payback: 4.8,
      title: "Cebu 小吃店：投资 1 台，4.8 个月回本",
      quote: '"最好的投资决定，省下来的钱已经买第二台了。"',
    },
    {
      slug: "surabaya-central-automation",
      country: "🇮🇩 Indonesia",
      industry: "中央厨房",
      volume: "500-1000",
      benefit: "Labor Cost Reduction",
      dailyOutput: 800,
      laborBefore: 18,
      laborAfter: 8,
      monthlySaving: "IDR 24M",
      payback: 8.5,
      title: "泗水中央厨房：自动化后废品率从 8% 降至 1.2%",
      quote: '"食品浪费大幅减少，每个月节省的食材钱就很可观。"',
    },
    {
      slug: "hanoi-street-food-modern",
      country: "🇻🇳 Vietnam",
      industry: "小型餐饮",
      volume: "<200",
      benefit: "Consistency",
      dailyOutput: 180,
      laborBefore: 2,
      laborAfter: 1,
      monthlySaving: "VND 8M",
      payback: 5.1,
      title: "河内街头小吃升级：1 台机器 + 1 个人 = 全品类菜单",
      quote: '"Phở 和 Bánh Mì 都能用，外国游客也夸味道好。"',
    },
  ];

  /* ── Filter Definitions ─────────────────────────── */
  var FILTERS = {
    industry: {
      label: "行业",
      i18n: "cases_filter_industry",
      options: ["小型餐饮", "中央厨房", "连锁餐饮", "智慧食堂", "云厨房"],
    },
    volume: {
      label: "日单量",
      i18n: "cases_filter_volume",
      options: ["<200", "200-500", "500-1000", "1000+"],
    },
    country: {
      label: "国家",
      i18n: "cases_filter_country",
      options: ["🇵🇭 Philippines", "🇮🇩 Indonesia", "🇻🇳 Vietnam", "🇹🇭 Thailand", "🇲🇾 Malaysia"],
    },
    benefit: {
      label: "核心收益",
      i18n: "cases_filter_benefit",
      options: ["Labor Cost Reduction", "Consistency", "Space Saving", "Fast Payback"],
    },
  };

  /* ── State ──────────────────────────────────────── */
  var activeFilters = { industry: null, volume: null, country: null, benefit: null };

  /* ── i18n helper ────────────────────────────────── */
  function __(key, fallback) {
    if (typeof window.t === "function") {
      var result = window.t(key);
      if (result && result !== key) return result;
    }
    return fallback || key;
  }

  /* ── Helpers ────────────────────────────────────── */
  function laborReduction(b, a) {
    return Math.round((1 - a / b) * 100);
  }

  function benefitLabel(key) {
    var map = {
      "Labor Cost Reduction": "cases_benefit_labor",
      Consistency: "cases_benefit_consistency",
      "Space Saving": "cases_benefit_space",
      "Fast Payback": "cases_benefit_payback",
    };
    return __(map[key] || key, map[key] || key);
  }

  function ii(key, fallback) {
    return __(key, fallback);
  }

  function benefitIcon(key) {
    var map = {
      "Labor Cost Reduction": "group_remove",
      Consistency: "verified",
      "Space Saving": "compress",
      "Fast Payback": "rocket_launch",
    };
    return map[key] || "star";
  }

  function benefitColor(key) {
    var map = {
      "Labor Cost Reduction": "blue",
      Consistency: "green",
      "Space Saving": "purple",
      "Fast Payback": "orange",
    };
    return map[key] || "primary";
  }

  /* ── Rendering ──────────────────────────────────── */

  /**
   * Render a single case card (PC variant — used for PC & Tablet)
   */
  function renderCardPc(c) {
    var pct = laborReduction(c.laborBefore, c.laborAfter);
    var bc = benefitColor(c.benefit);
    return (
      '<div class="case-card bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group border border-slate-200 dark:border-slate-700 hover:border-' +
      bc +
      '-500/50 flex flex-col">' +
      "<!-- 上方图片 16:9 -->" +
      '<div class="w-full aspect-video md:aspect-[4/3] bg-slate-200 dark:bg-slate-700 overflow-hidden relative flex-shrink-0">' +
      '<img loading="lazy" alt="' +
      c.title +
      '" class="w-full h-full object-contain bg-slate-100 dark:bg-slate-700 group-hover:scale-105 transition-transform" src="/assets/images/cases/' +
      c.slug.split("-")[0] +
      '/cover.webp" />' +
      '<div class="absolute top-3 left-3 flex items-center gap-2">' +
      '<span class="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 text-sm font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-sm">' +
      c.country +
      "</span>" +
      '<span class="px-3 py-1 rounded-full bg-' +
      bc +
      '-500 text-white text-sm font-bold" data-i18n="cases_benefit_' +
      c.benefit.replace(/ /g, "_").toLowerCase() +
      '">' +
      benefitLabel(c.benefit) +
      "</span>" +
      "</div>" +
      "</div>" +
      "<!-- 下方内容 -->" +
      '<div class="flex-1 p-5 lg:p-6 flex flex-col gap-2.5">' +
      '<h3 class="font-bold text-lg lg:text-xl leading-snug text-slate-900 dark:text-white" data-i18n="cases_' +
      c.slug.split("-")[0] +
      '_title">' +
      c.title +
      "</h3>" +
      '<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">' +
      '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-base">storefront</span>' +
      '<span data-i18n="cases_industry_' +
      c.slug.split("-")[0] +
      '">' +
      c.industry +
      "</span>" +
      "</span>" +
      '<span class="text-slate-300 dark:text-slate-600">·</span>' +
      '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-base">restaurant</span>' +
      '<span data-i18n="cases_daily_' +
      c.slug.split("-")[0] +
      '">' +
      c.dailyOutput +
      " " +
      __("cases_per_day", "餐/天") +
      "</span>" +
      "</span>" +
      '<span class="text-slate-300 dark:text-slate-600">·</span>' +
      '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-base">schedule</span>' +
      '<span data-i18n="cases_payback_' +
      c.slug.split("-")[0] +
      '">' +
      c.payback +
      " " +
      __("cases_payback_month", "月回本") +
      "</span>" +
      "</span>" +
      "</div>" +
      '<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300 italic border-l-4 border-' +
      bc +
      '-400 pl-3" data-i18n="cases_quote_' +
      c.slug +
      '">' +
      c.quote +
      "</p>" +
      '<div class="grid grid-cols-3 gap-2 mt-1">' +
      '<div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5 text-center">' +
      '<div class="text-lg font-black text-' +
      bc +
      '-600">-' +
      pct +
      "%</div>" +
      '<div class="text-xs text-slate-500 dark:text-slate-400" data-i18n="cases_label_labor_cost">' +
      __("cases_label_labor_cost", "人工成本") +
      "</div>" +
      "</div>" +
      '<div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5 text-center">' +
      '<div class="text-lg font-black text-slate-700 dark:text-slate-200">' +
      c.laborBefore +
      "→" +
      c.laborAfter +
      "</div>" +
      '<div class="text-xs text-slate-500 dark:text-slate-400" data-i18n="cases_label_staff_change">' +
      __("cases_label_staff_change", "人数变化") +
      "</div>" +
      "</div>" +
      '<div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5 text-center">' +
      '<div class="text-base font-black text-primary">' +
      c.monthlySaving +
      "</div>" +
      '<div class="text-xs text-slate-500 dark:text-slate-400" data-i18n="cases_label_monthly_saving">' +
      __("cases_label_monthly_saving", "月节省") +
      "</div>" +
      "</div>" +
      "</div>" +
      '<a href="/cases/' +
      c.slug +
      '/" target="_self" class="inline-flex items-center gap-1 text-primary font-bold text-sm group-hover:gap-2 transition-all mt-auto pt-1">' +
      '<span data-i18n="cases_read_story">' +
      __("cases_read_story", "查看详情") +
      "</span>" +
      '<span class="material-symbols-outlined text-base">arrow_forward</span>' +
      "</a>" +
      "</div>" +
      "</div>"
    );
  }

  /**
   * Render a single case card (Mobile variant — compact)
   */
  function renderCardMobile(c) {
    var pct = laborReduction(c.laborBefore, c.laborAfter);
    var bc = benefitColor(c.benefit);
    return (
      '<div class="case-card bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">' +
      "  <!-- 上方图片 16:9 -->" +
      '<div class="w-full aspect-video bg-slate-200 dark:bg-slate-700 overflow-hidden relative flex-shrink-0">' +
      '<img loading="lazy" alt="' +
      c.title +
      '" class="w-full h-full object-contain bg-slate-100 dark:bg-slate-700 group-hover:scale-105 transition-transform" src="/assets/images/cases/' +
      c.slug.split("-")[0] +
      '/cover.webp" />' +
      '<div class="absolute top-2 left-2 flex items-center gap-1.5">' +
      '<span class="px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-sm">' +
      c.country +
      "</span>" +
      '<span class="px-2 py-0.5 rounded-full bg-' +
      bc +
      '-500 text-white text-xs font-bold" data-i18n="cases_benefit_' +
      c.benefit.replace(/ /g, "_").toLowerCase() +
      '">' +
      benefitLabel(c.benefit) +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="p-4 flex flex-col gap-2">' +
      '<div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">' +
      "<span>" +
      c.country +
      " · " +
      '<span data-i18n="cases_industry_' +
      c.slug.split("-")[0] +
      '">' +
      c.industry +
      "</span>" +
      "</span>" +
      '<span class="font-semibold text-slate-700 dark:text-slate-200">' +
      '<span data-i18n="cases_daily_' +
      c.slug.split("-")[0] +
      '">' +
      c.dailyOutput +
      " " +
      __("cases_per_day", "餐/天") +
      "</span>" +
      "</span>" +
      "</div>" +
      '<h3 class="font-bold text-base leading-snug" data-i18n="cases_' +
      c.slug.split("-")[0] +
      '_title">' +
      c.title +
      "</h3>" +
      '<div class="flex items-center gap-3">' +
      '<span class="inline-flex items-center gap-1 text-sm font-bold text-' +
      bc +
      '-600">' +
      '<span class="material-symbols-outlined text-sm">' +
      benefitIcon(c.benefit) +
      "</span>" +
      '<span data-i18n="cases_labor_' +
      c.slug.split("-")[0] +
      '">' +
      __("cases_labor_reduction", "人工") +
      " -" +
      pct +
      "%" +
      "</span>" +
      "</span>" +
      '<span class="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">' +
      '<span class="material-symbols-outlined text-sm text-primary">schedule</span>' +
      '<span data-i18n="cases_payback_' +
      c.slug.split("-")[0] +
      '">' +
      c.payback +
      " " +
      __("cases_payback_month", "月回本") +
      "</span>" +
      "</span>" +
      "</div>" +
      '<p class="text-sm text-slate-600 dark:text-slate-400 italic" data-i18n="cases_quote_' +
      c.slug +
      '">' +
      c.quote +
      "</p>" +
      '<a href="/cases/' +
      c.slug +
      '/" target="_self" class="inline-flex items-center gap-1 text-primary font-bold text-sm">' +
      '<span data-i18n="cases_read_more">' +
      __("cases_read_more", "Read More") +
      "</span>" +
      '<span class="material-symbols-outlined text-base">arrow_forward</span>' +
      "</a>" +
      "</div>" +
      "</div>"
    );
  }

  /**
   * Get filtered cases
   */
  function getFiltered() {
    return ROI_CASES.filter(function (c) {
      for (var key in activeFilters) {
        if (activeFilters[key] && c[key] !== activeFilters[key]) return false;
      }
      return true;
    });
  }

  /**
   * Render all cards into #case-grid
   */
  function renderGrid(variant) {
    var container = document.getElementById("case-grid");
    if (!container) {
      return;
    }
    var cases = getFiltered();
    if (cases.length === 0) {
      container.innerHTML =
        '<div class="col-span-full text-center py-16"><p class="text-slate-500 dark:text-slate-400 text-lg" data-i18n="cases_no_results">没有找到匹配的案例，试试调整筛选条件。</p></div>';
      return;
    }
    var html = "";
    for (var i = 0; i < cases.length; i++) {
      html += variant === "mobile" ? renderCardMobile(cases[i]) : renderCardPc(cases[i]);
    }
    container.innerHTML = html;

    // Update count — use i18n format
    var countEl = document.getElementById("case-count");
    if (countEl) {
      var template = __("cases_count_format", "{count} 个案例");
      countEl.textContent = template.replace("{count}", cases.length);
    }

    // Make entire case cards clickable
    var cards = container.querySelectorAll(".case-card");
    for (var ci = 0; ci < cards.length; ci++) {
      (function (card) {
        card.style.cursor = "pointer";
        _spaOn(
          card,
          "click",
          function (e) {
            // Don't intercept clicks on nested links or buttons
            if (e.target.closest("a") || e.target.closest("button")) return;
            var link = card.querySelector('a[href^="/cases/"]');
            if (link) {
              e.preventDefault();
              var href = link.getAttribute("href");
              if (href) window.location.href = href;
            }
          },
          "casegrid:cardClick_" + ci
        );
      })(cards[ci]);
    }
  }

  /* ── Filter UI Builders ─────────────────────────── */

  /**
   * Build horizontal filter bar (PC)
   */
  function buildFiltersPc() {
    var bar = document.getElementById("case-filters");
    if (!bar) return;

    var html = '<div class="flex flex-wrap items-center gap-3">';
    for (var key in FILTERS) {
      var f = FILTERS[key];
      html +=
        '<div class="flex items-center gap-2">' +
        '<span class="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap" data-i18n="' +
        f.i18n +
        '">' +
        f.label +
        "</span>" +
        '<div class="flex gap-1">';
      html +=
        '<button data-filter="' +
        key +
        '" data-value="" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-primary bg-primary text-white" data-i18n="cases_filter_all">' +
        __("cases_filter_all", "全部") +
        "</button>";
      for (var i = 0; i < f.options.length; i++) {
        html +=
          '<button data-filter="' +
          key +
          '" data-value="' +
          f.options[i] +
          '" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary">' +
          f.options[i] +
          "</button>";
      }
      html += "</div></div>";
    }
    html += "</div>";
    bar.innerHTML = html;
  }

  /**
   * Build collapsible filter panel (Tablet)
   */
  function buildFiltersTablet() {
    var bar = document.getElementById("case-filters");
    if (!bar) return;

    var html =
      '<button id="case-filter-toggle" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold shadow-sm hover:shadow-md transition-all">' +
      '<span class="material-symbols-outlined text-primary">tune</span>' +
      '<span data-i18n="cases_filter_toggle">' +
      __("cases_filter_toggle", "筛选案例") +
      "</span>" +
      '<span id="case-count" class="ml-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">' +
      __("cases_count_format", "8 个案例").replace("{count}", "8") +
      "</span>" +
      '<span class="material-symbols-outlined ml-auto transition-transform" id="case-filter-arrow">expand_more</span>' +
      "</button>" +
      '<div id="case-filter-panel" class="hidden mt-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg space-y-4">';

    for (var key in FILTERS) {
      var f = FILTERS[key];
      html +=
        "<div>" +
        '<span class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2" data-i18n="' +
        f.i18n +
        '">' +
        f.label +
        "</span>" +
        '<div class="flex flex-wrap gap-1.5">';
      html +=
        '<button data-filter="' +
        key +
        '" data-value="" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-primary bg-primary text-white" data-i18n="cases_filter_all">' +
        __("cases_filter_all", "全部") +
        "</button>";
      for (var i = 0; i < f.options.length; i++) {
        html +=
          '<button data-filter="' +
          key +
          '" data-value="' +
          f.options[i] +
          '" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary">' +
          f.options[i] +
          "</button>";
      }
      html += "</div></div>";
    }
    html += "</div>";
    bar.innerHTML = html;

    // Toggle logic
    var toggle = document.getElementById("case-filter-toggle");
    var panel = document.getElementById("case-filter-panel");
    var arrow = document.getElementById("case-filter-arrow");
    if (toggle && panel) {
      _spaOn(
        toggle,
        "click",
        function () {
          var open = !panel.classList.contains("hidden");
          panel.classList.toggle("hidden");
          if (arrow) arrow.style.transform = open ? "" : "rotate(180deg)";
        },
        "casegrid:filterToggle"
      );
    }
  }

  /**
   * Build mobile dropdown filters (single-row sticky)
   */
  function buildFiltersMobile() {
    var bar = document.getElementById("case-filters");
    if (!bar) return;

    var html = '<div class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">';
    for (var key in FILTERS) {
      var f = FILTERS[key];
      html +=
        '<select data-filter-select="' +
        key +
        '"' +
        ' class="case-filter-select flex-shrink-0 px-3 py-2 text-xs font-semibold' +
        " rounded-lg border border-slate-300 dark:border-slate-600" +
        " bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" +
        ' appearance-none cursor-pointer min-w-[110px]"' +
        " style='background-image: url(\"data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22" +
        " width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22" +
        " stroke=%22%2394a3b8%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>');" +
        " background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;'>";
      html += '<option value="">' + __(f.i18n, f.label) + "</option>";
      for (var i = 0; i < f.options.length; i++) {
        html += '<option value="' + f.options[i] + '">' + f.options[i] + "</option>";
      }
      html += "</select>";
    }
    html +=
      '<span id="case-count" class="flex-shrink-0 text-xs font-bold text-primary whitespace-nowrap">' +
      __("cases_count_format", "8 个案例").replace("{count}", "8") +
      "</span>";
    html += "</div>";
    bar.innerHTML = html;

    // Bind select change events
    var selects = bar.querySelectorAll(".case-filter-select");
    for (var s = 0; s < selects.length; s++) {
      _spaOn(
        selects[s],
        "change",
        function () {
          activeFilters[this.getAttribute("data-filter-select")] = this.value || null;
          renderGrid("mobile");
        },
        "casegrid:selectChange_" + s
      );
    }
  }

  /* ── Filter Button Event Binding ────────────────── */
  function bindFilterButtons() {
    _spaOn(
      document,
      "click",
      function (e) {
        var btn = e.target.closest(".case-filter-btn");
        if (!btn) return;

        var filterKey = btn.getAttribute("data-filter");
        var value = btn.getAttribute("data-value");

        activeFilters[filterKey] = value || null;

        // Update button states within the same filter group
        var siblings = btn.parentElement.querySelectorAll(".case-filter-btn");
        for (var i = 0; i < siblings.length; i++) {
          siblings[i].className =
            "case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary";
        }
        btn.className =
          "case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-primary bg-primary text-white";

        // Determine variant
        var variant = document.body.getAttribute("data-case-variant") || "pc";
        renderGrid(variant);
      },
      "casegrid:filterButtonClick"
    );
  }

  /* ── Init ───────────────────────────────────────── */
  function init(variant) {
    if (variant === "pc") buildFiltersPc();
    else if (variant === "tablet") buildFiltersTablet();
    else buildFiltersMobile();

    renderGrid(variant);
    bindFilterButtons();
  }

  /* ── Auto-init based on data attribute ──────────── */
  window.CaseGrid = { init: init, FILTERS: FILTERS, ROI_CASES: ROI_CASES };

  // ── Auto-init when DOM is ready ────────────────────
  function autoInit(evt) {
    var grid = document.getElementById("case-grid");
    var filters = document.getElementById("case-filters");
    if (!grid) {
      setTimeout(autoInit, 200);
      return;
    }
    var variant = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1280 ? "tablet" : "pc";
    init(variant);
  }

  if (document.readyState === "loading") {
    _spaOn(document, "DOMContentLoaded", autoInit, "casegrid:DOMContentLoaded");
  } else {
    autoInit();
  }

  // SPA navigation: re-init after i18n translations are applied
  // Wait for spa:ready (fired by translations.js after applyTranslations resolves)
  // to ensure data-i18n fallback text is replaced before/after we render cards
  _spaOn(document, "spa:load", autoInit, "casegrid:spaLoad");
  _spaOn(document, "spa:ready", autoInit, "casegrid:spaReady");
})();
