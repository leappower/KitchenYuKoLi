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
   * @param {HTMLElement} el       - Target element whose textContent will animate
   * @param {number}      target   - Final numeric value
   * @param {number}      duration - Animation duration in ms
   * @param {string}      [suffix] - Appended after the number (e.g. "%")
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
      // Ease-out cubic
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = start + (target - start) * ease;

      // ✅ Only update DOM every 2 frames (reduces reflow by 50%)
      if (frameCount % 2 === 0) {
        el.textContent = isFloat ? current.toFixed(1) + suf : Math.round(current) + suf;
      }
      frameCount++;

      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── 7. ROI Calculator logic ──────────────────────────────────────────────────
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
    var deployStrategy = "phased"; // default

    // ─── §2.3 Chart.js — 5-Year Cumulative Impact 柱状图 ─────────────────────
    var cumulativeChart = null;
    var laborCompareChart = null;
    var CHART_PRIMARY = "rgb(236, 91, 19)";
    var CHART_PRIMARY_A = "rgba(236, 91, 19, 0.15)";
    var CHART_SLATE = "rgba(148, 163, 184, 0.6)";
    // 销毁旧 Chart 实例（SPA 重复导航时 canvas 已被替换）
    if (typeof global.Chart !== "undefined") {
      var _cc = document.getElementById("roi-cumulative-chart");
      if (_cc && _cc.chart) { try { _cc.chart.destroy(); } catch(e){} }
      var _lc = document.getElementById("roi-labor-compare-chart");
      if (_lc && _lc.chart) { try { _lc.chart.destroy(); } catch(e){} }
    }

    /**
     * 初始化或重建 Chart.js 实例。
     * 若 Chart 全局不存在（测试环境 / Chart.js 未加载），则跳过，不报错。
     */
    function initCharts() {
      if (typeof global.Chart === "undefined") {
        return;
      }

      // ── 5-Year Cumulative chart (Bar) ───────────────────────────────────────
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
                callbacks: {
                  label: function (ctx) {
                    return ctx.dataset.label + ": $" + ctx.parsed.y.toFixed(0) + "k";
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 10, weight: "700" }, color: "#94a3b8" },
              },
              y: {
                grid: { color: "rgba(148,163,184,0.15)" },
                ticks: {
                  font: { size: 10 },
                  color: "#94a3b8",
                  callback: function (v) {
                    return "$" + v + "k";
                  },
                },
              },
            },
          },
        });
      }

      // ── Manual vs Automated Labor Compare (Line) ────────────────────────────
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
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 9 }, color: "#94a3b8" },
              },
              y: {
                grid: { color: "rgba(148,163,184,0.15)" },
                ticks: {
                  font: { size: 9 },
                  color: "#94a3b8",
                  callback: function (v) {
                    return "$" + v + "k";
                  },
                },
              },
            },
          },
        });
      }
    }

    /**
     * 用最新计算结果更新 Chart.js 图表数据。
     * @param {number} annualSavings - 年度节省总额（美元）
     * @param {number} labor         - 月度劳动力成本（美元）
     * @param {number} laborSavingRate - 劳动力节省比例
     */
    function updateCharts(annualSavings, labor, laborSavingRate) {
      if (!cumulativeChart && !laborCompareChart) return;

      var annualK = annualSavings / 1000;

      // 5年累计净利润：逐年递增曲线
      var cumNetProfit = [
        Math.round(annualK * 0.15),
        Math.round(annualK * 0.45),
        Math.round(annualK * 0.75),
        Math.round(annualK * 1.1),
        Math.round(annualK * 1.5),
      ];
      // Baseline：硬件摊销成本（逐年递减）
      var cumBaseline = [
        Math.round(annualK * 0.22),
        Math.round(annualK * 0.22),
        Math.round(annualK * 0.21),
        Math.round(annualK * 0.23),
        Math.round(annualK * 0.22),
      ];

      if (cumulativeChart) {
        cumulativeChart.data.datasets[0].data = cumNetProfit;
        cumulativeChart.data.datasets[1].data = cumBaseline;
        cumulativeChart.update();
      }

      // Manual vs Automated — 月度劳动成本曲线（24个月轨迹）
      var laborK = labor / 1000;
      var automatedMonths = [1, 3, 6, 9, 12, 18, 24].map(function (mo) {
        // Automated cost 随时间递减（实施后逐步降低）
        var factor = Math.max(1 - laborSavingRate * (mo / 24), 1 - laborSavingRate);
        return parseFloat((laborK * factor).toFixed(1));
      });
      var manualMonths = [1, 3, 6, 9, 12, 18, 24].map(function (mo) {
        // Manual cost 随时间缓慢增长（通胀 ~3% 年）
        return parseFloat((laborK * (1 + (0.03 * mo) / 12)).toFixed(1));
      });

      if (laborCompareChart) {
        laborCompareChart.data.datasets[0].data = manualMonths;
        laborCompareChart.data.datasets[1].data = automatedMonths;
        laborCompareChart.update();
      }
    }

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

    // Live slider label update
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

    recalcBtn.addEventListener("click", function () {
      runCalculation();
      safeCall("showNotification", ["已重新计算", "success"]);
    });

    function runCalculation() {
      var outlets = parseInt((outletsInput && outletsInput.value) || 5, 10);
      var chefs = parseInt((chefsInput && chefsInput.value) || 3, 10);
      var salary = parseFloat((salaryInput && salaryInput.value) || 5000);
      var energy = parseFloat((energyInput && energyInput.value) || 8000);

      // YuKoLi ROI model (RMB-based)
      var laborSavingRate = deployStrategy === "phased" ? 0.7 : 0.7; // 节省人工70%
      var energySavingRate = 0.3; // 节能30%+
      var machinesPerOutlet = Math.ceil(chefs * laborSavingRate); // 需要的机器数
      var machineCost = 30000; // 单台智能炒菜机均价估算(人民币)
      var totalMachineCost = outlets * machinesPerOutlet * machineCost;

      var monthlyLaborSave = chefs * salary * laborSavingRate; // 每店每月节省人工
      var monthlyEnergySave = energy * energySavingRate; // 每店每月节省能源
      var monthlySavings = (monthlyLaborSave + monthlyEnergySave) * outlets;
      var annualSavings = monthlySavings * 12;
      var paybackMonths = totalMachineCost / monthlySavings;
      var fiveYearROI = Math.round(((annualSavings * 5) / totalMachineCost) * 100);

      // Update KPI cards
      if (kpiROI) animateNumber(kpiROI, Math.max(0, fiveYearROI), 500, "%");
      if (kpiPayback) animateNumber(kpiPayback, Math.min(99, Math.round(paybackMonths * 10) / 10), 500, "");
      if (kpiSavings) {
        var savingsWan = annualSavings / 10000;
        animateNumber(kpiSavings, Math.round(savingsWan), 500, "");
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

      // §2.3 Update Chart.js dynamic charts
      updateCharts(annualSavings, chefs * salary, laborSavingRate);
    }

    // Initialize charts then run initial calculation
    initCharts();
    runCalculation();
  }

  // 防止重复初始化
  var _roiInitialized = false;
  function init() {
    if (_roiInitialized) { initROICalculator(); return; }
    _roiInitialized = true;
    initROICalculator();
  }

  document.addEventListener("DOMContentLoaded", function () { _roiInitialized = true; initROICalculator(); });
  document.addEventListener("spa:load", init);
})(window);
