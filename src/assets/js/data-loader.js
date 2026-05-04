/**
 * data-loader.js — Unified Data Loader with Version Control + 3-Layer Caching
 *
 * For GitHub Pages static deployment:
 * - Layer 0: Embedded fallback data (in HTML or JS)
 * - Layer 1: localStorage (cross-session, version-controlled)
 * - Layer 2: Network fetch (API with ETag)
 *
 * For dev server:
 * - Always fetch from API, use localStorage as cache
 */
(function(global) {
  'use strict';

  var API_BASE = window.__API_BASE__ || '';  // empty for same-origin, configurable for CDN
  var VERSION_KEY = 'yk_data_version';
  var VERSION_TTL = 5 * 60 * 1000; // re-check version every 5 minutes

  // Data type configurations
  var DATA_TYPES = {
    nav: {
      url: '/api/nav-config',
      localKey: 'yk_nav_config',
      fallback: null,  // will use window.NAV_CONFIG from nav-config.js
      versionField: 'nav'
    },
    products: {
      url: '/api/cms/products-data',
      localKey: 'yk_products_data',
      fallback: null,
      versionField: 'products'
    },
    cases: {
      url: '/api/cases',
      localKey: 'yk_cases_data',
      fallback: 'ROI_CASES',  // reference to window.ROI_CASES from roi-data.js
      versionField: 'cases'
    },
    exchangeRates: {
      url: '/api/exchange-rates',
      localKey: 'yk_exchange_rates',
      fallback: 'ROI_EXCHANGE_RATES',
      versionField: null,  // uses TTL instead of version
      ttl: 24 * 60 * 60 * 1000  // 24 hours
    }
  };

  /**
   * Get cached version info
   */
  function getCachedVersion() {
    try { return JSON.parse(localStorage.getItem(VERSION_KEY)) || {}; } catch(e) { return {}; }
  }

  /**
   * Save version info
   */
  function saveVersion(versions) {
    try { localStorage.setItem(VERSION_KEY, JSON.stringify(versions)); } catch(e) {}
  }

  /**
   * Get cached data from localStorage
   */
  function getCachedData(localKey) {
    try {
      var raw = localStorage.getItem(localKey);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data;
    } catch(e) { return null; }
  }

  /**
   * Save data to localStorage
   */
  function saveData(localKey, data) {
    try { localStorage.setItem(localKey, JSON.stringify(data)); } catch(e) {}
  }

  /**
   * Fetch version from API (lightweight request)
   */
  function fetchVersion() {
    return fetch(API_BASE + '/api/version', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
  }

  /**
   * Check if cached data is still valid
   */
  function isCacheValid(type, cachedVersion) {
    var config = DATA_TYPES[type];
    if (!config) return false;

    // Exchange rates use TTL
    if (config.ttl) {
      try {
        var meta = JSON.parse(localStorage.getItem(config.localKey + '_meta'));
        return meta && (Date.now() - meta.timestamp < config.ttl);
      } catch(e) { return false; }
    }

    // Version-controlled types
    if (config.versionField && cachedVersion[config.versionField]) {
      return true;
    }
    return false;
  }

  /**
   * Load data with 3-layer caching
   * @param {string} type - data type key ('nav', 'products', 'cases', 'exchangeRates')
   * @param {function} callback - called with (data, source) where source is 'cache'|'network'|'fallback'
   */
  function load(type, callback) {
    var config = DATA_TYPES[type];
    if (!config) { callback(null, 'none'); return; }

    // Try cache first (synchronous)
    var cachedVersion = getCachedVersion();
    var cachedData = getCachedData(config.localKey);

    if (cachedData && isCacheValid(type, cachedVersion)) {
      console.log('[DataLoader] ' + type + ': using cache');
      callback(cachedData, 'cache');
      // Background refresh for version-controlled types
      if (config.versionField) {
        fetchVersion().then(function(versions) {
          if (versions && versions[config.versionField] !== cachedVersion[config.versionField]) {
            console.log('[DataLoader] ' + type + ': version changed, refreshing');
            loadFresh(type, callback);
          }
        });
      }
      return;
    }

    // Need to fetch
    loadFresh(type, callback);
  }

  /**
   * Load fresh data from network
   */
  function loadFresh(type, callback) {
    var config = DATA_TYPES[type];

    fetch(API_BASE + config.url, { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        saveData(config.localKey, data);
        if (config.ttl) {
          try { localStorage.setItem(config.localKey + '_meta', JSON.stringify({ timestamp: Date.now() })); } catch(e) {}
        }
        // Update version
        if (config.versionField) {
          var versions = getCachedVersion();
          versions[config.versionField] = Date.now();
          saveVersion(versions);
        }
        console.log('[DataLoader] ' + type + ': loaded from network');
        callback(data, 'network');
      })
      .catch(function(err) {
        console.warn('[DataLoader] ' + type + ': network failed, using fallback', err);
        var fallback = null;
        if (config.fallback === 'ROI_CASES' && window.ROI_CASES) {
          fallback = window.ROI_CASES;
        } else if (config.fallback === 'ROI_EXCHANGE_RATES' && window.ROI_EXCHANGE_RATES) {
          fallback = window.ROI_EXCHANGE_RATES;
        } else if (config.fallback && window[config.fallback]) {
          fallback = window[config.fallback];
        } else if (type === 'nav' && window.NAV_CONFIG) {
          fallback = window.NAV_CONFIG;
        }
        callback(fallback, 'fallback');
      });
  }

  /**
   * Preload multiple data types
   */
  function preload(types, callback) {
    var results = {};
    var remaining = types.length;
    types.forEach(function(type) {
      load(type, function(data, source) {
        results[type] = { data: data, source: source };
        remaining--;
        if (remaining === 0) callback(results);
      });
    });
  }

  /**
   * Invalidate cache for a specific type
   */
  function invalidate(type) {
    var config = DATA_TYPES[type];
    if (!config) return;
    try { localStorage.removeItem(config.localKey); localStorage.removeItem(config.localKey + '_meta'); } catch(e) {}
    var versions = getCachedVersion();
    delete versions[config.versionField];
    saveVersion(versions);
  }

  // Export
  global.DataLoader = {
    load: load,
    preload: preload,
    invalidate: invalidate,
    TYPES: DATA_TYPES
  };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
