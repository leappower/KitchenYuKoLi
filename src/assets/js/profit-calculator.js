/**
 * YuKoLi Profit Calculator — ROI calculation engine
 * Pure frontend, no external API calls.
 */
(function () {
  'use strict';

  /* ───────── Default salary data per country ───────── */
  var DEFAULT_SALARIES = {
    'Philippines': { monthly: 25000, currency: 'PHP', symbol: '₱' },
    'Indonesia':   { monthly: 4800000, currency: 'IDR', symbol: 'Rp' },
    'Vietnam':     { monthly: 7000000, currency: 'VND', symbol: '₫' },
    'Thailand':    { monthly: 15000, currency: 'THB', symbol: '฿' },
    'Malaysia':    { monthly: 2500, currency: 'MYR', symbol: 'RM' },
    'Other':       { monthly: 2000, currency: 'USD', symbol: '$' }
  };

  /* ───────── Savings ratio table ───────── */
  var SAVINGS_TABLE = {
    'hiring_difficulty':      { min: 0.40, mid: 0.50, max: 0.58 },
    'high_labor_cost':        { min: 0.45, mid: 0.55, max: 0.68 },
    'inconsistent_quality':   { min: 0.32, mid: 0.42, max: 0.52 },
    'slow_service':           { min: 0.36, mid: 0.46, max: 0.55 },
    'limited_space':          { min: 0.30, mid: 0.40, max: 0.48 }
  };

  /* ───────── Equipment cost ranges (USD) ───────── */
  var EQUIPMENT_COST = {
    'smart_wok':        { min: 3000, max: 8000 },
    'rice_cooker':      { min: 1500, max: 4000 },
    'dishwasher':       { min: 2000, max: 5000 },
    'induction_cooker': { min: 500,  max: 2000 },
    'deep_fryer':       { min: 1000, max: 3000 }
  };

  /* ───────── Equipment multipliers (boost savings) ───────── */
  var EQUIPMENT_MULTIPLIER = {
    'smart_wok':        1.15,
    'rice_cooker':      1.05,
    'dishwasher':       1.10,
    'induction_cooker': 1.03,
    'deep_fryer':       1.06
  };

  /* ───────── CO₂ reduction per equipment (tonnes / year) ───────── */
  var CO2_PER_EQUIPMENT = {
    'smart_wok':        2.1,
    'rice_cooker':      0.8,
    'dishwasher':       1.2,
    'induction_cooker': 0.5,
    'deep_fryer':       0.7
  };


  /* ───────── Scene presets (from application page deep-links) ───────── */

  var SCENE_PRESETS = {
    'chain-restaurant':  { meals: 500,  pain: 'high_labor_cost',      equipment: ['smart_wok', 'rice_cooker'], operators: 3 },
    'central-kitchen':   { meals: 2000, pain: 'hiring_difficulty',    equipment: ['smart_wok', 'rice_cooker', 'dishwasher'], operators: 5 },
    'small-restaurant':  { meals: 150,  pain: 'slow_service',        equipment: ['smart_wok'], operators: 1 },
    'canteen':           { meals: 1000, pain: 'hiring_difficulty',    equipment: ['smart_wok', 'rice_cooker', 'dishwasher', 'deep_fryer'], operators: 4 },
    'cloud-kitchen':     { meals: 300,  pain: 'limited_space',       equipment: ['smart_wok', 'induction_cooker'], operators: 2 },
    'menu-lab':          { meals: 200,  pain: 'inconsistent_quality', equipment: ['smart_wok'], operators: 2 }
  };

  /* ───────── Helpers ───────── */

  /** CJK languages use 万 (10K) and 億 (100M); others use K and M. */
  function isCJK() {
    if (!window.translationManager) return false;
    var lang = window.translationManager.currentLanguage || '';
    return /^zh|ja|ko/.test(lang);
  }

  /** Get currency info based on current UI language (not country). */
  function langCurrency() {
    if (!window.translationManager) return { symbol: '$', currency: 'USD' };
    var lang = window.translationManager.currentLanguage || '';
    var map = {
      'zh-CN': { symbol: '¥', currency: 'CNY' },
      'zh-TW': { symbol: 'NT$', currency: 'TWD' },
      'ja':    { symbol: '¥', currency: 'JPY' },
      'ko':    { symbol: '₩', currency: 'KRW' },
      'th':    { symbol: '฿', currency: 'THB' },
      'vi':    { symbol: '₫', currency: 'VND' },
      'id':    { symbol: 'Rp', currency: 'IDR' },
      'ms':    { symbol: 'RM', currency: 'MYR' },
      'hi':    { symbol: '₹', currency: 'INR' },
      'ar':    { symbol: '﷼', currency: 'SAR' }
    };
    // Match exact lang code or prefix
    for (var key in map) {
      if (lang === key || lang.indexOf(key) === 0) return map[key];
    }
    return { symbol: '$', currency: 'USD' };
  }

  function formatNumber(n, decimals) {
    if (decimals === undefined) decimals = 0;
    var locale = isCJK() ? 'zh-CN' : 'en-US';
    return n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function shortCurrency(n, symbol) {
    if (isCJK()) {
      // CJK: 万 (10,000) and 億 (100,000,000)
      if (n >= 100000000) return symbol + formatNumber(n / 100000000, 1) + t('profit_calc_unit_100m');
      if (n >= 10000) return symbol + formatNumber(n / 10000, 1) + t('profit_calc_unit_10k');
      return symbol + formatNumber(n);
    }
    // Western: K and M
    if (n >= 1000000) return symbol + formatNumber(n / 1000000, 1) + 'M';
    if (n >= 1000) return symbol + formatNumber(n / 1000, 1) + 'K';
    return symbol + formatNumber(n);
  }

  function getSavingsRatio(painPoint, equipment) {
    var base = SAVINGS_TABLE[painPoint] || { min: 0.30, mid: 0.40, max: 0.48 };
    var multiplier = 1.0;
    if (equipment && equipment.length) {
      equipment.forEach(function (eq) {
        multiplier *= (EQUIPMENT_MULTIPLIER[eq] || 1.0);
      });
      // compound → average
      multiplier = Math.pow(multiplier, 1 / Math.max(equipment.length, 1));
    }
    return {
      min: Math.min(base.min * multiplier, 0.70),
      mid: Math.min(base.mid * multiplier, 0.75),
      max: Math.min(base.max * multiplier, 0.80)
    };
  }

  function getEquipmentCost(equipment) {
    var totalMin = 0, totalMax = 0;
    if (equipment && equipment.length) {
      equipment.forEach(function (eq) {
        var cost = EQUIPMENT_COST[eq];
        if (cost) { totalMin += cost.min; totalMax += cost.max; }
      });
    } else {
      totalMin = 5000; totalMax = 15000;
    }
    return { min: totalMin, max: totalMax, mid: (totalMin + totalMax) / 2 };
  }

  function getCO2(equipment, operatorReduction) {
    var total = 0;
    if (equipment && equipment.length) {
      equipment.forEach(function (eq) {
        total += CO2_PER_EQUIPMENT[eq] || 0.4;
      });
    }
    return total * (1 + operatorReduction * 0.15); // more operators reduced → more efficiency
  }

  /* ───────── Core calculate ───────── */

  function calculate(input) {
    var savingsRatio = getSavingsRatio(input.painPoint, input.equipment);

    // Monthly savings = (monthly labor / workers) * reduction * ratio
    // Estimate workers: assume 4 base workers for cost entered
    var estimatedWorkers = Math.max(Math.round(input.laborCost / (DEFAULT_SALARIES[input.country] || DEFAULT_SALARIES['Other']).monthly), input.operatorReduction);
    var perWorkerCost = input.laborCost / estimatedWorkers;
    var monthlySavingsBase = perWorkerCost * input.operatorReduction * savingsRatio.mid;

    var monthlySavings = {
      min: Math.round(monthlySavingsBase * (savingsRatio.min / savingsRatio.mid)),
      mid: Math.round(monthlySavingsBase),
      max: Math.round(monthlySavingsBase * (savingsRatio.max / savingsRatio.mid))
    };

    var investment = getEquipmentCost(input.equipment);
    // Convert USD investment to local currency (rough estimates)
    var usdToLocalRates = {
      'Philippines': 56, 'Indonesia': 15800, 'Vietnam': 25000,
      'Thailand': 35, 'Malaysia': 4.7, 'Other': 1
    };
    var rate = usdToLocalRates[input.country] || 1;
    var localInvestment = {
      min: Math.round(investment.min * rate),
      max: Math.round(investment.max * rate),
      mid: Math.round(investment.mid * rate)
    };

    var paybackMin = localInvestment.max / Math.max(monthlySavings.max, 1);
    var paybackMax = localInvestment.min / Math.max(monthlySavings.min, 1);

    var fiveYearReturn = {
      min: (monthlySavings.mid * 60) - localInvestment.max,
      mid: (monthlySavings.mid * 60) - localInvestment.mid,
      max: (monthlySavings.mid * 60) - localInvestment.min
    };

    var annualSavings = {
      min: monthlySavings.min * 12,
      mid: monthlySavings.mid * 12,
      max: monthlySavings.max * 12
    };

    var co2 = getCO2(input.equipment, input.operatorReduction);

    return {
      monthlySavings: monthlySavings,
      investment: localInvestment,
      payback: { min: Math.ceil(paybackMin), max: Math.ceil(paybackMax) },
      fiveYearReturn: fiveYearReturn,
      annualSavings: annualSavings,
      co2: co2
    };
  }

  
  /* ───────── i18n helper ───────── */
  function t(key) {
    if (window.translationManager && typeof window.translationManager.translate === 'function') {
      var v = window.translationManager.translate(key);
      return v !== key ? v : key;
    }
    return key;
  }

  /* ───────── Pain point → i18n key mapping ───────── */
  var PAIN_KEY_MAP = {
    'hiring_difficulty':    'profit_calc_pain_hiring',
    'high_labor_cost':      'profit_calc_pain_labor',
    'inconsistent_quality': 'profit_calc_pain_quality',
    'slow_service':         'profit_calc_pain_speed',
    'limited_space':        'profit_calc_pain_space'
  };

  /* ───────── Equipment → i18n key mapping ───────── */
  var EQUIP_KEY_MAP = {
    'smart_wok':        'profit_calc_eq_wok',
    'rice_cooker':      'profit_calc_eq_rice',
    'dishwasher':       'profit_calc_eq_dish',
    'induction_cooker': 'profit_calc_eq_induction',
    'deep_fryer':       'profit_calc_eq_fryer'
  };

/* ───────── WhatsApp message builder ───────── */

  function buildWhatsAppMessage(input, result, salaryInfo) {
    var painLabel = PAIN_KEY_MAP[input.painPoint] ? t(PAIN_KEY_MAP[input.painPoint]) : input.painPoint;
    var lc = langCurrency();
    var eqNames = (input.equipment && input.equipment.length) ? input.equipment.map(function(eq) {
      return EQUIP_KEY_MAP[eq] ? t(EQUIP_KEY_MAP[eq]) : eq;
    }).join(', ') : 'N/A';
    return [
      'Hi YuKoLi, I calculated my ROI:',
      '',
      t('profit_calc_report_challenge') + ': ' + input.country,
      t('profit_calc_labor_cost') + ': ' + formatNumber(input.laborCost) + ' ' + lc.currency,
      t('profit_calc_report_daily_output') + ': ' + input.dailyMeals,
      t('profit_calc_pain_point') + ': ' + painLabel,
      t('profit_calc_report_equipment') + ': ' + eqNames,
      '',
      t('profit_calc_report_savings') + ': ' + lc.symbol + formatNumber(result.monthlySavings.min) + ' – ' + lc.symbol + formatNumber(result.monthlySavings.max) + ' ' + lc.currency,
      t('profit_calc_payback') + ': ' + result.payback.min + '–' + result.payback.max + ' ' + t('profit_calc_months'),
      t('profit_calc_report_5year') + ': ' + lc.symbol + shortCurrency(result.fiveYearReturn.min, lc.symbol).replace(lc.symbol, '') + ' – ' + shortCurrency(result.fiveYearReturn.max, lc.symbol).replace(lc.symbol, '') + ' ' + lc.currency,
      '',
      t('profit_calc_pdf_disclaimer').replace(t('profit_calc_pdf_disclaimer').split('.')[0] + '.', '')
    ].join('\n');
  }

  /* ───────── PDF generation (html2canvas + jsPDF) ───────── */

  function generatePDF(input, result, salaryInfo) {
    // Check for required libraries
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      // Fallback to print-based method
      generatePDFFallback(input, result, salaryInfo);
      return;
    }

    var painLabel = PAIN_KEY_MAP[input.painPoint] ? t(PAIN_KEY_MAP[input.painPoint]) : input.painPoint;
    var lc = langCurrency();
    var eqNames = (input.equipment && input.equipment.length) ? input.equipment.map(function(eq) {
      return EQUIP_KEY_MAP[eq] ? t(EQUIP_KEY_MAP[eq]) : eq;
    }).join(', ') : 'N/A';

    // Build a hidden report container
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:680px;background:#fff;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;padding:40px 32px;';

    container.innerHTML =
      '<div style="border-bottom:3px solid #e11d48;padding-bottom:16px;margin-bottom:24px">' +
        '<h1 style="font-size:22px;font-weight:900;margin:0 0 4px;color:#1e293b">🍳 ' + t('profit_calc_pdf_title') + '</h1>' +
        '<p style="font-size:12px;color:#94a3b8;margin:0">' + t('profit_calc_pdf_footer') + ' ' + new Date().toLocaleDateString() + '</p>' +
      '</div>' +

      '<h2 style="font-size:15px;font-weight:700;color:#64748b;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">' + t('profit_calc_pdf_input') + '</h2>' +
      pdfRow(t('profit_calc_pdf_country'), input.country) +
      pdfRow(t('profit_calc_labor_cost'), lc.symbol + formatNumber(input.laborCost) + ' ' + lc.currency) +
      pdfRow(t('profit_calc_pdf_daily_meals'), input.dailyMeals) +
      pdfRow(t('profit_calc_pdf_main_challenge'), painLabel) +
      pdfRow(t('profit_calc_pdf_planned_equipment'), eqNames) +
      pdfRow(t('profit_calc_pdf_operator_reduction'), input.operatorReduction + ' ' + t('profit_calc_operator_unit')) +

      '<h2 style="font-size:15px;font-weight:700;color:#64748b;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.05em">' + t('profit_calc_pdf_results') + '</h2>' +

      '<div style="background:#fff1f2;border-radius:12px;padding:20px;margin-bottom:16px">' +
        pdfRow(t('profit_calc_pdf_monthly_savings'), lc.symbol + formatNumber(result.monthlySavings.min) + ' – ' + lc.symbol + formatNumber(result.monthlySavings.max)) +
        pdfRow(t('profit_calc_pdf_equipment_investment'), lc.symbol + formatNumber(result.investment.min) + ' – ' + lc.symbol + formatNumber(result.investment.max)) +
        '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #fecdd3">' +
          '<span style="color:#64748b;font-size:13px">' + t('profit_calc_pdf_payback_period') + '</span>' +
          '<span style="font-weight:900;font-size:20px;color:#e11d48">' + result.payback.min + '–' + result.payback.max + ' ' + t('profit_calc_months') + '</span>' +
        '</div>' +
        pdfRow(t('profit_calc_pdf_5year_return'), lc.symbol + shortCurrency(result.fiveYearReturn.min, lc.symbol) + ' – ' + lc.symbol + shortCurrency(result.fiveYearReturn.max, lc.symbol)) +
        pdfRow(t('profit_calc_pdf_annual_savings'), lc.symbol + shortCurrency(result.annualSavings.mid, lc.symbol)) +
        pdfRow(t('profit_calc_pdf_co2'), result.co2.toFixed(1) + ' ' + t('profit_calc_co2_unit')) +
      '</div>' +

      '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">' +
        '<p style="font-size:10px;color:#94a3b8;text-align:center;margin:0">' + t('profit_calc_pdf_disclaimer') + '</p>' +
      '</div>';

    document.body.appendChild(container);

    html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    }).then(function(canvas) {
      document.body.removeChild(container);

      var JSPDF = window.jspdf.jsPDF || jsPDF;
      var pdf = new JSPDF('p', 'mm', 'a4');
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var margin = 10;
      var contentWidth = pageWidth - margin * 2;
      var imgHeight = canvas.height * contentWidth / canvas.width;

      // Single page (content fits in A4)
      if (imgHeight <= pageHeight - margin * 2) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentWidth, imgHeight);
      } else {
        // Multi-page support
        var pageImgHeight = pageHeight - margin * 2;
        var remainingHeight = imgHeight;
        var position = 0;
        var page = 0;
        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG',
            margin, margin - position, contentWidth, imgHeight);
          remainingHeight -= pageImgHeight;
          position += pageImgHeight;
          page++;
        }
      }

      var filename = 'YuKoLi-ROI-Report-' + new Date().toISOString().slice(0, 10) + '.pdf';
      pdf.save(filename);
    }).catch(function(err) {
      document.body.removeChild(container);
      console.error('[ProfitCalc] PDF generation failed:', err);
      // Fallback
      generatePDFFallback(input, result, salaryInfo);
    });
  }

  /** Simple table row helper */
  function pdfRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0">' +
      '<span style="color:#64748b;font-size:13px">' + label + '</span>' +
      '<span style="font-weight:700;font-size:13px;color:#1e293b">' + value + '</span>' +
    '</div>';
  }

  /** Fallback: open print dialog */
  function generatePDFFallback(input, result, salaryInfo) {
    var painLabel = PAIN_KEY_MAP[input.painPoint] ? t(PAIN_KEY_MAP[input.painPoint]) : input.painPoint;
    var lc = langCurrency();
    var eqNames = (input.equipment && input.equipment.length) ? input.equipment.map(function(eq) {
      return EQUIP_KEY_MAP[eq] ? t(EQUIP_KEY_MAP[eq]) : eq;
    }).join(', ') : 'N/A';
    var html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + t('profit_calc_pdf_title') + '</title>',
      '<style>',
      'body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1e293b}',
      'h1{font-size:24px;border-bottom:3px solid #e11d48;padding-bottom:12px}',
      'h2{font-size:18px;margin-top:24px;color:#475569}',
      '.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}',
      '.label{color:#64748b;font-size:14px}',
      '.value{font-weight:700;font-size:14px}',
      '.highlight{background:#fff1f2;padding:16px;border-radius:8px;margin:16px 0}',
      '.highlight .big{font-size:28px;font-weight:900;color:#e11d48}',
      '.footer{margin-top:32px;font-size:11px;color:#94a3b8;text-align:center}',
      '</style></head><body>',
      '<h1>🍳 ' + t('profit_calc_pdf_title') + '</h1>',
      '<h2>' + t('profit_calc_pdf_input') + '</h2>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_country') + '</span><span class="value">' + input.country + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_labor_cost') + '</span><span class="value">' + lc.symbol + formatNumber(input.laborCost) + ' ' + lc.currency + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_daily_meals') + '</span><span class="value">' + input.dailyMeals + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_main_challenge') + '</span><span class="value">' + painLabel + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_planned_equipment') + '</span><span class="value">' + eqNames + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_operator_reduction') + '</span><span class="value">' + input.operatorReduction + ' ' + t('profit_calc_operator_unit') + '</span></div>',
      '<h2>' + t('profit_calc_pdf_results') + '</h2>',
      '<div class="highlight">',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_monthly_savings') + '</span><span class="value">' + lc.symbol + formatNumber(result.monthlySavings.min) + ' – ' + lc.symbol + formatNumber(result.monthlySavings.max) + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_equipment_investment') + '</span><span class="value">' + lc.symbol + formatNumber(result.investment.min) + ' – ' + lc.symbol + formatNumber(result.investment.max) + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_payback_period') + '</span><span class="value big">' + result.payback.min + '–' + result.payback.max + ' ' + t('profit_calc_months') + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_5year_return') + '</span><span class="value">' + lc.symbol + shortCurrency(result.fiveYearReturn.min, lc.symbol) + ' – ' + lc.symbol + shortCurrency(result.fiveYearReturn.max, lc.symbol) + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_annual_savings') + '</span><span class="value">' + lc.symbol + shortCurrency(result.annualSavings.mid, lc.symbol) + '</span></div>',
      '<div class="row"><span class="label">' + t('profit_calc_pdf_co2') + '</span><span class="value">' + result.co2.toFixed(1) + ' ' + t('profit_calc_co2_unit') + '</span></div>',
      '</div>',
      '<div class="footer">' + t('profit_calc_pdf_footer') + new Date().toLocaleDateString() + '<br>' + t('profit_calc_pdf_disclaimer') + '</div>',
      '</body></html>'
    ].join('');

    var win = window.open('', '_blank', 'noopener');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(function () { win.print(); }, 500);
    }
  }

  /* ───────── Chart rendering ───────── */

  function renderChart(canvasId, result, salaryInfo) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var sym = langCurrency().symbol;

    // Destroy previous chart instance
    if (canvas._chartInstance) canvas._chartInstance.destroy();

    var ctx = canvas.getContext('2d');
    var chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [t('profit_calc_chart_monthly_savings'), t('profit_calc_chart_annual_savings'), t('profit_calc_chart_investment'), t('profit_calc_chart_5year_return')],
        datasets: [
          {
            label: t('profit_calc_chart_min'),
            data: [result.monthlySavings.min, result.annualSavings.min, -result.investment.max, result.fiveYearReturn.min],
            backgroundColor: 'rgba(225,29,72,0.2)',
            borderColor: 'rgba(225,29,72,0.6)',
            borderWidth: 1
          },
          {
            label: t('profit_calc_chart_max'),
            data: [result.monthlySavings.max, result.annualSavings.max, -result.investment.min, result.fiveYearReturn.max],
            backgroundColor: 'rgba(225,29,72,0.6)',
            borderColor: 'rgba(225,29,72,1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.raw;
                return ctx.dataset.label + ': ' + sym + formatNumber(Math.abs(v));
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function (v) { return sym + shortCurrency(Math.abs(v), sym).replace(sym, ''); }
            }
          }
        }
      }
    });

    canvas._chartInstance = chart;
  }

  /* ───────── UI Controller ───────── */

  function ProfitCalculator(opts) {
    this.formId = opts.formId || 'profit-calc-form';
    this.resultId = opts.resultId || 'profit-result-panel';
    this.chartCanvasId = opts.chartCanvasId || 'profit-chart';
    this.countrySelectId = opts.countrySelectId || 'pc-country';
    this.laborInputId = opts.laborInputId || 'pc-labor-cost';
    this.stepsMode = opts.stepsMode || false;

    // Store reference for language change re-render
    window._profitCalcInstance = this;

    this.init();
  }

  ProfitCalculator.prototype.init = function () {
    var self = this;
    var countryEl = document.getElementById(this.countrySelectId);
    if (countryEl) {
      countryEl.addEventListener('change', function () {
        var info = DEFAULT_SALARIES[this.value];
        var laborEl = document.getElementById(self.laborInputId);
        if (info && laborEl && !laborEl.dataset.touched) {
          laborEl.value = info.monthly;
        }
      });
    }

    // Mark labor input as touched on manual edit
    var laborEl = document.getElementById(this.laborInputId);
    if (laborEl) {
      laborEl.addEventListener('input', function () {
        this.dataset.touched = 'true';
      });
    }

    // Range slider value display
    var rangeEl = document.getElementById('pc-operator-reduction');
    var rangeValEl = document.getElementById('pc-operator-value');
    if (rangeEl && rangeValEl) {
      rangeEl.addEventListener('input', function () {
        rangeValEl.textContent = this.value;
      });
    }
  };

  ProfitCalculator.prototype.getInput = function () {
    var country = document.getElementById(this.countrySelectId).value;
    var salaryInfo = DEFAULT_SALARIES[country] || DEFAULT_SALARIES['Other'];

    // Gather equipment
    var equipment = [];
    document.querySelectorAll('.pc-equipment:checked').forEach(function (cb) {
      equipment.push(cb.value);
    });

    return {
      country: country,
      laborCost: parseFloat(document.getElementById(this.laborInputId).value) || salaryInfo.monthly,
      dailyMeals: parseInt(document.getElementById('pc-daily-meals').value, 10) || 200,
      painPoint: document.getElementById('pc-pain-point').value || 'high_labor_cost',
      equipment: equipment,
      operatorReduction: parseInt(document.getElementById('pc-operator-reduction').value, 10) || 2,
      salaryInfo: salaryInfo
    };
  };

  ProfitCalculator.prototype.run = function () {
    var input = this.getInput();
    var result = calculate(input);

    // Show result panel
    var panel = document.getElementById(this.resultId);
    if (panel) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Steps mode: switch to step 2
    if (this.stepsMode) {
      var step1 = document.getElementById('pc-step-1');
      var step2 = document.getElementById('pc-step-2');
      if (step1) step1.classList.add('hidden');
      if (step2) step2.classList.remove('hidden');
    }

    this.renderResults(result, input.salaryInfo);
    this.renderChart(result, input.salaryInfo);
    this.storeLastResult(input, result);
  };

  ProfitCalculator.prototype.renderResults = function (r, info) {
    var sym = langCurrency().symbol;
    var helpers = {
      fmt: formatNumber,
      short: function (n) { return shortCurrency(n, sym); }
    };

    // Bind data attributes
    var els = {
      'res-monthly-savings': sym + helpers.fmt(r.monthlySavings.min) + ' – ' + sym + helpers.fmt(r.monthlySavings.max),
      'res-investment': sym + helpers.fmt(r.investment.min) + ' – ' + sym + helpers.fmt(r.investment.max),
      'res-payback': r.payback.min + '–' + r.payback.max,
      'res-five-year': helpers.short(r.fiveYearReturn.min) + ' – ' + helpers.short(r.fiveYearReturn.max),
      'res-annual': helpers.short(r.annualSavings.mid),
      'res-co2': r.co2.toFixed(1)
    };

    Object.keys(els).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = els[id];
    });
  };

  ProfitCalculator.prototype.renderChart = function (result, salaryInfo) {
    renderChart(this.chartCanvasId, result, salaryInfo);
  };

  ProfitCalculator.prototype.storeLastResult = function (input, result) {
    this._lastInput = input;
    this._lastResult = result;
  };

  ProfitCalculator.prototype.restoreLastResult = function () { return false; };

  ProfitCalculator.prototype.shareWhatsApp = function () {
    if (!this._lastInput || !this._lastResult) return;
    var msg = buildWhatsAppMessage(this._lastInput, this._lastResult, this._lastInput.salaryInfo);
    var url = (window.Contacts && typeof window.Contacts.contactsWhatsApp === 'function')
      ? window.Contacts.contactsWhatsApp({ source: 'ROI Calculator', message: msg })
      : 'https://wa.me/' + (window.Contacts ? window.Contacts.whatsapp : '8613163756465') + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank', 'noopener');
  };

  ProfitCalculator.prototype.downloadPDF = function () {
    if (!this._lastInput || !this._lastResult) return;
    generatePDF(this._lastInput, this._lastResult, this._lastInput.salaryInfo);
  };

  ProfitCalculator.prototype.resetSteps = function () {
    var step1 = document.getElementById('pc-step-1');
    var step2 = document.getElementById('pc-step-2');
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
  };


  /**
   * Apply URL parameters to auto-fill the form.
   * Supports direct params (country, meals, pain, equipment, operators)
   * and scene presets (scene=chain-restaurant).
   */
  ProfitCalculator.prototype.applyPreset = function () {
    var params = new URLSearchParams(window.location.search);
    var scene = params.get('scene');

    // Load scene preset as defaults
    var preset = scene && SCENE_PRESETS[scene] ? SCENE_PRESETS[scene] : {};

    // URL params override preset values
    var country    = params.get('country') || '';
    var meals      = parseInt(params.get('meals'), 10) || preset.meals || 0;
    var pain       = params.get('pain') || preset.pain || '';
    var equipStr   = params.get('equipment') || '';
    var equipment  = equipStr ? equipStr.split(',').map(function (s) { return s.trim(); })
                              : (preset.equipment || []);
    var operators  = parseInt(params.get('operators'), 10) || preset.operators || 2;
    var autoCalc   = params.get('calc') !== '0'; // auto-calc by default when params exist

    // No valid preset and no explicit params — do nothing
    if (!scene && !params.has('meals') && !params.has('pain') && !params.has('equipment')) {
      return false;
    }

    var self = this;

    // Fill country (triggers labor cost auto-fill)
    if (country) {
      var countryEl = document.getElementById(this.countrySelectId);
      if (countryEl) {
        countryEl.value = country;
        countryEl.dispatchEvent(new Event('change'));
      }
    }

    // Fill daily meals
    if (meals > 0) {
      var mealsEl = document.getElementById('pc-daily-meals');
      if (mealsEl) mealsEl.value = meals;
    }

    // Fill pain point
    if (pain) {
      var painEl = document.getElementById('pc-pain-point');
      if (painEl) painEl.value = pain;
    }

    // Check equipment checkboxes
    if (equipment.length) {
      document.querySelectorAll('.pc-equipment').forEach(function (cb) {
        cb.checked = equipment.indexOf(cb.value) !== -1;
      });
    }

    // Set operator reduction slider
    var rangeEl = document.getElementById('pc-operator-reduction');
    var rangeValEl = document.getElementById('pc-operator-value');
    if (rangeEl) {
      rangeEl.value = operators;
      if (rangeValEl) rangeValEl.textContent = operators;
    }

    // Auto-trigger calculation after a short delay (let DOM settle)
    if (autoCalc) {
      setTimeout(function () {
        self.run();
      }, 300);
    }

    return true;
  };

  /* ───────── Expose ───────── */
  window.ProfitCalculator = ProfitCalculator;
  window.ProfitCalculatorData = { DEFAULT_SALARIES: DEFAULT_SALARIES };

  // Expose for languageChanged listener (outside IIFE)
  window._pcLangCurrency = langCurrency;
  window._pcRenderChart = renderChart;
})();

/* ───────── SPA auto-init on spa:load ───────── */
document.addEventListener("spa:load", function initProfitCalc() {
  var form = document.getElementById("profit-calc-form");
  if (!form || form._spaInitialized) return;
  form._spaInitialized = true;

  // Detect mobile by presence of back-btn (only mobile has steps mode)
  var isMobile = !!document.getElementById("pc-back-btn");

  var calc = new ProfitCalculator({
    formId:        "profit-calc-form",
    resultId:      "profit-result-panel",
    chartCanvasId: "profit-chart",
    countrySelectId: "pc-country",
    laborInputId:  "pc-labor-cost",
    stepsMode:     isMobile
  });
  window._profitCalcInstance = calc;

  // Bind buttons
  var calcBtn = document.getElementById("pc-calc-btn");
  var backBtn = document.getElementById("pc-back-btn");
  var whatsappBtn = document.getElementById("pc-whatsapp-btn");
  var pdfBtn = document.getElementById("pc-pdf-btn");
  var placeholder = document.getElementById("profit-placeholder");

  if (calcBtn) {
    calcBtn.addEventListener("click", function () {
      if (placeholder) placeholder.classList.add("hidden");
      calc.run();
    });
  }
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      calc.resetSteps();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  if (whatsappBtn) {
    whatsappBtn.addEventListener("click", function () {
      calc.shareWhatsApp();
    });
  }
  if (pdfBtn) {
    pdfBtn.addEventListener("click", function () {
      calc.downloadPDF();
    });
  }

  // Apply URL presets if any
  calc.applyPreset();


});

// Debug: verify script loaded and languageChanged works
console.log('[PC] script loaded, testing languageChanged dispatch...');
window.addEventListener("languageChanged", function (e) {
  console.log('[PC langChange] EVENT RECEIVED', e && e.detail);
}, true); // capture phase

// On language change, re-render results with new currency/labels
window.addEventListener("languageChanged", function () {
  var calc = window._profitCalcInstance;
  if (calc && calc._lastResult && calc._lastInput) {
    calc.renderResults(calc._lastResult, calc._lastInput.salaryInfo);
    calc.renderChart(calc._lastResult, calc._lastInput.salaryInfo);
  }
});
