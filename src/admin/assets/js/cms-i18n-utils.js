// cms-i18n-utils.js — shared helpers for i18n modules
(function() {
  'use strict';
  var CMS = window.CMS;
  var esc = CMS._deps.esc;

  // Helper: safely get i18n state (lazy-read because cms-i18n.js loads after us)
  function st() { if (!CMS._i18nState) CMS._i18nState = { type: 'ui' }; return CMS._i18nState; }

  // ─── HTML generators ──────────────────────────────────────────────

  CMS._i18nUtils = {};

  CMS._i18nUtils.header = function(title, activeTab) {
    return '<div class="flex items-center justify-between mb-5 flex-wrap gap-3">' +
      '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
        '<button id="i18n-tab-overview" class="i18n-main-tab' + (!activeTab ? ' active' : '') + '" style="padding:0.4rem 1rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">🌐 翻译总览</button>' +
        '<button id="i18n-tab-pages" class="i18n-main-tab' + (activeTab === 'pages' ? ' active' : '') + '" style="padding:0.4rem 1rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">📄 页面内容</button>' +
      '</div>' +
      '<div class="flex gap-2">' +
        '<button id="btn-i18n-export" class="btn-ghost" style="font-size:0.85rem;padding:0.4rem 1rem">📥 导出 JSON</button>' +
        '<button id="btn-i18n-import" class="btn-ghost" style="font-size:0.85rem;padding:0.4rem 1rem">📤 导入 JSON</button>' +
        '<input type="file" id="i18n-import-file" accept=".json" style="display:none">' +
      '</div>' +
    '</div>';
  };

  CMS._i18nUtils.typeButtons = function() {
    var s = st();
    return '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
      '<button class="i18n-type-btn' + (s.type === 'ui' ? ' active' : '') + '" data-type="ui" style="padding:0.25rem 0.625rem;border:none;border-radius:0.375rem;font-size:0.8rem;cursor:pointer;transition:all 0.15s">UI 文案</button>' +
      '<button class="i18n-type-btn' + (s.type === 'product' ? ' active' : '') + '" data-type="product" style="padding:0.25rem 0.625rem;border:none;border-radius:0.375rem;font-size:0.8rem;cursor:pointer;transition:all 0.15s">产品翻译</button>' +
    '</div>';
  };

  CMS._i18nUtils.filterBtn = function(filter, label) {
    return '<button class="editor-filter-btn" data-filter="' + filter + '" style="padding:0.25rem 0.625rem;border:none;border-radius:0.375rem;font-size:0.8rem;cursor:pointer;transition:all 0.15s">' + label + '</button>';
  };

  CMS._i18nUtils.downloadJSON = function(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── Type button binding ──────────────────────────────────────────

  CMS._i18nUtils.bindTypeButtons = function(onTypeChange) {
    document.querySelectorAll('.i18n-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var newType = btn.getAttribute('data-type');
        if (CMS._i18nState) CMS._i18nState.type = newType;
        CMS._i18nUtils.updateTypeBtnStyles();
        if (onTypeChange) onTypeChange(newType);
      });
    });
    CMS._i18nUtils.updateTypeBtnStyles();
  };

  CMS._i18nUtils.updateTypeBtnStyles = function() {
    var currentType = st().type;
    document.querySelectorAll('.i18n-type-btn').forEach(function(btn) {
      var t = btn.getAttribute('data-type');
      if (t === currentType) {
        btn.style.background = '#fff'; btn.style.color = '#111827'; btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        btn.style.background = 'transparent'; btn.style.color = '#6b7280'; btn.style.boxShadow = 'none';
      }
    });
  };

  // ─── Filter button styles ─────────────────────────────────────────

  CMS._i18nUtils.updateFilterBtnStyles = function(filterValue) {
    document.querySelectorAll('.editor-filter-btn').forEach(function(btn) {
      var f = btn.getAttribute('data-filter');
      if (f === filterValue) {
        btn.style.background = '#fff'; btn.style.color = '#111827'; btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      } else {
        btn.style.background = 'transparent'; btn.style.color = '#6b7280'; btn.style.boxShadow = 'none';
      }
    });
  };
})();
