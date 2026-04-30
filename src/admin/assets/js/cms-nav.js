// cms-nav.js — Navigation management page
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;

  CMS.renderNavPage = function(area) {
    area.innerHTML = '<div class="fade-in"><div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-semibold">导航管理</h2>' +
      '<div class="flex gap-2">' +
      '<button id="btn-nav-batch-translate" class="btn-secondary" style="background:#7c3aed;color:#fff;border:none;padding:0.375rem 0.75rem;border-radius:0.375rem;cursor:pointer;font-size:0.875rem;white-space:nowrap">🤖 AI 批量翻译</button>' +
      '<button class="btn-primary" onclick="openNavEditor()">+ 新增导航项</button>' +
      '</div></div>' +
      '<div id="nav-container"><div class="text-center py-8 text-gray-400">加载中...</div></div></div>';

    document.getElementById('btn-nav-batch-translate').addEventListener('click', openNavBatchTranslate);
    loadNavData();
  };

  function loadNavData() {
    var container = document.getElementById('nav-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';
    api('/nav').then(function(data) {
      if (!data) return;
      // Cache flat items list for client-side duplicate checks
      window._navItems = data.items || [];
      renderNavTree(data.tree, container);
    });
  }

  function renderNavTree(tree, container) {
    container.innerHTML = '';
    if (!tree || !tree.length) {
      container.innerHTML = '<div class="text-center py-8 text-gray-400">暂无导航项，点击"新增"添加</div>';
      return;
    }
    tree.forEach(function(item) {
      var div = document.createElement('div');
      div.style.cssText = 'border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.75rem;margin-bottom:0.5rem';
      div.className = item.is_active ? '' : 'opacity-50';

      var header = document.createElement('div');
      header.className = 'flex items-center justify-between';
      header.innerHTML = '<div class="flex items-center gap-2">' +
        '<span class="text-lg">' + (item.icon || '📄') + '</span>' +
        '<span class="font-medium">' + esc(item.default_label || item.i18n_key) + '</span>' +
        '<span class="text-xs text-gray-400">' + esc(item.path || '') + '</span>' +
        (item.is_active ? '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">启用</span>' : '<span class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">禁用</span>') +
        '</div>' +
        '<div class="flex gap-1">' +
        '<button class="nav-action" data-id="' + item.id + '" data-action="edit" style="font-size:0.75rem;padding:0.25rem 0.5rem;background:#4f46e5;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">编辑</button>' +
        '<button class="nav-action" data-id="' + item.id + '" data-action="delete" style="font-size:0.75rem;padding:0.25rem 0.5rem;background:#ef4444;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">删除</button>' +
        '</div>';
      div.appendChild(header);

      // Children
      if (item.children && item.children.length) {
        var childContainer = document.createElement('div');
        childContainer.style.cssText = 'margin-top:0.5rem;padding-left:1.5rem;border-left:2px solid #e5e7eb';
        item.children.forEach(function(child) {
          var childDiv = document.createElement('div');
          childDiv.className = child.is_active ? '' : 'opacity-50';
          childDiv.style.cssText = 'padding:0.375rem 0.5rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f3f4f6';
          childDiv.innerHTML = '<div class="flex items-center gap-2">' +
            '<span>' + esc(child.icon || '') + '</span>' +
            '<span class="text-sm">' + esc(child.default_label || child.i18n_key) + '</span>' +
            '<span class="text-xs text-gray-400 font-mono">' + esc(child.path || child.href || '') + '</span>' +
            (child.badge ? '<span class="text-xs bg-amber-100 text-amber-700 px-1 rounded">HOT</span>' : '') +
            (child.target === '_blank' ? '<span class="text-xs bg-blue-100 text-blue-700 px-1 rounded">↗</span>' : '') +
            '</div>' +
            '<div class="flex gap-1">' +
            '<button class="nav-action" data-id="' + child.id + '" data-action="edit" style="font-size:0.7rem;padding:0.125rem 0.375rem;background:#4f46e5;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">编辑</button>' +
            '<button class="nav-action" data-id="' + child.id + '" data-action="delete" style="font-size:0.7rem;padding:0.125rem 0.375rem;background:#ef4444;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">删除</button>' +
            '</div>';
          childContainer.appendChild(childDiv);
        });
        div.appendChild(childContainer);
      }
      container.appendChild(div);
    });

    // Bind events
    container.querySelectorAll('.nav-action').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = parseInt(btn.getAttribute('data-id'));
        var action = btn.getAttribute('data-action');
        if (action === 'edit') openNavEditor(id);
        else if (action === 'delete') {
          if (!confirm('确定删除？子项也会被删除。')) return;
          api('/nav/' + id, { method: 'DELETE' }).then(function() { toast('已删除'); loadNavData(); });
        }
      });
    });
  }

  function openNavEditor(id) {
    var isEdit = !!id;
    var done = function(cb) {
      if (isEdit) {
        api('/nav').then(function(data) {
          if (!data) return;
          var item = data.items.find(function(i) { return i.id === id; });
          if (item) cb(item);
        });
      } else {
        cb({ parent_id: null, sort_order: 0, is_active: 1, i18n_key: '', default_label: '', path: '', icon: '', badge: 0, target: '', group_key: '' });
      }
    };
    done(function(item) {
      // Build parent select options from cached tree
      var parentOpts = '<option value="">无（主菜单）</option>';
      if (typeof renderNavTree === 'undefined' || !window._navTree) {
        parentOpts = '<div><label class="text-sm font-medium">父级菜单</label><select id="ne-parent"><option value="">无（主菜单）</option></select></div>';
      }

      var html = '<div class="form-grid">' +
        '<div><label class="text-sm font-medium">i18n Key</label><input id="ne-key" value="' + esc(item.i18n_key) + '" placeholder="nav_xxx"></div>' +
        '<div><label class="text-sm font-medium">默认标签</label><input id="ne-label" value="' + esc(item.default_label) + '" placeholder="产品中心"></div>' +
        '<div><label class="text-sm font-medium">路径</label><input id="ne-path" value="' + esc(item.path) + '" placeholder="/products/"></div>' +
        '<div><label class="text-sm font-medium">图标</label><input id="ne-icon" value="' + esc(item.icon) + '" placeholder="kitchen"></div>' +
        '<div><label class="text-sm font-medium">分组</label><input id="ne-group" value="' + esc(item.group_key) + '" placeholder="products/solutions/..."></div>' +
        '<div><label class="text-sm font-medium">排序</label><input id="ne-sort" type="number" value="' + item.sort_order + '"></div>' +
        '<div><label class="text-sm font-medium">打开方式</label><select id="ne-target"><option value=""' + (!item.target ? ' selected' : '') + '>当前窗口</option><option value="_blank"' + (item.target === '_blank' ? ' selected' : '') + '>新窗口</option></select></div>' +
        '<div><label class="text-sm font-medium">父级 ID</label><input id="ne-parent" type="number" value="' + (item.parent_id || '') + '" placeholder="留空=主菜单"></div>' +
        '<div class="flex items-end gap-2"><label class="text-sm font-medium flex items-center gap-2"><input id="ne-active" type="checkbox" ' + (item.is_active ? 'checked' : '') + '> 启用</label>' +
        '<label class="text-sm font-medium flex items-center gap-2"><input id="ne-badge" type="checkbox" ' + (item.badge ? 'checked' : '') + '> HOT 标签</label></div></div>';
      showModal('nav-modal', (isEdit ? '编辑导航项' : '新增导航项'), html, function() {
        var body = {
          i18n_key: document.getElementById('ne-key').value.trim(),
          default_label: document.getElementById('ne-label').value.trim(),
          path: document.getElementById('ne-path').value.trim(),
          icon: document.getElementById('ne-icon').value.trim(),
          group_key: document.getElementById('ne-group').value.trim(),
          sort_order: parseInt(document.getElementById('ne-sort').value) || 0,
          parent_id: document.getElementById('ne-parent').value ? parseInt(document.getElementById('ne-parent').value) : null,
          is_active: document.getElementById('ne-active').checked ? 1 : 0,
          badge: document.getElementById('ne-badge').checked ? 1 : 0,
          target: document.getElementById('ne-target').value || ''
        };
        if (!body.i18n_key) { toast('请输入 i18n Key', true); return; }
        if (!body.default_label) { toast('请输入默认标签', true); return; }
        if (!body.path) { toast('请输入路径', true); return; }
        // Client-side duplicate check against cached nav data
        var navItems = window._navItems || [];
        var dupKey = navItems.find(function(n) { return n.i18n_key === body.i18n_key && (!isEdit || n.id !== id); });
        if (dupKey) { toast('i18n Key "' + body.i18n_key + '" 已被 "' + (dupKey.default_label || dupKey.i18n_key) + '" 使用', true); return; }
        var dupPath = navItems.find(function(n) { return n.path && n.path === body.path && (!isEdit || n.id !== id); });
        if (dupPath) { toast('路径 "' + body.path + '" 已被 "' + (dupPath.default_label || dupPath.i18n_key) + '" 使用', true); return; }
        var promise;
        if (isEdit) promise = api('/nav/' + id, { method: 'PUT', body: body });
        else promise = api('/nav', { method: 'POST', body: body });
        promise.then(function() { toast(isEdit ? '已更新' : '已创建'); document.getElementById('nav-modal').remove(); loadNavData(); });
      });
    });
  }

  window.openNavEditor = openNavEditor;

  function openNavBatchTranslate() {
    var langCheckboxes = Object.entries({
      'en': 'English', 'ja': '日本語', 'ko': '한국어', 'th': 'ไทย',
      'vi': 'Tiếng Việt', 'id': 'Bahasa Indonesia', 'ms': 'Bahasa Melayu',
      'hi': 'हिन्दी', 'ar': 'العربية', 'zh-TW': '繁體中文'
    }).map(function(e) {
      return '<label class="flex items-center gap-2 text-sm"><input type="checkbox" class="batch-lang-cb" value="' + e[0] + '" checked> ' + e[1] + ' (' + e[0] + ')</label>';
    }).join('');

    var html = '<div>' +
      '<p class="text-sm text-gray-600 mb-3">将所有导航项的中文标签翻译为选中的语言，并写入对应的 i18n 语言文件。</p>' +
      '<p class="text-sm text-gray-600 mb-2">目标语言：</p>' +
      '<div class="grid grid-cols-2 gap-2 mb-4" style="max-height:200px;overflow-y:auto">' + langCheckboxes + '</div>' +
      '<label class="flex items-center gap-2 text-sm mb-3"><input type="checkbox" id="bt-skip-done" checked> 跳过已有翻译的语言</label>' +
      '<div id="bt-progress" class="text-sm text-gray-500 mb-2"></div>' +
      '<div id="bt-result" class="text-sm"></div>' +
      '</div>';

    showModal('nav-bt-modal', '🤖 AI 批量翻译导航项', html, function() {
      var selectedLangs = Array.from(document.querySelectorAll('.batch-lang-cb:checked')).map(function(cb) { return cb.value; });
      if (!selectedLangs.length) { toast('请至少选择一个目标语言', true); return; }

      var progressEl = document.getElementById('bt-progress');
      var resultEl = document.getElementById('bt-result');
      progressEl.textContent = '正在翻译，请稍候...';
      resultEl.textContent = '';

      api('/nav/batch-translate', {
        method: 'POST',
        body: { target_langs: selectedLangs, source_lang: 'zh-CN' }
      }).then(function(data) {
        if (!data) return;
        progressEl.textContent = '';
        if (data.errors && data.errors.length) {
          resultEl.innerHTML = '<span class="text-amber-600">⚠️ 完成，但有 ' + data.errors.length + ' 个错误：</span><br>' +
            data.errors.map(function(e) { return '<span class="text-xs text-red-500">' + esc(String(e)) + '</span>'; }).join('<br>');
        } else {
          resultEl.innerHTML = '<span class="text-green-600">✅ 翻译完成！共翻译 ' + (data.translated || 0) + ' 条。</span>';
        }
        if (data.langs) {
          var summary = Object.entries(data.langs).map(function(e) {
            if (e[1].status === 'ok') return '<span class="text-green-600">' + e[0] + ': ' + e[1].translated + '条</span>';
            if (e[1].status === 'already_done') return '<span class="text-gray-400">' + e[0] + ': 已有翻译</span>';
            return '<span class="text-red-500">' + e[0] + ': ' + (e[1].error || '失败') + '</span>';
          }).join('<br>');
          resultEl.innerHTML += '<div class="mt-2">' + summary + '</div>';
        }
        toast('翻译完成');
      });

      // Prevent closing the modal during translation
      return false;
    });
  }
})();
