/* ═══════════════════════════════════════════════════
   case-grid.js — 案例列表 + 筛选逻辑
   Pure frontend, no backend dependency
   ═══════════════════════════════════════════════════ */

;(function () {
  'use strict'

  /* ── Mock Data ──────────────────────────────────── */
  var ROI_CASES = [
    { slug: 'manila-small-resto-labor-62', country: '🇵🇭 Philippines', industry: '小型餐饮', volume: '200-500', benefit: 'Labor Cost Reduction', dailyOutput: 350, laborBefore: 4, laborAfter: 2, monthlySaving: 'PHP 48,000', payback: 7.8, title: 'Manila 快餐店：引入炒菜机后人工成本降 62%', quote: '"以前每天炒菜 12 小时，现在只要 2.5 小时。"' },
    { slug: 'jakarta-central-kitchen-450', country: '🇮🇩 Indonesia', industry: '中央厨房', volume: '500-1000', benefit: 'Consistency', dailyOutput: 450, laborBefore: 11, laborAfter: 5, monthlySaving: 'IDR 18M', payback: 9.2, title: 'Jakarta 中央厨房：450 餐/天，出品一致性 97%', quote: '"口味终于稳定了，连锁店的投诉率下降了 80%。"' },
    { slug: 'hcmc-cloud-kitchen-compact', country: '🇻🇳 Vietnam', industry: '云厨房', volume: '<200', benefit: 'Space Saving', dailyOutput: 150, laborBefore: 3, laborAfter: 1, monthlySaving: 'VND 14M', payback: 5.5, title: '胡志明市云厨房：15㎡ 完成全品类出餐', quote: '"空间小但能做的菜很多，客户都以为是专业大厨房。"' },
    { slug: 'bangkok-chain-8-stores', country: '🇹🇭 Thailand', industry: '连锁餐饮', volume: '1000+', benefit: 'Consistency', dailyOutput: 1200, laborBefore: 24, laborAfter: 12, monthlySaving: 'THB 270K', payback: 11.3, title: '曼谷火锅连锁 8 店：口味标准化 + 培训周期缩短 75%', quote: '"新店开业第 2 周就能正常出餐，以前至少要 2 个月。"' },
    { slug: 'kl-canteen-2000-meals', country: '🇲🇾 Malaysia', industry: '智慧食堂', volume: '1000+', benefit: 'Fast Payback', dailyOutput: 2000, laborBefore: 15, laborAfter: 6, monthlySaving: 'MYR 13,500', payback: 6.2, title: '吉隆坡工厂食堂：2000 餐/天，6.2 个月回本', quote: '"工人最喜欢的是清洗方便，10 分钟就能搞定。"' },
    { slug: 'cebu-small-resto-payback', country: '🇵🇭 Philippines', industry: '小型餐饮', volume: '200-500', benefit: 'Fast Payback', dailyOutput: 280, laborBefore: 3, laborAfter: 1, monthlySaving: 'PHP 32,000', payback: 4.8, title: 'Cebu 小吃店：投资 1 台，4.8 个月回本', quote: '"最好的投资决定，省下来的钱已经买第二台了。"' },
    { slug: 'surabaya-central-automation', country: '🇮🇩 Indonesia', industry: '中央厨房', volume: '500-1000', benefit: 'Labor Cost Reduction', dailyOutput: 800, laborBefore: 18, laborAfter: 8, monthlySaving: 'IDR 24M', payback: 8.5, title: '泗水中央厨房：自动化后废品率从 8% 降至 1.2%', quote: '"食品浪费大幅减少，每个月节省的食材钱就很可观。"' },
    { slug: 'hanoi-street-food-modern', country: '🇻🇳 Vietnam', industry: '小型餐饮', volume: '<200', benefit: 'Consistency', dailyOutput: 180, laborBefore: 2, laborAfter: 1, monthlySaving: 'VND 8M', payback: 5.1, title: '河内街头小吃升级：1 台机器 + 1 个人 = 全品类菜单', quote: '"Phở 和 Bánh Mì 都能用，外国游客也夸味道好。"' }
  ]

  /* ── Filter Definitions ─────────────────────────── */
  var FILTERS = {
    industry: {
      label: '行业',
      i18n: 'cases_filter_industry',
      options: ['小型餐饮', '中央厨房', '连锁餐饮', '智慧食堂', '云厨房']
    },
    volume: {
      label: '日单量',
      i18n: 'cases_filter_volume',
      options: ['<200', '200-500', '500-1000', '1000+']
    },
    country: {
      label: '国家',
      i18n: 'cases_filter_country',
      options: ['🇵🇭 Philippines', '🇮🇩 Indonesia', '🇻🇳 Vietnam', '🇹🇭 Thailand', '🇲🇾 Malaysia']
    },
    benefit: {
      label: '核心收益',
      i18n: 'cases_filter_benefit',
      options: ['Labor Cost Reduction', 'Consistency', 'Space Saving', 'Fast Payback']
    }
  }

  /* ── State ──────────────────────────────────────── */
  var activeFilters = { industry: null, volume: null, country: null, benefit: null }

  /* ── Helpers ────────────────────────────────────── */
  function laborReduction(b, a) {
    return Math.round((1 - a / b) * 100)
  }

  function benefitLabel(key) {
    var map = {
      'Labor Cost Reduction': '降人工',
      'Consistency': '标准化',
      'Space Saving': '省空间',
      'Fast Payback': '快回本'
    }
    return map[key] || key
  }

  function benefitIcon(key) {
    var map = {
      'Labor Cost Reduction': 'group_remove',
      'Consistency': 'verified',
      'Space Saving': 'compress',
      'Fast Payback': 'rocket_launch'
    }
    return map[key] || 'star'
  }

  function benefitColor(key) {
    var map = {
      'Labor Cost Reduction': 'blue',
      'Consistency': 'green',
      'Space Saving': 'purple',
      'Fast Payback': 'orange'
    }
    return map[key] || 'primary'
  }

  /* ── Rendering ──────────────────────────────────── */

  /**
   * Render a single case card (PC variant — used for PC & Tablet)
   */
  function renderCardPc(c) {
    var pct = laborReduction(c.laborBefore, c.laborAfter)
    var bc = benefitColor(c.benefit)
    return '<div class="case-card bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group border border-slate-200 dark:border-slate-700 hover:border-' + bc + '-500/50">' +
      '<!-- TODO: 替换为 ' + c.slug + ' 案例场景图 -->' +
      '<div class="h-44 bg-slate-200 dark:bg-slate-700 overflow-hidden">' +
        '<img loading="lazy" alt="' + c.title + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop" />' +
      '</div>' +
      '<div class="p-6 flex flex-col gap-3">' +
        '<div class="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">' +
          '<span>' + c.country + '</span>' +
          '<span class="text-slate-300 dark:text-slate-600">|</span>' +
          '<span>' + c.industry + '</span>' +
          '<span class="text-slate-300 dark:text-slate-600">|</span>' +
          '<span class="font-semibold text-slate-700 dark:text-slate-200">' + c.dailyOutput + ' 餐/天</span>' +
        '</div>' +
        '<div class="flex items-center justify-between gap-4">' +
          '<div class="flex items-center gap-2">' +
            '<div class="w-10 h-10 rounded-xl bg-' + bc + '-100 dark:bg-' + bc + '-900/30 flex items-center justify-center">' +
              '<span class="material-symbols-outlined text-' + bc + '-600">' + benefitIcon(c.benefit) + '</span>' +
            '</div>' +
            '<div>' +
              '<div class="text-xs text-slate-500 dark:text-slate-400">' + benefitLabel(c.benefit) + '</div>' +
              '<div class="text-xl font-black text-' + bc + '-600">人工 -' + pct + '%</div>' +
            '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="text-xs text-slate-500 dark:text-slate-400">月省</div>' +
            '<div class="text-lg font-bold text-primary">' + c.monthlySaving + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">' +
          '<span class="material-symbols-outlined text-primary text-sm">schedule</span>' +
          '<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">' + c.payback + ' 个月回本</span>' +
        '</div>' +
        '<p class="text-base leading-relaxed" data-i18n="cases_quote_' + c.slug + '">' + c.quote + '</p>' +
        '<h3 class="font-bold text-lg leading-snug" data-i18n="cases_title_' + c.slug + '">' + c.title + '</h3>' +
        '<a href="/cases/' + c.slug + '/" class="inline-flex items-center gap-1 text-primary font-bold text-sm group-hover:gap-2 transition-all mt-auto">' +
          '<span data-i18n="cases_read_story">Read Full Story</span>' +
          '<span class="material-symbols-outlined text-base">arrow_forward</span>' +
        '</a>' +
      '</div>' +
    '</div>'
  }

  /**
   * Render a single case card (Mobile variant — compact)
   */
  function renderCardMobile(c) {
    var pct = laborReduction(c.laborBefore, c.laborAfter)
    var bc = benefitColor(c.benefit)
    return '<div class="case-card bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">' +
      '<div class="p-4 flex flex-col gap-2">' +
        '<div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">' +
          '<span>' + c.country + ' · ' + c.industry + '</span>' +
          '<span class="font-semibold text-slate-700 dark:text-slate-200">' + c.dailyOutput + ' 餐/天</span>' +
        '</div>' +
        '<h3 class="font-bold text-base leading-snug" data-i18n="cases_title_' + c.slug + '">' + c.title + '</h3>' +
        '<div class="flex items-center gap-3">' +
          '<span class="inline-flex items-center gap-1 text-sm font-bold text-' + bc + '-600">' +
            '<span class="material-symbols-outlined text-sm">' + benefitIcon(c.benefit) + '</span>' +
            '人工 -' + pct + '%' +
          '</span>' +
          '<span class="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">' +
            '<span class="material-symbols-outlined text-sm text-primary">schedule</span>' +
            c.payback + ' 月回本' +
          '</span>' +
        '</div>' +
        '<p class="text-sm text-slate-600 dark:text-slate-400 italic" data-i18n="cases_quote_' + c.slug + '">' + c.quote + '</p>' +
        '<a href="/cases/' + c.slug + '/" class="inline-flex items-center gap-1 text-primary font-bold text-sm">' +
          '<span data-i18n="cases_read_more">Read More</span>' +
          '<span class="material-symbols-outlined text-base">arrow_forward</span>' +
        '</a>' +
      '</div>' +
    '</div>'
  }

  /**
   * Get filtered cases
   */
  function getFiltered() {
    return ROI_CASES.filter(function (c) {
      for (var key in activeFilters) {
        if (activeFilters[key] && c[key] !== activeFilters[key]) return false
      }
      return true
    })
  }

  /**
   * Render all cards into #case-grid
   */
  function renderGrid(variant) {
    var container = document.getElementById('case-grid')
    if (!container) return
    var cases = getFiltered()
    if (cases.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-16"><p class="text-slate-500 dark:text-slate-400 text-lg" data-i18n="cases_no_results">没有找到匹配的案例，试试调整筛选条件。</p></div>'
      return
    }
    var html = ''
    for (var i = 0; i < cases.length; i++) {
      html += variant === 'mobile' ? renderCardMobile(cases[i]) : renderCardPc(cases[i])
    }
    container.innerHTML = html

    // Update count
    var countEl = document.getElementById('case-count')
    if (countEl) countEl.textContent = cases.length + ' 个案例'
  }

  /* ── Filter UI Builders ─────────────────────────── */

  /**
   * Build horizontal filter bar (PC)
   */
  function buildFiltersPc() {
    var bar = document.getElementById('case-filters')
    if (!bar) return

    var html = '<div class="flex flex-wrap items-center gap-3">'
    for (var key in FILTERS) {
      var f = FILTERS[key]
      html += '<div class="flex items-center gap-2">' +
        '<span class="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap" data-i18n="' + f.i18n + '">' + f.label + '</span>' +
        '<div class="flex gap-1">'
      html += '<button data-filter="' + key + '" data-value="" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-primary bg-primary text-white">全部</button>'
      for (var i = 0; i < f.options.length; i++) {
        html += '<button data-filter="' + key + '" data-value="' + f.options[i] + '" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary">' + f.options[i] + '</button>'
      }
      html += '</div></div>'
    }
    html += '</div>'
    bar.innerHTML = html
  }

  /**
   * Build collapsible filter panel (Tablet)
   */
  function buildFiltersTablet() {
    var bar = document.getElementById('case-filters')
    if (!bar) return

    var html = '<button id="case-filter-toggle" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold shadow-sm hover:shadow-md transition-all">' +
      '<span class="material-symbols-outlined text-primary">tune</span>' +
      '<span data-i18n="cases_filter_toggle">筛选案例</span>' +
      '<span id="case-count" class="ml-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">8</span>' +
      '<span class="material-symbols-outlined ml-auto transition-transform" id="case-filter-arrow">expand_more</span>' +
    '</button>' +
    '<div id="case-filter-panel" class="hidden mt-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-lg space-y-4">'

    for (var key in FILTERS) {
      var f = FILTERS[key]
      html += '<div>' +
        '<span class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2" data-i18n="' + f.i18n + '">' + f.label + '</span>' +
        '<div class="flex flex-wrap gap-1.5">'
      html += '<button data-filter="' + key + '" data-value="" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-primary bg-primary text-white">全部</button>'
      for (var i = 0; i < f.options.length; i++) {
        html += '<button data-filter="' + key + '" data-value="' + f.options[i] + '" class="case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary">' + f.options[i] + '</button>'
      }
      html += '</div></div>'
    }
    html += '</div>'
    bar.innerHTML = html

    // Toggle logic
    var toggle = document.getElementById('case-filter-toggle')
    var panel = document.getElementById('case-filter-panel')
    var arrow = document.getElementById('case-filter-arrow')
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = !panel.classList.contains('hidden')
        panel.classList.toggle('hidden')
        if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)'
      })
    }
  }

  /**
   * Build mobile dropdown filters (single-row sticky)
   */
  function buildFiltersMobile() {
    var bar = document.getElementById('case-filters')
    if (!bar) return

    var html = '<div class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">'
    for (var key in FILTERS) {
      var f = FILTERS[key]
      html += '<select data-filter-select="' + key + '" class="case-filter-select flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer min-w-[110px]" style="background-image: url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>\'); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;">'
      html += '<option value="">' + f.label + '</option>'
      for (var i = 0; i < f.options.length; i++) {
        html += '<option value="' + f.options[i] + '">' + f.options[i] + '</option>'
      }
      html += '</select>'
    }
    html += '<span id="case-count" class="flex-shrink-0 text-xs font-bold text-primary whitespace-nowrap">8 个案例</span>'
    html += '</div>'
    bar.innerHTML = html

    // Bind select change events
    var selects = bar.querySelectorAll('.case-filter-select')
    for (var s = 0; s < selects.length; s++) {
      selects[s].addEventListener('change', function () {
        activeFilters[this.getAttribute('data-filter-select')] = this.value || null
        renderGrid('mobile')
      })
    }
  }

  /* ── Filter Button Event Binding ────────────────── */
  function bindFilterButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.case-filter-btn')
      if (!btn) return

      var filterKey = btn.getAttribute('data-filter')
      var value = btn.getAttribute('data-value')

      activeFilters[filterKey] = value || null

      // Update button states within the same filter group
      var siblings = btn.parentElement.querySelectorAll('.case-filter-btn')
      for (var i = 0; i < siblings.length; i++) {
        siblings[i].className = 'case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
      }
      btn.className = 'case-filter-btn px-3 py-1.5 text-xs font-semibold rounded-full border transition-all border-primary bg-primary text-white'

      // Determine variant
      var variant = document.body.getAttribute('data-case-variant') || 'pc'
      renderGrid(variant)
    })
  }

  /* ── Init ───────────────────────────────────────── */
  function init(variant) {
    if (variant === 'pc') buildFiltersPc()
    else if (variant === 'tablet') buildFiltersTablet()
    else buildFiltersMobile()

    renderGrid(variant)
    bindFilterButtons()
  }

  /* ── Auto-init based on data attribute ──────────── */
  window.CaseGrid = { init: init, FILTERS: FILTERS, ROI_CASES: ROI_CASES }
})()
