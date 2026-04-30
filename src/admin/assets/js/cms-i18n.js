// cms-i18n.js — I18n translation management + Page content management
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;

  var i18nState = {
    lang: 'zh-CN',
    type: 'ui',
    search: '',
    page: 1,
    pageSize: 50,
    total: 0,
    edits: {},      // key -> new value (unsaved changes)
    editCount: 0
  };

  var pagesState = { currentView: 'list', currentPageId: null };

  CMS.renderI18nPage = function(area) {
    area.innerHTML = '<div class="fade-in">' +
      // Header with tabs
      '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
        '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
          '<button id="i18n-tab-trans" class="i18n-tab active" style="padding:0.375rem 0.875rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">🌐 翻译管理</button>' +
          '<button id="i18n-tab-pages" class="i18n-tab" style="padding:0.375rem 0.875rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">📄 页面内容</button>' +
        '</div>' +
      '</div>' +
      // Translation panel
      '<div id="i18n-trans-panel">' +
        '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
          '<h2 class="text-lg font-semibold">翻译管理</h2>' +
          '<div class="flex gap-3 flex-wrap">' +
            '<select id="i18n-lang" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.6rem;border-radius:0.5rem;font-size:0.85rem">' +
              '<option value="zh-CN"' + (i18nState.lang === 'zh-CN' ? ' selected' : '') + '>中文</option>' +
              '<option value="en"' + (i18nState.lang === 'en' ? ' selected' : '') + '>English</option>' +
            '</select>' +
            '<select id="i18n-type" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.6rem;border-radius:0.5rem;font-size:0.85rem">' +
              '<option value="ui"' + (i18nState.type === 'ui' ? ' selected' : '') + '>UI 文案</option>' +
              '<option value="product"' + (i18nState.type === 'product' ? ' selected' : '') + '>产品翻译</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        // Stats bar
        '<div id="i18n-stats" class="flex items-center gap-4 mb-4 text-sm text-gray-500"></div>' +
        // Search
        '<div class="flex gap-3 mb-4">' +
          '<input id="i18n-search" placeholder="搜索翻译键或值..." value="' + esc(i18nState.search) + '" style="flex:1;border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.5rem 0.75rem;border-radius:0.5rem;font-size:0.85rem">' +
          '<button id="i18n-search-btn" class="btn-primary" style="font-size:0.85rem">搜索</button>' +
        '</div>' +
        // Unsaved changes bar
        '<div id="i18n-unsaved-bar" class="hidden mb-4 flex items-center justify-between px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">' +
          '<span class="text-sm text-amber-700" id="i18n-unsaved-text">0 条未保存修改</span>' +
          '<div class="flex gap-3">' +
            '<button id="i18n-discard-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.35rem 0.875rem">放弃</button>' +
            '<button id="i18n-unsaved-save-btn" class="btn-primary" style="font-size:0.85rem;padding:0.35rem 0.875rem;background:#f59e0b">保存修改</button>' +
          '</div>' +
        '</div>' +
        // Table container
        '<div id="i18n-container" style="overflow-x:auto"><div class="text-center py-8 text-gray-400">加载中...</div></div>' +
        // Pagination
        '<div id="i18n-pagination" class="flex items-center justify-between mt-4 text-sm text-gray-500"></div>' +
        // Import/Export bar
        '<div class="flex items-center justify-end gap-3 mt-4">' +
          '<button id="i18n-export-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">📥 导出 JSON</button>' +
          '<button id="i18n-import-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">📤 导入 JSON</button>' +
          '<input type="file" id="i18n-import-file" accept=".json" style="display:none">' +
        '</div>' +
      '</div>' +
      // Pages panel (hidden by default)
      '<div id="i18n-pages-panel" style="display:none">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h2 class="text-lg font-semibold">页面内容管理</h2>' +
          '<button id="pages-sync-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">🔄 从 HTML 自动检测</button>' +
        '</div>' +
        '<div id="pages-list"></div>' +
        '<div id="pages-editor" style="display:none"></div>' +
      '</div>' +
      '</div>';

    // Tab switching
    var tabTrans = document.getElementById('i18n-tab-trans');
    var tabPages = document.getElementById('i18n-tab-pages');
    var panelTrans = document.getElementById('i18n-trans-panel');
    var panelPages = document.getElementById('i18n-pages-panel');
    function activateTab(active, inactive, showPanel, hidePanel) {
      active.style.background = '#fff'; active.style.color = '#111827'; active.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      inactive.style.background = 'transparent'; inactive.style.color = '#6b7280'; inactive.style.boxShadow = 'none';
      showPanel.style.display = ''; hidePanel.style.display = 'none';
    }
    activateTab(tabTrans, tabPages, panelTrans, panelPages);
    tabTrans.addEventListener('click', function() { activateTab(tabTrans, tabPages, panelTrans, panelPages); });
    tabPages.addEventListener('click', function() { activateTab(tabPages, tabTrans, panelPages, panelTrans); loadPagesList(); });
    document.getElementById('pages-sync-btn').addEventListener('click', syncAllPages);

    // Bind events
    document.getElementById('i18n-lang').addEventListener('change', function() {
      i18nState.lang = this.value;
      i18nState.page = 1;
      i18nState.search = '';
      document.getElementById('i18n-search').value = '';
      loadI18nKeys();
    });
    document.getElementById('i18n-type').addEventListener('change', function() {
      i18nState.type = this.value;
      i18nState.page = 1;
      loadI18nKeys();
    });
    document.getElementById('i18n-search-btn').addEventListener('click', function() {
      i18nState.search = document.getElementById('i18n-search').value.trim();
      i18nState.page = 1;
      loadI18nKeys();
    });
    document.getElementById('i18n-search').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        i18nState.search = this.value.trim();
        i18nState.page = 1;
        loadI18nKeys();
      }
    });
    document.getElementById('i18n-discard-btn').addEventListener('click', function() {
      i18nState.edits = {};
      i18nState.editCount = 0;
      updateUnsavedBar();
      loadI18nKeys();
    });
    document.getElementById('i18n-unsaved-save-btn').addEventListener('click', saveI18nEdits);
    document.getElementById('i18n-export-btn').addEventListener('click', exportI18n);
    document.getElementById('i18n-import-btn').addEventListener('click', function() {
      document.getElementById('i18n-import-file').click();
    });
    document.getElementById('i18n-import-file').addEventListener('change', importI18nFile);

    loadI18nKeys();
  }

  // ─── PAGE CONTENT MANAGEMENT ──────────────────────────────────────
  CMS.renderPagesPage = function(area) {
    CMS.currentPage = 'i18n';
    document.getElementById('breadcrumb').textContent = '多语言与页面';
    var nav = document.getElementById('nav-menu');
    nav.querySelectorAll('.sidebar-link').forEach(function(b) { b.classList.remove('active'); });
    nav.querySelector('[data-key="i18n"]') || nav.querySelectorAll('.sidebar-link').forEach(function(b) { if (b.textContent.includes('多语言')) b.classList.add('active'); });
    CMS.renderI18nPage(area);
    // Auto-switch to pages tab after render
    setTimeout(function() {
      var tabPages = document.getElementById('i18n-tab-pages');
      if (tabPages) tabPages.click();
    }, 50);
  };

  function loadPagesList() {
    var container = document.getElementById('pages-list');
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
        card.addEventListener('click', function() {
          loadPageEditor(card.getAttribute('data-page'));
        });
      });
    });
  }

  function loadPageEditor(pageId) {
    document.getElementById('pages-list').style.display = 'none';
    var editor = document.getElementById('pages-editor');
    editor.style.display = '';

    api('/pages/' + encodeURIComponent(pageId)).then(function(d) {
      if (!d) { editor.innerHTML = '<div class="text-red-400">加载失败</div>'; return; }
      var sections = d.sections || [];

      var html = '<button id="pages-back-btn" class="btn-ghost mb-4">← 返回页面列表</button>' +
        '<h3 class="text-lg font-semibold mb-4">' + esc(pageId) + ' — 内容编辑</h3>';

      if (sections.length === 0) {
        html += '<div class="py-12 text-center text-gray-400"><div class="text-4xl mb-3">📭</div><div>暂无内容，点击"从 HTML 自动检测"按钮导入</div></div>';
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
          var i18nHint = '';
          if (s.section_key) {
            i18nHint = '<div style="margin-top:2px;font-size:0.7rem;color:#94a3b8" title="翻译 key: ' + esc(s.section_key) + '">' + esc(s.section_key) + '</div>';
          }
          html += '<tr style="border-bottom:1px solid #f3f4f6" data-section="' + esc(s.section_key) + '">' +
            '<td style="padding:0.5rem;font-family:monospace;font-size:0.75rem;color:#94a3b8">' + esc(s.section_key) + i18nHint + '</td>' +
            '<td style="padding:0.5rem"><span style="font-size:0.7rem;padding:0.125rem 0.375rem;border-radius:0.25rem;background:#f3f4f6;color:#94a3b8">' + esc(s.section_type) + '</span></td>' +
            '<td style="padding:0.5rem;color:#64748b;font-size:0.8rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(preview) + '">' + esc(preview) + '</td>' +
            '<td style="padding:0.5rem;text-align:center"><button class="btn-ghost edit-section-btn" style="font-size:0.75rem;padding:0.2rem 0.5rem">编辑</button></td>' +
            '</tr>';
        });

        html += '</tbody></table>';
      }
      editor.innerHTML = html;

      document.getElementById('pages-back-btn').addEventListener('click', function() {
        editor.style.display = 'none';
        document.getElementById('pages-list').style.display = '';
        pagesState.currentPageId = null;
      });

      editor.querySelectorAll('.edit-section-btn').forEach(function(btn) {
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

    // Content fields
    var contentKeys = Object.keys(content);
    if (contentKeys.length > 0) {
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
    }

    // Image management
    if (images.length > 0 || section.section_type === 'image') {
      bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">图片</label>';
      images.forEach(function(img, idx) {
        bodyHtml += '<div class="flex items-center gap-2 mb-2">' +
          (img.image_url ? '<img src="' + esc(img.image_url) + '" style="width:48px;height:48px;object-fit:cover;border-radius:0.25rem">' : '<div style="width:48px;height:48px;background:#f3f4f6;border-radius:0.25rem"></div>') +
          '<input class="img-url" data-idx="' + idx + '" value="' + esc(img.image_url || '') + '" placeholder="图片 URL" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.8rem">' +
          '<button class="remove-img-btn" data-idx="' + idx + '" style="color:#f87171;font-size:0.8rem;padding:0.25rem 0.5rem;background:none;border:none;cursor:pointer">✕</button>' +
          '</div>';
      });
      bodyHtml += '<button id="add-img-btn" style="font-size:0.8rem;padding:0.25rem 0.5rem;background:#f3f4f6;color:#94a3b8;border:none;border-radius:0.25rem;cursor:pointer">+ 添加图片</button>';
      bodyHtml += '</div>';
    }

    bodyHtml += '</div>';

    showModal('section-editor-modal', '编辑 Section: ' + section.section_key, bodyHtml, function() {
      // Collect content
      var newContent = {};
      document.querySelectorAll('.section-field').forEach(function(field) {
        newContent[field.getAttribute('data-field')] = field.value;
      });

      // Collect images
      var newImages = [];
      document.querySelectorAll('.img-url').forEach(function(input) {
        newImages.push({ image_url: input.value, alt_text: '', sort_order: newImages.length });
      });

      // Save
      api('/pages/' + encodeURIComponent(pageId) + '/sections/' + encodeURIComponent(section.section_key), {
        method: 'PUT',
        body: { section_type: section.section_type, content: newContent, sort_order: section.sort_order, is_active: section.is_active }
      }).then(function() {
        if (newImages.length > 0) {
          return api('/pages/' + encodeURIComponent(pageId) + '/sections/' + encodeURIComponent(section.section_key) + '/images', {
            method: 'PUT',
            body: { images: newImages }
          });
        }
      }).then(function() {
        toast('已保存');
        loadPageEditor(pageId);
      });
      return false;
    }, function() {
      // Add image button handler
      var addBtn = document.getElementById('add-img-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function() {
          var container = addBtn.parentElement;
          var idx = container.querySelectorAll('.img-url').length;
          var row = document.createElement('div');
          row.className = 'flex items-center gap-2 mb-2';
          row.innerHTML = '<div style="width:48px;height:48px;background:#f3f4f6;border-radius:0.25rem"></div>' +
            '<input class="img-url" data-idx="' + idx + '" placeholder="图片 URL" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.8rem">' +
            '<button class="remove-img-btn" data-idx="' + idx + '" style="color:#f87171;font-size:0.8rem;padding:0.25rem 0.5rem;background:none;border:none;cursor:pointer">✕</button>';
          addBtn.before(row);
          row.querySelector('.remove-img-btn').addEventListener('click', function() { row.remove(); });
        });
      }
      // Remove image handlers
      document.querySelectorAll('.remove-img-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { btn.closest('.flex').remove(); });
      });
    });
  }

  function syncAllPages() {
    var btn = document.getElementById('pages-sync-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '检测中...';

    var pageIds = [
      'home', 'about',
      'solutions/deploy-fast-food', 'solutions/deploy-cloud-kitchen', 'solutions/deploy-canteen', 'solutions/deploy-southeast-asian',
      'applications/cases'
    ];

    var promises = pageIds.map(function(pid) {
      return api('/pages/' + encodeURIComponent(pid) + '/sync', { method: 'POST' });
    });

    Promise.all(promises).then(function(results) {
      var totalSections = 0;
      results.forEach(function(r, i) {
        if (r && r.detected_sections) {
          totalSections += r.detected_sections;
          // Save detected sections
          var sections = r.sections || [];
          sections.forEach(function(s) {
            api('/pages/' + encodeURIComponent(pageIds[i]) + '/sections/' + encodeURIComponent(s.section_key), {
              method: 'PUT',
              body: { section_type: s.section_type, content: s.content, sort_order: totalSections }
            });
          });
        }
      });

      btn.disabled = false;
      btn.textContent = '🔄 从 HTML 自动检测';
      toast('检测完成: ' + totalSections + ' 个 sections');
      loadPagesList();
    });
  }

  // ─── I18N Functions ──────────────────────────────────────────────
  function loadI18nKeys() {
    var container = document.getElementById('i18n-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    var params = '?lang=' + i18nState.lang + '&type=' + i18nState.type +
      '&page=' + i18nState.page + '&limit=' + i18nState.pageSize +
      (i18nState.search ? '&search=' + encodeURIComponent(i18nState.search) : '');

    // Fetch primary + comparison language
    var lang2 = i18nState.lang === 'zh-CN' ? 'en' : 'zh-CN';
    api('/i18n/keys' + params).then(function(data1) {
      if (!data1) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }
      i18nState.total = data1.total || 0;

      // Fetch comparison
      var compParams = '?lang=' + lang2 + '&type=' + i18nState.type + '&limit=' + i18nState.pageSize +
        '&page=' + i18nState.page +
        (i18nState.search ? '&search=' + encodeURIComponent(i18nState.search) : '');
      api('/i18n/keys' + compParams).then(function(data2) {
        var map2 = {};
        if (data2 && data2.keys) data2.keys.forEach(function(k) { map2[k.key] = k.value; });

        // Also fetch total for comparison for stats
        api('/i18n/keys?lang=' + lang2 + '&type=' + i18nState.type + '&limit=1').then(function(compInfo) {
          var compTotal = (compInfo && compInfo.total) || 0;
          var missingCount = data1.keys.filter(function(e) { return !map2[e.key]; }).length;

          // Update stats
          var statsEl = document.getElementById('i18n-stats');
          if (statsEl) {
            statsEl.innerHTML =
              '<span>当前语言: <strong class="text-gray-900">' + i18nState.lang + '</strong></span>' +
              '<span>对照: <strong class="text-gray-900">' + lang2 + '</strong></span>' +
              '<span>总条目: <strong class="text-gray-900">' + i18nState.total + '</strong></span>' +
              '<span class="text-red-500">缺失翻译: <strong>' + missingCount + '</strong></span>' +
              '<span>覆盖率: <strong class="' + (missingCount === 0 ? 'text-green-600' : 'text-amber-600') + '">' +
                (data1.keys.length ? Math.round((1 - missingCount / data1.keys.length) * 100) : 0) + '%</strong></span>';
          }

          renderI18nTable(data1.keys, map2, lang2);
          renderI18nPagination();
          updateUnsavedBar();
        });
      });
    });
  }

  function renderI18nTable(entries, map2, lang2) {
    var container = document.getElementById('i18n-container');
    if (!container) return;

    if (!entries.length) {
      container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="text-4xl mb-3">📭</div><div>没有找到匹配的翻译条目</div></div>';
      return;
    }

    // Group by prefix (e.g. "nav_" or "products_")
    var groups = {};
    entries.forEach(function(e) {
      var prefix = e.key.split('_')[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(e);
    });

    var html = '<table style="width:100%;border-collapse:collapse;font-size:0.875rem">' +
      '<thead style="position:sticky;top:0;z-index:1;background:#f9fafb"><tr style="border-bottom:2px solid #e5e7eb">' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:25%">Key</th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:35%">' + i18nState.lang + ' <span class="text-xs text-gray-400">(可编辑)</span></th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:35%">' + lang2 + ' <span class="text-xs text-gray-400">(可编辑)</span></th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:center;width:5%">状态</th>' +
      '</tr></thead><tbody>';

    var lastPrefix = '';
    entries.forEach(function(entry) {
      var prefix = entry.key.split('_')[0];
      // Group separator row
      if (prefix !== lastPrefix && Object.keys(groups).length > 1) {
        if (lastPrefix) html += '<tr><td colspan="4" style="padding:0;height:0.5rem"></td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb"><td colspan="4" style="padding:0.375rem 0.5rem">' +
          '<span style="font-size:0.7rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">' +
          esc(prefix) + ' <span style="color:#9ca3af">(' + groups[prefix].length + ')</span></span></td></tr>';
        lastPrefix = prefix;
      }

      var v2 = map2[entry.key] || '';
      var missing = !v2;
      var editedKey = entry.key;
      var currentVal = i18nState.edits.hasOwnProperty(entry.key) ? i18nState.edits[entry.key] : entry.value;
      var currentV2 = i18nState.edits.hasOwnProperty(entry.key + ':' + lang2) ? i18nState.edits[entry.key + ':' + lang2] : v2;

      var rowBg = missing && !i18nState.edits.hasOwnProperty(entry.key + ':' + lang2) ? '#fef2f2' : (i18nState.edits.hasOwnProperty(entry.key) ? '#fffbeb' : '');
      html += '<tr style="border-bottom:1px solid #f3f4f6;' + (rowBg ? 'background:' + rowBg : '') +
        '" data-key="' + esc(entry.key) + '">' +
        '<td style="padding:0.5rem;font-family:monospace;font-size:0.7rem;color:#6b7280;word-break:break-all;line-height:1.4" title="' + esc(entry.key) + '">' + esc(entry.key) + '</td>' +
        '<td style="padding:0.25rem 0.5rem"><input class="i18n-edit" data-lang="' + i18nState.lang + '" data-key="' + esc(entry.key) + '" value="' + esc(currentVal) + '" ' +
        'style="width:100%;border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.5rem;border-radius:0.375rem;font-size:0.8rem;line-height:1.4"></td>' +
        '<td style="padding:0.25rem 0.5rem"><input class="i18n-edit" data-lang="' + lang2 + '" data-key="' + esc(entry.key) + '" value="' + esc(currentV2) + '" ' +
        'style="width:100%;border:1px solid #d1d5db;background:#fff;color:' + (missing ? '#dc2626' : '#111827') + ';padding:0.375rem 0.5rem;border-radius:0.375rem;font-size:0.8rem;line-height:1.4" ' +
        'placeholder="' + esc(v2 || '(点击输入翻译)') + '"></td>' +
        '<td style="padding:0.5rem;text-align:center">' +
        (i18nState.edits.hasOwnProperty(entry.key) || i18nState.edits.hasOwnProperty(entry.key + ':' + lang2)
          ? '<span style="color:#f59e0b;font-size:0.75rem" title="已修改未保存">✏️</span>'
          : (missing ? '<span style="color:#ef4444;font-size:0.75rem" title="缺失翻译">⚠️</span>' : '<span style="color:#22c55e;font-size:0.75rem">✅</span>')) +
        '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Track edits
    container.querySelectorAll('.i18n-edit').forEach(function(input) {
      input.addEventListener('input', function() {
        var lang = input.getAttribute('data-lang');
        var key = input.getAttribute('data-key');
        var editKey = lang === i18nState.lang ? key : key + ':' + lang;
        if (input.value === '') delete i18nState.edits[editKey];
        else i18nState.edits[editKey] = input.value;
        i18nState.editCount = Object.keys(i18nState.edits).length;
        updateUnsavedBar();
        // Update row highlight
        var row = input.closest('tr');
        if (row) row.style.background = input.value ? '#fffbeb' : '';
      });
    });
  }

  function renderI18nPagination() {
    var el = document.getElementById('i18n-pagination');
    if (!el) return;
    var totalPages = Math.ceil(i18nState.total / i18nState.pageSize);
    var page = i18nState.page;
    if (totalPages <= 1) { el.innerHTML = '<span>共 ' + i18nState.total + ' 条</span><span></span>'; return; }

    var start = (page - 1) * i18nState.pageSize + 1;
    var end = Math.min(page * i18nState.pageSize, i18nState.total);

    var pages = [];
    if (page > 1) pages.push({ n: page - 1, t: '‹' });
    for (var i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      pages.push({ n: i, t: String(i) });
    }
    if (page < totalPages) pages.push({ n: page + 1, t: '›' });

    var btns = pages.map(function(p) {
      var active = p.n === page;
      return '<button data-page="' + p.n + '" style="padding:0.25rem 0.5rem;border:1px solid ' +
        (active ? '#4f46e5' : '#d1d5db') + ';background:' + (active ? '#4f46e5' : '#fff') +
        ';color:' + (active ? '#fff' : '#374151') + ';border-radius:0.375rem;cursor:pointer;font-size:0.8rem;min-width:2rem">' + p.t + '</button>';
    }).join('');

    el.innerHTML = '<span>显示 ' + start + '-' + end + ' / 共 ' + i18nState.total + ' 条</span>' +
      '<div class="flex gap-1">' + btns + '</div>';

    el.querySelectorAll('[data-page]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        i18nState.page = parseInt(this.getAttribute('data-page'));
        loadI18nKeys();
        document.getElementById('i18n-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function updateUnsavedBar() {
    var bar = document.getElementById('i18n-unsaved-bar');
    var text = document.getElementById('i18n-unsaved-text');
    if (!bar) return;
    if (i18nState.editCount > 0) {
      bar.classList.remove('hidden');
      if (text) text.textContent = i18nState.editCount + ' 条未保存修改';
    } else {
      bar.classList.add('hidden');
    }
  }

  function saveI18nEdits() {
    if (!i18nState.editCount) return;
    var updates = [];
    Object.keys(i18nState.edits).forEach(function(editKey) {
      var isComp = editKey.indexOf(':') > -1;
      var key = isComp ? editKey.split(':')[0] : editKey;
      var lang = isComp ? editKey.split(':')[1] : i18nState.lang;
      var type = isComp ? i18nState.type : i18nState.type;
      updates.push({ key: key, value: i18nState.edits[editKey], lang: lang, type: type });
    });

    // Group by lang+type to minimize API calls
    var groups = {};
    updates.forEach(function(u) {
      var gk = u.lang + '|' + u.type;
      if (!groups[gk]) groups[gk] = { lang: u.lang, type: u.type, updates: [] };
      groups[gk].updates.push({ key: u.key, value: u.value });
    });

    var promises = Object.values(groups).map(function(g) {
      return api('/i18n/batch', { method: 'PUT', body: g });
    });

    Promise.all(promises).then(function(results) {
      var totalSaved = 0;
      results.forEach(function(r) { if (r && r.count) totalSaved += r.count; });
      if (totalSaved > 0) {
        i18nState.edits = {};
        i18nState.editCount = 0;
        updateUnsavedBar();
        toast('已保存 ' + totalSaved + ' 条翻译');
        loadI18nKeys(); // Refresh
      }
    });
  }

  function exportI18n() {
    var url = '/api/cms/i18n/export?lang=' + i18nState.lang + '&type=' + i18nState.type;
    fetch(url, { headers: { 'Authorization': 'Bearer ' + CMS.token } })
      .then(function(r) { return r.text(); })
      .then(function(text) {
        var blob = new Blob([text], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = i18nState.lang + '-' + i18nState.type + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('导出成功');
      })
      .catch(function(e) { toast('导出失败: ' + e.message, true); });
  }

  function importI18nFile(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || Array.isArray(data)) {
          toast('无效的 JSON 格式', true); return;
        }
        api('/i18n/import', {
          method: 'POST',
          body: { lang: i18nState.lang, type: i18nState.type, data: data, mode: 'merge' }
        }).then(function(result) {
          if (result) {
            toast(result.message || '导入成功');
            loadI18nKeys();
          }
        });
      } catch (err) {
        toast('JSON 解析失败: ' + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  window.loadI18nUI = function(lang, type, search) {
    i18nState.lang = lang || i18nState.lang;
    i18nState.type = type || i18nState.type;
    if (search !== undefined) i18nState.search = search;
    i18nState.page = 1;
    loadI18nKeys();
  };
})();
