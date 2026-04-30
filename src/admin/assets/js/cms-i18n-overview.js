// cms-i18n-overview.js — overview/dashboard view (language cards, stats, batch translate, export)
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;
  function st() { if (!CMS._i18nState) CMS._i18nState = { type: "ui", lang: "zh-CN", page: 1, filter: "all", search: "", view: "overview", selected: {}, edits: {} }; return CMS._i18nState; }
  var _header = function() { return CMS._i18nUtils.header.apply(null, arguments); };
  var _typeButtons = function() { return CMS._i18nUtils.typeButtons(); };
  var _bindTypeButtons = function(cb) { CMS._i18nUtils.bindTypeButtons(cb); };
  var _downloadJSON = function() { return CMS._i18nUtils.downloadJSON.apply(null, arguments); };
  var LANG_MAP = function() { return CMS._i18nConstants && CMS._i18nConstants.LANG_MAP; };

  CMS._i18nOverview = {};

  CMS._i18nOverview.render = function(area) {
    var LM = LANG_MAP() || {};
    area.innerHTML = '<div class="fade-in">' +
      _header('🌐 翻译总览') +
      '<div id="i18n-type-bar" class="flex items-center gap-3 mb-5">' +
        '<span class="text-sm text-gray-500">类型:</span>' +
        _typeButtons() +
      '</div>' +
      '<div id="i18n-overview-content"><div class="text-center py-12 text-gray-400">加载中...</div></div>' +
      '</div>';
    _bindTypeButtons(function() { CMS._i18nOverview.load(); });
    CMS._i18nOverview.load();
  };

  CMS._i18nOverview.load = function() {
    var container = document.getElementById('i18n-overview-content');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-12 text-gray-400">加载中...</div>';

    api('/i18n/overview?type=' + st().type).then(function(data) {
      if (!data) { container.innerHTML = '<div class="text-center py-12 text-red-400">加载失败</div>'; return; }
      st().overviewData = data;
      CMS._i18nOverview.renderCards(container, data);
    });
  };

  CMS._i18nOverview.renderCards = function(container, data) {
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
    html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">';
    data.languages.forEach(function(lang) {
      var pct = lang.percent;
      var color = pct >= 80 ? '#22c55e' : pct >= 30 ? '#eab308' : '#ef4444';
      var bgColor = pct >= 80 ? '#f0fdf4' : pct >= 30 ? '#fefce8' : '#fef2f2';
      var statusIcon = pct >= 100 ? '✅' : pct >= 80 ? '📝' : '❌';
      var statusText = pct >= 100 ? '已完成' : pct >= 80 ? '接近完成' : pct >= 30 ? '进行中' : '待翻译';

      html += '<div class="lang-card cursor-pointer rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all p-5" data-lang="' + esc(lang.code) + '" style="border-left:4px solid ' + color + '">' +
        '<div class="flex items-center gap-3 mb-4">' +
          '<span class="text-3xl">' + lang.flag + '</span>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-semibold text-gray-900 text-base">' + esc(lang.name) + '</div>' +
            '<div class="text-xs text-gray-400 font-mono mt-0.5">' + esc(lang.code) + '</div>' +
          '</div>' +
          '<span class="text-lg">' + statusIcon + '</span>' +
        '</div>' +
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-sm text-gray-600">' + lang.translated + ' / ' + lang.total + '</span>' +
          '<span class="text-xs font-medium" style="color:' + color + '">' + pct + '%</span>' +
        '</div>' +
        '<div style="width:100%;height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden">' +
          '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + color + ';border-radius:3px;transition:width 0.3s"></div>' +
        '</div>' +
        '<div class="mt-2.5 text-xs text-gray-400">' + statusText + '</div>' +
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

    // Bind card clicks → switch to editor
    container.querySelectorAll('.lang-card').forEach(function(card) {
      card.addEventListener('click', function() {
        st().lang = card.getAttribute('data-lang');
        st().view = 'editor';
        st().page = 1;
        st().filter = 'all';
        st().search = '';
        st().selected = {};
        st().edits = {};
        st().expandedRow = null;
        CMS._i18nMain.render(
          document.getElementById('main-content') || document.querySelector('.main-content') || document.querySelector('[id$="content"]') || container.closest('.fade-in')
        );
      });
    });

    // Batch translate — show language selection modal
    var batchBtn = document.getElementById('btn-batch-translate-all');
    if (batchBtn) {
      batchBtn.addEventListener('click', function() {
        if (incompleteCodes.length === 0) { toast('所有语言已完成翻译'); return; }
        CMS._i18nOverview.showBatchLangModal(incompleteCodes, data.languages);
      });
    }

    // Export report
    var exportBtn = document.getElementById('btn-export-report');
    if (exportBtn) {
      exportBtn.addEventListener('click', CMS._i18nOverview.exportReport);
    }
  };

  // ─── Batch translate language selection modal ─────────────────

  CMS._i18nOverview.showBatchLangModal = function(incompleteCodes, allLanguages) {
    var lm = LANG_MAP() || {};
    var html = '<div class="mb-3 text-sm text-gray-600">选择需要翻译的目标语言：</div>';
    incompleteCodes.forEach(function(code) {
      var langInfo = allLanguages.find(function(l) { return l.code === code; });
      var meta = lm[code] || {};
      var pct = langInfo ? langInfo.percent : 0;
      html += '<label class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer mb-1" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0.75rem;border-radius:0.5rem">' +
        '<input type="checkbox" class="batch-lang-cb" value="' + esc(code) + '" checked style="width:1.1rem;height:1.1rem;accent-color:#6366f1">' +
        '<span class="text-base">' + (meta.flag || '') + '</span>' +
        '<span class="flex-1 text-sm text-gray-900">' + esc(meta.name || code) + '</span>' +
        '<span class="text-xs text-gray-400">' + (langInfo ? (langInfo.translated + '/' + langInfo.total) : '') + ' (' + pct + '%)</span>' +
        '</label>';
    });
    html += '<div class="flex items-center justify-between mt-4">' +
      '<button id="btn-batch-lang-select-all" class="btn-ghost" style="font-size:0.8rem;padding:0.3rem 0.75rem">全选</button>' +
      '<button id="btn-start-batch" class="btn-primary" style="font-size:0.85rem;padding:0.5rem 1.5rem">🚀 开始翻译</button>' +
      '</div>';

    showModal('batch-lang-modal', '🤖 AI 批量翻译', html, function() {
      // On confirm: collect checked langs and start
      var checked = [];
      document.querySelectorAll('.batch-lang-cb:checked').forEach(function(cb) { checked.push(cb.value); });
      if (checked.length === 0) { toast('请至少选择一种语言', true); return false; }
      CMS._i18nOverview.startBatchTranslate(checked);
    }, function() {
      // On mount: bind select-all toggle
      var selectAll = document.getElementById('btn-batch-lang-select-all');
      if (selectAll) {
        selectAll.addEventListener('click', function() {
          var allChecked = document.querySelectorAll('.batch-lang-cb:checked').length === document.querySelectorAll('.batch-lang-cb').length;
          document.querySelectorAll('.batch-lang-cb').forEach(function(cb) { cb.checked = !allChecked; });
          selectAll.textContent = allChecked ? '全选' : '取消全选';
        });
      }
    });
  };

  // ─── Batch translate all (overview level) ─────────────────────────

  CMS._i18nOverview.startBatchTranslate = function(targetLangs) {
    api('/i18n/batch-translate', {
      method: 'POST',
      body: { source_lang: 'zh-CN', target_langs: targetLangs, type: st().type }
    }).then(function(result) {
      if (!result) { toast('启动失败', true); return; }
      if (result.status === 'already_done') { toast(result.message); return; }
      if (!result.job_id) { toast('未能启动翻译', true); return; }

      st().batchJobId = result.job_id;
      toast('已开始批量翻译');
      CMS._i18nOverview.showBatchProgress();
      CMS._i18nOverview.pollBatchProgress();
    }).catch(function() { toast('启动失败', true); });
  };

  CMS._i18nOverview.showBatchProgress = function() {
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
      api('/i18n/batch-translate/cancel', { method: 'POST', body: { job_id: st().batchJobId } });
      toast('已发送取消请求');
    });
  };

  CMS._i18nOverview.pollBatchProgress = function() {
    if (st().batchPollTimer) clearInterval(st().batchPollTimer);
    st().batchPollTimer = setInterval(function() {
      api('/i18n/batch-translate/status?job_id=' + st().batchJobId).then(function(data) {
        if (!data) return;

        var langArea = document.getElementById('batch-lang-progress');
        var totalP = document.getElementById('batch-total-progress');
        var etaEl = document.getElementById('batch-eta');

        if (langArea) {
          var html = '';
          var _lm = LANG_MAP() || {};
          for (var code in data.results) {
            var r = data.results[code];
            var meta = _lm[code] || {};
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
          clearInterval(st().batchPollTimer);
          st().batchPollTimer = null;
          st().batchJobId = null;
          if (totalP) {
            totalP.textContent = data.status === 'completed' ? '✅ 全部完成!' : data.status === 'cancelled' ? '⚠️ 已取消' : '❌ 翻译失败';
          }
          if (etaEl) etaEl.textContent = '';
          CMS._i18nOverview.load();
          toast(data.status === 'completed' ? '批量翻译完成!' : '批量翻译已' + data.status);
        }
      });
    }, 5000);
  };

  // ─── Export report ────────────────────────────────────────────────

  CMS._i18nOverview.exportReport = function() {
    if (!st().overviewData) return;
    var data = st().overviewData;
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
  };
})();
