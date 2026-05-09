/**
 * pi-maps.js — Google Maps Service Center + IoT Support (extracted from page-interactions.js §11 & §16)
 * Self-contained IIFE — no dependencies on page-interactions.js
 *
 * Depends on:
 *   Google Maps JavaScript API + Places API (optional — graceful degradation)
 *   window.showNotification (optional — from smart-popup.js)
 */
(function (global) {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  // ─── Helpers (from PiHelpers) ─────────────────────────────────────────
  var _h = window.PiHelpers || {};
  var safeCall =
    _h.safeCall ||
    function (fnName, args) {
      if (typeof global[fnName] === "function") return global[fnName].apply(null, args || []);
    };
  var directText =
    _h.directText ||
    function (el) {
      var t = "";
      el.childNodes.forEach(function (n) {
        if (n.nodeType === 3) t += n.nodeValue;
      });
      return t.trim();
    };
  var findByText =
    _h.findByText ||
    function (tag, text) {
      var els = document.querySelectorAll(tag),
        r = [],
        l = text.toLowerCase();
      els.forEach(function (el) {
        if (directText(el).toLowerCase().indexOf(l) !== -1) r.push(el);
      });
      return r;
    };

  // ─── 16. Google Maps Service Center — full architecture (§1.2) ───────────────
  /**
   * Yukoli 服务中心地图逻辑。
   *
   * 依赖：Google Maps JavaScript API + Places API
   * 启用步骤：
   *   1. 在 Google Cloud Console 创建 API Key，启用 Maps JS API + Places API
   *   2. 在 index-pc.html 中取消注释 Google Maps <script> 标签
   *   3. 将 YOUR_GOOGLE_MAPS_API_KEY 替换为真实 Key
   *   4. 地图加载后会自动调用 window.initGoogleMapsCallback()，本函数随即执行
   *
   * 当 API 未加载时，此函数静默返回，页面显示静态背景图 fallback。
   */

  // Yukoli 全球服务中心示例坐标（真实部署时从后端 API 获取）
  var YUKOLI_SERVICE_CENTERS = [
    { name: "Yukoli Shanghai HQ", lat: 31.2304, lng: 121.4737 },
    { name: "Yukoli Jakarta Hub", lat: -6.2088, lng: 106.8456 },
    { name: "Yukoli Kuala Lumpur", lat: 3.139, lng: 101.6869 },
    { name: "Yukoli Singapore Tech", lat: 1.3521, lng: 103.8198 },
    { name: "Yukoli Bangkok Service", lat: 13.7563, lng: 100.5018 },
    { name: "Yukoli Dubai MENA", lat: 25.2048, lng: 55.2708 },
    { name: "Yukoli Frankfurt EU", lat: 50.1109, lng: 8.6821 },
    { name: "Yukoli Los Angeles NA", lat: 34.0522, lng: -118.2437 },
  ];

  // 暂时未被使用 — API key 未配置，当前显示静态 SVG fallback
  function initServiceCenterMap() {
    if (typeof window.google === "undefined" || !window.google.maps) {
      return;
    }

    var mapEl = document.getElementById("yukoli-service-map");
    if (!mapEl) return;

    // Hide fallback background once Maps is ready
    var fallback = document.getElementById("yukoli-service-map-fallback");
    if (fallback) fallback.style.display = "none";

    // Initialize map centered on Southeast Asia (primary market)
    var map = new window.google.maps.Map(mapEl, {
      center: { lat: 5.0, lng: 105.0 },
      zoom: 4,
      styles: [
        // Subtle grayscale style matching Yukoli design language
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Store map instance for zoom buttons
    window._yukolicServiceMap = map;

    // Place service center markers
    YUKOLI_SERVICE_CENTERS.forEach(function (center) {
      var marker = new window.google.maps.Marker({
        position: { lat: center.lat, lng: center.lng },
        map: map,
        title: center.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#ec5b13",
          fillOpacity: 0.9,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      var infoWindow = new window.google.maps.InfoWindow({
        content:
          "<div style=\"font-family:'Public Sans',sans-serif;padding:4px 8px;\">" +
          '<strong style="color:#ec5b13;">' +
          center.name +
          "</strong>" +
          '<br><span style="font-size:12px;color:#64748b;">24/7 Support Hub</span>' +
          "</div>",
      });

      marker.addListener("click", function () {
        infoWindow.open(map, marker);
      });
    });
  }

  /**
   * Places API 文字搜索 — 在地图上定位并显示最近服务中心。
   * @param {string} query - 用户输入的地名/城市
   */
  // 暂时未被使用 — 依赖 Google Maps Places API
  function serviceCenterSearch(query) {
    if (!window._yukolicServiceMap || !window.google || !window.google.maps) return;

    var geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, function (results, status) {
      if (status === "OK" && results[0]) {
        var loc = results[0].geometry.location;
        window._yukolicServiceMap.panTo(loc);
        window._yukolicServiceMap.setZoom(8);

        // Find nearest Yukoli service center to the geocoded point
        var nearestCenter = null;
        var minDist = Infinity;
        YUKOLI_SERVICE_CENTERS.forEach(function (c) {
          var dLat = c.lat - loc.lat();
          var dLng = c.lng - loc.lng();
          var dist = dLat * dLat + dLng * dLng;
          if (dist < minDist) {
            minDist = dist;
            nearestCenter = c;
          }
        });

        if (nearestCenter) {
          safeCall("showNotification", [
            "Nearest hub: " + nearestCenter.name + " — Our team will contact you within 4 hours.",
            "success",
          ]);
        }
      } else {
        safeCall("showNotification", ["Location not found. Please try a city name.", "success"]);
      }
    });
  }

  // ─── 11. IoT Support page — Activate Diagnostics + Map Search ───────────────
  // 暂时未被使用 — 页面暂无 "Activate Diagnostics" / "Client Portal" 按钮
  function initIoTSupportPage() {
    var diagBtn = findByText("button", "activate diagnostics")[0];
    if (diagBtn) {
      diagBtn.addEventListener("click", function () {
        safeCall("showNotification", [
          "Diagnostics module requires device pairing. Contact support to activate.",
          "success",
        ]);
      });
    }

    // Client Portal button
    var portalBtn = findByText("button", "client portal")[0];
    if (portalBtn) {
      portalBtn.addEventListener("click", function () {
        safeCall("showSmartPopupManual");
      });
    }

    // Map zoom buttons — delegate to Google Maps instance if available,
    // otherwise show placeholder notification
    var zoomBtns = document.querySelectorAll(".flex.flex-col.gap-2 button");
    zoomBtns.forEach(function (btn) {
      var icon = btn.querySelector(".material-symbols-outlined");
      if (!icon) return;
      var iconName = icon.textContent.trim();
      if (iconName === "add") {
        btn.addEventListener("click", function () {
          if (window._yukolicServiceMap) {
            window._yukolicServiceMap.setZoom(window._yukolicServiceMap.getZoom() + 1);
          } else {
            safeCall("showNotification", ["Interactive map: set API key to activate.", "success"]);
          }
        });
      } else if (iconName === "remove") {
        btn.addEventListener("click", function () {
          if (window._yukolicServiceMap) {
            window._yukolicServiceMap.setZoom(window._yukolicServiceMap.getZoom() - 1);
          } else {
            safeCall("showNotification", ["Interactive map: set API key to activate.", "success"]);
          }
        });
      }
    });

    // Service center search — runs Places API geocode when Maps loaded,
    // falls back to notification when API key is not set
    var searchBtn = findByText("button", "search")[0];
    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        var input =
          document.querySelector('input[placeholder*="service center"]') ||
          document.querySelector('input[placeholder*="nearest"]');
        var query = input ? input.value.trim() : "";
        if (!query) return;

        if (window._yukolicServiceMap && window.google && window.google.maps) {
          // Google Maps Places API loaded — run geocode search
          serviceCenterSearch(query);
        } else {
          safeCall("showNotification", [
            "Map search ready — set Google Maps API key to activate live lookup.",
            "success",
          ]);
        }
      });
    }
  }

  // ─── Google Maps callback — called by Maps JS API after async load ─────────
  /**
   * window.initGoogleMapsCallback() is set as the Maps API `callback` parameter.
   * When the API script loads, it calls this function, which then initialises
   * the service center map on the IoT Support page.
   * On pages without #yukoli-service-map this is a safe no-op.
   */
  // 暂时未被使用 — Google Maps API key 未配置
  window.initGoogleMapsCallback = function () {
    initServiceCenterMap();
  };

  document.addEventListener("DOMContentLoaded", initIoTSupportPage);
  _spaOn(document, "spa:load", initIoTSupportPage, "spa:load:initIoTSupportPage");
})(window);
