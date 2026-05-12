/**
 * roi-data.js — ROI reference data — savings coefficients, salaries, exchange rates, cases, WhatsApp templates
 *
 * Contains:
 * - ROI savings coefficient table
 * - Default salary references (5 SE Asian countries)
 * - Equipment investment ranges (USD)
 * - Exchange rates (simulated)
 * - Case studies (8 entries, shared with case-grid.js)
 * - WhatsApp pre-fill message templates
 *
 * All data is exported via window.RoiData and individual window.* globals
 * for DataLoader fallback chain.
 */
(function () {
  "use strict";

  // ── A. ROI Savings Coefficient Table ──────────────────────────────────
  var ROI_SAVINGS_TABLE = {
    招工难_智能炒菜机: { min: 0.3, mid: 0.52, max: 0.7 },
    人工成本高_全套自动化: { min: 0.35, mid: 0.6, max: 0.78 },
    出品不稳定_标准化设备: { min: 0.25, mid: 0.45, max: 0.62 },
    出餐慢_高速设备: { min: 0.28, mid: 0.48, max: 0.65 },
    空间不足_紧凑型设备: { min: 0.22, mid: 0.42, max: 0.58 },
  };

  // ── B. Default Salary References (5 countries) ────────────────────────
  var ROI_DEFAULT_SALARIES = {
    Philippines: { monthly: 25000, currency: "PHP", symbol: "₱" },
    Indonesia: { monthly: 4800000, currency: "IDR", symbol: "Rp" },
    Vietnam: { monthly: 7000000, currency: "VND", symbol: "₫" },
    Thailand: { monthly: 15000, currency: "THB", symbol: "฿" },
    Malaysia: { monthly: 2500, currency: "MYR", symbol: "RM" },
  };

  // ── C. Equipment Investment Ranges (USD) ──────────────────────────────
  var ROI_EQUIPMENT_COST = {
    智能炒菜机: { minUSD: 3000, maxUSD: 8000 },
    蒸饭柜: { minUSD: 1500, maxUSD: 4000 },
    洗碗机: { minUSD: 2000, maxUSD: 5000 },
    电磁炉: { minUSD: 500, maxUSD: 2000 },
    油炸炉: { minUSD: 1000, maxUSD: 3000 },
  };

  // ── D. Exchange Rates (simulated, 2025 median) ────────────────────────
  window.ROI_EXCHANGE_RATES = {
    base: "USD",
    rates: {
      PHP: 56.2,
      IDR: 15800,
      VND: 25300,
      THB: 35.5,
      MYR: 4.7,
      CNY: 7.24,
      USD: 1,
    },
    updatedAt: "2026-05-01",
  };

  // ── E. Case Studies (shared with case-grid.js) ────────────────────────
  window.ROI_CASES = {
    cases: [
      {
        id: "case-01",
        title: "Manila Burger Chain — 3 Shifts to 1",
        subtitle: "Smart wok + auto-fryer replaced 6 cooks per store",
        country: "Philippines",
        industry: "连锁餐饮",
        volume: "200-500",
        benefits: ["Labor Cost Reduction", "Consistency", "Fast Payback"],
        equipment: ["智能炒菜机 x2", "油炸炉 x1"],
        savings: "55% labor cost cut, ROI in 8 months",
        image: "/assets/images/cases/manila-burger-chain.webp",
        testimonial: "We went from 6 cooks per shift to 2. Food quality is actually better now.",
        author: "Marco R.",
        role: "Operations Director",
        date: "2025-09",
      },
      {
        id: "case-02",
        title: "Jakarta Cloud Kitchen — 30m² to Full Menu",
        subtitle: "Compact multi-function units enabled 45-item menu in tiny space",
        country: "Indonesia",
        industry: "云厨房",
        volume: "<200",
        benefits: ["Space Saving", "Labor Cost Reduction"],
        equipment: ["智能炒菜机 x1", "电磁炉 x2", "蒸饭柜 x1"],
        savings: "40% rent saved by downgrading kitchen space, same output",
        image: "/assets/images/cases/jakarta-cloud-kitchen.webp",
        testimonial: "Our cloud kitchen went from 80 to 200 daily orders without hiring anyone new.",
        author: "Siti N.",
        role: "Founder",
        date: "2025-07",
      },
      {
        id: "case-03",
        title: "HCMC Central Kitchen — 5000 Meals/Day",
        subtitle: "Automated steaming + wok line feeds 30+ school cafeterias",
        country: "Vietnam",
        industry: "中央厨房",
        volume: "1000+",
        benefits: ["Consistency", "Labor Cost Reduction", "Fast Payback"],
        equipment: ["智能炒菜机 x4", "蒸饭柜 x3", "洗碗机 x2"],
        savings: "60% labor reduction, 12-month full ROI",
        image: "/assets/images/cases/hcmc-central-kitchen.webp",
        testimonial: "Every school gets the same quality rice and stir-fry. Parents are happy.",
        author: "Tran V.",
        role: "Production Manager",
        date: "2025-11",
      },
      {
        id: "case-04",
        title: "Bangkok University Canteen",
        subtitle: "High-volume smart cooking for 3000+ daily servings",
        country: "Thailand",
        industry: "智慧食堂",
        volume: "1000+",
        benefits: ["Consistency", "Fast Payback"],
        equipment: ["智能炒菜机 x3", "蒸饭柜 x2", "电磁炉 x4", "油炸炉 x2"],
        savings: "Serving time cut from 45 to 20 min per meal window",
        image: "/assets/images/cases/bangkok-canteen.webp",
        testimonial: "Students no longer wait in long lines. Peak hour is actually calm now.",
        author: "Prasert K.",
        role: "Facility Director",
        date: "2025-10",
      },
      {
        id: "case-05",
        title: "KL Kopitiam Chain — Standardized Taste",
        subtitle: "Smart woks ensure every outlet tastes like the original",
        country: "Malaysia",
        industry: "连锁餐饮",
        volume: "500-1000",
        benefits: ["Consistency", "Labor Cost Reduction"],
        equipment: ["智能炒菜机 x2", "油炸炉 x1"],
        savings: "95% taste consistency across 12 outlets",
        image: "/assets/images/cases/kl-kopitiam.webp",
        testimonial: "Customers say every branch tastes the same now. That was impossible before.",
        author: "Ahmad F.",
        role: "Franchise Manager",
        date: "2025-08",
      },
      {
        id: "case-06",
        title: "Cebu Seafood Restaurant",
        subtitle: "Small restaurant owner went from 4 helpers to 1 machine",
        country: "Philippines",
        industry: "小型餐饮",
        volume: "<200",
        benefits: ["Labor Cost Reduction", "Space Saving", "Fast Payback"],
        equipment: ["智能炒菜机 x1"],
        savings: "₱18,000/month saved, ROI in 5 months",
        image: "/assets/images/cases/cebu-seafood.webp",
        testimonial: "My one smart wok does the work of 3 cooks. Best investment I ever made.",
        author: "Elena D.",
        role: "Owner",
        date: "2025-12",
      },
      {
        id: "case-07",
        title: "Surabaya Factory Canteen",
        subtitle: "Industrial kitchen automation for 1500 workers daily",
        country: "Indonesia",
        industry: "智慧食堂",
        volume: "1000+",
        benefits: ["Consistency", "Labor Cost Reduction", "Space Saving"],
        equipment: ["智能炒菜机 x4", "蒸饭柜 x4", "洗碗机 x3"],
        savings: "35% kitchen footprint reduction, 50% fewer kitchen staff",
        image: "/assets/images/cases/surabaya-factory.webp",
        testimonial: "We reduced our kitchen area and still increased capacity. Workers love the food.",
        author: "Budi S.",
        role: "Admin Manager",
        date: "2026-01",
      },
      {
        id: "case-08",
        title: "Hanoi Pho Chain — Consistency at Scale",
        subtitle: "Standardized broth + noodle production across 8 stores",
        country: "Vietnam",
        industry: "连锁餐饮",
        volume: "500-1000",
        benefits: ["Consistency", "Fast Payback"],
        equipment: ["智能炒菜机 x2", "蒸饭柜 x2"],
        savings: "Broth consistency improved from 70% to 98% satisfaction rating",
        image: "/assets/images/cases/hanoi-pho.webp",
        testimonial: "Customers noticed the difference immediately. Our Google reviews jumped 0.8 stars.",
        author: "Linh P.",
        role: "Brand Manager",
        date: "2026-02",
      },
    ],
    total: 8,
    filters: {
      industries: ["小型餐饮", "中央厨房", "连锁餐饮", "智慧食堂", "云厨房"],
      volumes: ["<200", "200-500", "500-1000", "1000+"],
      countries: ["Philippines", "Indonesia", "Vietnam", "Thailand", "Malaysia"],
      benefits: ["Labor Cost Reduction", "Consistency", "Space Saving", "Fast Payback"],
    },
  };

  // ── F. WhatsApp Pre-fill Message Templates ────────────────────────────
  var ROI_WHATSAPP_TEMPLATES = {
    "small-restaurant":
      "Hi, I run a small restaurant (approx __ orders/day). I want to know the price for your smart cooking machines.",
    "central-kitchen": "Hi, I am setting up a central kitchen. I need equipment for large volume production.",
    "chain-restaurant":
      "Hi, I manage a chain restaurant with __ stores. I'm looking for standardized cooking equipment.",
    canteen: "Hi, I manage a canteen serving __ people daily. I need high-volume cooking equipment.",
    "cloud-kitchen": "Hi, I run a cloud kitchen. I need compact multi-functional cooking equipment.",
    "menu-lab": "Hi, I'm curious if your machines can cook our local dishes. Can you test our menu?",
    "product-detail": "Hi, I'm interested in the {product name} ({model}). Please send me pricing and specs.",
    "roi-result": "Hi YuKoLi, I calculated my ROI:\n...",
    case: "Hi, I read the {country} {industry} case on your website. I have a similar situation.",
    global: "Hi, I'm interested in YuKoLi commercial kitchen equipment. Please help me find the right machine.",
  };

  // ── Export ────────────────────────────────────────────────────────────
  window.RoiData = {
    savingsTable: ROI_SAVINGS_TABLE,
    salaries: ROI_DEFAULT_SALARIES,
    equipmentCost: ROI_EQUIPMENT_COST,
    exchangeRates: window.ROI_EXCHANGE_RATES,
    cases: window.ROI_CASES,
    whatsappTemplates: ROI_WHATSAPP_TEMPLATES,
  };
})();
