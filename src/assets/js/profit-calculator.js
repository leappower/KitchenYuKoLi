/**
 * YuKoLi Profit Calculator — ROI calculation engine
 * Pure frontend, no external API calls.
 */
(function () {
  "use strict";

  /* ───────── Default salary data per country ───────── */
  var DEFAULT_SALARIES = {
    Philippines: { monthly: 25000, currency: "PHP", symbol: "₱" },
    Indonesia: { monthly: 4800000, currency: "IDR", symbol: "Rp" },
    Vietnam: { monthly: 7000000, currency: "VND", symbol: "₫" },
    Thailand: { monthly: 15000, currency: "THB", symbol: "฿" },
    Malaysia: { monthly: 2500, currency: "MYR", symbol: "RM" },
    China: { monthly: 5000, currency: "CNY", symbol: "¥" },
    Japan: { monthly: 220000, currency: "JPY", symbol: "¥" },
    "South Korea": { monthly: 2800000, currency: "KRW", symbol: "₩" },
    India: { monthly: 25000, currency: "INR", symbol: "₹" },
    "Saudi Arabia": { monthly: 4000, currency: "SAR", symbol: "ر.س" },
    Taiwan: { monthly: 40000, currency: "TWD", symbol: "NT$" },
    Other: { monthly: 2000, currency: "USD", symbol: "$" },
  };

  /* ───────── Language → Country auto-match ───────── */
  var LANG_COUNTRY_MAP = {
    "zh-CN": "China",
    "zh-TW": "Taiwan",
    zh: "China",
    en: "Other",
    th: "Thailand",
    vi: "Vietnam",
    id: "Indonesia",
    ms: "Malaysia",
    fil: "Philippines",
    ja: "Japan",
    ko: "South Korea",
    hi: "India",
    ar: "Saudi Arabia",
  };

  /** Detect country from browser language (works before translationManager is loaded) */
  function detectCountryFromBrowser() {
    var nav = navigator.language || navigator.userLanguage || "en";
    var lang = nav.split("-")[0];
    var full = nav;
    if (LANG_COUNTRY_MAP[full]) return LANG_COUNTRY_MAP[full];
    if (LANG_COUNTRY_MAP[lang]) return LANG_COUNTRY_MAP[lang];
    return null;
  }

  /* ───────── Savings ratio table ───────── */
  var SAVINGS_TABLE = {
    hiring_difficulty: { min: 0.4, mid: 0.5, max: 0.58 },
    high_labor_cost: { min: 0.45, mid: 0.55, max: 0.68 },
    inconsistent_quality: { min: 0.32, mid: 0.42, max: 0.52 },
    slow_service: { min: 0.36, mid: 0.46, max: 0.55 },
    limited_space: { min: 0.3, mid: 0.4, max: 0.48 },
  };

  /* ───────── Equipment cost ranges (USD) ───────── */
  var EQUIPMENT_COST = {
    smart_wok: { min: 3000, max: 8000 },
    rice_cooker: { min: 1500, max: 4000 },
    dishwasher: { min: 2000, max: 5000 },
    induction_cooker: { min: 500, max: 2000 },
    deep_fryer: { min: 1000, max: 3000 },
  };

  /* ───────── Equipment multipliers (boost savings) ───────── */
  var EQUIPMENT_MULTIPLIER = {
    smart_wok: 1.15,
    rice_cooker: 1.05,
    dishwasher: 1.1,
    induction_cooker: 1.03,
    deep_fryer: 1.06,
  };

  /* ───────── CO₂ reduction per equipment (tonnes / year) ───────── */
  var CO2_PER_EQUIPMENT = {
    smart_wok: 1.8,
    rice_cooker: 0.6,
    dishwasher: 1.2,
    induction_cooker: 0.5,
    deep_fryer: 0.9,
  };

  /* ───────── Equipment → CMS category mapping ───────── */
  var EQUIPMENT_CATEGORY_MAP = {
    smart_wok: ["stirfry"],
    rice_cooker: ["steaming"],
    dishwasher: ["other"],
    induction_cooker: ["other"],
    deep_fryer: ["frying"],
  };

  /* ───────── Scene presets (from application page deep-links) ───────── */

  var SCENE_PRESETS = {
    "chain-restaurant": { meals: 500, pain: "high_labor_cost", equipment: ["smart_wok", "rice_cooker"], operators: 3 },
    "central-kitchen": {
      meals: 2000,
      pain: "hiring_difficulty",
      equipment: ["smart_wok", "rice_cooker", "dishwasher"],
      operators: 5,
    },
    "small-restaurant": { meals: 150, pain: "slow_service", equipment: ["smart_wok"], operators: 1 },
    canteen: {
      meals: 1000,
      pain: "hiring_difficulty",
      equipment: ["smart_wok", "rice_cooker", "dishwasher", "deep_fryer"],
      operators: 4,
    },
    "cloud-kitchen": { meals: 300, pain: "limited_space", equipment: ["smart_wok", "induction_cooker"], operators: 2 },
    "menu-lab": { meals: 200, pain: "inconsistent_quality", equipment: ["smart_wok"], operators: 2 },
    "food-factory": {
      meals: 3000,
      pain: "high_labor_cost",
      equipment: ["smart_wok", "rice_cooker", "dishwasher", "induction_cooker"],
      operators: 8,
    },
  };

  /* ───────── Helpers ───────── */

  /** CJK languages use 万 (10K) and 億 (100M); others use K and M. */
  function isCJK() {
    if (!window.translationManager) return false;
    var lang = window.translationManager.currentLanguage || "";
    return /^zh|ja|ko/.test(lang);
  }

  /** Get currency info based on current UI language (not country). */
  function langCurrency() {
    /* Currency determined by country selection, not language.
     * Falls back to language-based mapping only when no country is selected. */
    var countrySelect = document.getElementById("pc-country");
    if (countrySelect && countrySelect.value) {
      var info = DEFAULT_SALARIES[countrySelect.value];
      if (info) return { symbol: info.symbol, currency: info.currency };
    }
    /* Fallback: derive from current language */
    if (!window.translationManager) return { symbol: "$", currency: "USD" };
    var lang = window.translationManager.currentLanguage || "";
    var map = {
      "zh-CN": { symbol: "¥", currency: "CNY" },
      "zh-TW": { symbol: "NT$", currency: "TWD" },
      ja: { symbol: "¥", currency: "JPY" },
      ko: { symbol: "₩", currency: "KRW" },
      th: { symbol: "฿", currency: "THB" },
      vi: { symbol: "₫", currency: "VND" },
      id: { symbol: "Rp", currency: "IDR" },
      ms: { symbol: "RM", currency: "MYR" },
      hi: { symbol: "₹", currency: "INR" },
      ar: { symbol: "ر.س", currency: "SAR" },
    };
    for (var key in map) {
      if (lang === key || lang.indexOf(key) === 0) return map[key];
    }
    return { symbol: "$", currency: "USD" };
  }

  function formatNumber(n, decimals) {
    if (decimals === undefined) decimals = 0;
    var locale = isCJK() ? "zh-CN" : "en-US";
    return n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function shortCurrency(n, symbol) {
    if (isCJK()) {
      // CJK: 万 (10,000) and 億 (100,000,000)
      if (n >= 100000000) return symbol + formatNumber(n / 100000000, 1) + "億";
      if (n >= 10000) return symbol + formatNumber(n / 10000, 1) + "万";
      return symbol + formatNumber(n);
    }
    // Western: K and M
    if (n >= 1000000) return symbol + formatNumber(n / 1000000, 1) + "M";
    if (n >= 1000) return symbol + formatNumber(n / 1000, 1) + "K";
    return symbol + formatNumber(n);
  }

  function getSavingsRatio(painPoint, equipment) {
    var base = SAVINGS_TABLE[painPoint] || { min: 0.3, mid: 0.4, max: 0.48 };
    var multiplier = 1.0;
    if (equipment && equipment.length) {
      equipment.forEach(function (eq) {
        multiplier *= EQUIPMENT_MULTIPLIER[eq] || 1.0;
      });
      // compound → average
      multiplier = Math.pow(multiplier, 1 / Math.max(equipment.length, 1));
    }
    return {
      min: Math.min(base.min * multiplier, 0.7),
      mid: Math.min(base.mid * multiplier, 0.75),
      max: Math.min(base.max * multiplier, 0.8),
    };
  }

  function getEquipmentCost(equipment) {
    var totalMin = 0,
      totalMax = 0;
    if (equipment && equipment.length) {
      equipment.forEach(function (eq) {
        var cost = EQUIPMENT_COST[eq];
        if (cost) {
          totalMin += cost.min;
          totalMax += cost.max;
        }
      });
    } else {
      totalMin = 5000;
      totalMax = 15000;
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

    // Monthly savings = default per-worker salary × operator reduction × efficiency ratio
    // Use country's default single-worker salary so that changing operator count directly affects the result.
    var perWorkerSalary = (DEFAULT_SALARIES[input.country] || DEFAULT_SALARIES["Other"]).monthly;
    var monthlySavingsBase = perWorkerSalary * input.operatorReduction * savingsRatio.mid;

    var monthlySavings = {
      min: Math.round(monthlySavingsBase * (savingsRatio.min / savingsRatio.mid)),
      mid: Math.round(monthlySavingsBase),
      max: Math.round(monthlySavingsBase * (savingsRatio.max / savingsRatio.mid)),
    };

    var investment = getEquipmentCost(input.equipment);
    // Convert USD investment to local currency (rough estimates)
    var usdToLocalRates = {
      Philippines: 56,
      Indonesia: 15800,
      Vietnam: 25000,
      Thailand: 35,
      Malaysia: 4.7,
      Other: 1,
    };
    var rate = usdToLocalRates[input.country] || 1;
    var localInvestment = {
      min: Math.round(investment.min * rate),
      max: Math.round(investment.max * rate),
      mid: Math.round(investment.mid * rate),
    };

    // Payback: based on mid estimate, with ±30% range for realistic best/worst
    var paybackMid = localInvestment.mid / Math.max(monthlySavings.mid, 1);
    paybackMid = Math.max(3, paybackMid);
    var payback = {
      min: Math.max(3, Math.round(paybackMid * 0.7)),
      mid: Math.max(3, Math.round(paybackMid)),
      max: Math.round(paybackMid * 1.3),
    };

    // 5-year return: best = max monthly savings × 60 − min investment; worst = min savings × 60 − max investment
    var fiveYearReturn = {
      min: monthlySavings.min * 60 - localInvestment.max,
      mid: monthlySavings.mid * 60 - localInvestment.mid,
      max: monthlySavings.max * 60 - localInvestment.min,
    };

    var annualSavings = {
      min: monthlySavings.min * 12,
      mid: monthlySavings.mid * 12,
      max: monthlySavings.max * 12,
    };

    var co2 = getCO2(input.equipment, input.operatorReduction);

    var roiMultiplier = investment.mid > 0 ? fiveYearReturn.mid / investment.mid : 0;

    return {
      monthlySavings: monthlySavings,
      investment: localInvestment,
      payback: payback,
      fiveYearReturn: fiveYearReturn,
      annualSavings: annualSavings,
      co2: co2,
      roiMultiplier: roiMultiplier,
    };
  }

  /* ───────── i18n helper ───────── */
  function t(key) {
    if (window.translationManager && typeof window.translationManager.translate === "function") {
      var v = window.translationManager.translate(key);
      return v !== key ? v : key;
    }
    return key;
  }

  /* ───────── Pain point → i18n key mapping ───────── */
  var PAIN_KEY_MAP = {
    hiring_difficulty: "profit_calc_pain_hiring",
    high_labor_cost: "profit_calc_pain_labor",
    inconsistent_quality: "profit_calc_pain_quality",
    slow_service: "profit_calc_pain_speed",
    limited_space: "profit_calc_pain_space",
  };

  /* ───────── Equipment → i18n key mapping ───────── */
  var EQUIP_KEY_MAP = {
    smart_wok: "profit_calc_eq_wok",
    rice_cooker: "profit_calc_eq_rice",
    dishwasher: "profit_calc_eq_dish",
    induction_cooker: "profit_calc_eq_induction",
    deep_fryer: "profit_calc_eq_fryer",
  };

  /* ───────── Recommend products from CMS catalog ───────── */

  function recommendProducts(equipment, dailyMeals) {
    try {
      if (!window.AppUtils || typeof window.AppUtils.buildProductCatalog !== "function") return null;
      var catalog = window.AppUtils.buildProductCatalog();
      if (!catalog || !catalog.length) return null;
      var lang = (window.translationManager && window.translationManager.currentLanguage) || "en";
      var results = [];
      equipment.forEach(function (eq) {
        var categories = EQUIPMENT_CATEGORY_MAP[eq] || [];
        if (!categories.length) return;
        var candidates = catalog.filter(function (p) {
          if (!p.isActive) return false;
          return categories.indexOf(p.category) !== -1;
        });
        if (!candidates.length) return;
        // Parse throughput number
        candidates.forEach(function (p) {
          var tpStr = p.throughput || "";
          var tpMatch = tpStr.match(/(\d+)/);
          p._tpNum = tpMatch ? parseInt(tpMatch[1], 10) : 0;
          var prStr = p.referencePrice || "";
          var prMatch = prStr.match(/(\d+)/);
          p._prNum = prMatch ? parseInt(prMatch[1], 10) : 999999999;
          var nm = p.name;
          p._displayName = typeof nm === "object" && nm !== null ? nm[lang] || nm.zh || nm.en || "" : nm || "";
        });
        // Prefer throughput >= dailyMeals, then lowest price
        var sufficient = candidates.filter(function (p) {
          return p._tpNum >= dailyMeals;
        });
        var pick = sufficient.length ? sufficient : candidates;
        pick.sort(function (a, b) {
          return a._prNum - b._prNum;
        });
        if (pick.length) {
          results.push({
            equipment: eq,
            model: pick[0].model || "",
            name: pick[0]._displayName,
            price: pick[0]._prNum,
          });
        }
      });
      return results.length ? results : null;
    } catch (e) {
      console.warn("[PC] recommendProducts error:", e);
      return null;
    }
  }

  /* ───────── Before vs After comparison HTML ───────── */

  /* Equipment-specific comparison dimensions */
  var EQUIP_COMPARISON_MAP = {
    smart_wok: [
      ["profit_calc_comp_quality", "profit_calc_comp_quality_before", "profit_calc_comp_quality_after"],
      ["profit_calc_comp_consistency", "profit_calc_comp_consistency_before", "profit_calc_comp_consistency_after"],
      ["profit_calc_comp_speed", "profit_calc_comp_speed_before", "profit_calc_comp_speed_after"],
      ["profit_calc_comp_wok_safety", "profit_calc_comp_wok_safety_before", "profit_calc_comp_wok_safety_after"],
      ["profit_calc_comp_space", "profit_calc_comp_space_before", "profit_calc_comp_space_after"],
    ],
    rice_cooker: [
      ["profit_calc_comp_consistency", "profit_calc_comp_consistency_before", "profit_calc_comp_consistency_after"],
      [
        "profit_calc_comp_rice_capacity",
        "profit_calc_comp_rice_capacity_before",
        "profit_calc_comp_rice_capacity_after",
      ],
      ["profit_calc_comp_energy", "profit_calc_comp_energy_before", "profit_calc_comp_energy_after"],
      ["profit_calc_comp_safety", "profit_calc_comp_safety_before", "profit_calc_comp_safety_after"],
    ],
    dishwasher: [
      ["profit_calc_comp_hygiene", "profit_calc_comp_hygiene_before", "profit_calc_comp_hygiene_after"],
      ["profit_calc_comp_water_usage", "profit_calc_comp_water_usage_before", "profit_calc_comp_water_usage_after"],
      ["profit_calc_comp_speed", "profit_calc_comp_speed_before", "profit_calc_comp_speed_after"],
      [
        "profit_calc_comp_labor_intensity",
        "profit_calc_comp_labor_intensity_before",
        "profit_calc_comp_labor_intensity_after",
      ],
    ],
    induction_cooker: [
      ["profit_calc_comp_energy", "profit_calc_comp_energy_before", "profit_calc_comp_energy_after"],
      ["profit_calc_comp_temp_control", "profit_calc_comp_temp_control_before", "profit_calc_comp_temp_control_after"],
      ["profit_calc_comp_safety", "profit_calc_comp_safety_before", "profit_calc_comp_safety_after"],
      ["profit_calc_comp_space", "profit_calc_comp_space_before", "profit_calc_comp_space_after"],
    ],
    deep_fryer: [
      ["profit_calc_comp_quality", "profit_calc_comp_quality_before", "profit_calc_comp_quality_after"],
      ["profit_calc_comp_oil_mgmt", "profit_calc_comp_oil_mgmt_before", "profit_calc_comp_oil_mgmt_after"],
      ["profit_calc_comp_safety", "profit_calc_comp_safety_before", "profit_calc_comp_safety_after"],
      ["profit_calc_comp_temp_control", "profit_calc_comp_temp_control_before", "profit_calc_comp_temp_control_after"],
    ],
  };

  function buildComparisonHTML(input, result, lc, _t) {
    var tFunc = _t || t;
    var laborBefore = lc.symbol + formatNumber(input.laborCost);
    var laborAfter = lc.symbol + formatNumber(input.laborCost - result.monthlySavings.mid);
    var outputBefore = input.dailyMeals;
    var outputAfter = Math.ceil(input.dailyMeals * 1.3);

    // Universal rows (always shown)
    var rows = [
      [tFunc("profit_calc_comp_monthly_labor"), laborBefore, laborAfter],
      [tFunc("profit_calc_comp_daily_output"), outputBefore, outputAfter],
    ];

    // Equipment-specific rows (deduplicated by key)
    var seen = {};
    var eqList = input.equipment || [];
    if (eqList.length === 0) eqList = ["smart_wok"]; // default fallback
    eqList.forEach(function (eq) {
      var dims = EQUIP_COMPARISON_MAP[eq];
      if (!dims) return;
      dims.forEach(function (d) {
        if (!seen[d[0]]) {
          seen[d[0]] = true;
          rows.push([tFunc(d[0]), tFunc(d[1]), tFunc(d[2])]);
        }
      });
    });

    // Always append training + scalability
    rows.push([
      tFunc("profit_calc_comp_training"),
      tFunc("profit_calc_comp_training_before"),
      tFunc("profit_calc_comp_training_after"),
    ]);
    rows.push([
      tFunc("profit_calc_comp_maintenance"),
      tFunc("profit_calc_comp_maintenance_before"),
      tFunc("profit_calc_comp_maintenance_after"),
    ]);
    rows.push([
      tFunc("profit_calc_comp_scalability"),
      tFunc("profit_calc_comp_scalability_before"),
      tFunc("profit_calc_comp_scalability_after"),
    ]);

    var html =
      '<h3 style="font-size:15px;font-weight:700;color:#065f46;margin:24px 0 12px">★ ' +
      tFunc("profit_calc_comparison_title") +
      "</h3>";
    html +=
      '<table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #a7f3d0;border-radius:8px;overflow:hidden">';
    html +=
      '<tr style="background:#ecfdf5"><th style="padding:8px;text-align:left;border-bottom:2px solid #10b981;width:30%">' +
      tFunc("profit_calc_comp_dimension") +
      '</th><th style="padding:8px;text-align:left;border-bottom:2px solid #10b981;width:35%">' +
      tFunc("profit_calc_comparison_before") +
      '</th><th style="padding:8px;text-align:left;border-bottom:2px solid #10b981;width:35%">' +
      tFunc("profit_calc_comparison_after") +
      "</th></tr>";
    rows.forEach(function (r) {
      html +=
        '<tr><td style="padding:6px 8px;border-bottom:1px solid #d1fae5;color:#475569">' +
        r[0] +
        '</td><td style="padding:6px 8px;border-bottom:1px solid #d1fae5;color:#b91c1c;font-weight:600">' +
        r[1] +
        '</td><td style="padding:6px 8px;border-bottom:1px solid #d1fae5;font-weight:600;color:#059669">' +
        r[2] +
        "</td></tr>";
    });
    html += "</table>";
    return html;
  }

  /* ───────── 5-Year TCO Analysis HTML ───────── */

  function buildTCOHTML(input, result, lc, _t) {
    var tFunc = _t || t;
    var inflation = 0.03;
    var maintenanceRate = 0.05;
    var investmentMid = result.investment.mid;
    var maintenanceBase = investmentMid * maintenanceRate;
    var annualLabor = input.laborCost * 12;
    var afterLaborBase = annualLabor - result.annualSavings.mid;
    var html =
      '<h3 style="font-size:15px;font-weight:700;color:#64748b;margin:24px 0 12px">' +
      tFunc("profit_calc_tco_title") +
      "</h3>";
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html +=
      '<tr style="background:#f1f5f9"><th style="padding:8px;text-align:right;border-bottom:2px solid #cbd5e1"></th>';
    html +=
      '<th style="padding:8px;text-align:right;border-bottom:2px solid #cbd5e1">' +
      tFunc("profit_calc_tco_traditional") +
      "</th>";
    html +=
      '<th style="padding:8px;text-align:right;border-bottom:2px solid #cbd5e1">' +
      tFunc("profit_calc_tco_yukoli") +
      "</th>";
    html +=
      '<th style="padding:8px;text-align:right;border-bottom:2px solid #cbd5e1">' +
      tFunc("profit_calc_tco_annual_savings") +
      "</th>";
    html +=
      '<th style="padding:8px;text-align:right;border-bottom:2px solid #cbd5e1">' +
      tFunc("profit_calc_tco_cumulative") +
      "</th></tr>";
    var cumulative = 0;
    for (var yr = 1; yr <= 5; yr++) {
      var factor = Math.pow(1 + inflation, yr - 1);
      var tradCost = annualLabor * factor;
      var yukoliCost = afterLaborBase * factor + maintenanceBase * factor;
      if (yr === 1) yukoliCost += investmentMid;
      var annualSave = tradCost - yukoliCost;
      cumulative += annualSave;
      html += "<tr>";
      html +=
        '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-weight:600">' +
        tFunc("profit_calc_tco_year").replace("{n}", yr) +
        "</td>";
      html +=
        '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">' +
        lc.symbol +
        formatNumber(Math.round(tradCost)) +
        "</td>";
      html +=
        '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right">' +
        lc.symbol +
        formatNumber(Math.round(yukoliCost)) +
        "</td>";
      html +=
        '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:' +
        (annualSave >= 0 ? "#059669" : "#dc2626") +
        '">' +
        lc.symbol +
        formatNumber(Math.round(annualSave)) +
        "</td>";
      html +=
        '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#059669">' +
        lc.symbol +
        formatNumber(Math.round(cumulative)) +
        "</td>";
      html += "</tr>";
    }
    html += "</table>";
    return html;
  }

  /* ───────── WhatsApp message builder ───────── */

  function buildWhatsAppMessage(input, result, salaryInfo) {
    var painLabel = PAIN_KEY_MAP[input.painPoint] ? t(PAIN_KEY_MAP[input.painPoint]) : input.painPoint;
    var lc = langCurrency();
    var eqNames =
      input.equipment && input.equipment.length
        ? input.equipment
            .map(function (eq) {
              return EQUIP_KEY_MAP[eq] ? t(EQUIP_KEY_MAP[eq]) : eq;
            })
            .join(", ")
        : "N/A";
    return [
      "Hi YuKoLi, I calculated my ROI:",
      "",
      t("profit_calc_report_challenge") + ": " + input.country,
      t("profit_calc_labor_cost") + ": " + formatNumber(input.laborCost) + " " + lc.currency,
      t("profit_calc_report_daily_output") + ": " + input.dailyMeals,
      t("profit_calc_pain_point") + ": " + painLabel,
      t("profit_calc_report_equipment") + ": " + eqNames,
      "",
      t("profit_calc_report_savings") +
        ": " +
        lc.symbol +
        formatNumber(result.monthlySavings.min) +
        " – " +
        lc.symbol +
        formatNumber(result.monthlySavings.max) +
        " " +
        lc.currency,
      t("profit_calc_payback") + ": " + result.payback.min + "–" + result.payback.max + " " + t("profit_calc_months"),
      t("profit_calc_report_5year") +
        ": " +
        lc.symbol +
        shortCurrency(result.fiveYearReturn.min, lc.symbol).replace(lc.symbol, "") +
        " – " +
        shortCurrency(result.fiveYearReturn.max, lc.symbol).replace(lc.symbol, "") +
        " " +
        lc.currency,
      "",
      t("profit_calc_pdf_disclaimer").replace(t("profit_calc_pdf_disclaimer").split(".")[0] + ".", ""),
    ].join("\n");
  }

  /* ───────── PDF generation (html2canvas + jsPDF) ───────── */

  function generatePDF(input, result, salaryInfo) {
    // Debug: check library availability

    // Check for required libraries
    if (typeof html2canvas === "undefined") {
      console.error("[PC-PDF] html2canvas not loaded!");
      _showPDFErrorToast();
      generatePDFFallback(input, result, salaryInfo);
      return;
    }
    if (typeof window.jspdf === "undefined" && typeof jsPDF === "undefined") {
      console.error("[PC-PDF] jsPDF not loaded! window.jspdf:", window.jspdf, "| jsPDF:", jsPDF);
      _showPDFErrorToast();
      generatePDFFallback(input, result, salaryInfo);
      return;
    }

    var painLabel = PAIN_KEY_MAP[input.painPoint] ? t(PAIN_KEY_MAP[input.painPoint]) : input.painPoint;
    var lc = langCurrency();
    var eqNames =
      input.equipment && input.equipment.length
        ? input.equipment
            .map(function (eq) {
              return EQUIP_KEY_MAP[eq] ? t(EQUIP_KEY_MAP[eq]) : eq;
            })
            .join(", ")
        : "N/A";

    // Build a hidden report container
    var container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:0;top:0;width:680px;background:#fff;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;padding:40px 32px;opacity:0;pointer-events:none;";

    container.innerHTML =
      '<div style="border-bottom:3px solid #e11d48;padding-bottom:16px;margin-bottom:24px">' +
      '<h1 style="font-size:22px;font-weight:900;margin:0 0 4px;color:#1e293b">🍳 ' +
      t("profit_calc_pdf_title") +
      "</h1>" +
      '<p style="font-size:12px;color:#94a3b8;margin:0">' +
      t("profit_calc_pdf_footer") +
      " " +
      new Date().toLocaleDateString() +
      "</p>" +
      "</div>" +
      '<h2 style="font-size:15px;font-weight:700;color:#64748b;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">' +
      t("profit_calc_pdf_input") +
      "</h2>" +
      pdfRow(t("profit_calc_pdf_country"), input.country) +
      pdfRow(t("profit_calc_labor_cost"), lc.symbol + formatNumber(input.laborCost) + " " + lc.currency) +
      pdfRow(t("profit_calc_pdf_daily_meals"), input.dailyMeals) +
      pdfRow(t("profit_calc_pdf_main_challenge"), painLabel) +
      pdfRow(t("profit_calc_pdf_planned_equipment"), eqNames) +
      pdfRow(t("profit_calc_pdf_operator_reduction"), input.operatorReduction + " " + t("profit_calc_operator_unit")) +
      '<h2 style="font-size:15px;font-weight:700;color:#64748b;margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.05em">' +
      t("profit_calc_pdf_results") +
      "</h2>" +
      '<div style="background:#fff1f2;border-radius:12px;padding:20px;margin-bottom:16px">' +
      pdfRow(
        t("profit_calc_pdf_monthly_savings"),
        lc.symbol +
          formatNumber(result.monthlySavings.min) +
          " – " +
          lc.symbol +
          formatNumber(result.monthlySavings.max)
      ) +
      pdfRow(
        t("profit_calc_pdf_equipment_investment"),
        lc.symbol + formatNumber(result.investment.min) + " – " + lc.symbol + formatNumber(result.investment.max)
      ) +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #fecdd3">' +
      '<span style="color:#64748b;font-size:13px">' +
      t("profit_calc_pdf_payback_period") +
      "</span>" +
      '<span style="font-weight:900;font-size:20px;color:#e11d48">' +
      result.payback.min +
      "–" +
      result.payback.max +
      " " +
      t("profit_calc_months") +
      "</span>" +
      "</div>" +
      pdfRow(
        t("profit_calc_pdf_5year_return"),
        shortCurrency(result.fiveYearReturn.min, lc.symbol) +
          " – " +
          shortCurrency(result.fiveYearReturn.max, lc.symbol)
      ) +
      pdfRow(t("profit_calc_pdf_annual_savings"), shortCurrency(result.annualSavings.mid, lc.symbol)) +
      pdfRow(t("profit_calc_pdf_co2"), result.co2.toFixed(1) + " " + t("profit_calc_co2_unit")) +
      "</div>" +
      /* ROI multiplier — spacer to push to page 2 (A4 ≈ 1123px at 96dpi, minus margins ~960px content area) */
      '<div style="height:1px;margin-bottom:' +
      Math.max(0, 920 - 600) +
      'px"></div>' +
      '<div style="text-align:center;background:linear-gradient(135deg,#fef2f2,#fff1f2);border-radius:12px;padding:20px;margin-bottom:16px">' +
      '<div style="font-size:13px;color:#64748b;margin-bottom:4px">' +
      t("profit_calc_roi_multiplier") +
      "</div>" +
      '<div style="font-size:28px;font-weight:900;color:#e11d48">★ ' +
      t("profit_calc_roi_per_dollar").replace("{n}", result.roiMultiplier.toFixed(1)) +
      "</div>" +
      "</div>" +
      /* Recommended equipment + Before vs After comparison (combined) */
      buildRecommendedEquipmentHTML(input, result, lc, t) +
      buildComparisonHTML(input, result, lc, t) +
      /* 5-Year TCO Analysis */
      buildTCOHTML(input, result, lc, t) +
      '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">' +
      '<p style="font-size:10px;color:#94a3b8;text-align:center;margin:0">' +
      t("profit_calc_pdf_cta") +
      "</p>" +
      "</div>";

    document.body.appendChild(container);
    // Force reflow so html2canvas can measure the element
    void container.offsetHeight;

    html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: true,
      onclone: function (clonedDoc) {
        // Force visible in the cloned document for accurate capture
        var cloned = clonedDoc.body.lastChild;
        if (cloned) {
          cloned.style.opacity = "1";
          cloned.style.position = "absolute";
          cloned.style.left = "0";
          cloned.style.top = "0";
          cloned.style.zIndex = "99999";
        }
      },
    })
      .then(function (canvas) {
        document.body.removeChild(container);
        var JSPDF = window.jspdf.jsPDF || jsPDF;
        var pdf = new JSPDF("p", "mm", "a4");
        var pageWidth = pdf.internal.pageSize.getWidth();
        var pageHeight = pdf.internal.pageSize.getHeight();
        var margin = 10;
        var contentWidth = pageWidth - margin * 2;
        var imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Single page (content fits in A4)
        if (imgHeight <= pageHeight - margin * 2) {
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, contentWidth, imgHeight);
        } else {
          // Multi-page support
          var pageImgHeight = pageHeight - margin * 2;
          var remainingHeight = imgHeight;
          var position = 0;
          var page = 0;
          while (remainingHeight > 0) {
            if (page > 0) pdf.addPage();
            pdf.addImage(
              canvas.toDataURL("image/jpeg", 0.92),
              "JPEG",
              margin,
              margin - position,
              contentWidth,
              imgHeight
            );
            remainingHeight -= pageImgHeight;
            position += pageImgHeight;
            page++;
          }
        }

        var filename = "YuKoLi-ROI-Report-" + new Date().toISOString().slice(0, 10) + ".pdf";
        pdf.save(filename);
      })
      .catch(function (err) {
        document.body.removeChild(container);
        console.error("[PC-PDF] html2canvas error:", err);
        _showPDFErrorToast();
        // Fallback
        generatePDFFallback(input, result, salaryInfo);
      });
  }

  /* ───────── Recommended equipment HTML ───────── */
  function buildRecommendedEquipmentHTML(input, result, lc, _t) {
    var tFunc = _t || t;
    var html =
      '<h3 style="font-size:15px;font-weight:700;color:#1e40af;margin:24px 0 12px">★ ' +
      tFunc("profit_calc_recommended_equipment") +
      "</h3>";
    var recs = recommendProducts(input.equipment, input.dailyMeals);
    if (recs && recs.length) {
      html +=
        '<table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #bfdbfe;border-radius:8px;overflow:hidden">';
      html +=
        '<tr style="background:#eff6ff"><th style="padding:8px;text-align:left;border-bottom:2px solid #3b82f6">Model</th><th style="padding:8px;text-align:left;border-bottom:2px solid #3b82f6">' +
        tFunc("profit_calc_recommended_product") +
        '</th><th style="padding:8px;text-align:right;border-bottom:2px solid #3b82f6">' +
        tFunc("profit_calc_recommended_price") +
        "</th></tr>";
      recs.forEach(function (r) {
        html +=
          '<tr><td style="padding:6px 8px;border-bottom:1px solid #dbeafe;font-weight:600;color:#1e40af">' +
          r.model +
          '</td><td style="padding:6px 8px;border-bottom:1px solid #dbeafe">' +
          r.name +
          '</td><td style="padding:6px 8px;border-bottom:1px solid #dbeafe;text-align:right;color:#1e40af">' +
          lc.symbol +
          formatNumber(r.price) +
          "</td></tr>";
      });
      html += "</table>";
    } else {
      // Fallback: show equipment names + price ranges
      html +=
        '<table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #bfdbfe;border-radius:8px;overflow:hidden">';
      html +=
        '<tr style="background:#eff6ff"><th style="padding:8px;text-align:left;border-bottom:2px solid #3b82f6">' +
        tFunc("profit_calc_recommended_equipment_type") +
        '</th><th style="padding:8px;text-align:right;border-bottom:2px solid #3b82f6">' +
        tFunc("profit_calc_recommended_price_range") +
        "</th></tr>";
      (input.equipment || []).forEach(function (eq) {
        var cost = EQUIPMENT_COST[eq];
        if (!cost) return;
        var name = EQUIP_KEY_MAP[eq] ? tFunc(EQUIP_KEY_MAP[eq]) : eq;
        html +=
          '<tr><td style="padding:6px 8px;border-bottom:1px solid #dbeafe;font-weight:600;color:#1e40af">' +
          name +
          '</td><td style="padding:6px 8px;border-bottom:1px solid #dbeafe;text-align:right;color:#1e40af">' +
          lc.symbol +
          formatNumber(cost.min) +
          " – " +
          lc.symbol +
          formatNumber(cost.max) +
          "</td></tr>";
      });
      html += "</table>";
    }
    return html;
  }

  /** Simple table row helper */
  function pdfRow(label, value) {
    return (
      '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0">' +
      '<span style="color:#64748b;font-size:13px">' +
      label +
      "</span>" +
      '<span style="font-weight:700;font-size:13px;color:#1e293b">' +
      value +
      "</span>" +
      "</div>"
    );
  }

  /** Show a toast notification when PDF generation fails */
  function _showPDFErrorToast() {
    var msg =
      t("profit_calc_pdf_error") !== "profit_calc_pdf_error"
        ? t("profit_calc_pdf_error")
        : "PDF generation failed, please try again later";
    var toast = document.createElement("div");
    toast.className =
      "fixed top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl z-[200] text-sm font-medium transition-all duration-300";
    toast.style.cssText = "opacity:0;transform:translate(-50%,-10px)";
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%,0)";
    });
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%,-10px)";
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /** Fallback: open print dialog */
  function generatePDFFallback(input, result, salaryInfo) {
    console.warn("[PC-PDF] Using fallback (print) method");
    var painLabel = PAIN_KEY_MAP[input.painPoint] ? t(PAIN_KEY_MAP[input.painPoint]) : input.painPoint;
    var lc = langCurrency();
    var eqNames =
      input.equipment && input.equipment.length
        ? input.equipment
            .map(function (eq) {
              return EQUIP_KEY_MAP[eq] ? t(EQUIP_KEY_MAP[eq]) : eq;
            })
            .join(", ")
        : "N/A";
    var html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + t("profit_calc_pdf_title") + "</title>",
      "<style>",
      "body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1e293b}",
      "h1{font-size:24px;border-bottom:3px solid #e11d48;padding-bottom:12px}",
      "h2{font-size:18px;margin-top:24px;color:#475569}",
      ".row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}",
      ".label{color:#64748b;font-size:14px}",
      ".value{font-weight:700;font-size:14px}",
      ".highlight{background:#fff1f2;padding:16px;border-radius:8px;margin:16px 0}",
      ".highlight .big{font-size:28px;font-weight:900;color:#e11d48}",
      ".footer{margin-top:32px;font-size:11px;color:#94a3b8;text-align:center}",
      "</style></head><body>",
      "<h1>🍳 " + t("profit_calc_pdf_title") + "</h1>",
      "<h2>" + t("profit_calc_pdf_input") + "</h2>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_country") +
        '</span><span class="value">' +
        input.country +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_labor_cost") +
        '</span><span class="value">' +
        lc.symbol +
        formatNumber(input.laborCost) +
        " " +
        lc.currency +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_daily_meals") +
        '</span><span class="value">' +
        input.dailyMeals +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_main_challenge") +
        '</span><span class="value">' +
        painLabel +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_planned_equipment") +
        '</span><span class="value">' +
        eqNames +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_operator_reduction") +
        '</span><span class="value">' +
        input.operatorReduction +
        " " +
        t("profit_calc_operator_unit") +
        "</span></div>",
      "<h2>" + t("profit_calc_pdf_results") + "</h2>",
      '<div class="highlight">',
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_monthly_savings") +
        '</span><span class="value">' +
        lc.symbol +
        formatNumber(result.monthlySavings.min) +
        " – " +
        lc.symbol +
        formatNumber(result.monthlySavings.max) +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_equipment_investment") +
        '</span><span class="value">' +
        lc.symbol +
        formatNumber(result.investment.min) +
        " – " +
        lc.symbol +
        formatNumber(result.investment.max) +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_payback_period") +
        '</span><span class="value big">' +
        result.payback.min +
        "–" +
        result.payback.max +
        " " +
        t("profit_calc_months") +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_5year_return") +
        '</span><span class="value">' +
        shortCurrency(result.fiveYearReturn.min, lc.symbol) +
        " – " +
        shortCurrency(result.fiveYearReturn.max, lc.symbol) +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_annual_savings") +
        '</span><span class="value">' +
        shortCurrency(result.annualSavings.mid, lc.symbol) +
        "</span></div>",
      '<div class="row"><span class="label">' +
        t("profit_calc_pdf_co2") +
        '</span><span class="value">' +
        result.co2.toFixed(1) +
        " " +
        t("profit_calc_co2_unit") +
        "</span></div>",
      "</div>",
      /* ROI multiplier — spacer for print page break */
      '<div style="page-break-before:always;text-align:center;background:linear-gradient(135deg,#fef2f2,#fff1f2);padding:16px;border-radius:8px;margin:16px 0">',
      '<div style="font-size:14px;color:#64748b;margin-bottom:4px">' + t("profit_calc_roi_multiplier") + "</div>",
      '<div style="font-size:24px;font-weight:900;color:#e11d48">★ ' +
        t("profit_calc_roi_per_dollar").replace("{n}", result.roiMultiplier.toFixed(1)) +
        "</div>",
      "</div>",
      /* Recommended equipment + Before vs After comparison (combined) */
      buildRecommendedEquipmentHTML(input, result, lc, t),
      buildComparisonHTML(input, result, lc, t),
      /* 5-Year TCO Analysis */
      buildTCOHTML(input, result, lc, t),
      '<div class="footer">' +
        t("profit_calc_pdf_footer") +
        new Date().toLocaleDateString() +
        "<br>" +
        t("profit_calc_pdf_cta") +
        "</div>",
      "</body></html>",
    ].join("");

    var win = window.open("", "_blank", "noopener");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(function () {
        win.print();
      }, 500);
    }
  }

  /* ───────── Chart rendering ───────── */

  function renderChart(canvasId, result, salaryInfo) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var sym = langCurrency().symbol;

    // Destroy previous chart instance
    if (canvas._chartInstance) canvas._chartInstance.destroy();

    var ctx = canvas.getContext("2d");
    var chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          t("profit_calc_chart_monthly_savings"),
          t("profit_calc_chart_annual_savings"),
          t("profit_calc_chart_investment"),
          t("profit_calc_chart_5year_return"),
        ],
        datasets: [
          {
            label: t("profit_calc_chart_min"),
            data: [
              result.monthlySavings.min,
              result.annualSavings.min,
              -result.investment.max,
              result.fiveYearReturn.min,
            ],
            backgroundColor: "rgba(225,29,72,0.2)",
            borderColor: "rgba(225,29,72,0.6)",
            borderWidth: 1,
          },
          {
            label: t("profit_calc_chart_max"),
            data: [
              result.monthlySavings.max,
              result.annualSavings.max,
              -result.investment.min,
              result.fiveYearReturn.max,
            ],
            backgroundColor: "rgba(225,29,72,0.6)",
            borderColor: "rgba(225,29,72,1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var v = ctx.raw;
                return ctx.dataset.label + ": " + sym + formatNumber(Math.abs(v));
              },
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: function (v) {
                return sym + shortCurrency(Math.abs(v), sym).replace(sym, "");
              },
            },
          },
        },
      },
    });

    canvas._chartInstance = chart;
  }

  /** Show inline validation error on a form field */
  function showFieldError(el, msg) {
    // Remove existing error
    var existing = el.parentNode.querySelector(".pc-field-error");
    if (existing) existing.remove();
    el.classList.add("border-red-400", "ring-2", "ring-red-200");
    el.classList.remove("border-slate-300", "dark:border-slate-700");
    var tip = document.createElement("p");
    tip.className = "pc-field-error text-red-500 text-xs mt-1 font-medium";
    tip.textContent = msg;
    el.parentNode.appendChild(tip);
    // Auto-clear on focus
    el.addEventListener("focus", function onfocus() {
      el.classList.remove("border-red-400", "ring-2", "ring-red-200");
      el.classList.add("border-slate-300", "dark:border-slate-700");
      var err = el.parentNode.querySelector(".pc-field-error");
      if (err) err.remove();
      el.removeEventListener("focus", onfocus);
    });
  }

  /** Clear all validation errors */
  function clearFieldErrors() {
    document.querySelectorAll(".pc-field-error").forEach(function (el) {
      el.remove();
    });
    document.querySelectorAll("#profit-calc-form .border-red-400").forEach(function (el) {
      el.classList.remove("border-red-400", "ring-2", "ring-red-200");
      el.classList.add("border-slate-300", "dark:border-slate-700");
    });
  }

  /** Validate required fields, returns true if valid */
  function validateForm() {
    clearFieldErrors();
    var valid = true;
    var countryEl = document.getElementById("pc-country");
    var mealsEl = document.getElementById("pc-daily-meals");

    if (!countryEl || !countryEl.value) {
      showFieldError(
        countryEl,
        t("profit_calc_err_country") !== "profit_calc_err_country"
          ? t("profit_calc_err_country")
          : "Please select a country"
      );
      valid = false;
    }
    if (!mealsEl || !mealsEl.value || parseInt(mealsEl.value, 10) <= 0) {
      showFieldError(
        mealsEl,
        t("profit_calc_err_meals") !== "profit_calc_err_meals"
          ? t("profit_calc_err_meals")
          : "Please enter daily meals served"
      );
      valid = false;
    }
    return valid;
  }

  /* ───────── UI Controller ───────── */

  function ProfitCalculator(opts) {
    this.formId = opts.formId || "profit-calc-form";
    this.resultId = opts.resultId || "profit-result-panel";
    this.chartCanvasId = opts.chartCanvasId || "profit-chart";
    this.countrySelectId = opts.countrySelectId || "pc-country";
    this.laborInputId = opts.laborInputId || "pc-labor-cost";
    this.stepsMode = opts.stepsMode || false;

    // Store reference for language change re-render
    window._profitCalcInstance = this;

    this.init();

    // Auto-select country from browser language (immediate, no dependency on translationManager)
    var browserCountry = detectCountryFromBrowser();
    var countryEl2 = document.getElementById(this.countrySelectId);
    if (browserCountry && countryEl2 && !countryEl2.value) {
      countryEl2.value = browserCountry;
      var info = DEFAULT_SALARIES[browserCountry];
      var laborEl = document.getElementById(this.laborInputId);
      if (info && laborEl && !laborEl.dataset.touched) {
        laborEl.value = info.monthly;
      }
      var symEl = document.getElementById("pc-currency-symbol");
      if (symEl && info) symEl.textContent = "(" + info.currency + ")";
      countryEl2.dispatchEvent(new Event("change"));
    }
  }

  ProfitCalculator.prototype.init = function () {
    var self = this;
    var countryEl = document.getElementById(this.countrySelectId);
    if (countryEl) {
      // Auto-select country based on current language
      function applyCountryFromLang() {
        if (!window.translationManager) return;
        var lang = window.translationManager.currentLanguage || "";
        var matchedCountry = null;
        if (LANG_COUNTRY_MAP[lang]) {
          matchedCountry = LANG_COUNTRY_MAP[lang];
        } else {
          var prefix = lang.split("-")[0];
          matchedCountry = LANG_COUNTRY_MAP[prefix] || null;
        }
        if (matchedCountry && countryEl.value !== matchedCountry) {
          countryEl.value = matchedCountry;
          var info = DEFAULT_SALARIES[matchedCountry];
          var laborEl = document.getElementById(self.laborInputId);
          if (info && laborEl && !laborEl.dataset.touched) {
            laborEl.value = info.monthly;
          }
          updateCurrencySymbol();
          /* Dispatch change so CustomSelect syncs */
          countryEl.dispatchEvent(new Event("change"));
        }
      }
      applyCountryFromLang();

      // Re-apply on language change (user manually toggled lang)
      window.addEventListener("languageChanged", function () {
        applyCountryFromLang();
      });

      function updateCurrencySymbol() {
        var info = DEFAULT_SALARIES[countryEl.value];
        var symEl = document.getElementById("pc-currency-symbol");
        if (symEl) symEl.textContent = info ? "(" + info.currency + ")" : "";
      }
      updateCurrencySymbol();

      countryEl.addEventListener("change", function () {
        var info = DEFAULT_SALARIES[this.value];
        var laborEl = document.getElementById(self.laborInputId);
        if (info && laborEl && !laborEl.dataset.touched) {
          laborEl.value = info.monthly;
        }
        updateCurrencySymbol();
        /* Re-calculate if results are already showing */
        if (
          document.getElementById("profit-result-panel") &&
          !document.getElementById("profit-result-panel").classList.contains("hidden")
        ) {
          self.run();
        }
      });
    }

    // Business type select → auto-fill preset
    var businessTypeEl = document.getElementById("pc-business-type");
    if (businessTypeEl) {
      businessTypeEl.addEventListener("change", function () {
        var preset = SCENE_PRESETS[this.value];
        if (!preset) return;
        var mealsEl = document.getElementById("pc-daily-meals");
        if (mealsEl && preset.meals) mealsEl.value = preset.meals;
        var painEl = document.getElementById("pc-pain-point");
        if (painEl && preset.pain) painEl.value = preset.pain;
        if (preset.equipment && preset.equipment.length) {
          document.querySelectorAll(".pc-equipment").forEach(function (cb) {
            cb.checked = preset.equipment.indexOf(cb.value) !== -1;
          });
        }
        var rangeEl = document.getElementById("pc-operator-reduction");
        var rangeValEl = document.getElementById("pc-operator-value");
        if (rangeEl && preset.operators) {
          rangeEl.value = preset.operators;
          if (rangeValEl) rangeValEl.textContent = preset.operators;
        }
        // Re-calculate if results visible
        if (
          document.getElementById("profit-result-panel") &&
          !document.getElementById("profit-result-panel").classList.contains("hidden")
        ) {
          self.run();
        }
      });
    }

    // Mark labor input as touched on manual edit
    var laborEl = document.getElementById(this.laborInputId);
    if (laborEl) {
      laborEl.addEventListener("input", function () {
        this.dataset.touched = "true";
      });
    }

    // Range slider sync (also done in SPA init for robustness)
    syncRangeDisplay();
  };

  /** Sync slider value → display element */
  function syncRangeDisplay() {
    var rangeEl = document.getElementById("pc-operator-reduction");
    var rangeValEl = document.getElementById("pc-operator-value");
    if (!rangeEl || !rangeValEl) return;
    // Set display to current value
    rangeValEl.textContent = rangeEl.value;
    // Remove old listener by cloning (cleanest approach)
    var newRange = rangeEl.cloneNode(true);
    rangeEl.parentNode.replaceChild(newRange, rangeEl);
    newRange.addEventListener("input", function () {
      var val = document.getElementById("pc-operator-value");
      if (val) val.textContent = this.value;
    });
  }

  ProfitCalculator.prototype.getInput = function () {
    var country = document.getElementById(this.countrySelectId).value;
    var salaryInfo = DEFAULT_SALARIES[country] || DEFAULT_SALARIES["Other"];

    // Gather equipment
    var equipment = [];
    document.querySelectorAll(".pc-equipment:checked").forEach(function (cb) {
      equipment.push(cb.value);
    });

    var businessTypeEl = document.getElementById("pc-business-type");
    var businessType = businessTypeEl ? businessTypeEl.value : "";

    return {
      country: country || "Other",
      laborCost: parseFloat(document.getElementById(this.laborInputId).value) || salaryInfo.monthly,
      dailyMeals: parseInt(document.getElementById("pc-daily-meals").value, 10) || 0,
      painPoint: document.getElementById("pc-pain-point").value || "high_labor_cost",
      equipment: equipment,
      operatorReduction: parseInt(document.getElementById("pc-operator-reduction").value, 10) || 2,
      salaryInfo: salaryInfo,
      businessType: businessType,
    };
  };

  ProfitCalculator.prototype.run = function () {
    if (!validateForm()) return;
    var input = this.getInput();
    if (input.dailyMeals <= 0) return;
    var result = calculate(input);

    // Show result panel
    var panel = document.getElementById(this.resultId);
    if (panel) {
      panel.classList.remove("hidden");
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Steps mode: switch to step 2
    if (this.stepsMode) {
      var step1 = document.getElementById("pc-step-1");
      var step2 = document.getElementById("pc-step-2");
      if (step1) step1.classList.add("hidden");
      if (step2) step2.classList.remove("hidden");
    }

    this.renderResults(result, input.salaryInfo);
    this.renderChart(result, input.salaryInfo);
    this.storeLastResult(input, result);
  };

  ProfitCalculator.prototype.renderResults = function (r, info) {
    var sym = langCurrency().symbol;
    var helpers = {
      fmt: formatNumber,
      short: function (n) {
        return shortCurrency(n, sym);
      },
    };

    // Bind data attributes
    var els = {
      "res-monthly-savings": sym + helpers.fmt(r.monthlySavings.min) + " – " + sym + helpers.fmt(r.monthlySavings.max),
      "res-investment": sym + helpers.fmt(r.investment.min) + " – " + sym + helpers.fmt(r.investment.max),
      "res-payback": r.payback.min + "–" + r.payback.max,
      "res-five-year": helpers.short(r.fiveYearReturn.min) + " – " + helpers.short(r.fiveYearReturn.max),
      "res-annual": helpers.short(r.annualSavings.mid),
      "res-co2": r.co2.toFixed(1),
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

  ProfitCalculator.prototype.restoreLastResult = function () {
    return false;
  };

  ProfitCalculator.prototype.shareWhatsApp = function () {
    if (!this._lastInput || !this._lastResult) return;
    var msg = buildWhatsAppMessage(this._lastInput, this._lastResult, this._lastInput.salaryInfo);
    var url =
      window.Contacts && typeof window.Contacts.contactsWhatsApp === "function"
        ? window.Contacts.contactsWhatsApp({ source: "ROI Calculator", message: msg })
        : "https://wa.me/" +
          (window.Contacts ? window.Contacts.whatsapp : "8613163756465") +
          "?text=" +
          encodeURIComponent(msg);
    window.open(url, "_blank", "noopener");
  };

  ProfitCalculator.prototype.downloadPDF = function () {
    if (!this._lastInput || !this._lastResult) return;
    generatePDF(this._lastInput, this._lastResult, this._lastInput.salaryInfo);
  };

  ProfitCalculator.prototype.resetSteps = function () {
    var step1 = document.getElementById("pc-step-1");
    var step2 = document.getElementById("pc-step-2");
    if (step1) step1.classList.remove("hidden");
    if (step2) step2.classList.add("hidden");
  };

  /**
   * Apply URL parameters to auto-fill the form.
   * Supports direct params (country, meals, pain, equipment, operators)
   * and scene presets (scene=chain-restaurant).
   */
  ProfitCalculator.prototype.applyPreset = function () {
    var params = new URLSearchParams(window.location.search);
    var scene = params.get("scene");

    // Load scene preset as defaults
    var preset = scene && SCENE_PRESETS[scene] ? SCENE_PRESETS[scene] : {};

    // URL params override preset values
    var country = params.get("country") || "";
    var meals = parseInt(params.get("meals"), 10) || preset.meals || 0;
    var pain = params.get("pain") || preset.pain || "";
    var equipStr = params.get("equipment") || "";
    var equipment = equipStr
      ? equipStr.split(",").map(function (s) {
          return s.trim();
        })
      : preset.equipment || [];
    var operators = parseInt(params.get("operators"), 10) || preset.operators || 2;
    var autoCalc = params.get("calc") !== "0"; // auto-calc by default when params exist

    // No valid preset and no explicit params — do nothing
    if (!scene && !params.has("meals") && !params.has("pain") && !params.has("equipment")) {
      return false;
    }

    var self = this;

    // Fill country (triggers labor cost auto-fill)
    if (country) {
      var countryEl = document.getElementById(this.countrySelectId);
      if (countryEl) {
        countryEl.value = country;
        countryEl.dispatchEvent(new Event("change"));
      }
    }

    // Fill daily meals
    if (meals > 0) {
      var mealsEl = document.getElementById("pc-daily-meals");
      if (mealsEl) mealsEl.value = meals;
    }

    // Fill pain point
    if (pain) {
      var painEl = document.getElementById("pc-pain-point");
      if (painEl) painEl.value = pain;
    }

    // Check equipment checkboxes
    if (equipment.length) {
      document.querySelectorAll(".pc-equipment").forEach(function (cb) {
        cb.checked = equipment.indexOf(cb.value) !== -1;
      });
    }

    // Set operator reduction slider
    var rangeEl = document.getElementById("pc-operator-reduction");
    var rangeValEl = document.getElementById("pc-operator-value");
    if (rangeEl) {
      rangeEl.value = operators;
      if (rangeValEl) rangeValEl.textContent = operators;
    }
    // Re-bind input listener on the slider (cloneNode replaced it in syncRangeDisplay)
    var freshRange = document.getElementById("pc-operator-reduction");
    if (freshRange) {
      freshRange.addEventListener("input", function () {
        var val = document.getElementById("pc-operator-value");
        if (val) val.textContent = this.value;
      });
    }

    // Auto-trigger calculation (use microtask to let change handlers run first)
    if (autoCalc) {
      Promise.resolve().then(function () {
        var ph = document.getElementById("profit-placeholder");
        if (ph) ph.classList.add("hidden");
        self.run();
      });
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

/* ───────── SPA-safe event helper (outside IIFE) ───────── */
var _spaRegs = {};
function _spaOn(tgt, evt, fn, key) {
  if (_spaRegs[key]) _spaRegs[key].abort();
  var ac = new AbortController();
  _spaRegs[key] = ac;
  tgt.addEventListener(evt, fn, { signal: ac.signal });
}

/* ───────── SPA auto-init on spa:load ───────── */
_spaOn(document, "spa:load", function initProfitCalc() {
  var form = document.getElementById("profit-calc-form");
  if (!form || form._spaInitialized) return;
  form._spaInitialized = true;

  // Detect mobile by presence of back-btn (only mobile has steps mode)
  var isMobile = !!document.getElementById("pc-back-btn");

  var calc = new ProfitCalculator({
    formId: "profit-calc-form",
    resultId: "profit-result-panel",
    chartCanvasId: "profit-chart",
    countrySelectId: "pc-country",
    laborInputId: "pc-labor-cost",
    stepsMode: isMobile,
  });
  window._profitCalcInstance = calc;

  // Ensure slider display syncs (handles SPA re-navigation)
  syncRangeDisplay();

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
_spaOn(window, "languageChanged", function (e) {}, true); // capture phase

// On language change, re-render results with new currency/labels
_spaOn(window, "languageChanged", function () {
  var calc = window._profitCalcInstance;
  if (calc && calc._lastResult && calc._lastInput) {
    calc.renderResults(calc._lastResult, calc._lastInput.salaryInfo);
    calc.renderChart(calc._lastResult, calc._lastInput.salaryInfo);
  }
});
