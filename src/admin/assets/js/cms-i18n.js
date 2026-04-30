// cms-i18n.js — I18n translation management: main orchestrator, tab switching, shared state
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;

  // ─── Constants ─────────────────────────────────────────────────────
  CMS._i18nConstants = {
    LANG_MAP: {
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
    },
    PAGE_SIZE: 200
  };

  // ─── Shared State ──────────────────────────────────────────────────
  CMS._i18nState = {
    view: 'overview',       // 'overview' | 'editor' | 'pages'
    type: 'ui',
    // Overview
    overviewData: null,
    // Editor
    lang: null,
    editorData: null,
    page: 1,
    filter: 'all',
    search: '',
    sortBy: 'key',
    selected: {},
    edits: {},
    aiSuggestions: {},
    expandedRow: null,
    editingCell: null,
    // Batch translate
    batchJobId: null,
    batchPollTimer: null
  };

  // ─── Main render entry ─────────────────────────────────────────────
  CMS.renderI18nPage = function(area) {
    CMS._i18nState.view = 'overview';
    CMS._i18nMain.render(area);
  };

  CMS.renderPagesPage = function(area) {
    CMS.currentPage = 'i18n';
    var bc = document.getElementById('breadcrumb'); if (bc) bc.textContent = '多语言与页面';
    var nav = document.getElementById('nav-menu');
    nav.querySelectorAll('.sidebar-link').forEach(function(b) { b.classList.remove('active'); });
    nav.querySelectorAll('.sidebar-link').forEach(function(b) { if (b.textContent.includes('多语言')) b.classList.add('active'); });
    CMS._i18nState.view = 'overview';
    CMS._i18nMain.render(area);
    CMS._i18nState.view = 'pages';
    CMS._i18nMain.render(area);
    setTimeout(function() { CMS._i18nPages.loadList(); }, 50);
  };

  // ─── Render dispatcher ─────────────────────────────────────────────
  CMS._i18nMain = {};

  CMS._i18nMain.render = function(area) {
    if (CMS._i18nState.view === 'overview') CMS._i18nOverview.render(area);
    else if (CMS._i18nState.view === 'editor') CMS._i18nEditor.render(area);
    else if (CMS._i18nState.view === 'pages') CMS._i18nPages.render(area);
  };

  // ─── Tab switching via event delegation ────────────────────────────
  document.addEventListener('click', function(e) {
    if (e.target.id === 'i18n-tab-overview' || e.target.id === 'i18n-tab-pages') {
      var target = e.target.id;
      var area = document.querySelector('.fade-in');
      if (!area) return;

      if (target === 'i18n-tab-pages') {
        CMS._i18nState.view = 'pages';
      } else {
        CMS._i18nState.view = 'overview';
      }
      CMS._i18nMain.render(area);
    }

    // Export
    if (e.target.id === 'btn-i18n-export') {
      var exportLang = CMS._i18nState.lang || 'zh-CN';
      var url = '/api/cms/i18n/export?lang=' + exportLang + '&type=' + CMS._i18nState.type;
      fetch(url, { headers: { 'Authorization': 'Bearer ' + CMS.token } })
        .then(function(r) { return r.text(); })
        .then(function(text) {
          CMS._i18nUtils.downloadJSON(JSON.parse(text), exportLang + '-' + CMS._i18nState.type + '.json');
          toast('导出成功');
        }).catch(function(err) { toast('导出失败: ' + err.message, true); });
    }

    // Import
    if (e.target.id === 'btn-i18n-import') {
      document.getElementById('i18n-import-file').click();
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
        var importLang = CMS._i18nState.lang || 'zh-CN';
        api('/i18n/import', {
          method: 'POST',
          body: { lang: importLang, type: CMS._i18nState.type, data: data, mode: 'merge' }
        }).then(function(result) {
          if (result) {
            toast(result.message || '导入成功');
            if (CMS._i18nState.view === 'overview') CMS._i18nOverview.load();
            else if (CMS._i18nState.view === 'editor') CMS._i18nEditor.loadData();
          }
        });
      } catch (err) { toast('JSON 解析失败: ' + err.message, true); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Legacy compatibility
  window.loadI18nUI = function(lang, type, search) {
    CMS._i18nState.lang = lang || CMS._i18nState.lang;
    CMS._i18nState.type = type || CMS._i18nState.type;
    if (search !== undefined) CMS._i18nState.search = search;
    CMS._i18nState.view = 'editor';
    CMS._i18nState.page = 1;
    var area = document.querySelector('.fade-in');
    if (area) CMS._i18nMain.render(area);
  };
})();
