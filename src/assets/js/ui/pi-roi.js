/**
 * pi-roi.js — ROI Calculator (extracted from page-interactions.js §7)
 * Self-contained IIFE — no dependencies on page-interactions.js
 *
 * Depends on:
 *   Chart.js (optional — graceful degradation if absent)
 *   window.showNotification (optional — from smart-popup.js)
 */
(function (global) {
  "use strict";

  // ─── Helpers (from PiHelpers) ─────────────────────────────────────────
  var _h = global.PiHelpers || {};
  var safeCall = _h.safeCall || function (fnName, args) {
    if (typeof global[fnName] === "function") return global[fnName].apply(null, args || []);
  };

  /**
   * Animate a numeric value from its current text content to `target`.
   */
  function animateNumber(el, target, duration, suffix) {
    if (!el) return;
    var start = parseFloat(el.textContent) || 0;
    var startTs = null;
    var suf = suffix || "";
    var isFloat = String(target).indexOf(".") !== -1;
    var frameCount = 0;

    function step(ts) {
      if (!startTs) startTs = ts;
      var progress = Math.min((ts - startTs) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = start + (target - start) * ease;

      if (frameCount % 2 === 0) {
        el.textContent = isFloat ? current.toFixed(1) + suf : Math.round(current) + suf;
      }
      frameCount++;

      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /**
   * iOS-style full-screen loading overlay
   */
  function showSpinner() {
    if (document.getElementById("roi-loading-overlay")) return;
    var overlay = document.createElement("div");
    overlay.id = "roi-loading-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;";
    overlay.innerHTML = '<div style="width:48px;height:48px;border:3px solid #e5e7eb;border-top-color:rgb(236,91,19);border-radius:50%;animation:roi-spin 0.7s linear infinite;"></div><span style="font-size:14px;font-weight:600;color:#64748b;">计算中...</span>';
    if (!document.getElementById("roi-spinner-style")) {
      var style = document.createElement("style");
      style.id = "roi-spinner-style";
      style.textContent = "@keyframes roi-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
    }
    document.body.appendChild(overlay);
  }

  function hideSpinner() {
    var overlay = document.getElementById("roi-loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.3s";
      setTimeout(function () { overlay.remove(); }, 300);
    }
  }

  // ─── Chart instances (module-level for language change re-render) ──
  var cumulativeChart = null;
  var laborCompareChart = null;
  var CHART_PRIMARY = "rgb(236, 91, 19)";
  var CHART_PRIMARY_A = "rgba(236, 91, 19, 0.15)";
  var CHART_SLATE = "rgba(148, 163, 184, 0.6)";

  // ─── 7. ROI Calculator logic ──────────────────────────────────────────
  function initROICalculator() {
    var recalcBtn = document.getElementById("roi-recalc-btn");
    if (!recalcBtn) return;

    // Input references
    var outletsInput = document.getElementById("roi-outlets");
    var chefsInput = document.getElementById("roi-chefs");
    var salaryInput = document.getElementById("roi-salary");
    var energyInput = document.getElementById("roi-energy");

    // KPI card text targets
    var kpiROI = document.getElementById("roi-kpi-roi");
    var kpiPayback = document.getElementById("roi-kpi-payback");
    var kpiSavings = document.getElementById("roi-kpi-savings");

    // Benefit bars
    var laborPct = document.getElementById("roi-labor-pct");
    var laborBar = document.getElementById("roi-labor-bar");
    var energyPct = document.getElementById("roi-energy-pct");
    var energyBar = document.getElementById("roi-energy-bar");

    // Strategy toggle buttons
    var strategyBtns = document.querySelectorAll(".roi-strategy-btn");
    var deployStrategy = "phased";

    // ─── §2.3 Chart.js ──────────────────────────────────────────────────

    // 销毁旧 Chart 实例（SPA 重复导航时 canvas 已被替换）
    if (typeof global.Chart !== "undefined") {
      var _cc = document.getElementById("roi-cumulative-chart");
      if (_cc && _cc.chart) { try { _cc.chart.destroy(); } catch (e) { } }
      var _lc = document.getElementById("roi-labor-compare-chart");
      if (_lc && _lc.chart) { try { _lc.chart.destroy(); } catch (e) { } }
    }

    function initCharts() {
      if (typeof global.Chart === "undefined") return;

      var cumulativeCanvas = document.getElementById("roi-cumulative-chart");
      if (cumulativeCanvas && !cumulativeChart) {
        cumulativeChart = new global.Chart(cumulativeCanvas, {
          type: "bar",
          data: {
            labels: ["YEAR 1", "YEAR 2", "YEAR 3", "YEAR 4", "YEAR 5"],
            datasets: [
              {
                label: "Net Profit ($k)",
                data: [0, 0, 0, 0, 0],
                backgroundColor: [CHART_PRIMARY_A, CHART_PRIMARY_A, CHART_PRIMARY_A, CHART_PRIMARY_A, CHART_PRIMARY],
                borderColor: CHART_PRIMARY,
                borderWidth: 2,
                borderRadius: 6,
                order: 1,
              },
              {
                label: "Baseline Cost ($k)",
                data: [0, 0, 0, 0, 0],
                backgroundColor: CHART_SLATE,
                borderWidth: 0,
                borderRadius: 4,
                order: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15,23,42,0.9)',
                titleFont: { size: 12, weight: '600' },
                bodyFont: { size: 13, weight: '600' },
                padding: 10,
                cornerRadius: 8,
                displayColors: true,
                boxPadding: 4,
                callbacks: {
                  label: function (ctx) {
                    var cfg = window.Currency && window.Currency.getConfig();
                    if (!cfg) return ctx.dataset.label + ": " + ctx.parsed.y.toFixed(0) + "k";
                    return ctx.dataset.label + ": " + ctx.parsed.y.toFixed(0) + (cfg.unit || 'K');
                  },
                },
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 12, weight: "700" }, color: "#475569" } },
              y: { grid: { color: "rgba(148,163,184,0.15)" }, ticks: { font: { size: 11, weight: "500" }, color: "#475569", callback: function (v) { var c = window.Currency && window.Currency.getConfig(); var u = c ? (c.unit || 'K') : 'K'; return v + u; } } },
            },
          },
        });
      }

      var laborCanvas = document.getElementById("roi-labor-compare-chart");
      if (laborCanvas && !laborCompareChart) {
        laborCompareChart = new global.Chart(laborCanvas, {
          type: "line",
          data: {
            labels: ["Mo 1", "Mo 3", "Mo 6", "Mo 9", "Mo 12", "Mo 18", "Mo 24"],
            datasets: [
              {
                label: "Manual Labor ($k)",
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: CHART_SLATE,
                backgroundColor: "transparent",
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.3,
              },
              {
                label: "Automated ($k)",
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: CHART_PRIMARY,
                backgroundColor: CHART_PRIMARY_A,
                borderWidth: 2,
                pointRadius: 3,
                fill: true,
                tension: 0.3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15,23,42,0.9)',
                titleFont: { size: 12, weight: '600' },
                bodyFont: { size: 13, weight: '600' },
                padding: 10,
                cornerRadius: 8,
                boxPadding: 4,
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#475569" } },
              y: { grid: { color: "rgba(148,163,184,0.15)" }, ticks: { font: { size: 11, weight: "500" }, color: "#475569", callback: function (v) { var c = window.Currency && window.Currency.getConfig(); var u = c ? (c.unit || 'K') : 'K'; return v + u; } } },
            },
          },
        });
      }
    }

    function updateCharts(annualSavings, labor, laborSavingRate) {
      if (!cumulativeChart && !laborCompareChart) return;

      // Chart 数据始终以 CNY 万元为单位，不换算汇率，只换标签
      var cfg = (window.Currency && window.Currency.getConfig()) || { rate: 1, unit: '万元' };
      var annualInUnit = annualSavings / 10000; // CNY 万元
      var laborInUnit = labor / 10000; // CNY 万元

      var cumNetProfit = [
        Math.round(annualInUnit * 0.15),
        Math.round(annualInUnit * 0.45),
        Math.round(annualInUnit * 0.75),
        Math.round(annualInUnit * 1.1),
        Math.round(annualInUnit * 1.5),
      ];
      var cumBaseline = [
        Math.round(annualInUnit * 0.22),
        Math.round(annualInUnit * 0.22),
        Math.round(annualInUnit * 0.21),
        Math.round(annualInUnit * 0.23),
        Math.round(annualInUnit * 0.22),
      ];

      if (cumulativeChart) {
        cumulativeChart.data.datasets[0].data = cumNetProfit;
        cumulativeChart.data.datasets[1].data = cumBaseline;
        cumulativeChart.update();
      }

      var laborVal = laborInUnit;
      var automatedMonths = [1, 3, 6, 9, 12, 18, 24].map(function (mo) {
        var factor = Math.max(1 - laborSavingRate * (mo / 24), 1 - laborSavingRate);
        return parseFloat((laborVal * factor).toFixed(1));
      });
      var manualMonths = [1, 3, 6, 9, 12, 18, 24].map(function (mo) {
        return parseFloat((laborVal * (1 + (0.03 * mo) / 12)).toFixed(1));
      });

      if (laborCompareChart) {
        laborCompareChart.data.datasets[0].data = manualMonths;
        laborCompareChart.data.datasets[1].data = automatedMonths;
        laborCompareChart.update();
      }
    }

    // ─── Strategy buttons (use className for Tailwind / classes) ────────
    strategyBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        strategyBtns.forEach(function (b) {
          b.className = b.className.replace(/border-primary|bg-primary\/10|text-primary/g, "");
          if (b.className.indexOf("border-slate-200") === -1) b.className += " border-slate-200";
          if (b.className.indexOf("text-slate-500") === -1) b.className += " text-slate-500";
        });
        btn.className = btn.className.replace(/border-slate-200|text-slate-500/g, "");
        if (btn.className.indexOf("border-primary") === -1) btn.className += " border-primary";
        if (btn.className.indexOf("bg-primary/10") === -1) btn.className += " bg-primary/10";
        if (btn.className.indexOf("text-primary") === -1) btn.className += " text-primary";
        deployStrategy = btn.dataset.strategy || "phased";
        runCalculation();
      });
    });

    // ─── Live slider label update ───────────────────────────────────────
    if (outletsInput) {
      var outletCountSpan = document.getElementById("roi-outlet-label");
      outletsInput.addEventListener("input", function () {
        if (outletCountSpan) outletCountSpan.textContent = outletsInput.value;
        runCalculation();
      });
    }
    if (chefsInput) {
      var chefCountSpan = document.getElementById("roi-chef-label");
      chefsInput.addEventListener("input", function () {
        if (chefCountSpan) chefCountSpan.textContent = chefsInput.value;
        runCalculation();
      });
    }
    if (salaryInput) salaryInput.addEventListener("input", runCalculation);
    if (energyInput) energyInput.addEventListener("input", runCalculation);

    // ─── Recalculate button with iOS spinner ────────────────────────────
    recalcBtn.addEventListener("click", function () {
      showSpinner();
      setTimeout(function () {
        runCalculation();
        hideSpinner();
        safeCall("showNotification", ["已重新计算", "success"]);
      }, 800);
    });

    function runCalculation() {
      var outlets = parseInt((outletsInput && outletsInput.value) || 5, 10);
      var chefs = parseInt((chefsInput && chefsInput.value) || 3, 10);
      var salary = parseFloat((salaryInput && salaryInput.value) || 5000);
      var energy = parseFloat((energyInput && energyInput.value) || 8000);

      // YuKoLi ROI model (RMB-based)
      // 分批部署: 人工节省 70%, 机器按比例分批投入
      // 一次性部署: 人工节省 80%, 全部机器一次到位，初期投资更高但节省更快
      var laborSavingRate = deployStrategy === "phased" ? 0.55 : 0.85;
      var energySavingRate = 0.30;
      var machinesPerOutlet = Math.ceil(chefs * laborSavingRate);
      var machineCost = 30000;
      // 一次性部署成本更高（安装+培训+并行投入）
      var costMultiplier = deployStrategy === "phased" ? 1.0 : 0.90;
      var totalMachineCost = outlets * machinesPerOutlet * machineCost * costMultiplier;

      var monthlyLaborSave = chefs * salary * laborSavingRate;
      var monthlyEnergySave = energy * energySavingRate;
      var monthlySavings = (monthlyLaborSave + monthlyEnergySave) * outlets;
      var annualSavings = monthlySavings * 12;
      var paybackMonths = totalMachineCost / monthlySavings;
      var fiveYearROI = Math.round(((annualSavings * 5 - totalMachineCost) / totalMachineCost) * 100);

      // Sync slider labels with actual input values
      var outletLabel = document.getElementById("roi-outlet-label");
      if (outletLabel) outletLabel.textContent = outlets;
      var chefLabel = document.getElementById("roi-chef-label");
      if (chefLabel) chefLabel.textContent = chefs;

      // Update KPI cards
      if (kpiROI) animateNumber(kpiROI, Math.max(0, fiveYearROI), 500, "%");
      if (kpiPayback) animateNumber(kpiPayback, Math.min(99, Math.round(paybackMonths * 10) / 10), 500, "");
      if (kpiSavings) {
        var savings = window.Currency ? window.Currency.formatCurrencyWan(annualSavings) : { display: String(Math.round(annualSavings / 10000)) };
        animateNumber(kpiSavings, parseFloat(savings.display) || 0, 500, "");
      }

      // Update benefit bars
      var totalMonthly = monthlyLaborSave + monthlyEnergySave;
      if (laborPct && laborBar) {
        var lp = Math.round((monthlyLaborSave / totalMonthly) * 100);
        laborPct.textContent = lp + "%";
        laborBar.style.width = lp + "%";
      }
      if (energyPct && energyBar) {
        var ep = Math.round((monthlyEnergySave / totalMonthly) * 100);
        energyPct.textContent = ep + "%";
        energyBar.style.width = ep + "%";
      }

      updateCharts(annualSavings, chefs * salary, laborSavingRate);
    }

    initCharts();
    runCalculation();
  }

  var _roiInitialized = false;
  function init() {
    if (_roiInitialized) { initROICalculator(); return; }
    _roiInitialized = true;
    initROICalculator();
  }

  document.addEventListener("DOMContentLoaded", function () { _roiInitialized = true; initROICalculator(); });
  document.addEventListener("spa:load", init);

  // Language change: only refresh chart labels (no recalculation needed — ROI is currency-independent)
  global.addEventListener('languageChanged', function () {
    requestAnimationFrame(function () {
      if (cumulativeChart) cumulativeChart.update();
      if (laborCompareChart) laborCompareChart.update();
    });
  });

  // SPA navigation: just refresh charts for new canvas
  document.addEventListener('spa:load', function () {
    setTimeout(function () {
      if (cumulativeChart) cumulativeChart.update();
      if (laborCompareChart) laborCompareChart.update();
    }, 200);
  });
})(window);
