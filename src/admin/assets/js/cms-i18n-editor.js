// cms-i18n-editor.js — inline editor view (table, search, filter, batch operations, shortcuts)
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;
  var state = CMS._i18nState;
  var _filterBtn = function(f, l) { return CMS._i18nUtils.filterBtn(f, l); };
  var _updateFilterBtnStyles = function(f) { CMS._i18nUtils.updateFilterBtnStyles(f); };
  var _c = function() { return CMS._i18nConstants || {}; };

  CMS._i18nEditor = {};

  // ─── Render ───────────────────────────────────────────────────────

  CMS._i18nEditor.render = function(area) {
    var LM = _c().LANG_MAP || {};
    var PS = _c().PAGE_SIZE || 200;
    var meta = LM[state.lang] || {};
    var area2 = document.getElementById('main-content') || area;
    if (area2 !== area && area2) area = area2;

    area.innerHTML = '<div class="fade-in">' +
      // Back button + header
      '<div class="flex items-center gap-4 mb-5">' +
        '<button id="btn-back-overview" class="btn-ghost" style="padding:0.4rem 0.875rem;font-size:0.85rem">← 返回总览</button>' +
        '<div class="flex items-center gap-2 flex-1">' +
          '<span class="text-2xl">' + (meta.flag || '') + '</span>' +
          '<h2 class="text-lg font-semibold">' + esc(meta.name || state.lang) + '</h2>' +
          '<span class="text-sm text-gray-400 font-mono">(' + esc(state.lang) + ')</span>' +
          '<span id="editor-stats" class="text-sm text-gray-500 ml-auto">加载中...</span>' +
        '</div>' +
      '</div>' +
      // Toolbar
      '<div class="flex items-center gap-3 mb-5 flex-wrap">' +
        '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
          _filterBtn('all', '全部') +
          _filterBtn('untranslated', '未翻译') +
          _filterBtn('translated', '已翻译') +
          _filterBtn('ai_review', 'AI待审核') +
        '</div>' +
        '<input id="editor-search" placeholder="搜索 key 或原文..." value="' + esc(state.search) + '" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.4rem 0.75rem;border-radius:0.5rem;font-size:0.85rem;width:240px">' +
        '<select id="editor-sort" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.4rem 0.6rem;border-radius:0.5rem;font-size:0.85rem">' +
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
      CMS._i18nMain.render(area);
    });

    // Filter buttons
    document.querySelectorAll('.editor-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.filter = btn.getAttribute('data-filter');
        state.page = 1;
        _updateFilterBtnStyles(state.filter);
        CMS._i18nEditor.loadData();
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
        CMS._i18nEditor.loadData();
      }, 300);
    });
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { clearTimeout(searchTimer); state.search = searchInput.value.trim(); state.page = 1; CMS._i18nEditor.loadData(); }
    });

    // Sort
    document.getElementById('editor-sort').addEventListener('change', function() {
      state.sortBy = this.value;
      state.page = 1;
      CMS._i18nEditor.loadData();
    });

    // Selection actions
    document.getElementById('btn-batch-translate-selected').addEventListener('click', CMS._i18nEditor.translateSelected);
    document.getElementById('btn-mark-reviewed').addEventListener('click', function() { toast('已标记 ' + Object.keys(state.selected).length + ' 条为已审核'); });
    document.getElementById('btn-export-selected').addEventListener('click', CMS._i18nEditor.exportSelected);
    document.getElementById('btn-clear-selection').addEventListener('click', function() { state.selected = {}; CMS._i18nEditor.updateSelectionBar(); });

    // Save/discard
    document.getElementById('btn-save-edits').addEventListener('click', CMS._i18nEditor.saveEdits);
    document.getElementById('btn-discard-edits').addEventListener('click', function() { state.edits = {}; CMS._i18nEditor.updateUnsavedBar(); CMS._i18nEditor.loadData(); });

    _updateFilterBtnStyles(state.filter);
    CMS._i18nEditor.loadData();

    // Keyboard shortcuts
    CMS._i18nEditor.bindShortcuts();
  };

  // ─── Data loading ─────────────────────────────────────────────────

  CMS._i18nEditor.loadData = function() {
    var container = document.getElementById('editor-table-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    var params = '?lang=' + state.lang + '&type=' + state.type +
      '&page=' + state.page + '&limit=' + PS +
      (state.search ? '&search=' + encodeURIComponent(state.search) : '');

    api('/i18n/keys' + params).then(function(data) {
      if (!data) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }

      // Fetch source (zh-CN) for comparison
      var srcParams = '?lang=zh-CN&type=' + state.type + '&limit=1';
      api('/i18n/keys' + srcParams).then(function(srcInfo) {
        var srcTotal = (srcInfo && srcInfo.total) || 0;

        // Fetch full source data for display
        api('/i18n/export?lang=zh-CN&type=' + state.type).then(function(srcData) {
          state.editorData = {
            keys: data.keys,
            total: data.total,
            srcMap: srcData || {}
          };

          CMS._i18nEditor.updateStats(data.total, srcTotal);
          CMS._i18nEditor.renderTable();
          CMS._i18nEditor.renderPagination(data.total);
          CMS._i18nEditor.updateSelectionBar();
          CMS._i18nEditor.updateUnsavedBar();
        });
      });
    });
  };

  // ─── Filtered keys ────────────────────────────────────────────────

  CMS._i18nEditor.getFilteredKeys = function() {
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
  };

  // ─── Render table ─────────────────────────────────────────────────

  CMS._i18nEditor.renderTable = function() {
    var container = document.getElementById('editor-table-container');
    if (!container || !state.editorData) return;

    var keys = CMS._i18nEditor.getFilteredKeys();
    var srcMap = state.editorData.srcMap;
    var meta = LM[state.lang] || {};

    if (keys.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="text-4xl mb-3">📭</div><div>没有找到匹配的条目</div></div>';
      return;
    }

    var html = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">' +
      '<thead style="position:sticky;top:0;z-index:1"><tr style="border-bottom:2px solid #e5e7eb;background:#f9fafb">' +
      '<th style="padding:0.625rem 0.5rem;text-align:center;width:40px"><input type="checkbox" id="select-all-cb" style="cursor:pointer"></th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:18%">Key</th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:27%">🇨🇳 中文原文</th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:38%">翻译 <span class="text-xs text-gray-400">(点击编辑)</span></th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:center;width:60px">状态</th>' +
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
        '<td style="padding:0.625rem 0.5rem;text-align:center"><input type="checkbox" class="row-cb" data-key="' + esc(key) + '"' + (state.selected[key] ? ' checked' : '') + ' style="cursor:pointer"></td>' +
        '<td style="padding:0.625rem 0.5rem;font-family:monospace;font-size:0.72rem;color:#6b7280;word-break:break-all;line-height:1.5;max-width:220px" title="' + esc(key) + '">' + esc(key) + '</td>' +
        '<td style="padding:0.625rem 0.5rem;color:#374151;font-size:0.82rem;line-height:1.5;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(srcVal) + '">' + esc(srcVal) + '</td>' +
        '<td style="padding:0.375rem 0.5rem">' +
          '<div class="cell-edit-wrapper" style="position:relative">' +
            '<input class="cell-edit-input" data-key="' + esc(key) + '" value="' + esc(curVal) + '" placeholder="点击输入翻译..." ' +
            'style="width:100%;border:1px solid #d1d5db;background:#fff;color:' + (hasValue ? '#111827' : '#9ca3af') + ';padding:0.4rem 0.625rem;border-radius:0.375rem;font-size:0.82rem;line-height:1.5;transition:border-color 0.15s">' +
            '<button class="cell-ai-btn" data-key="' + esc(key) + '" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0;transition:opacity 0.15s" title="AI 翻译此行">🤖</button>' +
          '</div>' +
        '</td>' +
        '<td style="padding:0.625rem 0.5rem;text-align:center">' +
          (isEdited ? '<span style="color:#f59e0b" title="已修改未保存">✏️</span>' :
           hasAiSuggestion ? '<span style="color:#7c3aed" title="AI待审核">💡</span>' :
           !hasValue ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">待翻译</span>' :
           '<span class="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">✅</span>') +
        '</td>' +
        '</tr>';

      // Expanded row (AI suggestion / review)
      if (isExpanded) {
        html += '<tr class="expanded-detail" data-expanded-key="' + esc(key) + '" style="border-bottom:1px solid #e5e7eb;background:#fafbff">' +
          '<td colspan="5" style="padding:1rem 1.25rem">' +
            '<div style="max-width:900px">' +
              '<div class="text-xs text-gray-400 mb-3 font-mono" style="font-size:0.72rem">' + esc(key) + '</div>' +
              '<div class="grid gap-4" style="grid-template-columns:1fr 1fr">' +
                '<div>' +
                  '<div class="text-xs text-gray-500 mb-1.5" style="font-weight:500">🇨🇳 中文原文</div>' +
                  '<div class="text-sm text-gray-800 p-3 rounded-lg bg-gray-50" style="line-height:1.6">' + esc(srcVal) + '</div>' +
                '</div>' +
                '<div>' +
                  '<div class="text-xs text-gray-500 mb-1.5" style="font-weight:500">' + meta.flag + ' ' + esc(meta.name) + ' 翻译</div>' +
                  '<textarea class="expanded-edit" data-key="' + esc(key) + '" style="width:100%;min-height:48px;border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.625rem 0.75rem;border-radius:0.375rem;font-size:0.85rem;resize:vertical;line-height:1.6">' + esc(curVal) + '</textarea>' +
                '</div>' +
              '</div>' +
              (hasAiSuggestion ? '<div class="mt-4 p-3 rounded-lg border border-purple-100 bg-purple-50">' +
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

    CMS._i18nEditor.bindTableEvents(container, meta);
  };

  // ─── Table event binding ──────────────────────────────────────────

  CMS._i18nEditor.bindTableEvents = function(container, meta) {
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
        CMS._i18nEditor.updateSelectionBar();
      });
    }

    // Row checkboxes
    container.querySelectorAll('.row-cb').forEach(function(cb) {
      cb.addEventListener('change', function(e) {
        e.stopPropagation();
        var k = cb.getAttribute('data-key');
        if (cb.checked) state.selected[k] = true;
        else delete state.selected[k];
        CMS._i18nEditor.updateSelectionBar();
        CMS._i18nEditor.updateSelectAllState();
      });
    });

    // Row click → expand/collapse
    container.querySelectorAll('.editor-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.cell-edit-wrapper')) return;
        var key = row.getAttribute('data-key');
        state.expandedRow = (state.expandedRow === key) ? null : key;
        CMS._i18nEditor.renderTable();
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
        CMS._i18nEditor.updateUnsavedBar();
        CMS._i18nEditor.updateSelectionBar();
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
        CMS._i18nEditor.translateSingleKey(btn.getAttribute('data-key'));
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
        CMS._i18nEditor.updateUnsavedBar();
        CMS._i18nEditor.renderTable();
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
          CMS._i18nEditor.updateUnsavedBar();
          CMS._i18nEditor.renderTable();
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
        CMS._i18nEditor.renderTable();
      });
    });
    container.querySelectorAll('.expanded-ai-translate').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        CMS._i18nEditor.translateSingleKey(btn.getAttribute('data-key'));
      });
    });
    container.querySelectorAll('.expanded-edit').forEach(function(textarea) {
      textarea.addEventListener('click', function(e) { e.stopPropagation(); });
    });
  };

  // ─── UI helpers ───────────────────────────────────────────────────

  CMS._i18nEditor.updateStats = function(total, srcTotal) {
    var el = document.getElementById('editor-stats');
    if (!el) return;
    var translated = state.editorData.keys.filter(function(k) { return k.value && k.value.trim(); }).length;
    var pct = total > 0 ? Math.round(translated / total * 1000) / 10 : 0;
    var color = pct >= 80 ? '#22c55e' : pct >= 30 ? '#eab308' : '#ef4444';
    el.innerHTML = '<span style="color:' + color + ';font-weight:600">' + translated + '/' + total + '</span>' +
      ' <span class="text-gray-400">' + pct + '%</span>';
  };

  CMS._i18nEditor.renderPagination = function(total) {
    var el = document.getElementById('editor-pagination');
    if (!el) return;
    var totalPages = Math.ceil(total / PS);
    var page = state.page;
    if (totalPages <= 1) { el.innerHTML = '<span>共 ' + total + ' 条</span><span></span>'; return; }

    var start = (page - 1) * PS + 1;
    var end = Math.min(page * PS, total);

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
        CMS._i18nEditor.loadData();
      });
    });
  };

  CMS._i18nEditor.updateSelectionBar = function() {
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
    CMS._i18nEditor.updateSelectAllState();
  };

  CMS._i18nEditor.updateSelectAllState = function() {
    var selectAllCb = document.getElementById('select-all-cb');
    var rowCbs = document.querySelectorAll('.row-cb');
    if (!selectAllCb || rowCbs.length === 0) return;
    var checkedCount = 0;
    rowCbs.forEach(function(cb) { if (cb.checked) checkedCount++; });
    selectAllCb.checked = checkedCount === rowCbs.length;
    selectAllCb.indeterminate = checkedCount > 0 && checkedCount < rowCbs.length;
  };

  CMS._i18nEditor.updateUnsavedBar = function() {
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
  };

  // ─── Actions ──────────────────────────────────────────────────────

  CMS._i18nEditor.saveEdits = function() {
    var count = Object.keys(state.edits).length;
    if (count === 0) return;

    var updates = Object.keys(state.edits).map(function(k) {
      return { key: k, value: state.edits[k] };
    });

    api('/i18n/batch', { method: 'PUT', body: { lang: state.lang, type: state.type, updates: updates } }).then(function(result) {
      if (result && result.count > 0) {
        state.edits = {};
        CMS._i18nEditor.updateUnsavedBar();
        toast('已保存 ' + result.count + ' 条翻译');
        CMS._i18nEditor.loadData();
      }
    });
  };

  CMS._i18nEditor.translateSingleKey = function(key) {
    var srcMap = state.editorData ? state.editorData.srcMap : {};
    var srcVal = srcMap[key] || key;

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
          CMS._i18nEditor.updateUnsavedBar();
          CMS._i18nEditor.renderTable();
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
  };

  CMS._i18nEditor.translateSelected = function() {
    var selectedKeys = Object.keys(state.selected);
    if (selectedKeys.length === 0) return;
    CMS._i18nEditor.batchTranslateKeys(selectedKeys);
  };

  CMS._i18nEditor.batchTranslateKeys = function(keys) {
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
            CMS._i18nEditor.updateUnsavedBar();
            CMS._i18nEditor.renderTable();
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
            setTimeout(translateNextBatch, 8000);
          });
        }

        translateNextBatch();
      });
  };

  CMS._i18nEditor.exportSelected = function() {
    var keys = Object.keys(state.selected);
    if (keys.length === 0) return;
    var data = {};
    keys.forEach(function(k) {
      data[k] = state.edits[k] || (state.editorData.keys.find(function(e) { return e.key === k; }) || {}).value || '';
    });
    CMS._i18nUtils.downloadJSON(data, state.lang + '-selected.json');
    toast('已导出 ' + keys.length + ' 条');
  };

  // ─── Keyboard shortcuts ───────────────────────────────────────────

  CMS._i18nEditor.bindShortcuts = function() {
    function handler(e) {
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
            state.page = Math.floor(i / PS) + 1;
            CMS._i18nEditor.loadData();
            setTimeout(function() {
              var input = document.querySelector('.cell-edit-input[data-key="' + keys[i].key + '"]');
              if (input) input.focus();
            }, 200);
            return;
          }
          if (curKey && keys[i].key === curKey) found = true;
          if (!curKey && (!keys[i].value || !keys[i].value.trim())) {
            state.page = Math.floor(i / PS) + 1;
            CMS._i18nEditor.loadData();
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
          CMS._i18nEditor.translateSingleKey(state.editingCell.key);
        }
      }

      // Esc — close expanded row / cancel editing
      if (e.key === 'Escape') {
        if (state.expandedRow) {
          state.expandedRow = null;
          CMS._i18nEditor.renderTable();
        } else if (state.editingCell) {
          state.editingCell.inputEl.blur();
        }
      }
    }

    document.addEventListener('keydown', handler);
    if (window._i18nKeyHandler) document.removeEventListener('keydown', window._i18nKeyHandler);
    window._i18nKeyHandler = handler;
  };
})();
