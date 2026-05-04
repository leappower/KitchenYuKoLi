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
    '招工难':  { min: 0.40, mid: 0.50, max: 0.58 },
    '人工成本高': { min: 0.45, mid: 0.55, max: 0.68 },
    '出品不稳定': { min: 0.32, mid: 0.42, max: 0.52 },
    '出餐慢':  { min: 0.36, mid: 0.46, max: 0.55 },
    '空间不足': { min: 0.30, mid: 0.40, max: 0.48 }
  };

  /* ───────── Equipment cost ranges (USD) ───────── */
  var EQUIPMENT_COST = {
    '智能炒菜机': { min: 3000, max: 8000 },
    '蒸饭柜':     { min: 1500, max: 4000 },
    '洗碗机':     { min: 2000, max: 5000 },
    '电磁炉':     { min: 500,  max: 2000 },
    '油炸炉':     { min: 1000, max: 3000 }
  };

  /* ───────── Equipment multipliers (boost savings) ───────── */
  var EQUIPMENT_MULTIPLIER = {
    '智能炒菜机': 1.15,
    '蒸饭柜':     1.05,
    '洗碗机':     1.10,
    '电磁炉':     1.03,
    '油炸炉':     1.06
  };

  /* ───────── CO₂ reduction per equipment (tonnes / year) ───────── */
  var CO2_PER_EQUIPMENT = {
    '智能炒菜机': 2.1,
    '蒸饭柜':     0.8,
    '洗碗机':     1.2,
    '电磁炉':     0.5,
    '油炸炉':     0.7
  };


  /* ───────── Scene presets (from application page deep-links) ───────── */

  var SCENE_PRESETS = {
    'chain-restaurant':  { meals: 500,  pain: '人工成本高', equipment: ['智能炒菜机', '蒸饭柜'], operators: 3 },
    'central-kitchen':   { meals: 2000, pain: '招工难',   equipment: ['智能炒菜机', '蒸饭柜', '洗碗机'], operators: 5 },
    'small-restaurant':  { meals: 150,  pain: '出餐慢',   equipment: ['智能炒菜机'], operators: 1 },
    'canteen':           { meals: 1000, pain: '招工难',   equipment: ['智能炒菜机', '蒸饭柜', '洗碗机', '油炸炉'], operators: 4 },
    'cloud-kitchen':     { meals: 300,  pain: '空间不足', equipment: ['智能炒菜机', '电磁炉'], operators: 2 },
    'menu-lab':          { meals: 200,  pain: '出品不稳定', equipment: ['智能炒菜机'], operators: 2 }
  };

  /* ───────── Helpers ───────── */

  function formatNumber(n, decimals) {
    if (decimals === undefined) decimals = 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function shortCurrency(n, symbol) {
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

  /* ───────── WhatsApp message builder ───────── */

  function buildWhatsAppMessage(input, result, salaryInfo) {
    var eqList = (input.equipment && input.equipment.length) ? input.equipment.join(', ') : 'N/A';
    return [
      'Hi YuKoLi, I calculated my ROI:',
      '',
      'Country: ' + input.country,
      'Monthly Labor Cost: ' + formatNumber(input.laborCost) + ' ' + salaryInfo.currency,
      'Daily Output: ' + input.dailyMeals + ' meals',
      'Main Challenge: ' + input.painPoint,
      'Equipment: ' + eqList,
      '',
      'Estimated Monthly Savings: ' + salaryInfo.symbol + formatNumber(result.monthlySavings.min) + ' – ' + salaryInfo.symbol + formatNumber(result.monthlySavings.max) + ' ' + salaryInfo.currency,
      'Estimated Payback: ' + result.payback.min + '–' + result.payback.max + ' months',
      '5-Year Total Return: ' + salaryInfo.symbol + shortCurrency(result.fiveYearReturn.min, salaryInfo.symbol).replace(salaryInfo.symbol, '') + ' – ' + shortCurrency(result.fiveYearReturn.max, salaryInfo.symbol).replace(salaryInfo.symbol, '') + ' ' + salaryInfo.currency,
      '',
      'Please send me a detailed proposal.'
    ].join('\n');
  }

  /* ───────── PDF generation (simple HTML→print) ───────── */

  function generatePDF(input, result, salaryInfo) {
    var eqList = (input.equipment && input.equipment.length) ? input.equipment.join(', ') : 'N/A';
    var html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>YuKoLi ROI Report</title>',
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
      '<h1>🍳 YuKoLi Kitchen Equipment — ROI Report</h1>',
      '<h2>📋 Input Summary</h2>',
      '<div class="row"><span class="label">Country</span><span class="value">' + input.country + '</span></div>',
      '<div class="row"><span class="label">Monthly Labor Cost</span><span class="value">' + salaryInfo.symbol + formatNumber(input.laborCost) + ' ' + salaryInfo.currency + '</span></div>',
      '<div class="row"><span class="label">Daily Meals Output</span><span class="value">' + input.dailyMeals + '</span></div>',
      '<div class="row"><span class="label">Main Challenge</span><span class="value">' + input.painPoint + '</span></div>',
      '<div class="row"><span class="label">Planned Equipment</span><span class="value">' + eqList + '</span></div>',
      '<div class="row"><span class="label">Operator Reduction</span><span class="value">' + input.operatorReduction + ' people</span></div>',
      '<h2>💰 Estimated Results</h2>',
      '<div class="highlight">',
      '<div class="row"><span class="label">Monthly Savings</span><span class="value">' + salaryInfo.symbol + formatNumber(result.monthlySavings.min) + ' – ' + salaryInfo.symbol + formatNumber(result.monthlySavings.max) + '</span></div>',
      '<div class="row"><span class="label">Equipment Investment</span><span class="value">' + salaryInfo.symbol + formatNumber(result.investment.min) + ' – ' + salaryInfo.symbol + formatNumber(result.investment.max) + '</span></div>',
      '<div class="row"><span class="label">Payback Period</span><span class="value big">' + result.payback.min + '–' + result.payback.max + ' months</span></div>',
      '<div class="row"><span class="label">5-Year Cumulative Return</span><span class="value">' + salaryInfo.symbol + shortCurrency(result.fiveYearReturn.min, salaryInfo.symbol) + ' – ' + salaryInfo.symbol + shortCurrency(result.fiveYearReturn.max, salaryInfo.symbol) + '</span></div>',
      '<div class="row"><span class="label">Annual Savings</span><span class="value">' + salaryInfo.symbol + shortCurrency(result.annualSavings.mid, salaryInfo.symbol) + '</span></div>',
      '<div class="row"><span class="label">CO₂ Reduction (est.)</span><span class="value">' + result.co2.toFixed(1) + ' tonnes/year</span></div>',
      '</div>',
      '<div class="footer">Generated by YuKoLi Kitchen Equipment Profit Calculator — ' + new Date().toLocaleDateString() + '<br>Estimates are for reference only. Contact YuKoLi for a detailed proposal.</div>',
      '</body></html>'
    ].join('');

    var win = window.open('', '_blank');
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

    // Destroy previous chart instance
    if (canvas._chartInstance) canvas._chartInstance.destroy();

    var ctx = canvas.getContext('2d');
    var chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Monthly\nSavings', 'Annual\nSavings', 'Equipment\nInvestment', '5-Year\nReturn'],
        datasets: [
          {
            label: 'Min',
            data: [result.monthlySavings.min, result.annualSavings.min, -result.investment.max, result.fiveYearReturn.min],
            backgroundColor: 'rgba(225,29,72,0.2)',
            borderColor: 'rgba(225,29,72,0.6)',
            borderWidth: 1
          },
          {
            label: 'Max',
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
                return ctx.dataset.label + ': ' + salaryInfo.symbol + formatNumber(Math.abs(v));
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function (v) { return salaryInfo.symbol + shortCurrency(Math.abs(v), salaryInfo.symbol).replace(salaryInfo.symbol, ''); }
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
      painPoint: document.getElementById('pc-pain-point').value || '人工成本高',
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
    var sym = info.symbol;
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

  ProfitCalculator.prototype.shareWhatsApp = function () {
    if (!this._lastInput || !this._lastResult) return;
    var msg = buildWhatsAppMessage(this._lastInput, this._lastResult, this._lastInput.salaryInfo);
    var url = (window.Contacts && typeof window.Contacts.contactsWhatsApp === 'function')
      ? window.Contacts.contactsWhatsApp({ source: 'ROI Calculator', message: msg })
      : 'https://wa.me/8613163756465?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
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
