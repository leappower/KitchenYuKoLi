/**
 * news-detail.js — News article detail page logic
 * Migrated from inline scripts in news/detail-*.html
 * Handles loading article content from URL params and applying i18n translations.
 * Works with both direct page load and SPA navigation.
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

  function initNewsDetail() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") || "news_1";
    var titleEl = document.getElementById("article-title");
    var bodyEl = document.getElementById("article-body");
    var dateEl = document.getElementById("article-date");

    // Set title via i18n
    if (titleEl) {
      titleEl.setAttribute("data-i18n", id + "_title");
      if (window.translationManager && window.translationManager.t) {
        titleEl.textContent = window.translationManager.t(id + "_title") || "";
      }
    }

    // Set date via i18n
    if (dateEl) {
      var dateKey = id + "_date";
      if (window.translationManager && window.translationManager.t) {
        var i18nPrefix = window.translationManager.t("news_detail_published") || "";
        var dateVal = window.translationManager.t(dateKey) || "";
        dateEl.innerHTML = i18nPrefix + " " + dateVal;
      }
    }

    // Set body content via i18n
    if (bodyEl) {
      var bodyKey = id + "_body";
      if (window.translationManager && window.translationManager.t) {
        var bodyHtml = window.translationManager.t(bodyKey) || "";
        // Convert newlines to paragraphs
        bodyHtml = bodyHtml
          .split("\n\n")
          .map(function (p) {
            return "<p>" + p.trim() + "</p>";
          })
          .join("");
        bodyEl.innerHTML = bodyHtml;
      }
    }
  }

  // Direct page load
  if (document.readyState !== "loading") {
    initNewsDetail();
  } else {
    document.addEventListener("DOMContentLoaded", initNewsDetail);
  }

  // SPA navigation
  _spaOn(
    document,
    "spa:load",
    function initNewsDetailSPA() {
      var titleEl = document.getElementById("article-title");
      if (!titleEl) return;
      initNewsDetail();
    },
    "spa:load"
  );

  // Also listen for spa:ready (fired after translations are applied)
  _spaOn(
    document,
    "spa:ready",
    function initNewsDetailReady() {
      var titleEl = document.getElementById("article-title");
      if (!titleEl) return;
      initNewsDetail();
    },
    "spa:ready"
  );
})();
