// cms-excel-import.js — Excel import modal
(function() {
  'use strict';
  var CMS = window.CMS;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;

  CMS.openExcelImport = function() {
    var html = '<div style="display:flex;flex-direction:column;gap:1rem">' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">选择 Excel 文件</label>' +
      '<input type="file" id="excel-file" accept=".xlsx,.xls" style="font-size:0.875rem">' +
      '<div id="excel-file-info" class="text-xs text-gray-400" style="margin-top:0.25rem">支持 .xlsx 格式，自动解析产品型号、名称、配置等信息</div></div>' +
      '<div id="excel-preview" style="display:none">' +
      '<div class="flex items-center justify-between mb-2"><span class="text-sm font-medium">预览结果</span>' +
      '<span class="text-xs text-gray-400" id="excel-count"></span></div>' +
      '<div id="excel-table" style="max-height:300px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px"></div></div></div>';

    showModal('excel-import-modal', '📥 导入 Excel 产品数据', html, function() {
      // Execute import (no dry_run)
      var fileInput = document.getElementById('excel-file');
      if (!fileInput || !fileInput.files[0]) { toast('请选择文件', true); return; }

      var file = fileInput.files[0];
      // File size check
      if (file.size > 500 * 1024 * 1024) {
        toast('文件过大 (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)，最大支持 500MB', true);
        return;
      }
      var fd = new FormData();
      fd.append('file', file);

      var saveBtn = document.getElementById('excel-import-modal-save');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '导入中 (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)...'; }

      fetch('/api/cms/import/excel', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + CMS.token },
        body: fd
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.mode === 'executed') {
          toast('导入完成: 新增 ' + d.imported + '，更新 ' + d.updated + '，跳过 ' + d.skipped);
          document.getElementById('excel-import-modal').remove();
          CMS.renderPage();
        } else {
          toast('导入失败: ' + (d ? d.error : '未知错误'), true);
        }
      })
      .catch(function(e) { toast('导入失败: ' + e.message, true); });
    }, function() {
      // onReady: bind preview
      var fileInput = document.getElementById('excel-file');
      if (!fileInput) return;
      var previewBtn = document.createElement('button');
      previewBtn.className = 'btn-ghost';
      previewBtn.style.cssText = 'font-size:0.75rem;margin-top:0.5rem';
      previewBtn.textContent = '👁️ 预览数据（不导入）';
      previewBtn.type = 'button';
      fileInput.parentElement.appendChild(previewBtn);
      previewBtn.addEventListener('click', function() {
        if (!fileInput.files[0]) { toast('请先选择文件', true); return; }
        var file = fileInput.files[0];
        // File size check (50MB limit)
        if (file.size > 500 * 1024 * 1024) {
          toast('文件过大 (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)，最大支持 500MB', true);
          return;
        }
        var fd = new FormData();
        fd.append('file', fileInput.files[0]);
        previewBtn.disabled = true;
        previewBtn.textContent = '⏳ 解析中 (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)...';
        fetch('/api/cms/import/excel?dry_run=true', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + CMS.token },
          body: fd
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          previewBtn.disabled = false;
          previewBtn.textContent = '👁️ 预览数据（不导入）';
          if (!d || d.error) { toast('解析失败: ' + (d ? d.error : ''), true); return; }
          var preview = document.getElementById('excel-preview');
          var count = document.getElementById('excel-count');
          var table = document.getElementById('excel-table');
          if (!preview) return;
          preview.style.display = '';
          if (count) count.textContent = d.products_found + ' 个产品';
          var prods = d.products || [];
          var html = '<table style="width:100%;font-size:0.75rem;border-collapse:collapse">' +
            '<thead style="background:#f9fafb;position:sticky;top:0"><tr>' +
            '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e5e7eb">型号</th>' +
            '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e5e7eb">名称</th>' +
            '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e5e7eb">分类</th>' +
            '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e5e7eb">配置</th>' +
            '</tr></thead><tbody>';
          prods.slice(0, 50).forEach(function(p) {
            html += '<tr>' +
              '<td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;font-weight:600">' + esc(p.model) + '</td>' +
              '<td style="padding:4px 8px;border-bottom:1px solid #f3f4f6">' + esc(p.name || '—') + '</td>' +
              '<td style="padding:4px 8px;border-bottom:1px solid #f3f4f6"><span style="background:#f0f9ff;padding:1px 6px;border-radius:4px;font-size:0.7rem">' + esc(p.category_name || '其他') + '</span></td>' +
              '<td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(p.specifications || '') + '">' + esc(p.specifications || '—') + '</td>' +
              '</tr>';
          });
          if (prods.length > 50) html += '<tr><td colspan="4" style="padding:8px;text-align:center;color:#9ca3af">...还有 ' + (prods.length - 50) + ' 个产品</td></tr>';
          html += '</tbody></table>';
          table.innerHTML = html;
          toast('解析完成: ' + d.total_rows + ' 行，识别 ' + d.products_found + ' 个产品');
        })
        .catch(function(e) {
          previewBtn.disabled = false;
          previewBtn.textContent = '👁️ 预览数据（不导入）';
          toast('解析失败: ' + e.message, true);
        });
      });
    });
  };
})();
