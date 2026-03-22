// product-list.js - IIFE wrapper for src2 (no build tools)
// Depends on: window.ImageAssets, window.PRODUCT_DATA_TABLE
// Outputs: window.PRODUCT_SERIES, window.ProductEntity, window.PRODUCT_DEFAULTS, window.assembleProductSeries

(function (global) {
  'use strict';

  // ─── Safe references to globals ───────────────────────────────────────────
  function getImageAssets() {
    return (global.ImageAssets && global.ImageAssets.IMAGE_ASSETS) || {};
  }

  var SAFE_PRODUCT_DATA_TABLE = Array.isArray(global.PRODUCT_DATA_TABLE)
    ? global.PRODUCT_DATA_TABLE
    : [];

  // ─── Defaults ─────────────────────────────────────────────────────────────
  var PRODUCT_DEFAULTS = {
    category: null,
    subCategory: null,
    model: null,
    name: null,
    highlights: null,
    scenarios: null,
    usage: null,
    power: null,
    throughput: null,
    averageTime: null,
    launchTime: null,
    status: null,
    isActive: true,
    badge: null,
    badgeColor: null,
    imageRecognitionKey: null,
    packingQuantity: null,
    productDimensions: null,
    packageDimensions: null,
    outerBoxDimensions: null,
    packageType: null,
    color: null,
    netWeight: null,
    grossWeight: null,
    voltage: null,
    frequency: null,
    material: null,
    warrantyPeriod: null,
    certification: null,
    temperatureRange: null,
    controlMethod: null,
    energyEfficiencyGrade: null,
    applicablePeople: null,
    origin: null,
    barcode: null,
    referencePrice: null,
    minimumOrderQuantity: null,
    stockQuantity: null,
    brand: null
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function toArrayValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    var raw = String(value || '').trim();
    if (!raw) return [];
    return raw
      .replace(/；/g, ';')
      .replace(/，/g, ',')
      .split(/[;,]/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function toNullableString(value) {
    if (value == null) return null;
    var text = String(value).trim();
    return text ? text : null;
  }

  /**
   * 将型号名转换为图片 key（与 optimize-images.js 的 toSnakeCase 规则一致）
   * @param {string} model
   * @returns {string}
   */
  function modelToImageKey(model) {
    if (!model) return '';
    var snake = model
      .toLowerCase()
      .replace(/\//g, '')
      .replace(/\+/g, '_p')
      .replace(/-/g, '_')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '');
    return snake.endsWith('_1') ? snake : (snake + '_1');
  }

  function toBooleanOrDefault(value, defaultValue) {
    if (defaultValue === undefined) defaultValue = true;
    if (value == null) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return true;
    var text = String(value).trim();
    if (!text) return defaultValue;
    if (text === 'false' || text === 'False' || text === 'FALSE' || text === '否') {
      return false;
    }
    return true;
  }

  // ─── ProductEntity ─────────────────────────────────────────────────────────
  function ProductEntity(payload) {
    var defaults = Object.assign({}, PRODUCT_DEFAULTS, { productImageKey: '', imageUrl: '' });
    Object.assign(this, defaults, payload);
  }

  // ─── normalizeProduct ──────────────────────────────────────────────────────
  function normalizeProduct(product, fallbackCategory) {
    var rawKey =
      product.imageRecognitionKey ||
      (product.i18n && product.i18n.imageRecognitionKey && product.i18n.imageRecognitionKey['zh-CN']) ||
      null;
    var imageRecognitionKey = rawKey
      ? modelToImageKey(rawKey)
      : modelToImageKey(product.model || '');

    function getFieldWithI18nKey(fieldName) {
      var mainVal = toNullableString(product[fieldName]);
      if (mainVal) return mainVal;
      if (product.i18n && typeof product.i18n === 'object') {
        var keys = Object.keys(product.i18n);
        var matchKey = null;
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].endsWith('_' + fieldName)) { matchKey = keys[i]; break; }
        }
        if (matchKey) {
          var i18nObj = product.i18n[matchKey];
          if (typeof i18nObj === 'string' && i18nObj.trim()) return i18nObj.trim();
          if (i18nObj && typeof i18nObj === 'object') {
            if (typeof i18nObj['zh-CN'] === 'string' && i18nObj['zh-CN'].trim()) return i18nObj['zh-CN'].trim();
            if (typeof i18nObj['en'] === 'string' && i18nObj['en'].trim()) return i18nObj['en'].trim();
            var vals = Object.values(i18nObj);
            for (var j = 0; j < vals.length; j++) {
              if (typeof vals[j] === 'string' && vals[j].trim()) return String(vals[j]).trim();
            }
          }
        }
        if (fieldName in product.i18n) {
          var i18nObj2 = product.i18n[fieldName];
          if (typeof i18nObj2 === 'string' && i18nObj2.trim()) return i18nObj2.trim();
          if (i18nObj2 && typeof i18nObj2 === 'object') {
            if (typeof i18nObj2['zh-CN'] === 'string' && i18nObj2['zh-CN'].trim()) return i18nObj2['zh-CN'].trim();
            if (typeof i18nObj2['en'] === 'string' && i18nObj2['en'].trim()) return i18nObj2['en'].trim();
            var vals2 = Object.values(i18nObj2);
            for (var k = 0; k < vals2.length; k++) {
              if (typeof vals2[k] === 'string' && vals2[k].trim()) return String(vals2[k]).trim();
            }
          }
        }
      }
      return null;
    }

    return new ProductEntity(Object.assign({}, PRODUCT_DEFAULTS, product, {
      category:               toNullableString(product.category) || toNullableString(fallbackCategory),
      subCategory:            toNullableString(product.subCategory),
      model:                  toNullableString(product.model),
      name:                   getFieldWithI18nKey('name'),
      highlights:             toArrayValue(product.highlights),
      scenarios:              getFieldWithI18nKey('scenarios'),
      usage:                  getFieldWithI18nKey('usage'),
      power:                  toNullableString(product.power),
      throughput:             toNullableString(product.throughput),
      averageTime:            toNullableString(product.averageTime),
      launchTime:             toNullableString(product.launchTime),
      status:                 toNullableString(product.status) || '',
      isActive:               toBooleanOrDefault(product.isActive, true),
      badge:                  toNullableString(product.badge),
      badgeColor:             toNullableString(product.badgeColor),
      imageRecognitionKey:    imageRecognitionKey,
      packingQuantity:        toNullableString(product.packingQuantity),
      productDimensions:      toNullableString(product.productDimensions),
      packageDimensions:      toNullableString(product.packageDimensions),
      outerBoxDimensions:     toNullableString(product.outerBoxDimensions),
      packageType:            toNullableString(product.packageType),
      color:                  toNullableString(product.color),
      netWeight:              toNullableString(product.netWeight),
      grossWeight:            toNullableString(product.grossWeight),
      voltage:                toNullableString(product.voltage),
      frequency:              toNullableString(product.frequency),
      material:               toNullableString(product.material),
      warrantyPeriod:         toNullableString(product.warrantyPeriod),
      certification:          toNullableString(product.certification),
      temperatureRange:       toNullableString(product.temperatureRange),
      controlMethod:          toNullableString(product.controlMethod),
      energyEfficiencyGrade:  toNullableString(product.energyEfficiencyGrade),
      applicablePeople:       toNullableString(product.applicablePeople),
      origin:                 toNullableString(product.origin),
      barcode:                toNullableString(product.barcode),
      referencePrice:         toNullableString(product.referencePrice),
      minimumOrderQuantity:   toNullableString(product.minimumOrderQuantity),
      stockQuantity:          toNullableString(product.stockQuantity),
      productImageKey:        imageRecognitionKey
    }));
  }

  function filterValidProducts(products) {
    return (products || []).filter(function (p) {
      return p && typeof p === 'object' && Object.keys(p).length > 0;
    });
  }

  var GENERATED_PRODUCT_SERIES = SAFE_PRODUCT_DATA_TABLE.map(function (series) {
    return Object.assign({}, series, {
      products: filterValidProducts(series.products).map(function (product) {
        return normalizeProduct(product, series.category);
      })
    });
  });

  // FEISHU_SYNC_APPEND_START
  var APPENDED_PRODUCT_SERIES = [];
  // FEISHU_SYNC_APPEND_END

  var APPENDED_PRODUCT_SERIES_NORMALIZED = APPENDED_PRODUCT_SERIES.map(function (series) {
    return Object.assign({}, series, {
      products: filterValidProducts(series.products).map(function (product) {
        return normalizeProduct(product, series.category);
      })
    });
  });

  function withImageUrl(seriesList) {
    var IMAGE_ASSETS = getImageAssets();
    return seriesList.map(function (series) {
      return Object.assign({}, series, {
        products: series.products.map(function (product) {
          var imageKey = product.imageRecognitionKey || '';
          var imageUrl = IMAGE_ASSETS[imageKey] || '';
          return new ProductEntity(Object.assign({}, product, {
            imageRecognitionKey: imageKey || null,
            productImageKey:     imageKey || null,
            imageUrl:            imageUrl,
            productImage:        imageUrl
          }));
        })
      });
    });
  }

  function hasTableData(seriesList) {
    return (seriesList || []).some(function (series) {
      return Array.isArray(series.products) && series.products.length > 0;
    });
  }

  function productIdentityKey(product, fallbackCategory) {
    var category    = toNullableString(product && product.category) || toNullableString(fallbackCategory) || '';
    var subCategory = toNullableString(product && product.subCategory) || '';
    var model       = toNullableString(product && product.model) || '';
    return category + '::' + subCategory + '::' + model;
  }

  function mergeSeriesByIdentity(seriesList) {
    var grouped = new Map();
    (seriesList || []).forEach(function (series) {
      var category = toNullableString(series && series.category);
      if (!category) return;
      if (!grouped.has(category)) {
        grouped.set(category, { category: category, products: [], indexMap: new Map() });
      }
      var target = grouped.get(category);
      (series.products || []).forEach(function (product) {
        var pid = productIdentityKey(product, category);
        var hasIdentity = (pid !== (category + '::::') && pid !== '::::');
        if (hasIdentity && target.indexMap.has(pid)) {
          var idx = target.indexMap.get(pid);
          target.products[idx] = Object.assign({}, target.products[idx], product);
          return;
        }
        target.products.push(product);
        if (hasIdentity) {
          target.indexMap.set(pid, target.products.length - 1);
        }
      });
    });
    return Array.from(grouped.values()).map(function (g) {
      return { category: g.category, products: g.products };
    });
  }

  function assembleProductSeries() {
    var useTableData = hasTableData(GENERATED_PRODUCT_SERIES);
    var baseSeries = useTableData ? GENERATED_PRODUCT_SERIES : [];
    var combined = baseSeries.concat(APPENDED_PRODUCT_SERIES_NORMALIZED);
    return withImageUrl(mergeSeriesByIdentity(combined));
  }

  var PRODUCT_SERIES = assembleProductSeries();

  // ─── Exports ───────────────────────────────────────────────────────────────
  global.PRODUCT_DEFAULTS         = PRODUCT_DEFAULTS;
  global.ProductEntity            = ProductEntity;
  global.assembleProductSeries    = assembleProductSeries;
  global.PRODUCT_SERIES           = PRODUCT_SERIES;

}(window));
