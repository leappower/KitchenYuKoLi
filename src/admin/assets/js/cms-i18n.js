// cms-i18n.js — I18n translation management: overview, inline editing, batch translate, shortcuts
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;

  // ─── Constants ─────────────────────────────────────────────────────
  var LANG_MAP = {
    'zh-CN': { name: '中文', flag: '🇨🇳', dir: 'ltr' },
    'en':    { name: 'English', flag: '🇺🇸', dir: 'ltr' },
    'ja':    { name: '日本語', flag: '🇯🇵', dir: 'ltr' },
    'ko':    { name: '한국어', flag: '🇰🇷', dir: 'ltr' },
    'th':    { name: 'ไทย', flag: '🇹🇭', dir: 'ltr' },
    'vi':    { name: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
    'id':    { name: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
    'ms':    { name: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr' },
    'hi':    { name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
    'ar':    { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    'zh-TW': { name: '繁體中文', flag: '🇹🇼', dir: 'ltr' }
  };

  var PAGE_SIZE = 200;

  // ─── State ─────────────────────────────────────────────────────────
  var state = {
    view: 'overview',       // 'overview' | 'editor' | 'pages'
    type: 'ui',
    // Overview
    overviewData: null,
    // Editor
    lang: null,             // current editing language
    editorData: null,       // { keys: [...], srcMap: {...}, total: N }
    page: 1,
    filter: 'all',          // 'all' | 'untranslated' | 'translated' | 'ai_review'
    search: '',
    sortBy: 'key',          // 'key' | 'status'
    selected: {},           // key -> true
    edits: {},              // key -> value
    aiSuggestions: {},      // key -> suggestion string
    expandedRow: null,      // currently expanded key
    editingCell: null,      // { key, inputEl }
    // Batch translate
    batchJobId: null,
    batchPollTimer: null
  };

  // ─── Pages state (kept from original) ─────────────────────────────
  var pagesState = { currentView: 'list', currentPageId: null };

  // ─── Main render entry ─────────────────────────────────────────────
  CMS.renderI18nPage = function(area) {
    state.view = 'overview';
    _render(area);
  };

  CMS.renderPagesPage = function(area) {
    CMS.currentPage = 'i18n';
    var bc = document.getElementById('breadcrumb'); if (bc) bc.textContent = '多语言与页面';
    var nav = document.getElementById('nav-menu');
    nav.querySelectorAll('.sidebar-link').forEach(function(b) { b.classList.remove('active'); });
    nav.querySelectorAll('.sidebar-link').forEach(function(b) { if (b.textContent.includes('多语言')) b.classList.add('active'); });
    CMS.renderI18nPage(area);
    state.view = 'pages';
    _render(area);
    setTimeout(function() { loadPagesList(); }, 50);
  };

  function _render(area) {
    if (state.view === 'overview') renderOverview(area);
    else if (state.view === 'editor') renderEditor(area);
    else if (state.view === 'pages') renderPagesShell(area);
  }

  // ═══════════════════════════════════════════════════════════════════
  // OVERVIEW PAGE
  // ═══════════════════════════════════════════════════════════════════

  function renderOverview(area) {
    area.innerHTML = '<div class="fade-in">' +
      _header('🌐 翻译总览') +
      '<div id="i18n-type-bar" class="flex items-center gap-3 mb-5">' +
        '<span class="text-sm text-gray-500">类型:</span>' +
        _typeButtons() +
      '</div>' +
      '<div id="i18n-overview-content"><div class="text-center py-12 text-gray-400">加载中...</div></div>' +
      '</div>';
    _bindTypeButtons();
    _loadOverview();
  }

  function _loadOverview() {
    var container = document.getElementById('i18n-overview-content');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12 text-gray-400">加载中...</div>';

    api('/i18n/overview?type=' + state.type).then(function(data) {
      if (!data) { container.innerHTML = '<div class="text-center py-12 text-red-400">加载失败</div>'; return; }
      state.overviewData = data;
      _renderOverviewCards(container, data);
    });
  }

  function _renderOverviewCards(container, data) {
    var overallPct = data.overall_percent || 0;
    var barColor = overallPct > 80 ? '#22c55e' : overallPct > 30 ? '#eab308' : '#ef4444';

    var html = '<div class="mb-6 p-4 rounded-xl border border-gray-200 bg-white">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<div><span class="text-lg font-semibold">' + data.total_keys + '</span> <span class="text-sm text-gray-500">个 key × ' + data.languages.length + ' 语言</span></div>' +
        '<div class="text-sm font-medium" style="color:' + barColor + '">' + overallPct + '% 完成</div>' +
      '</div>' +
      '<div style="width:100%;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">' +
        '<div style="width:' + Math.min(overallPct, 100) + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.5s"></div>' +
      '</div>' +
      '</div>';

    // Sync warning
    var incompleteLangs = data.languages.filter(function(l) { return l.percent < 100; });
    var srcKeys = data.total_keys;
    if (incompleteLangs.length > 0) {
      var totalMissing = 0;
      incompleteLangs.forEach(function(l) { totalMissing += srcKeys - l.translated; });
      html += '<div class="mb-5 p-4 rounded-xl border border-amber-200 bg-amber-50">' +
        '<div class="flex items-start gap-2">' +
          '<span class="text-lg">⚠️</span>' +
          '<div class="flex-1">' +
            '<div class="text-sm font-medium text-amber-800 mb-1">翻译进度不足</div>' +
            '<div class="text-xs text-amber-600 mb-2">共 <strong>' + totalMissing + '</strong> 条待翻译，影响 ' + incompleteLangs.length + ' 种语言</div>' +
            '<div class="flex flex-wrap gap-1">' +
              incompleteLangs.map(function(l) {
                return '<span class="text-xs px-1.5 py-0.5 rounded" style="background:#fef3c7;color:#92400e">' + l.flag + ' ' + l.name + ' ' + l.percent + '%</span>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div></div>';
    }

    // Language cards grid
    html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">';
    data.languages.forEach(function(lang) {
      var pct = lang.percent;
      var color = pct >= 80 ? '#22c55e' : pct >= 30 ? '#eab308' : '#ef4444';
      var bgColor = pct >= 80 ? '#f0fdf4' : pct >= 30 ? '#fefce8' : '#fef2f2';
      var statusIcon = pct >= 100 ? '✅' : pct >= 80 ? '📝' : '❌';
      var statusText = pct >= 100 ? '已完成' : pct >= 80 ? '接近完成' : pct >= 30 ? '进行中' : '待翻译';

      html += '<div class="lang-card cursor-pointer rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all p-4" data-lang="' + esc(lang.code) + '" style="border-left:4px solid ' + color + '">' +
        '<div class="flex items-center gap-3 mb-3">' +
          '<span class="text-2xl">' + lang.flag + '</span>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-semibold text-gray-900">' + esc(lang.name) + '</div>' +
            '<div class="text-xs text-gray-400 font-mono">' + esc(lang.code) + '</div>' +
          '</div>' +
          '<span class="text-sm">' + statusIcon + '</span>' +
        '</div>' +
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-sm text-gray-600">' + lang.translated + ' / ' + lang.total + '</span>' +
          '<span class="text-xs font-medium" style="color:' + color + '">' + pct + '%</span>' +
        '</div>' +
        '<div style="width:100%;height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden">' +
          '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + color + ';border-radius:3px;transition:width 0.3s"></div>' +
        '</div>' +
        '<div class="mt-2 text-xs text-gray-400">' + statusText + '</div>' +
        '</div>';
    });
    html += '</div>';

    // Action buttons
    var incompleteCodes = incompleteLangs.map(function(l) { return l.code; });
    html += '<div class="flex items-center gap-3 flex-wrap">' +
      '<button id="btn-batch-translate-all" class="btn-primary" style="font-size:0.875rem;padding:0.5rem 1rem">' +
        '🤖 AI 批量翻译全部未完成语言 (' + incompleteCodes.length + ')' +
      '</button>' +
      '<button id="btn-export-report" class="btn-ghost" style="font-size:0.875rem;padding:0.5rem 1rem">📊 导出翻译报告</button>' +
      '</div>';

    // Batch progress area
    html += '<div id="batch-progress-area" style="display:none"></div>';

    container.innerHTML = html;

    // Bind card clicks
    container.querySelectorAll('.lang-card').forEach(function(card) {
      card.addEventListener('click', function() {
        state.lang = card.getAttribute('data-lang');
        state.view = 'editor';
        state.page = 1;
        state.filter = 'all';
        state.search = '';
        state.selected = {};
        state.edits = {};
        state.expandedRow = null;
        _render(document.getElementById('main-content') || document.querySelector('.main-content') || document.querySelector('[id$="content"]') || container.closest('.fade-in'));
      });
    });

    // Batch translate all
    var batchBtn = document.getElementById('btn-batch-translate-all');
    if (batchBtn) {
      batchBtn.addEventListener('click', function() {
        if (incompleteCodes.length === 0) { toast('所有语言已完成翻译'); return; }
        _startBatchTranslate(incompleteCodes);
      });
    }

    // Export report
    var exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
      exportBtn.addEventListener('click', _exportReport);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // EDITOR PAGE
  // ═══════════════════════════════════════════════════════════════════

  function renderEditor(area) {
    var meta = LANG_MAP[state.lang] || {};
    var area2 = document.getElementById('main-content') || area;
    if (area2 !== area && area2) area = area2;

    area.innerHTML = '<div class="fade-in">' +
      // Back button + header
      '<div class="flex items-center gap-4 mb-4">' +
        '<button id="btn-back-overview" class="btn-ghost" style="padding:0.375rem 0.75rem;font-size:0.85rem">← 返回总览</button>' +
        '<div class="flex items-center gap-2 flex-1">' +
          '<span class="text-xl">' + (meta.flag || '') + '</span>' +
          '<h2 class="text-lg font-semibold">' + esc(meta.name || state.lang) + '</h2>' +
          '<span class="text-sm text-gray-400 font-mono">(' + esc(state.lang) + ')</span>' +
          '<span id="editor-stats" class="text-sm text-gray-500 ml-auto">加载中...</span>' +
        '</div>' +
      '</div>' +
      // Toolbar
      '<div class="flex items-center gap-3 mb-4 flex-wrap">' +
        '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
          _filterBtn('all', '全部') +
          _filterBtn('untranslated', '未翻译') +
          _filterBtn('translated', '已翻译') +
          _filterBtn('ai_review', 'AI待审核') +
        '</div>' +
        '<input id="editor-search" placeholder="搜索 key 或原文..." value="' + esc(state.search) + '" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.75rem;border-radius:0.5rem;font-size:0.85rem;width:220px">' +
        '<select id="editor-sort" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.6rem;border-radius:0.5rem;font-size:0.85rem">' +
          '<option value="key"' + (state.sortBy === 'key' ? ' selected' : '') + '>按 Key 排序</option>' +
          '<option value="status"' + (state.sortBy === 'status' ? ' selected' : '') + '>按状态排序</option>' +
        '</select>' +
      '</div>' +
      // Table
      '<div id="editor-table-container" style="overflow-x:auto"><div class="text-center py-8 text-gray-400">加载中...</div></div>' +
      // Selection bar
      '<div id="editor-selection-bar" class="hidden mt-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50">' +
        '<div class="flex items-center justify-between flex-wrap gap-2">' +
          '<span class="text-sm text-indigo-700"><strong id="selection-count">0</strong> 条已选</span>' +
          '<div class="flex gap-2">' +
            '<button id="btn-batch-translate-selected" class="btn-primary" style="font-size:0.8rem;padding:0.3rem 0.75rem;background:#7c3aed">🤖 AI 翻译选中</button>' +
            '<button id="btn-mark-reviewed" class="btn-ghost" style="font-size:0.8rem;padding:0.3rem 0.75rem">✅ 标记已审核</button>' +
            '<button id="btn-export-selected" class="btn-ghost" style="font-size:0.8rem;padding:0.3rem 0.75rem">📥 导出选中</button>' +
            '<button id="btn-clear-selection" class="btn-ghost" style="font-size:0.8rem;padding:0.3rem 0.75rem">取消选择</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // Pagination
      '<div id="editor-pagination" class="flex items-center justify-between mt-4 text-sm text-gray-500"></div>' +
      // Unsaved bar
      '<div id="editor-unsaved-bar" class="hidden mt-4 flex items-center justify-between px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">' +
        '<span class="text-sm text-amber-700" id="editor-unsaved-text">0 条未保存修改</span>' +
        '<div class="flex gap-3">' +
          '<button id="btn-discard-edits" class="btn-ghost" style="font-size:0.85rem;padding:0.35rem 0.875rem">放弃</button>' +
          '<button id="btn-save-edits" class="btn-primary" style="font-size:0.85rem;padding:0.35rem 0.875rem;background:#f59e0b">保存修改</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    // Bind events
    document.getElementById('btn-back-overview').addEventListener('click', function() {
      state.view = 'overview';
      state.selected = {};
      state.edits = {};
      _render(area);
    });

    // Filter buttons
    document.querySelectorAll('.editor-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.filter = btn.getAttribute('data-filter');
        state.page = 1;
        _updateFilterBtnStyles();
        _loadEditorData();
      });
    });

    // Search
    var searchInput = document.getElementById('editor-search');
    var searchTimer = null;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() {
        state.search = searchInput.value.trim();
        state.page = 1;
        _loadEditorData();
      }, 300);
    });
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { clearTimeout(searchTimer); state.search = searchInput.value.trim(); state.page = 1; _loadEditorData(); }
    });

    // Sort
    document.getElementById('editor-sort').addEventListener('change', function() {
      state.sortBy = this.value;
      state.page = 1;
      _loadEditorData();
    });

    // Selection actions
    document.getElementById('btn-batch-translate-selected').addEventListener('click', _translateSelected);
    document.getElementById('btn-mark-reviewed').addEventListener('click', _markSelectedReviewed);
    document.getElementById('btn-export-selected').addEventListener('click', _exportSelected);
    document.getElementById('btn-clear-selection').addEventListener('click', function() { state.selected = {}; _updateSelectionBar(); });

    // Save/discard
    document.getElementById('btn-save-edits').addEventListener('click', _saveEdits);
    document.getElementById('btn-discard-edits').addEventListener('click', function() { state.edits = {}; _updateUnsavedBar(); _loadEditorData(); });

    _updateFilterBtnStyles();
    _loadEditorData();

    // Keyboard shortcuts
    _bindEditorShortcuts();
  }

  function _loadEditorData() {
    var container = document.getElementById('editor-table-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    var params = '?lang=' + state.lang + '&type=' + state.type +
      '&page=' + state.page + '&limit=' + PAGE_SIZE +
      (state.search ? '&search=' + encodeURIComponent(state.search) : '');

    api('/i18n/keys' + params).then(function(data) {
      if (!data) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }

      // Fetch source (zh-CN) for comparison
      var srcParams = '?lang=zh-CN&type=' + state.type + '&limit=1';
      api('/i18n/keys' + srcParams).then(function(srcInfo) {
        var srcTotal = (srcInfo && srcInfo.total) || 0;

        // Fetch full source data for display (we need it per-row)
        api('/i18n/export?lang=zh-CN&type=' + state.type).then(function(srcData) {
          state.editorData = {
            keys: data.keys,
            total: data.total,
            srcMap: srcData || {}
          };

          // Calculate filtered stats
          _updateEditorStats(data.total, srcTotal);
          _renderEditorTable();
          _renderEditorPagination(data.total);
          _updateSelectionBar();
          _updateUnsavedBar();
        });
      });
    });
  }

  function _getFilteredKeys() {
    var keys = state.editorData ? state.editorData.keys : [];
    if (state.filter === 'untranslated') {
      keys = keys.filter(function(k) { return !k.value || !k.value.trim(); });
    } else if (state.filter === 'translated') {
      keys = keys.filter(function(k) { return k.value && k.value.trim(); });
    } else if (state.filter === 'ai_review') {
      keys = keys.filter(function(k) { return state.aiSuggestions[k.key]; });
    }

    // Sort
    if (state.sortBy === 'status') {
      keys = keys.slice().sort(function(a, b) {
        var aEmpty = (!a.value || !a.value.trim()) ? 0 : 1;
        var bEmpty = (!b.value || !b.value.trim()) ? 0 : 1;
        return aEmpty - bEmpty;
      });
    }

    return keys;
  }

  function _renderEditorTable() {
    var container = document.getElementById('editor-table-container');
    if (!container || !state.editorData) return;

    var keys = _getFilteredKeys();
    var srcMap = state.editorData.srcMap;
    var meta = LANG_MAP[state.lang] || {};

    if (keys.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="text-4xl mb-3">📭</div><div>没有找到匹配的条目</div></div>';
      return;
    }

    var html = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">' +
      '<thead style="position:sticky;top:0;z-index:1"><tr style="border-bottom:2px solid #e5e7eb;background:#f9fafb">' +
      '<th style="padding:0.5rem 0.3rem;text-align:center;width:36px"><input type="checkbox" id="select-all-cb" style="cursor:pointer"></th>' +
      '<th style="padding:0.5rem;text-align:left;width:20%">Key</th>' +
      '<th style="padding:0.5rem;text-align:left;width:28%">🇨🇳 中文原文</th>' +
      '<th style="padding:0.5rem;text-align:left;width:35%">翻译 <span class="text-xs text-gray-400">(点击编辑)</span></th>' +
      '<th style="padding:0.5rem;text-align:center;width:60px">状态</th>' +
      '</tr></thead><tbody>';

    keys.forEach(function(entry) {
      var key = entry.key;
      var srcVal = srcMap[key] || '';
      var curVal = state.edits.hasOwnProperty(key) ? state.edits[key] : (entry.value || '');
      var hasValue = curVal && curVal.trim();
      var isEdited = state.edits.hasOwnProperty(key);
      var hasAiSuggestion = !!state.aiSuggestions[key];
      var rowBg = isEdited ? '#fffbeb' : (!hasValue ? '#fef2f2' : '');
      var isExpanded = state.expandedRow === key;

      html += '<tr class="editor-row" data-key="' + esc(key) + '" style="border-bottom:1px solid #f3f4f6;cursor:pointer;' + (rowBg ? 'background:' + rowBg : '') + '">' +
        '<td style="padding:0.5rem 0.3rem;text-align:center"><input type="checkbox" class="row-cb" data-key="' + esc(key) + '"' + (state.selected[key] ? ' checked' : '') + ' style="cursor:pointer"></td>' +
        '<td style="padding:0.5rem;font-family:monospace;font-size:0.7rem;color:#6b7280;word-break:break-all;line-height:1.4;max-width:200px" title="' + esc(key) + '">' + esc(key) + '</td>' +
        '<td style="padding:0.5rem;color:#374151;font-size:0.8rem;line-height:1.4;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(srcVal) + '">' + esc(srcVal) + '</td>' +
        '<td style="padding:0.25rem 0.5rem">' +
          '<div class="cell-edit-wrapper" style="position:relative">' +
            '<input class="cell-edit-input" data-key="' + esc(key) + '" value="' + esc(curVal) + '" placeholder="点击输入翻译..." ' +
            'style="width:100%;border:1px solid #d1d5db;background:#fff;color:' + (hasValue ? '#111827' : '#9ca3af') + ';padding:0.375rem 0.5rem;border-radius:0.375rem;font-size:0.8rem;line-height:1.4;transition:border-color 0.15s">' +
            '<button class="cell-ai-btn" data-key="' + esc(key) + '" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0;transition:opacity 0.15s" title="AI 翻译此行">🤖</button>' +
          '</div>' +
        '</td>' +
        '<td style="padding:0.5rem;text-align:center">' +
          (isEdited ? '<span style="color:#f59e0b" title="已修改未保存">✏️</span>' :
           hasAiSuggestion ? '<span style="color:#7c3aed" title="AI待审核">💡</span>' :
           !hasValue ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">待翻译</span>' :
           '<span class="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">✅</span>') +
        '</td>' +
        '</tr>';

      // Expanded row (AI suggestion / review)
      if (isExpanded) {
        html += '<tr class="expanded-detail" data-expanded-key="' + esc(key) + '" style="border-bottom:1px solid #e5e7eb;background:#fafbff">' +
          '<td colspan="5" style="padding:0.75rem 1rem">' +
            '<div style="max-width:800px">' +
              '<div class="text-xs text-gray-400 mb-2 font-mono">' + esc(key) + '</div>' +
              '<div class="grid gap-3" style="grid-template-columns:1fr 1fr">' +
                '<div>' +
                  '<div class="text-xs text-gray-500 mb-1">🇨🇳 中文原文</div>' +
                  '<div class="text-sm text-gray-800 p-2 rounded-lg bg-gray-50">' + esc(srcVal) + '</div>' +
                '</div>' +
                '<div>' +
                  '<div class="text-xs text-gray-500 mb-1">' + meta.flag + ' ' + esc(meta.name) + ' 翻译</div>' +
                  '<textarea class="expanded-edit" data-key="' + esc(key) + '" style="width:100%;min-height:40px;border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.5rem;border-radius:0.375rem;font-size:0.85rem;resize:vertical">' + esc(curVal) + '</textarea>' +
                '</div>' +
              '</div>' +
              (hasAiSuggestion ? '<div class="mt-3 p-3 rounded-lg border border-purple-100 bg-purple-50">' +
                '<div class="flex items-center gap-2 mb-2">' +
                  '<span class="text-sm">💡 AI 建议</span>' +
                  '<span class="text-xs text-gray-400">(deepseek-v4-flash)</span>' +
                '</div>' +
                '<div class="text-sm text-gray-800 mb-2 p-2 rounded bg-white border">' + esc(state.aiSuggestions[key]) + '</div>' +
                '<div class="flex gap-2">' +
                  '<button class="btn-primary expanded-accept" data-key="' + esc(key) + '" style="font-size:0.8rem;padding:0.25rem 0.75rem">✅ 采纳</button>' +
                  '<button class="btn-ghost expanded-edit-accept" data-key="' + esc(key) + '" style="font-size:0.8rem;padding:0.25rem 0.75rem">✏️ 编辑后采纳</button>' +
                  '<button class="btn-ghost expanded-reject" data-key="' + esc(key) + '" style="font-size:0.8rem;padding:0.25rem 0.75rem">❌ 不采纳</button>' +
                '</div></div>' : '<div class="mt-3"><button class="btn-ghost expanded-ai-translate" data-key="' + esc(key) + '" style="font-size:0.8rem;padding:0.25rem 0.75rem">🤖 AI 翻译</button></div>') +
            '</div>' +
          '</td></tr>';
      }
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Bind events
    _bindEditorTableEvents(container, meta);
  }

  function _bindEditorTableEvents(container, meta) {
    // Select all
    var selectAllCb = document.getElementById('select-all-cb');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', function() {
        var checked = this.checked;
        container.querySelectorAll('.row-cb').forEach(function(cb) {
          var k = cb.getAttribute('data-key');
          cb.checked = checked;
          if (checked) state.selected[k] = true;
          else delete state.selected[k];
        });
        _updateSelectionBar();
      });
    }

    // Row checkboxes
    container.querySelectorAll('.row-cb').forEach(function(cb) {
      cb.addEventListener('change', function(e) {
        e.stopPropagation();
        var k = cb.getAttribute('data-key');
        if (cb.checked) state.selected[k] = true;
        else delete state.selected[k];
        _updateSelectionBar();
        _updateSelectAllState();
      });
    });

    // Row click → expand/collapse
    container.querySelectorAll('.editor-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.cell-edit-wrapper')) return;
        var key = row.getAttribute('data-key');
        state.expandedRow = (state.expandedRow === key) ? null : key;
        _renderEditorTable();
      });
    });

    // Cell edit inputs — inline editing with save on blur
    container.querySelectorAll('.cell-edit-input').forEach(function(input) {
      input.addEventListener('focus', function(e) {
        e.stopPropagation();
        state.editingCell = { key: input.getAttribute('data-key'), inputEl: input };
        input.style.borderColor = '#6366f1';
      });
      input.addEventListener('blur', function() {
        var key = input.getAttribute('data-key');
        var newVal = input.value;
        var origVal = state.editorData.keys.find(function(k) { return k.key === key; });
        origVal = origVal ? origVal.value : '';
        if (newVal !== origVal) {
          state.edits[key] = newVal;
        } else {
          delete state.edits[key];
        }
        state.editingCell = null;
        input.style.borderColor = '#d1d5db';
        _updateUnsavedBar();
        _updateSelectionBar();
      });
      input.addEventListener('click', function(e) { e.stopPropagation(); });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { input.blur(); }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
      });
    });

    // AI translate buttons (hover per-row)
    container.querySelectorAll('.cell-ai-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        _translateSingleKey(btn.getAttribute('data-key'));
      });
    });

    // Hover show AI button
    container.querySelectorAll('.cell-edit-wrapper').forEach(function(wrapper) {
      var aiBtn = wrapper.querySelector('.cell-ai-btn');
      if (aiBtn) {
        wrapper.addEventListener('mouseenter', function() { aiBtn.style.opacity = '1'; });
        wrapper.addEventListener('mouseleave', function() { aiBtn.style.opacity = '0'; });
      }
    });

    // Expanded row actions
    container.querySelectorAll('.expanded-accept').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var key = btn.getAttribute('data-key');
        state.edits[key] = state.aiSuggestions[key];
        delete state.aiSuggestions[key];
        state.expandedRow = null;
        _updateUnsavedBar();
        _renderEditorTable();
        toast('已采纳 AI 建议');
      });
    });
    container.querySelectorAll('.expanded-edit-accept').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var key = btn.getAttribute('data-key');
        var textarea = container.querySelector('.expanded-edit[data-key="' + key + '"]');
        if (textarea) {
          state.edits[key] = textarea.value;
          delete state.aiSuggestions[key];
          state.expandedRow = null;
          _updateUnsavedBar();
          _renderEditorTable();
          toast('已保存编辑');
        }
      });
    });
    container.querySelectorAll('.expanded-reject').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var key = btn.getAttribute('data-key');
        delete state.aiSuggestions[key];
        state.expandedRow = null;
        _renderEditorTable();
      });
    });
    container.querySelectorAll('.expanded-ai-translate').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        _translateSingleKey(btn.getAttribute('data-key'));
      });
    });
    container.querySelectorAll('.expanded-edit').forEach(function(textarea) {
      textarea.addEventListener('click', function(e) { e.stopPropagation(); });
    });
  }

  // ─── Editor helpers ────────────────────────────────────────────────

  function _updateEditorStats(total, srcTotal) {
    var el = document.getElementById('editor-stats');
    if (!el) return;
    // Count translated in current view
    var translated = state.editorData.keys.filter(function(k) { return k.value && k.value.trim(); }).length;
    var pct = total > 0 ? Math.round(translated / total * 1000) / 10 : 0;
    var color = pct >= 80 ? '#22c55e' : pct >= 30 ? '#eab308' : '#ef4444';
    el.innerHTML = '<span style="color:' + color + ';font-weight:600">' + translated + '/' + total + '</span>' +
      ' <span class="text-gray-400">' + pct + '%</span>';
  }

  function _renderEditorPagination(total) {
    var el = document.getElementById('editor-pagination');
    if (!el) return;
    var totalPages = Math.ceil(total / PAGE_SIZE);
    var page = state.page;
    if (totalPages <= 1) { el.innerHTML = '<span>共 ' + total + ' 条</span><span></span>'; return; }

    var start = (page - 1) * PAGE_SIZE + 1;
    var end = Math.min(page * PAGE_SIZE, total);

    var pages = [];
    if (page > 1) pages.push({ n: page - 1, t: '◀' });
    for (var i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      pages.push({ n: i, t: String(i) });
    }
    if (page < totalPages) pages.push({ n: page + 1, t: '▶' });

    var btns = pages.map(function(p) {
      var active = p.n === page;
      return '<button data-page="' + p.n + '" style="padding:0.25rem 0.625rem;border:1px solid ' +
        (active ? '#4f46e5' : '#d1d5db') + ';background:' + (active ? '#4f46e5' : '#fff') +
        ';color:' + (active ? '#fff' : '#374151') + ';border-radius:0.375rem;cursor:pointer;font-size:0.8rem">' + p.t + '</button>';
    }).join('');

    el.innerHTML = '<span>第 ' + start + '-' + end + ' 条 / 共 ' + total + ' 条 (第 ' + page + '/' + totalPages + ' 页)</span>' +
      '<div class="flex gap-1">' + btns + '</div>';

    el.querySelectorAll('[data-page]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.page = parseInt(this.getAttribute('data-page'));
        state.expandedRow = null;
        _loadEditorData();
      });
    });
  }

  function _updateSelectionBar() {
    var bar = document.getElementById('editor-selection-bar');
    var count = Object.keys(state.selected).length;
    if (!bar) return;
    if (count > 0) {
      bar.classList.remove('hidden');
      var countEl = document.getElementById('selection-count');
      if (countEl) countEl.textContent = count;
    } else {
      bar.classList.add('hidden');
    }
    _updateSelectAllState();
  }

  function _updateSelectAllState() {
    var selectAllCb = document.getElementById('select-all-cb');
    var rowCbs = document.querySelectorAll('.row-cb');
    if (!selectAllCb || rowCbs.length === 0) return;
    var checkedCount = 0;
    rowCbs.forEach(function(cb) { if (cb.checked) checkedCount++; });
    selectAllCb.checked = checkedCount === rowCbs.length;
    selectAllCb.indeterminate = checkedCount > 0 && checkedCount < rowCbs.length;
  }

  function _updateUnsavedBar() {
    var bar = document.getElementById('editor-unsaved-bar');
    var text = document.getElementById('editor-unsaved-text');
    if (!bar) return;
    var count = Object.keys(state.edits).length;
    if (count > 0) {
      bar.classList.remove('hidden');
      if (text) text.textContent = count + ' 条未保存修改';
    } else {
      bar.classList.add('hidden');
    }
  }

  function _updateFilterBtnStyles() {
    document.querySelectorAll('.editor-filter-btn').forEach(function(btn) {
      var f = btn.getAttribute('data-filter');
      if (f === state.filter) {
        btn.style.background = '#fff'; btn.style.color = '#111827'; btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        btn.style.background = 'transparent'; btn.style.color = '#6b7280'; btn.style.boxShadow = 'none';
      }
    });
  }

  // ─── Editor actions ───────────────────────────────────────────────

  function _saveEdits() {
    var count = Object.keys(state.edits).length;
    if (count === 0) return;

    var updates = Object.keys(state.edits).map(function(k) {
      return { key: k, value: state.edits[k] };
    });

    api('/i18n/batch', { method: 'PUT', body: { lang: state.lang, type: state.type, updates: updates } }).then(function(result) {
      if (result && result.count > 0) {
        state.edits = {};
        _updateUnsavedBar();
        toast('已保存 ' + result.count + ' 条翻译');
        _loadEditorData();
      }
    });
  }

  function _translateSingleKey(key) {
    var srcMap = state.editorData ? state.editorData.srcMap : {};
    var srcVal = srcMap[key] || key;
    var meta = LANG_MAP[state.lang] || {};

    api('/translate/texts', {
      method: 'POST',
      body: {
        texts: [srcVal],
        source_lang: 'zh-CN',
        target_lang: state.lang
      }
    }).then(function(result) {
      if (result && result.translations && result.translations[0]) {
        var translated = result.translations[0];
        if (translated && translated.trim()) {
          state.aiSuggestions[key] = translated;
          state.edits[key] = translated;
          state.expandedRow = key;
          _updateUnsavedBar();
          _renderEditorTable();
          toast('AI 翻译完成');
        } else {
          toast('AI 未能生成翻译', true);
        }
      } else {
        toast('翻译请求失败', true);
      }
    }).catch(function() {
      toast('翻译请求失败', true);
    });
  }

  function _translateSelected() {
    var selectedKeys = Object.keys(state.selected);
    if (selectedKeys.length === 0) return;
    _batchTranslateKeys(selectedKeys);
  }

  function _batchTranslateKeys(keys) {
    if (!keys || keys.length === 0) return;

    var srcMap = state.editorData ? state.editorData.srcMap : {};
    var BATCH_SIZE = 5;
    var idx = 0;
    var total = keys.length;
    var done = 0;
    var errors = 0;

    showModal('batch-translate-modal', '🤖 AI 翻译 (' + total + ' 条)',
      '<div class="text-center py-4">' +
        '<div id="bt-progress-text" class="text-sm text-gray-600 mb-2">准备中...</div>' +
        '<div style="width:100%;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">' +
          '<div id="bt-progress-bar" style="width:0%;height:100%;background:#6366f1;border-radius:4px;transition:width 0.3s"></div>' +
        '</div>' +
        '<div id="bt-progress-detail" class="text-xs text-gray-400 mt-2">0/' + total + '</div>' +
      '</div>',
      function() { return false; },
      function() {
        function translateNextBatch() {
          if (idx >= keys.length) {
            var textEl = document.getElementById('bt-progress-text');
            if (textEl) textEl.textContent = '✅ 翻译完成！' + (errors > 0 ? ' (' + errors + ' 个错误)' : '');
            _updateUnsavedBar();
            _renderEditorTable();
            return;
          }

          var batch = keys.slice(idx, idx + BATCH_SIZE);
          var texts = batch.map(function(k) { return srcMap[k] || k; });

          api('/translate/texts', {
            method: 'POST',
            body: { texts: texts, source_lang: 'zh-CN', target_lang: state.lang }
          }).then(function(result) {
            if (result && result.translations && Array.isArray(result.translations)) {
              result.translations.forEach(function(t, i) {
                if (t && t.trim()) {
                  state.edits[batch[i]] = t;
                  state.aiSuggestions[batch[i]] = t;
                  done++;
                } else {
                  errors++;
                }
              });
            } else { errors += batch.length; }
          }).catch(function() { errors += batch.length; })
          .finally(function() {
            idx += BATCH_SIZE;
            var pct = Math.round(idx / total * 100);
            var bar = document.getElementById('bt-progress-bar');
            var detail = document.getElementById('bt-progress-detail');
            if (bar) bar.style.width = pct + '%';
            if (detail) detail.textContent = Math.min(idx, total) + '/' + total;
            // Rate limit: wait 8s between batches
            setTimeout(translateNextBatch, 8000);
          });
        }

        translateNextBatch();
      });
  }

  function _markSelectedReviewed() {
    toast('已标记 ' + Object.keys(state.selected).length + ' 条为已审核');
  }

  function _exportSelected() {
    var keys = Object.keys(state.selected);
    if (keys.length === 0) return;
    var srcMap = state.editorData ? state.editorData.srcMap : {};
    var data = {};
    keys.forEach(function(k) {
      data[k] = state.edits[k] || (state.editorData.keys.find(function(e) { return e.key === k; }) || {}).value || '';
    });
    _downloadJSON(data, state.lang + '-selected.json');
    toast('已导出 ' + keys.length + ' 条');
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────────

  function _bindEditorShortcuts() {
    function handler(e) {
      // Only active when in editor view
      if (state.view !== 'editor') return;
      if (!state.editingCell && !e.ctrlKey && !e.metaKey) return;

      // Ctrl+Enter — save current cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (state.editingCell && state.editingCell.inputEl) {
          e.preventDefault();
          state.editingCell.inputEl.blur();
        }
      }

      // Ctrl+↓ — jump to next untranslated
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        var keys = state.editorData ? state.editorData.keys : [];
        var curKey = state.editingCell ? state.editingCell.key : null;
        var found = false;
        for (var i = 0; i < keys.length; i++) {
          if (found && (!keys[i].value || !keys[i].value.trim())) {
            state.page = Math.floor(i / PAGE_SIZE) + 1;
            _loadEditorData();
            setTimeout(function() {
              var input = document.querySelector('.cell-edit-input[data-key="' + keys[i].key + '"]');
              if (input) input.focus();
            }, 200);
            return;
          }
          if (curKey && keys[i].key === curKey) found = true;
          if (!curKey && (!keys[i].value || !keys[i].value.trim())) {
            state.page = Math.floor(i / PAGE_SIZE) + 1;
            _loadEditorData();
            setTimeout(function() {
              var input = document.querySelector('.cell-edit-input[data-key="' + keys[i].key + '"]');
              if (input) input.focus();
            }, 200);
            return;
          }
        }
      }

      // Ctrl+T — AI translate current row
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (state.editingCell) {
          _translateSingleKey(state.editingCell.key);
        }
      }

      // Esc — close expanded row / cancel editing
      if (e.key === 'Escape') {
        if (state.expandedRow) {
          state.expandedRow = null;
          _renderEditorTable();
        } else if (state.editingCell) {
          state.editingCell.inputEl.blur();
        }
      }
    }

    document.addEventListener('keydown', handler);
    // Store for cleanup (will be re-added on each render)
    if (window._i18nKeyHandler) document.removeEventListener('keydown', window._i18nKeyHandler);
    window._i18nKeyHandler = handler;
  }

  // ═══════════════════════════════════════════════════════════════════
  // BATCH TRANSLATE ALL (overview level)
  // ═══════════════════════════════════════════════════════════════════

  function _startBatchTranslate(targetLangs) {
    api('/i18n/batch-translate', {
      method: 'POST',
      body: { source_lang: 'zh-CN', target_langs: targetLangs, type: state.type }
    }).then(function(result) {
      if (!result) { toast('启动失败', true); return; }
      if (result.status === 'already_done') { toast(result.message); return; }
      if (!result.job_id) { toast('未能启动翻译', true); return; }

      state.batchJobId = result.job_id;
      toast('已开始批量翻译');
      _showBatchProgress();
      _pollBatchProgress();
    }).catch(function() { toast('启动失败', true); });
  }

  function _showBatchProgress() {
    var area = document.getElementById('batch-progress-area');
    if (!area) return;
    area.style.display = '';
    area.innerHTML = '<div class="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<span class="font-semibold text-indigo-900">🤖 AI 批量翻译</span>' +
        '<div class="flex gap-2">' +
          '<button id="btn-cancel-batch" class="btn-ghost" style="font-size:0.8rem;padding:0.25rem 0.75rem;color:#ef4444;border-color:#fca5a5">取消</button>' +
        '</div>' +
      '</div>' +
      '<div id="batch-lang-progress"></div>' +
      '<div class="mt-3 flex items-center justify-between text-xs text-gray-500">' +
        '<span id="batch-total-progress">总进度: 0%</span>' +
        '<span id="batch-eta">预计剩余: 计算中...</span>' +
      '</div>' +
      '</div>';

    document.getElementById('btn-cancel-batch').addEventListener('click', function() {
      api('/i18n/batch-translate/cancel', { method: 'POST', body: { job_id: state.batchJobId } });
      toast('已发送取消请求');
    });
  }

  function _pollBatchProgress() {
    if (state.batchPollTimer) clearInterval(state.batchPollTimer);
    state.batchPollTimer = setInterval(function() {
      api('/i18n/batch-translate/status?job_id=' + state.batchJobId).then(function(data) {
        if (!data) return;

        var langArea = document.getElementById('batch-lang-progress');
        var totalP = document.getElementById('batch-total-progress');
        var etaEl = document.getElementById('batch-eta');

        if (langArea) {
          var html = '';
          for (var code in data.results) {
            var r = data.results[code];
            var meta = LANG_MAP[code] || {};
            var pct = r.total > 0 ? Math.round(r.translated / r.total * 100) : 0;
            var color = pct >= 100 ? '#22c55e' : pct > 0 ? '#6366f1' : '#d1d5db';
            var icon = r.status === 'done' ? '✅' : r.status === 'running' ? '⏳' : r.status === 'error' ? '❌' : '⏸️';

            html += '<div class="flex items-center gap-3 mb-2">' +
              '<span class="text-sm">' + (meta.flag || '') + ' ' + esc(meta.name || code) + '</span>' +
              '<div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">' +
                '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;transition:width 0.5s"></div>' +
              '</div>' +
              '<span class="text-xs" style="color:' + color + '">' + pct + '%</span>' +
              '<span class="text-sm">' + icon + '</span>' +
              '</div>';
          }
          langArea.innerHTML = html;
        }

        if (totalP && data.progress) {
          totalP.textContent = '总进度: ' + data.progress.percent + '% (' + data.progress.done + '/' + data.progress.total + ')';
        }

        if (etaEl && data.progress && data.progress.percent > 0 && data.progress.percent < 100) {
          var elapsed = (Date.now() - new Date(data.started_at).getTime()) / 1000;
          var estimated = elapsed / (data.progress.percent / 100);
          var remaining = Math.round((estimated - elapsed) / 60);
          etaEl.textContent = '预计剩余: ~' + remaining + ' 分钟';
        }

        if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'failed') {
          clearInterval(state.batchPollTimer);
          state.batchPollTimer = null;
          state.batchJobId = null;
          if (totalP) {
            totalP.textContent = data.status === 'completed' ? '✅ 全部完成!' : data.status === 'cancelled' ? '⚠️ 已取消' : '❌ 翻译失败';
          }
          if (etaEl) etaEl.textContent = '';
          // Refresh overview
          _loadOverview();
          toast(data.status === 'completed' ? '批量翻译完成!' : '批量翻译已' + data.status);
        }
      });
    }, 5000);
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPORT REPORT
  // ═══════════════════════════════════════════════════════════════════

  function _exportReport() {
    if (!state.overviewData) return;
    var data = state.overviewData;
    var report = {
      generated_at: new Date().toISOString(),
      type: data.type,
      total_keys: data.total_keys,
      overall_percent: data.overall_percent,
      languages: data.languages.map(function(l) {
        return { code: l.code, name: l.name, translated: l.translated, total: l.total, percent: l.percent };
      })
    };
    _downloadJSON(report, 'i18n-report-' + data.type + '.json');
    toast('报告已导出');
  }

  function _downloadJSON(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PAGES SHELL (kept from original)
  // ═══════════════════════════════════════════════════════════════════

  function renderPagesShell(area) {
    area.innerHTML = '<div class="fade-in">' +
      _header('📄 页面内容管理', 'pages') +
      '<div id="i18n-type-bar" class="flex items-center gap-3 mb-5">' +
        '<span class="text-sm text-gray-500">类型:</span>' +
        _typeButtons() +
      '</div>' +
      '<div id="pages-content"><div class="text-center py-8 text-gray-400">加载中...</div></div>' +
      '</div>';
    _bindTypeButtons();
    loadPagesList();
  }

  // ═══════════════════════════════════════════════════════════════════
  // PAGE CONTENT MANAGEMENT (kept from original with minor cleanup)
  // ═══════════════════════════════════════════════════════════════════

  function loadPagesList() {
    var container = document.getElementById('pages-content');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    api('/pages').then(function(d) {
      if (!d || !d.pages) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }

      var html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
      d.pages.forEach(function(p) {
        html += '<div class="p-4 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-all" data-page="' + esc(p.page_id) + '">' +
          '<div class="flex items-center gap-3 mb-2">' +
          '<span class="text-2xl">' + p.icon + '</span>' +
          '<div class="flex-1 min-w-0">' +
          '<div class="font-medium text-gray-900">' + esc(p.label) + '</div>' +
          '<div class="text-xs text-gray-500 font-mono">' + esc(p.page_id) + '</div>' +
          '</div>' +
          '<span class="text-xs px-2 py-0.5 rounded-full ' + (p.section_count > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + p.section_count + ' sections</span>' +
          '</div></div>';
      });
      html += '</div>';
      container.innerHTML = html;

      container.querySelectorAll('[data-page]').forEach(function(card) {
        card.addEventListener('click', function() { loadPageEditor(card.getAttribute('data-page')); });
      });
    });
  }

  function loadPageEditor(pageId) {
    var container = document.getElementById('pages-content');
    if (!container) return;

    api('/pages/' + encodeURIComponent(pageId)).then(function(d) {
      if (!d) { container.innerHTML = '<div class="text-red-400">加载失败</div>'; return; }
      var sections = d.sections || [];

      var html = '<button id="pages-back-btn" class="btn-ghost mb-4">← 返回页面列表</button>' +
        '<h3 class="text-lg font-semibold mb-4">' + esc(pageId) + ' — 内容编辑</h3>';

      if (sections.length === 0) {
        html += '<div class="py-12 text-center text-gray-400"><div class="text-4xl mb-3">📭</div><div>暂无内容</div></div>';
      } else {
        html += '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">' +
          '<thead><tr style="border-bottom:2px solid #e5e7eb;text-align:left">' +
          '<th style="padding:0.5rem">Section Key</th>' +
          '<th style="padding:0.5rem">类型</th>' +
          '<th style="padding:0.5rem">内容预览</th>' +
          '<th style="padding:0.5rem;text-align:center">操作</th>' +
          '</tr></thead><tbody>';

        sections.forEach(function(s) {
          var preview = '';
          if (s.content) {
            var vals = Object.values(s.content);
            preview = vals.map(function(v) { return typeof v === 'string' ? v : JSON.stringify(v); }).join(', ').slice(0, 80);
          }
          html += '<tr style="border-bottom:1px solid #f3f4f6" data-section="' + esc(s.section_key) + '">' +
            '<td style="padding:0.5rem;font-family:monospace;font-size:0.75rem;color:#94a3b8">' + esc(s.section_key) + '</td>' +
            '<td style="padding:0.5rem"><span style="font-size:0.7rem;padding:0.125rem 0.375rem;border-radius:0.25rem;background:#f3f4f6;color:#94a3b8">' + esc(s.section_type) + '</span></td>' +
            '<td style="padding:0.5rem;color:#64748b;font-size:0.8rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(preview) + '">' + esc(preview) + '</td>' +
            '<td style="padding:0.5rem;text-align:center"><button class="btn-ghost edit-section-btn" style="font-size:0.75rem;padding:0.2rem 0.5rem">编辑</button></td>' +
            '</tr>';
        });
        html += '</tbody></table>';
      }
      container.innerHTML = html;

      document.getElementById('pages-back-btn').addEventListener('click', loadPagesList);
      container.querySelectorAll('.edit-section-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var row = btn.closest('tr');
          var sectionKey = row.getAttribute('data-section');
          var section = sections.find(function(s) { return s.section_key === sectionKey; });
          if (section) openSectionEditor(pageId, section);
        });
      });
    });
  }

  function openSectionEditor(pageId, section) {
    var content = section.content || {};
    var images = section.images || [];
    var isI18n = section.section_type === 'i18n_text';

    var bodyHtml = '<div style="display:flex;flex-direction:column;gap:0.85rem">' +
      '<div class="text-sm text-gray-400 mb-2">Section: <span class="font-mono text-gray-900">' + esc(section.section_key) + '</span>' +
      (isI18n ? ' <span class="text-xs text-amber-400 ml-2">💡 此字段可通过多语言管理编辑</span>' : '') + '</div>';

    var contentKeys = Object.keys(content);
    contentKeys.forEach(function(k) {
      var v = content[k];
      if (typeof v === 'string' && v.length > 100) {
        bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">' + esc(k) + '</label>' +
          '<textarea class="section-field" data-field="' + esc(k) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem;font-size:0.85rem;min-height:100px;resize:vertical">' + esc(v) + '</textarea></div>';
      } else {
        bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">' + esc(k) + '</label>' +
          '<input class="section-field" data-field="' + esc(k) + '" type="text" value="' + esc(String(v || '')) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem;font-size:0.85rem"></div>';
      }
    });

    if (images.length > 0 || section.section_type === 'image') {
      bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">图片</label>';
      images.forEach(function(img, idx) {
        bodyHtml += '<div class="flex items-center gap-2 mb-2">' +
          (img.image_url ? '<img src="' + esc(img.image_url) + '" style="width:48px;height:48px;object-fit:cover;border-radius:0.25rem">' : '<div style="width:48px;height:48px;background:#f3f4f6;border-radius:0.25rem"></div>') +
          '<input class="img-url" data-idx="' + idx + '" value="' + esc(img.image_url || '') + '" placeholder="图片 URL" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.8rem">' +
          '<button class="remove-img-btn" data-idx="' + idx + '" style="color:#f87171;font-size:0.8rem;padding:0.25rem 0.5rem;background:none;border:none;cursor:pointer">✕</button>' +
          '</div>';
      });
      bodyHtml += '<button id="add-img-btn" style="font-size:0.8rem;padding:0.25rem 0.5rem;background:#f3f4f6;color:#94a3b8;border:none;border-radius:0.25rem;cursor:pointer">+ 添加图片</button></div>';
    }

    bodyHtml += '</div>';

    showModal('section-editor-modal', '编辑 Section: ' + section.section_key, bodyHtml, function() {
      var newContent = {};
      document.querySelectorAll('.section-field').forEach(function(field) {
        newContent[field.getAttribute('data-field')] = field.value;
      });
      var newImages = [];
      document.querySelectorAll('.img-url').forEach(function(input) {
        newImages.push({ image_url: input.value, alt_text: '', sort_order: newImages.length });
      });
      api('/pages/' + encodeURIComponent(pageId) + '/sections/' + encodeURIComponent(section.section_key), {
        method: 'PUT', body: { section_type: section.section_type, content: newContent, sort_order: section.sort_order, is_active: section.is_active }
      }).then(function() {
        if (newImages.length > 0) {
          return api('/pages/' + encodeURIComponent(pageId) + '/sections/' + encodeURIComponent(section.section_key) + '/images', {
            method: 'PUT', body: { images: newImages }
          });
        }
      }).then(function() { toast('已保存'); loadPageEditor(pageId); });
      return false;
    }, function() {
      var addBtn = document.getElementById('add-img-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function() {
          var c = addBtn.parentElement;
          var idx = c.querySelectorAll('.img-url').length;
          var row = document.createElement('div');
          row.className = 'flex items-center gap-2 mb-2';
          row.innerHTML = '<div style="width:48px;height:48px;background:#f3f4f6;border-radius:0.25rem"></div>' +
            '<input class="img-url" placeholder="图片 URL" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.8rem">' +
            '<button class="remove-img-btn" style="color:#f87171;font-size:0.8rem;padding:0.25rem 0.5rem;background:none;border:none;cursor:pointer">✕</button>';
          addBtn.before(row);
          row.querySelector('.remove-img-btn').addEventListener('click', function() { row.remove(); });
        });
      }
      document.querySelectorAll('.remove-img-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { btn.closest('.flex').remove(); });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════

  function _header(title, activeTab) {
    return '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
      '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
        '<button id="i18n-tab-overview" class="i18n-main-tab' + (!activeTab ? ' active' : '') + '" style="padding:0.375rem 0.875rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">🌐 翻译总览</button>' +
        '<button id="i18n-tab-pages" class="i18n-main-tab' + (activeTab === 'pages' ? ' active' : '') + '" style="padding:0.375rem 0.875rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">📄 页面内容</button>' +
      '</div>' +
      '<div class="flex gap-3">' +
        '<button id="btn-i18n-export" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">📥 导出 JSON</button>' +
        '<button id="btn-i18n-import" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">📤 导入 JSON</button>' +
        '<input type="file" id="i18n-import-file" accept=".json" style="display:none">' +
      '</div>' +
    '</div>';
  }

  function _typeButtons() {
    return '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
      '<button class="i18n-type-btn' + (state.type === 'ui' ? ' active' : '') + '" data-type="ui" style="padding:0.25rem 0.625rem;border:none;border-radius:0.375rem;font-size:0.8rem;cursor:pointer;transition:all 0.15s">UI 文案</button>' +
      '<button class="i18n-type-btn' + (state.type === 'product' ? ' active' : '') + '" data-type="product" style="padding:0.25rem 0.625rem;border:none;border-radius:0.375rem;font-size:0.8rem;cursor:pointer;transition:all 0.15s">产品翻译</button>' +
    '</div>';
  }

  function _bindTypeButtons() {
    document.querySelectorAll('.i18n-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.type = btn.getAttribute('data-type');
        _updateTypeBtnStyles();
        if (state.view === 'overview') _loadOverview();
        else if (state.view === 'editor') _loadEditorData();
      });
    });
    _updateTypeBtnStyles();
  }

  function _updateTypeBtnStyles() {
    document.querySelectorAll('.i18n-type-btn').forEach(function(btn) {
      var t = btn.getAttribute('data-type');
      if (t === state.type) {
        btn.style.background = '#fff'; btn.style.color = '#111827'; btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        btn.style.background = 'transparent'; btn.style.color = '#6b7280'; btn.style.boxShadow = 'none';
      }
    });
  }

  function _filterBtn(filter, label) {
    return '<button class="editor-filter-btn" data-filter="' + filter + '" style="padding:0.25rem 0.625rem;border:none;border-radius:0.375rem;font-size:0.8rem;cursor:pointer;transition:all 0.15s">' + label + '</button>';
  }

  // ─── Tab switching ─────────────────────────────────────────────────
  // Bind main tabs (overview vs pages) via event delegation on document
  document.addEventListener('click', function(e) {
    if (e.target.id === 'i18n-tab-overview' || e.target.id === 'i18n-tab-pages') {
      var target = e.target.id;
      var area = document.querySelector('.fade-in');
      if (!area) return;

      if (target === 'i18n-tab-pages') {
        state.view = 'pages';
        _render(area);
      } else {
        state.view = 'overview';
        _render(area);
      }
    }

    // Import/export buttons
    if (e.target.id === 'btn-i18n-export') {
      var exportLang = state.lang || 'zh-CN';
      var url = '/api/cms/i18n/export?lang=' + exportLang + '&type=' + state.type;
      fetch(url, { headers: { 'Authorization': 'Bearer ' + CMS.token } })
        .then(function(r) { return r.text(); })
        .then(function(text) {
          var blob = new Blob([text], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = exportLang + '-' + state.type + '.json';
          a.click();
          URL.revokeObjectURL(a.href);
          toast('导出成功');
        }).catch(function(err) { toast('导出失败: ' + err.message, true); });
    }

    if (e.target.id === 'btn-i18n-import') {
      document.getElementById('i18n-import-file').click();
    }

    if (e.target.id === 'i18n-import-file') {
      // handled by change event
    }
  });

  // Import file handler
  document.addEventListener('change', function(e) {
    if (e.target.id !== 'i18n-import-file') return;
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || Array.isArray(data)) { toast('无效的 JSON 格式', true); return; }
        var importLang = state.lang || 'zh-CN';
        api('/i18n/import', {
          method: 'POST',
          body: { lang: importLang, type: state.type, data: data, mode: 'merge' }
        }).then(function(result) {
          if (result) {
            toast(result.message || '导入成功');
            if (state.view === 'overview') _loadOverview();
            else if (state.view === 'editor') _loadEditorData();
          }
        });
      } catch (err) { toast('JSON 解析失败: ' + err.message, true); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Legacy compatibility
  window.loadI18nUI = function(lang, type, search) {
    state.lang = lang || state.lang;
    state.type = type || state.type;
    if (search !== undefined) state.search = search;
    state.view = 'editor';
    state.page = 1;
    var area = document.querySelector('.fade-in');
    if (area) _render(area);
  };
})();
