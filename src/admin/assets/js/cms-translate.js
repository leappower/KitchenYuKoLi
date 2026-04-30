// cms-translate.js — AI translation for products
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;

  var SUPPORTED_LANGS = [
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'th', label: 'ไทย' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'ms', label: 'Bahasa Melayu' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh-TW', label: '繁體中文' },
  ];

  CMS.renderTranslationFields = function(translations) {
    var container = document.getElementById('pm-translations');
    if (!container) return;
    container.innerHTML = '';
    var existing = {};
    (translations || []).forEach(function(t) { existing[t.lang] = t; });

    SUPPORTED_LANGS.forEach(function(lang) {
      var t = existing[lang.code] || {};
      var div = document.createElement('div');
      div.style.cssText = 'border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.75rem;background:#fafafa';
      div.innerHTML =
        '<div style="font-weight:600;font-size:0.8rem;margin-bottom:0.5rem;color:#374151">' + esc(lang.label) + ' (' + lang.code + ')</div>' +
        '<div style="display:flex;flex-direction:column;gap:0.35rem">' +
        // Name
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">名称</label>' +
        '<input class="pt-name" data-lang="' + lang.code + '" value="' + esc(t.name || '') + '" placeholder="翻译产品名称" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Specifications
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">配置</label>' +
        '<input class="pt-specs" data-lang="' + lang.code + '" value="' + esc(t.specifications || '') + '" placeholder="翻译配置信息" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Throughput
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">容量</label>' +
        '<input class="pt-throughput" data-lang="' + lang.code + '" value="' + esc(t.throughput || '') + '" placeholder="翻译用途和容量" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Material
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">材质</label>' +
        '<input class="pt-material" data-lang="' + lang.code + '" value="' + esc(t.material || '') + '" placeholder="翻译材质" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Sub category
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">子分类</label>' +
        '<input class="pt-sub_category" data-lang="' + lang.code + '" value="' + esc(t.sub_category || '') + '" placeholder="翻译子分类" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Tier
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">等级</label>' +
        '<input class="pt-tier" data-lang="' + lang.code + '" value="' + esc(t.tier || '') + '" placeholder="翻译等级" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Badge
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">标签</label>' +
        '<input class="pt-badge" data-lang="' + lang.code + '" value="' + esc(t.badge || '') + '" placeholder="翻译标签(如 Hot/New)" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Control method
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">控制方式</label>' +
        '<input class="pt-control_method" data-lang="' + lang.code + '" value="' + esc(t.control_method || '') + '" placeholder="翻译控制方式" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Dimensions
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">尺寸</label>' +
        '<input class="pt-product_dimensions" data-lang="' + lang.code + '" value="' + esc(t.product_dimensions || '') + '" placeholder="翻译尺寸" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        // Color
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:60px;flex-shrink:0">颜色</label>' +
        '<input class="pt-color" data-lang="' + lang.code + '" value="' + esc(t.color || '') + '" placeholder="翻译颜色" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        '</div>';
      container.appendChild(div);
    });

    // Bind auto-translate button
    var autoBtn = document.getElementById('pm-auto-translate');
    if (autoBtn) {
      autoBtn.onclick = function() {
        autoTranslateProduct();
      };
    }
  };

  CMS._saveProductTranslations = function(productId) {
    var container = document.getElementById('pm-translations');
    if (!container) return;
    var items = [];
    var extraFields = ['material', 'sub_category', 'tier', 'badge', 'control_method', 'product_dimensions', 'color'];
    container.querySelectorAll('.pt-name').forEach(function(input) {
      var lang = input.getAttribute('data-lang');
      var obj = { lang: lang, name: input.value.trim() };
      extraFields.forEach(function(f) {
        var el = container.querySelector('.pt-' + f + '[data-lang="' + lang + '"]');
        obj[f] = el ? el.value.trim() : '';
      });
      var specsEl = container.querySelector('.pt-specs[data-lang="' + lang + '"]');
      obj.specifications = specsEl ? specsEl.value.trim() : '';
      var thrEl = container.querySelector('.pt-throughput[data-lang="' + lang + '"]');
      obj.throughput = thrEl ? thrEl.value.trim() : '';
      obj.usage = '';
      if (obj.name || obj.specifications || obj.throughput) items.push(obj);
    });
    if (items.length === 0) return;
    api('/products/' + productId + '/translations', { method: 'PUT', body: items }).catch(function() {});
  };

  // AI Auto-translate using configured translation API
  function autoTranslateProduct() {
    var nameInput = document.getElementById('pm-name');
    var specsInput = document.getElementById('pm-specs');
    var throughputInput = document.getElementById('pm-throughput');
    var name = nameInput ? nameInput.value.trim() : '';
    var specs = specsInput ? specsInput.value.trim() : '';
    var throughput = throughputInput ? throughputInput.value.trim() : '';

    if (!name && !specs) {
      toast('请先填写产品名称或配置', true);
      return;
    }

    var btn = document.getElementById('pm-auto-translate');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 翻译中...'; }

    // Read current translation states to find which languages still need translation
    var container = document.getElementById('pm-translations');
    var alreadyTranslated = new Set();
    if (container) {
      container.querySelectorAll('.pt-name').forEach(function(input) {
        if (input.value.trim()) alreadyTranslated.add(input.getAttribute('data-lang'));
      });
    }

    var langsToTranslate = SUPPORTED_LANGS.filter(function(l) { return !alreadyTranslated.has(l.code); });
    if (langsToTranslate.length === 0) {
      toast('所有语言已翻译', true);
      if (btn) { btn.disabled = false; btn.textContent = '🤖 AI 一键翻译'; }
      return;
    }

    var texts = [];
    if (name) texts.push('产品名称: ' + name);
    if (specs) texts.push('产品配置: ' + specs);
    if (throughput) texts.push('用途和容量: ' + throughput);
    var extraFields = {};
    ['material', 'sub_category', 'tier', 'badge', 'control_method', 'product_dimensions', 'color'].forEach(function(f) {
      var el = document.getElementById('pm-' + f.replace('product_dimensions', 'productDimensions').replace('sub_category', 'subCategory').replace('control_method', 'controlMethod'));
      if (!el) el = document.getElementById('pm-' + f);
      if (!el) {
        // try camelCase
        var camel = f.replace(/_([a-z])/g, function(m,c) { return c.toUpperCase(); });
        el = document.getElementById('pm-' + camel);
      }
      var val = el ? el.value.trim() : '';
      if (val) {
        var labels = { material: '材质', sub_category: '子分类', tier: '等级', badge: '标签', control_method: '控制方式', product_dimensions: '尺寸', color: '颜色' };
        texts.push(labels[f] + ': ' + val);
        extraFields[f] = val;
      }
    });

    // Call the server-side translation API
    fetch('/api/cms/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CMS.token },
      body: JSON.stringify({
        texts: texts,
        source_lang: 'zh-CN',
        target_langs: langsToTranslate.map(function(l) { return l.code; })
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.translations) throw new Error('No translation data');
      // Populate fields
      var extraFieldMap = ['material', 'sub_category', 'tier', 'badge', 'control_method', 'product_dimensions', 'color'];
      data.translations.forEach(function(t) {
        var nameField = container.querySelector('.pt-name[data-lang="' + t.lang + '"]');
        var specsField = container.querySelector('.pt-specs[data-lang="' + t.lang + '"]');
        var throughputField = container.querySelector('.pt-throughput[data-lang="' + t.lang + '"]');
        if (nameField && !nameField.value && t.name) nameField.value = t.name;
        if (specsField && !specsField.value && t.specifications) specsField.value = t.specifications;
        if (throughputField && !throughputField.value && t.throughput) throughputField.value = t.throughput;
        extraFieldMap.forEach(function(f) {
          var el = container.querySelector('.pt-' + f + '[data-lang="' + t.lang + '"]');
          if (el && !el.value && t[f]) el.value = t[f];
        });
      });
      toast('已翻译 ' + langsToTranslate.length + ' 种语言');
    })
    .catch(function(err) {
      toast('翻译失败: ' + (err.message || '请检查翻译服务配置'), true);
    })
    .finally(function() {
      if (btn) { btn.disabled = false; btn.textContent = '🤖 AI 一键翻译'; }
    });
  }
})();
