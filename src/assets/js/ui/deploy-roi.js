/**
 * deploy-roi.js — Deploy page ROI Calculator (extracted from inline scripts)
 * Shared by: deploy-canteen, deploy-hotpot, deploy-fast-food, deploy-cloud-kitchen, deploy-southeast-asian
 *
 * Registers window.calculateROI() for onclick binding in HTML.
 * Self-initializing: defines the function immediately on script load.
 */
(function (global) {
  "use strict";

  // ── Currency helpers ──
  function _c() { return (global.Currency && global.Currency.getConfig()) || { symbol: '¥', unit: '万元', rate: 1 }; }
  function _fm(cny) {
    var cfg = _c(), local = cny * cfg.rate;
    var uv = { '万元': 10000, '萬元': 10000, 'K': 1000, 'ล้าน': 1000000, 'Triệu': 1000000, 'Juta': 1000000, '万円': 10000, '백만': 1000000, 'Lakh': 100000, '': 1 };
    var unitVal = uv[cfg.unit] || 1;
    var val = local / unitVal;
    return val >= 100 ? Math.round(val) + cfg.unit : val.toFixed(1).replace(/\.0$/, '') + cfg.unit;
  }
  function _mu() { var u = _c().unit; return u ? '/' + u : '/月'; }

  global.calculateROI = function () {
    var orders = Math.max(50, parseInt(document.getElementById("roi-orders").value) || 200);
    var price = Math.max(5, parseInt(document.getElementById("roi-price").value) || 25);
    var labor = Math.max(5000, parseInt(document.getElementById("roi-labor").value) || 60000);
    var scale = document.getElementById("roi-scale").value;

    var investmentMap = { small: 80000, medium: 180000, large: 350000 };
    var investment = investmentMap[scale] || 180000;

    var laborSaving = labor * 0.30;
    var wasteSaving = orders * price * 30 * 0.05;
    var efficiencyGain = orders * price * 30 * 0.03;
    var totalMonthlySaving = laborSaving + wasteSaving + efficiencyGain;

    var paybackMonths = Math.ceil(investment / totalMonthlySaving);
    var annualSaving = totalMonthlySaving * 12;
    var roi3Year = ((annualSaving * 3 - investment) / investment * 100).toFixed(0);

    var container = document.getElementById("roi-results");
    if (!container) return;

    container.innerHTML =
      '<div class="space-y-6">' +
        '<h3 class="text-xl font-bold flex items-center gap-2">' +
          '<span class="material-symbols-outlined text-primary">emoji_events</span>' +
          '<span data-i18n="sol_roi_result_title">投资回报预测</span>' +
        '</h3>' +
        '<div class="grid grid-cols-2 gap-4">' +
          '<div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">' +
            '<div class="text-3xl font-black text-primary">' + paybackMonths + '</div>' +
            '<div class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="sol_roi_payback_months">个月回本</div>' +
          '</div>' +
          '<div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">' +
            '<div class="text-3xl font-black text-primary">' + _fm(totalMonthlySaving) + '</div>' +
            '<div class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="sol_roi_monthly_saving">月均节省</div>' +
          '</div>' +
          '<div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">' +
            '<div class="text-3xl font-black text-green-600">' + roi3Year + '%</div>' +
            '<div class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="sol_roi_3year_roi">3年投资回报率</div>' +
          '</div>' +
          '<div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">' +
            '<div class="text-3xl font-black text-orange-600">' + _fm(annualSaving) + '</div>' +
            '<div class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="sol_roi_annual_saving">年节省总额</div>' +
          '</div>' +
        '</div>' +
        '<div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">' +
          '<div class="flex justify-between items-center mb-2">' +
            '<span class="text-sm font-medium" data-i18n="sol_roi_investment_label">预计投资额</span>' +
            '<span class="text-lg font-black text-slate-900 dark:text-white">' + _fm(investment) + '</span>' +
          '</div>' +
          '<div class="space-y-2 mt-3">' +
            '<div class="flex justify-between text-sm"><span class="text-slate-500 dark:text-slate-400" data-i18n="sol_roi_labor_save">人工成本节省</span><span class="font-semibold">' + _fm(laborSaving) + _mu() + '</span></div>' +
            '<div class="flex justify-between text-sm"><span class="text-slate-500 dark:text-slate-400" data-i18n="sol_roi_waste_save">食材损耗降低</span><span class="font-semibold">' + _fm(wasteSaving) + _mu() + '</span></div>' +
            '<div class="flex justify-between text-sm"><span class="text-slate-500 dark:text-slate-400" data-i18n="sol_roi_efficiency_gain">效率提升收益</span><span class="font-semibold">' + _fm(efficiencyGain) + _mu() + '</span></div>' +
          '</div>' +
        '</div>' +
        '<a href="/quote/" class="block w-full bg-primary text-white py-3 rounded-xl font-bold text-center hover:shadow-lg transition-all">' +
          '<span data-i18n="sol_roi_cta">获取精准报价方案 →</span>' +
        '</a>' +
      '</div>';
  };

  // Recalculate on language/currency change (input defaults updated by currency.js)
  global.addEventListener('languageChanged', function () {
    setTimeout(function () {
      if (document.getElementById('roi-results')) {
        global.calculateROI();
      }
    }, 300);
  });

})(window);
