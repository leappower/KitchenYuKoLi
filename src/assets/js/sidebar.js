// sidebar.js - Floating sidebar, indicator prompt, jump animation
// IIFE wrapper for src2 (no build tools)
// Depends on: window.MediaQueries
// Outputs: window.Sidebar + individual functions on window

(function (global) {
  "use strict";

  /** 读取移动端断点状态。优先 MediaQueries.isMobile()，降级 mqMobile 属性。 */
  function getMqMobile() {
    return global.MediaQueries
      ? typeof global.MediaQueries.isMobile === "function"
        ? global.MediaQueries.isMobile()
        : !!global.MediaQueries.mqMobile
      : false;
  }

  // ============================================
  // SIDEBAR SYSTEM
  // ============================================
  var secondaryExpanded = false;

  function setSecondaryContactsExpanded(expanded) {
    var secondary = document.getElementById("secondary-contacts");
    var btn = document.getElementById("expand-btn");
    if (!secondary || !btn) return;

    secondaryExpanded = !!expanded;
    var btnIcon =
      document.getElementById("expand-btn-icon") ||
      document.getElementById("expand-btn-material-symbols-outlined-text");
    var tooltip = btn.querySelector(".contact-tooltip");

    if (secondaryExpanded) {
      secondary.classList.add("expanded");
      if (btnIcon) btnIcon.textContent = "expand_less";
      if (tooltip) tooltip.setAttribute("data-i18n", "sidebar_collapse");
      btn.classList.add("expanded");
    } else {
      secondary.classList.remove("expanded");
      if (btnIcon) btnIcon.textContent = "expand_more";
      if (tooltip) tooltip.setAttribute("data-i18n", "sidebar_expand");
      btn.classList.remove("expanded");
    }

    if (global.translationManager && typeof global.translationManager.applyTranslations === "function") {
      global.translationManager.applyTranslations();
    }
  }

  function toggleSecondaryContacts() {
    setSecondaryContactsExpanded(!secondaryExpanded);
  }

  function setupSecondaryContactsAutoCollapse() {
    document.addEventListener("click", function (event) {
      if (!secondaryExpanded) return;
      var sidebar = document.getElementById("floating-sidebar");
      if (!sidebar) return;
      if (sidebar.contains(event.target)) return;
      setSecondaryContactsExpanded(false);
    });

    global.addEventListener(
      "scroll",
      function () {
        if (!secondaryExpanded) return;
        setSecondaryContactsExpanded(false);
      },
      { passive: true }
    );
  }

  // ============================================
  // SIDEBAR INDICATOR
  // ============================================
  var indicatorState = {
    pageEnterAt: Date.now(),
    shownCount: 0,
    maxShowsPerSession: 2,
    lastShownAt: 0,
    cooldownMs: 20000,
    hasContactIntent: false,
    touchInteractions: 0,
    promptLoopTimer: null,
    hideTimer: null,
  };

  function showIndicator() {
    var indicator = document.getElementById("sidebar-indicator");
    if (!indicator) return;

    var popupOverlay = document.getElementById("smart-popup-overlay");
    if (popupOverlay && popupOverlay.classList.contains("show")) return;

    if (indicatorState.hasContactIntent) return;
    if (indicatorState.shownCount >= indicatorState.maxShowsPerSession) return;
    if (indicatorState.lastShownAt && Date.now() - indicatorState.lastShownAt < indicatorState.cooldownMs) return;

    var elapsedSeconds = Math.floor((Date.now() - indicatorState.pageEnterAt) / 1000);
    var scrollPercent = Math.round(
      (global.scrollY / Math.max(1, document.body.scrollHeight - global.innerHeight)) * 100
    );
    var isMobile = getMqMobile();
    var minWaitSeconds = isMobile ? 6 : 12;
    if (elapsedSeconds < minWaitSeconds) return;

    var isFirstShow = indicatorState.shownCount === 0;
    if (!isFirstShow) {
      if (isMobile) {
        var hasEnoughBrowseSignal = scrollPercent >= 3 || indicatorState.touchInteractions >= 1;
        var timeFallbackReached = elapsedSeconds >= 12;
        if (!hasEnoughBrowseSignal && !timeFallbackReached) return;
      } else if (scrollPercent < 18) {
        return;
      }
    }

    indicatorState.shownCount += 1;
    indicatorState.lastShownAt = Date.now();
    indicator.classList.add("show");

    if (indicatorState.hideTimer) clearTimeout(indicatorState.hideTimer);
    var visibleDuration = isMobile ? 10000 : 15000;
    indicatorState.hideTimer = setTimeout(function () {
      hideIndicator();
      indicatorState.hideTimer = null;
    }, visibleDuration);
  }

  function hideIndicator() {
    var indicator = document.getElementById("sidebar-indicator");
    if (!indicator) return;
    indicator.classList.remove("show");
  }

  function setupIndicatorPrompt() {
    indicatorState.pageEnterAt = Date.now();
    indicatorState.touchInteractions = 0;

    var markIntent = function () {
      indicatorState.hasContactIntent = true;
      hideIndicator();
      if (indicatorState.promptLoopTimer) {
        clearInterval(indicatorState.promptLoopTimer);
        indicatorState.promptLoopTimer = null;
      }
    };

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var indicator = document.getElementById("sidebar-indicator");
      if (indicator && indicator.classList.contains("show") && !target.closest("#sidebar-indicator")) {
        hideIndicator();
      }

      var touchedContactEntry = target.closest(
        '#jump-btn-2, #jump-btn-3, #jump-btn-4, #secondary-contacts button, #contact-form, #smart-popup-form, [data-action="show-popup"]'
      );
      if (touchedContactEntry) markIntent();
    });

    document.addEventListener(
      "touchstart",
      function () {
        indicatorState.touchInteractions += 1;
      },
      { passive: true }
    );

    var initialDelay = getMqMobile() ? 5000 : 10000;
    setTimeout(showIndicator, initialDelay);
    indicatorState.promptLoopTimer = setInterval(showIndicator, 10000);
  }

  // ============================================
  // JUMP ANIMATION SYSTEM
  // ============================================
  function setupJumpingAnimation() {
    var jumpButtons = [
      document.getElementById("jump-btn-1"),
      document.getElementById("jump-btn-2"),
      document.getElementById("jump-btn-3"),
      document.getElementById("jump-btn-4"),
    ];
    if (
      jumpButtons.some(function (btn) {
        return !btn;
      })
    )
      return;

    var currentIndex = 0,
      animationTimer = null,
      isAnimating = false;
    var originalStyles = jumpButtons.map(function (btn) {
      return {
        transform: btn.style.transform,
        boxShadow: btn.style.boxShadow,
        zIndex: btn.style.zIndex,
        animation: btn.style.animation,
      };
    });

    function stopAllJumping() {
      jumpButtons.forEach(function (btn, index) {
        if (btn) {
          btn.classList.remove("jump-active");
          btn.style.transform = originalStyles[index].transform || "";
          btn.style.boxShadow = originalStyles[index].boxShadow || "";
          btn.style.zIndex = originalStyles[index].zIndex || "";
          btn.style.animation = "";
        }
      });
      isAnimating = false;
    }

    function gentleStopButton(btn, index) {
      if (!btn) return;
      btn.style.transition = "all 0.3s ease-out";
      setTimeout(function () {
        btn.classList.remove("jump-active");
        btn.style.transform = originalStyles[index].transform || "";
        btn.style.boxShadow = originalStyles[index].boxShadow || "";
        btn.style.zIndex = originalStyles[index].zIndex || "";
        setTimeout(function () {
          btn.style.transition = "";
        }, 300);
      }, 100);
    }

    function startNextJump() {
      if (isAnimating) return;
      isAnimating = true;
      if (jumpButtons[currentIndex]) gentleStopButton(jumpButtons[currentIndex], currentIndex);

      var nextIndex = currentIndex,
        attempts = 0;
      while (attempts <= jumpButtons.length) {
        nextIndex = (nextIndex + 1) % jumpButtons.length;
        attempts++;
        var nextBtn = jumpButtons[nextIndex];
        if (nextBtn) {
          var rect = nextBtn.getBoundingClientRect();
          var isVisible =
            rect.top >= -100 &&
            rect.left >= -100 &&
            rect.bottom <= global.innerHeight + 100 &&
            rect.right <= global.innerWidth + 100;
          if (isVisible && !nextBtn.matches(":hover")) {
            currentIndex = nextIndex;
            break;
          }
        }
      }

      if (attempts > jumpButtons.length) {
        isAnimating = false;
        return;
      }

      var currentBtn = jumpButtons[currentIndex];
      if (!currentBtn) {
        isAnimating = false;
        return;
      }

      originalStyles[currentIndex] = {
        transform: currentBtn.style.transform,
        boxShadow: currentBtn.style.boxShadow,
        zIndex: currentBtn.style.zIndex,
        animation: currentBtn.style.animation,
      };
      currentBtn.classList.add("jump-active");
      var bRect = currentBtn.getBoundingClientRect();
      if (bRect.top < 0 || bRect.bottom > global.innerHeight) {
        currentBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      setTimeout(function () {
        if (currentBtn && currentBtn.classList.contains("jump-active")) gentleStopButton(currentBtn, currentIndex);
        isAnimating = false;
      }, 800);
    }

    function startAnimationCycle() {
      stopAllJumping();
      if (animationTimer) clearInterval(animationTimer);
      setTimeout(startNextJump, 1000);
      animationTimer = setInterval(startNextJump, 1200);
    }

    function stopAnimationCycle() {
      if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
      }
      stopAllJumping();
    }

    function setupButtonInteractions() {
      jumpButtons.forEach(function (btn) {
        if (!btn) return;
        btn.addEventListener("mouseenter", function () {
          btn.classList.remove("jump-active");
          btn.style.transform = "scale(1.05)";
          btn.style.transition = "transform 0.2s ease-out";
        });
        btn.addEventListener("mouseleave", function () {
          btn.style.transform = "";
          btn.style.transition = "";
        });
        btn.addEventListener("click", function () {
          btn.style.transform = "scale(0.95)";
          setTimeout(function () {
            btn.style.transform = "";
          }, 150);
          btn.dataset.lastClicked = Date.now();
          stopAnimationCycle();
          setTimeout(startAnimationCycle, 2000);
        });
      });
    }

    function setupVisibilityHandler() {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stopAnimationCycle();
        else setTimeout(startAnimationCycle, 500);
      });
    }

    function init() {
      if (document.readyState !== "complete") {
        global.addEventListener("load", function () {
          setTimeout(init, 500);
        });
        return;
      }
      setupButtonInteractions();
      setupVisibilityHandler();
      setTimeout(startAnimationCycle, 3000);
      var lastActivity = Date.now();
      setInterval(function () {
        if (Date.now() - lastActivity > 30000 && animationTimer) {
          clearInterval(animationTimer);
          animationTimer = setInterval(startNextJump, 5000);
        }
      }, 10000);
      ["mousemove", "click", "keydown", "scroll"].forEach(function (evt) {
        global.addEventListener(
          evt,
          function () {
            lastActivity = Date.now();
          },
          { passive: true }
        );
      });
    }

    init();
    return { start: startAnimationCycle, stop: stopAnimationCycle, next: startNextJump };
  }

  // ─── Expose ───────────────────────────────────────────────────────────────
  global.Sidebar = {
    setSecondaryContactsExpanded: setSecondaryContactsExpanded,
    toggleSecondaryContacts: toggleSecondaryContacts,
    setupSecondaryContactsAutoCollapse: setupSecondaryContactsAutoCollapse,
    showIndicator: showIndicator,
    hideIndicator: hideIndicator,
    setupIndicatorPrompt: setupIndicatorPrompt,
    setupJumpingAnimation: setupJumpingAnimation,
  };

  // Direct window bindings for HTML inline calls
  global.setSecondaryContactsExpanded = setSecondaryContactsExpanded;
  global.toggleSecondaryContacts = toggleSecondaryContacts;
  global.showIndicator = showIndicator;
  global.hideIndicator = hideIndicator;
  global.setupJumpingAnimation = setupJumpingAnimation;
})(window);
