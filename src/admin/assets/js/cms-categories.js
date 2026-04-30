// cms-categories.js — Categories page + category form/delete
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;

  CMS.renderCategories = function(area) {
    area.innerHTML = '<div class="fade-in"><div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-semibold">产品系列</h2>' +
      '<button class="btn-primary" onclick="CMS.openCategoryForm()">+ 新增系列</button></div>' +
      '<div class="card" style="overflow:hidden"><table><thead style="background:#f9fafb"><tr>' +
      '<th>名称</th><th>URL 别名</th><th>排序</th><th>状态</th><th style="text-align:right">操作</th>' +
      '</tr></thead><tbody id="cat-tbody"></tbody></table>' +
      '<div id="cat-empty" class="py-12 text-center text-gray-400" style="display:none">暂无产品系列</div></div></div>';
    api('/categories').then(function(d) {
      if (!d || !d.categories) return;
      CMS.categories = d.categories;
      var tbody = document.getElementById('cat-tbody');
      var empty = document.getElementById('cat-empty');
      if (CMS.categories.length === 0) { empty.style.display = ''; return; }
      CMS.categories.forEach(function(cat) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="text-sm font-medium">' + esc(cat.name || cat.slug) + '</td>' +
          '<td class="text-sm text-gray-500" style="font-family:monospace">' + esc(cat.slug) + '</td>' +
          '<td>' + (cat.sort_order || 0) + '</td>' +
          '<td><span class="badge ' + (cat.is_active ? 'badge-green' : 'badge-gray') + '">' + (cat.is_active ? '启用' : '禁用') + '</span></td>' +
          '<td style="text-align:right"></td>';
        var editBtn = document.createElement('button');
        editBtn.className = 'text-indigo-600'; editBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.75rem';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', function() { CMS.openCategoryForm(cat); });
        var delBtn = document.createElement('button');
        delBtn.className = 'text-red-500'; delBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.75rem;margin-left:0.5rem';
        delBtn.textContent = '删除';
        delBtn.addEventListener('click', function() { CMS.deleteCategory(cat); });
        tr.lastElementChild.appendChild(editBtn);
        tr.lastElementChild.appendChild(delBtn);
        tbody.appendChild(tr);
      });
    });
  };

  // Category modal
  CMS.openCategoryForm = function(cat) {
    showModal('category-modal', cat ? '编辑系列' : '新增系列',
      '<div class="flex flex-col gap-3">' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">系列名称 *</label>' +
      '<input id="cm-name" required placeholder="如：切配系列" value="' + esc(cat ? (cat.name || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">URL 别名 *</label>' +
      '<input id="cm-slug" required placeholder="如：cutting" value="' + esc(cat ? cat.slug : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">翻译键</label>' +
      '<input id="cm-i18n" placeholder="如：nav_products_cutting" value="' + esc(cat ? (cat.i18n_key || '') : '') + '"></div>' +
      '<div class="flex gap-3"><div class="flex-1"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">排序</label>' +
      '<input id="cm-sort" type="number" value="' + (cat ? cat.sort_order : 0) + '"></div>' +
      '<div class="flex-1"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">状态</label>' +
      '<select id="cm-active"><option value="true"' + (cat && cat.is_active ? ' selected' : '') + '>启用</option>' +
      '<option value="false"' + (cat && !cat.is_active ? ' selected' : '') + '>禁用</option></select></div></div></div>',
      function() {
        var body = {
          name: document.getElementById('cm-name').value,
          slug: document.getElementById('cm-slug').value,
          i18n_key: document.getElementById('cm-i18n').value,
          sort_order: parseInt(document.getElementById('cm-sort').value) || 0,
          is_active: document.getElementById('cm-active').value === 'true'
        };
        var promise;
        if (cat) promise = api('/categories/' + cat.id, { method: 'PUT', body: body });
        else promise = api('/categories', { method: 'POST', body: body });
        promise.then(function(d) { if (d) { document.getElementById('category-modal').remove(); toast('保存成功'); CMS.renderPage(); } });
      });
  };

  CMS.deleteCategory = function(cat) {
    if (!confirm('确定删除系列 ' + (cat.name || cat.slug) + '？')) return;
    api('/categories/' + cat.id, { method: 'DELETE' }).then(function() { toast('已删除'); CMS.renderPage(); });
  };
})();
