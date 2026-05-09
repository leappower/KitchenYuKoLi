/**
 * cases-page.js — Interactive buttons for /applications/cases/ page
 * Handles: smooth scroll, filters, case study modals, video modal, CTA navigation
 */
(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  /* ─── Case Study Data ─── */
  var CASES = {
    1: {
      title: "暹罗快炒 (Siam Wok Express)",
      subtitle: "泰国 · 连锁餐饮 · 86家门店",
      flag: "🇹🇭",
      category: "chain",
      client: "泰国炒菜连锁品牌，覆盖曼谷、清迈、芭提雅共86家门店",
      challenge: "门店间菜品配方一致性差，厨师流动率高，新店开业周期长达6周，培训成本居高不下。",
      solution: "部署172台YuKoLi自动炒菜机（YK-AW2000），每台内置200+道菜谱，实现一键标准化烹饪。",
      results: [
        { value: "70%", label: "人力缩减（5人→1.5人/店）" },
        { value: "32%", label: "能耗降低" },
        { value: "10天", label: "新店开业周期（原6周）" },
        { value: "99.2%", label: "配方一致性评分" },
      ],
      equipment: [
        { model: "YK-AW2000", name: "自动炒菜机", qty: "172台" },
        { model: "YK-RC800", name: "商用饭煲", qty: "86台" },
      ],
      timeline: "18个月（第一阶段：曼谷30家店 → 第二阶段：全国扩展）",
      testimonial: {
        text: "We went from 12 stores to 86 in 18 months. Without YuKoLi, we'd still be at 20.",
        textCn: "我们18个月内从12家店扩展到86家。没有YuKoLi，可能还停留在20家。",
        author: "Chef Somchai",
        role: "运营总监 (Operations Director)",
      },
    },
    2: {
      title: "越快河粉 (Phở Việt Quick)",
      subtitle: "越南 · 连锁餐饮 · 45家门店",
      flag: "🇻🇳",
      category: "chain",
      client: "胡志明市河粉连锁品牌，45家门店，高峰期日供500+碗",
      challenge: "人力成本高，高峰期上菜慢，每店需3-5名厨师，日营业压力大。",
      solution: "部署YK-SP600智能汤锅 + YK-AW1200自动炒菜机（配料），实现汤底标准化烹饪。",
      results: [
        { value: "3→1", label: "每店厨师人数" },
        { value: "500+", label: "日供河粉碗数" },
        { value: "15分钟", label: "平均等餐时间（原25分钟）" },
        { value: "¥12万", label: "单店年节省成本" },
      ],
      equipment: [
        { model: "YK-SP600", name: "智能汤锅", qty: "45台" },
        { model: "YK-AW1200", name: "自动炒菜机", qty: "45台" },
        { model: "YK-IC300", name: "电磁炉", qty: "90台" },
      ],
      timeline: "8个月，完成全部45家门店升级",
      testimonial: {
        text: "Our broth consistency went from 80% to 99.5% overnight. Customers noticed immediately.",
        textCn: "我们的汤底一致性一夜之间从80%提升到99.5%。顾客立刻就注意到了。",
        author: "Mr. Nguyen Van Minh",
        role: "创始人 (Founder)",
      },
    },
    3: {
      title: "吉隆坡工厂食堂 (KL Industrial Canteen)",
      subtitle: "马来西亚 · 团餐 · 3,000人/天",
      flag: "🇲🇾",
      category: "catering",
      client: "吉隆坡电子工厂食堂，服务3,000名工人，需符合马来西亚卫生部食品安全标准",
      challenge: "场地有限、人手不足，需在有限空间内满足3,000人用餐，同时通过政府食品安全检查。",
      solution: "部署YK-ST3000商用蒸柜 + YK-RC2000电饭煲 + 自动洗碗线，实现大规模标准化出餐。",
      results: [
        { value: "75%", label: "人力缩减（16人→4人）" },
        { value: "3,000", label: "日均供餐份数" },
        { value: "40%", label: "食材浪费减少" },
        { value: "100%", label: "卫生部检查通过率" },
      ],
      equipment: [
        { model: "YK-ST3000", name: "商用蒸柜", qty: "6台" },
        { model: "YK-RC2000", name: "商用饭煲", qty: "8台" },
        { model: "YK-DF500", name: "商用洗碗机", qty: "3台" },
      ],
      timeline: "3个月安装 + 1个月培训",
      testimonial: {
        text: "We used to struggle with food safety audits. Now we pass with flying colors every time.",
        textCn: "以前食品安全检查总是提心吊胆，现在每次都轻松通过。",
        author: "Puan Aisyah",
        role: "设施经理 (Facilities Manager)",
      },
    },
    4: {
      title: "雅加达云厨房 (Jakarta Cloud Kitchen Hub)",
      subtitle: "印度尼西亚 · 云厨房 · 8个站点",
      flag: "🇮🇩",
      category: "ghost",
      client: "GoFood合作商，雅加达8个纯外卖站点，日均800+订单",
      challenge: "订单量大、空间有限，需同时支持多菜系烹饪，快速出餐是核心诉求。",
      solution: "部署YK-AW2000自动炒菜机 + YK-ST1500蒸柜 + 紧凑型厨房布局设计，一站多菜系。",
      results: [
        { value: "800+", label: "8站日均总订单量" },
        { value: "28%", label: "出餐速度提升" },
        { value: "¥15万", label: "年节省成本" },
        { value: "4.8★", label: "GoFood评分（原4.2★）" },
      ],
      equipment: [
        { model: "YK-AW2000", name: "自动炒菜机", qty: "16台" },
        { model: "YK-ST1500", name: "蒸柜", qty: "8台" },
        { model: "YK-IC500", name: "电磁炉", qty: "16台" },
      ],
      timeline: "6个月分阶段部署",
      testimonial: {
        text: "We run 3 cuisines from one station now. The auto-wok handles Thai, Chinese, and Indonesian dishes perfectly.",
        textCn: "现在一个站点能同时做三种菜系。自动炒菜机完美支持泰式、中式和印尼菜。",
        author: "Andi Pratama",
        role: "站点经理 (Hub Manager)",
      },
    },
    5: {
      title: "马尼拉大学食堂 (Manila University Cafeteria)",
      subtitle: "菲律宾 · 团餐 · 15,000名学生",
      flag: "🇵🇭",
      category: "catering",
      client: "马尼拉大都会区大学，15,000名学生，2个食堂，每食堂日供2,000+餐",
      challenge: "每食堂日供2,000+餐，员工流动率高，菜品质量不稳定，学生投诉频繁。",
      solution: "部署YK-ST2000蒸柜 + YK-AW1500自动炒菜机 + 智能库存管理系统。",
      results: [
        { value: "67%", label: "人力缩减（12人→4人/食堂）" },
        { value: "99.5%", label: "菜品一致性" },
        { value: "¥20万", label: "年节省成本" },
        { value: "+35%", label: "学生满意度提升" },
      ],
      equipment: [
        { model: "YK-ST2000", name: "蒸柜", qty: "4台" },
        { model: "YK-AW1500", name: "自动炒菜机", qty: "6台" },
        { model: "YK-RC1500", name: "电饭煲", qty: "6台" },
      ],
      timeline: "4个月",
      testimonial: {
        text: "Student complaints about food quality dropped by 90%. The rice and stir-fry dishes are identical every single day.",
        textCn: "学生对食品质量的投诉下降了90%。米饭和炒菜每天都一模一样。",
        author: "Dr. Reyes",
        role: "大学行政主管 (University Administrator)",
      },
    },
  };

  /* ─── Utility: find closest parent matching selector ─── */
  function closestParent(el, selector) {
    var node = el.parentElement;
    while (node) {
      if (node.matches && node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  /* ─── Utility: query all in context ─── */
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  /* ═══════════════════════════════════════════════════
     1. "Explore Cases" → smooth scroll to #case-grid
     ═══════════════════════════════════════════════════ */
  function initExploreButton() {
    $$("button").forEach(function (btn) {
      var text = (btn.textContent || "").trim().toLowerCase();
      if (text.includes("explore cases") || btn.querySelector('[data-i18n="case_studies_explore_cases"]')) {
        btn.addEventListener("click", function () {
          var target = document.getElementById("case-grid");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    });
  }

  /* ═══════════════════════════════════════════════════
     2. Filter buttons
     ═══════════════════════════════════════════════════ */
  function initFilters() {
    // Add data-filter to filter buttons
    $$('button[data-i18n="case_studies_all_cases"]').forEach(function (btn) {
      btn.setAttribute("data-filter", "all");
    });
    $$('button[data-i18n="case_studies_chain_restaurants"]').forEach(function (btn) {
      btn.setAttribute("data-filter", "chain");
    });
    $$('button[data-i18n="case_studies_catering"]').forEach(function (btn) {
      btn.setAttribute("data-filter", "catering");
    });
    $$('button[data-i18n="case_studies_ghost_kitchens"]').forEach(function (btn) {
      btn.setAttribute("data-filter", "ghost");
    });

    // Add data-category to case cards
    var cardSelectors = [
      { titleI18n: "case1_title", category: "chain" },
      { titleI18n: "case2_title", category: "chain" },
      { titleI18n: "case3_title", category: "catering" },
      { titleI18n: "case4_title", category: "ghost" },
      { titleI18n: "case5_title", category: "catering" },
    ];
    cardSelectors.forEach(function (cs) {
      $$('[data-i18n="' + cs.titleI18n + '"]').forEach(function (el) {
        var card = closestParent(el, ".rounded-2xl");
        if (card) card.setAttribute("data-category", cs.category);
      });
    });

    // Filter click handler
    var filterContainer = null;
    $$("button[data-filter]").forEach(function (btn) {
      if (!filterContainer) filterContainer = btn.parentElement;
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");

        // Update active states
        if (filterContainer) {
          $$("button[data-filter]", filterContainer).forEach(function (b) {
            b.classList.remove("bg-primary", "text-white");
            b.classList.add("bg-slate-200", "dark:bg-slate-800");
          });
        }
        btn.classList.remove("bg-slate-200", "dark:bg-slate-800");
        btn.classList.add("bg-primary", "text-white");

        // Filter cards
        var grid = document.getElementById("case-grid");
        if (!grid) return;

        $$("[data-category]", grid).forEach(function (card) {
          var cat = card.getAttribute("data-category");
          var show = filter === "all" || cat === filter;
          if (show) {
            card.style.display = "";
            requestAnimationFrame(function () {
              card.style.opacity = "1";
              card.style.transform = "scale(1)";
            });
          } else {
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            setTimeout(function () {
              card.style.display = "none";
            }, 300);
          }
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     3. Case Study Modal
     ═══════════════════════════════════════════════════ */
  var modalOverlay = null;
  var modalCard = null;

  function createModal() {
    modalOverlay = document.createElement("div");
    modalOverlay.id = "case-modal-overlay";
    modalOverlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;";
    modalOverlay.innerHTML =
      '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);"></div>';
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay || e.target === modalOverlay.firstElementChild) closeModal();
    });

    modalCard = document.createElement("div");
    modalCard.style.cssText =
      "position:relative;max-width:768px;width:100%;max-height:90vh;overflow-y:auto;background:#fff;border-radius:1rem;box-shadow:0 25px 50px rgba(0,0,0,0.25);transform:scale(0.95);opacity:0;transition:transform 0.3s ease,opacity 0.3s ease;";
    modalCard.className = "dark:bg-slate-900 dark:text-slate-100";

    modalOverlay.appendChild(modalCard);
    document.body.appendChild(modalOverlay);
  }

  function openModal(caseId) {
    var c = CASES[caseId];
    if (!c || !modalOverlay || !modalCard) return;

    var resultsHTML = c.results
      .map(function (r) {
        return (
          '<div style="text-align:center;padding:1rem 0.5rem;background:#f8fafc;border-radius:0.75rem;" class="dark:bg-slate-800">' +
          '<div style="font-size:2rem;font-weight:900;color:var(--color-primary,#f97316);">' +
          r.value +
          "</div>" +
          '<div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:0.25rem;" class="dark:text-slate-400">' +
          r.label +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    var equipHTML = c.equipment
      .map(function (e) {
        return (
          '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #f1f5f9;" class="dark:border-slate-700">' +
          '<span><strong class="text-primary">' +
          e.model +
          "</strong> · " +
          e.name +
          "</span>" +
          '<span style="font-weight:700;">' +
          e.qty +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    modalCard.innerHTML =
      '<button id="case-modal-close" style="position:absolute;top:1rem;right:1rem;background:#f1f5f9;border:none;border-radius:0.5rem;width:2.5rem;height:2.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.25rem;z-index:1;" class="dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">&times;</button>' +
      '<div style="padding:2rem;">' +
      // Header
      '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">' +
      '<span style="font-size:2rem;">' +
      c.flag +
      "</span>" +
      "<div>" +
      '<h2 style="font-size:1.5rem;font-weight:900;line-height:1.2;">' +
      c.title +
      "</h2>" +
      '<p style="color:#64748b;font-size:0.875rem;font-weight:600;" class="dark:text-slate-400">' +
      c.subtitle +
      "</p>" +
      "</div>" +
      "</div>" +
      '<p style="color:#475569;margin-bottom:1.5rem;" class="dark:text-slate-300">' +
      c.client +
      "</p>" +
      // Challenge
      '<div style="margin-bottom:1.5rem;">' +
      '<h3 style="font-weight:800;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:0.5rem;" class="dark:text-slate-400">💡 客户挑战</h3>' +
      '<p style="line-height:1.7;">' +
      c.challenge +
      "</p>" +
      "</div>" +
      // Solution
      '<div style="margin-bottom:1.5rem;">' +
      '<h3 style="font-weight:800;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:0.5rem;" class="dark:text-slate-400">🔧 解决方案</h3>' +
      '<p style="line-height:1.7;">' +
      c.solution +
      "</p>" +
      "</div>" +
      // Key Results
      '<div style="margin-bottom:1.5rem;">' +
      '<h3 style="font-weight:800;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:0.75rem;" class="dark:text-slate-400">📊 核心成果</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;">' +
      resultsHTML +
      "</div>" +
      "</div>" +
      // Equipment
      '<div style="margin-bottom:1.5rem;">' +
      '<h3 style="font-weight:800;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:0.5rem;" class="dark:text-slate-400">🏗️ 部署设备</h3>' +
      equipHTML +
      "</div>" +
      // Timeline
      '<div style="margin-bottom:1.5rem;">' +
      '<h3 style="font-weight:800;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:0.5rem;" class="dark:text-slate-400">⏱️ 项目周期</h3>' +
      "<p>" +
      c.timeline +
      "</p>" +
      "</div>" +
      // Testimonial
      '<div style="background:#f8fafc;padding:1.25rem;border-radius:0.75rem;border-left:4px solid var(--color-primary,#f97316);" class="dark:bg-slate-800">' +
      '<p style="font-style:italic;line-height:1.7;margin-bottom:0.5rem;color:#334155;" class="dark:text-slate-300">"' +
      c.testimonial.text +
      '"</p>' +
      '<p style="font-size:0.8125rem;color:#64748b;" class="dark:text-slate-400">（' +
      c.testimonial.textCn +
      "）</p>" +
      '<p style="font-weight:700;margin-top:0.75rem;font-size:0.875rem;">— ' +
      c.testimonial.author +
      "</p>" +
      '<p style="font-size:0.8125rem;color:#64748b;" class="dark:text-slate-400">' +
      c.testimonial.role +
      "</p>" +
      "</div>" +
      // CTA
      '<div style="margin-top:1.5rem;text-align:center;">' +
      '<a href="/profit-calculator/" style="display:inline-block;background:var(--color-primary,#f97316);color:#fff;padding:0.875rem 2rem;border-radius:0.75rem;font-weight:800;text-decoration:none;font-size:0.875rem;">获取免费ROI方案</a>' +
      "</div>" +
      "</div>";

    modalOverlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () {
      modalCard.style.transform = "scale(1)";
      modalCard.style.opacity = "1";
    });

    $("#case-modal-close").addEventListener("click", closeModal);
  }

  function closeModal() {
    if (!modalOverlay || !modalCard) return;
    modalCard.style.transform = "scale(0.95)";
    modalCard.style.opacity = "0";
    setTimeout(function () {
      modalOverlay.style.display = "none";
      document.body.style.overflow = "";
    }, 300);
  }

  function initCaseStudyButtons() {
    // Map case buttons to case IDs by their title i18n key
    var caseMap = {
      case1_title: 1,
      case2_title: 2,
      case3_title: 3,
      case4_title: 4,
      case5_title: 5,
    };

    Object.keys(caseMap).forEach(function (titleKey) {
      var caseId = caseMap[titleKey];
      $$('[data-i18n="' + titleKey + '"]').forEach(function (titleEl) {
        var card = closestParent(titleEl, ".rounded-2xl");
        if (!card) return;
        var readBtn = $('button[data-i18n="case_read_more"]', card);
        if (readBtn) {
          readBtn.addEventListener("click", function () {
            openModal(caseId);
          });
        }
      });
    });

    // "Read Full Story" featured button → Case 1
    $$('button[data-i18n="featured_cta"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(1);
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     4. Video Modal
     ═══════════════════════════════════════════════════ */
  var videoOverlay = null;

  function initVideoButton() {
    $$('[data-i18n="case_studies_watch_video"]').forEach(function (el) {
      var clickable = closestParent(el, ".flex");
      if (!clickable) clickable = el;
      clickable.style.cursor = "pointer";
      clickable.addEventListener("click", function () {
        openVideoModal();
      });
    });
  }

  function openVideoModal() {
    if (videoOverlay) {
      videoOverlay.style.display = "flex";
      document.body.style.overflow = "hidden";
      return;
    }
    videoOverlay = document.createElement("div");
    videoOverlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);";
    videoOverlay.innerHTML =
      '<div style="position:relative;max-width:640px;width:100%;background:#fff;border-radius:1rem;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.25);" class="dark:bg-slate-900">' +
      '<button style="position:absolute;top:0.75rem;right:0.75rem;background:rgba(255,255,255,0.9);border:none;border-radius:0.5rem;width:2.25rem;height:2.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.25rem;z-index:1;" class="dark:bg-slate-800 dark:text-white" id="video-modal-close">&times;</button>' +
      '<div style="aspect-ratio:16/9;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;">' +
      '<span class="material-symbols-outlined" style="font-size:4rem;color:#f97316;">play_circle</span>' +
      '<p style="color:#e2e8f0;font-weight:700;font-size:1.125rem;">视频即将上线</p>' +
      '<p style="color:#94a3b8;font-size:0.875rem;">YuKoLi智能炒菜机自动化演示</p>' +
      "</div>" +
      "</div>";

    videoOverlay.addEventListener("click", function (e) {
      if (e.target === videoOverlay) {
        videoOverlay.style.display = "none";
        document.body.style.overflow = "";
      }
    });
    document.body.appendChild(videoOverlay);
    document.body.style.overflow = "hidden";
    $("#video-modal-close").addEventListener("click", function () {
      videoOverlay.style.display = "none";
      document.body.style.overflow = "";
    });
  }

  /* ═══════════════════════════════════════════════════
     6 & 7. CTA Buttons
     ═══════════════════════════════════════════════════ */
  function initCTAButtons() {
    $$('button[data-i18n="cta_get_proposal"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.SpaRouter) {
          window.SpaRouter.navigate("/profit-calculator/");
        } else {
          window.location.href = "/profit-calculator/";
        }
      });
    });
    $$('button[data-i18n="cta_contact_sales"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.SpaRouter) {
          window.SpaRouter.navigate("/quote/");
        } else {
          window.location.href = "/contact/?from=" + encodeURIComponent(location.pathname);
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     8. ESC key handler
     ═══════════════════════════════════════════════════ */
  function initKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeModal();
        if (videoOverlay && videoOverlay.style.display === "flex") {
          videoOverlay.style.display = "none";
          document.body.style.overflow = "";
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════
     9. Add transition styles to case cards
     ═══════════════════════════════════════════════════ */
  function initCardTransitions() {
    $$("[data-category]").forEach(function (card) {
      card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    });
  }

  /* ─── Init ─── */
  function init() {
    createModal();
    initExploreButton();
    initFilters();
    initCaseStudyButtons();
    initVideoButton();
    initCTAButtons();
    initKeyboard();
    // Delay card transitions until after filter init
    requestAnimationFrame(initCardTransitions);
  }

  function runInit() {
    init();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInit);
  } else {
    runInit();
  }
  _spaOn(document, "spa:load", runInit, "spa:load");
})();
