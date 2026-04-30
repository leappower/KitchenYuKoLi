// cms-i18n-pages.js — page content translation view
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;
  var state = CMS._i18nState;
  var _header = function() { return CMS._i18nUtils.header.apply(null, arguments); };
  var _typeButtons = function() { return CMS._i18nUtils.typeButtons(); };
  var _bindTypeButtons = function() { CMS._i18nUtils.bindTypeButtons(null); };

  CMS._i18nPages = {};

  // ─── Render shell ─────────────────────────────────────────────────

  CMS._i18nPages.render = function(area) {
    area.innerHTML = '<div class="fade-in">' +
      _header('📄 页面内容管理', 'pages') +
      '<div id="i18n-type-bar" class="flex items-center gap-3 mb-5">' +
        '<span class="text-sm text-gray-500">类型:</span>' +
        _typeButtons() +
      '</div>' +
      '<div id="pages-content"><div class="text-center py-8 text-gray-400">加载中...</div></div>' +
      '</div>';
    _bindTypeButtons();
    CMS._i18nPages.loadList();
  };

  // ─── Pages list ───────────────────────────────────────────────────

  CMS._i18nPages.loadList = function() {
    var container = document.getElementById('pages-content');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    api('/pages').then(function(d) {
      if (!d || !d.pages) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }

      var html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">';
      d.pages.forEach(function(p) {
        html += '<div class="p-5 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-all" data-page="' + esc(p.page_id) + '">' +
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
        card.addEventListener('click', function() { CMS._i18nPages.loadEditor(card.getAttribute('data-page')); });
      });
    });
  };

  // ─── Page editor ──────────────────────────────────────────────────

  CMS._i18nPages.loadEditor = function(pageId) {
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

      document.getElementById('pages-back-btn').addEventListener('click', CMS._i18nPages.loadList);
      container.querySelectorAll('.edit-section-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var row = btn.closest('tr');
          var sectionKey = row.getAttribute('data-section');
          var section = sections.find(function(s) { return s.section_key === sectionKey; });
          if (section) CMS._i18nPages.openSectionEditor(pageId, section);
        });
      });
    });
  };

  // ─── Section editor (modal) ──────────────────────────────────────

  CMS._i18nPages.openSectionEditor = function(pageId, section) {
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
      }).then(function() { toast('已保存'); CMS._i18nPages.loadEditor(pageId); });
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
  };
})();
