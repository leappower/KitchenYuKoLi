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

    // Check for invalid article: if title or body has no meaningful content
    var hasContent = false;
    if (titleEl && titleEl.textContent.trim()) {
      var tKey = id + "_title";
      var rawTitle =
        window.translationManager && window.translationManager.t
          ? window.translationManager.t(tKey)
          : titleEl.textContent;
      hasContent = rawTitle && rawTitle !== tKey;
    }
    if (!hasContent && bodyEl) {
      var bKey = id + "_body";
      var rawBody =
        window.translationManager && window.translationManager.t
          ? window.translationManager.t(bKey)
          : bodyEl.textContent;
      hasContent = rawBody && rawBody !== bKey && rawBody.trim().length > 0;
    }
    if (!hasContent) {
      var mainEl = document.getElementById("spa-content");
      if (mainEl) {
        mainEl.innerHTML =
          '<div class="flex flex-col items-center justify-center py-24 px-6 text-center">' +
          '<div class="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">' +
          '<span class="material-symbols-outlined text-4xl text-slate-400">article</span>' +
          "</div>" +
          '<h1 class="text-3xl font-black mb-3" data-i18n="news_not_found_title">Article Not Found</h1>' +
          '<p class="text-slate-500 dark:text-slate-400 mb-8 max-w-md" data-i18n="news_not_found_desc">The article you are looking for does not exist or has been removed.</p>' +
          '<a href="/news/" class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all">' +
          '<span class="material-symbols-outlined">arrow_back</span>' +
          '<span data-i18n="news_not_found_back">Back to News</span>' +
          "</a>" +
          "</div>";
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
