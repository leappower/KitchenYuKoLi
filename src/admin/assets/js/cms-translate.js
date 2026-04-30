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
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:48px;flex-shrink:0">名称</label>' +
        '<input class="pt-name" data-lang="' + lang.code + '" value="' + esc(t.name || '') + '" placeholder="翻译产品名称" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:48px;flex-shrink:0">配置</label>' +
        '<input class="pt-specs" data-lang="' + lang.code + '" value="' + esc(t.specifications || '') + '" placeholder="翻译配置信息" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
        '<div style="display:flex;gap:0.5rem;align-items:center"><label style="font-size:0.75rem;color:#6b7280;width:48px;flex-shrink:0">产能</label>' +
        '<input class="pt-throughput" data-lang="' + lang.code + '" value="' + esc(t.throughput || '') + '" placeholder="翻译用途和产能" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:0.8rem"></div>' +
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
    container.querySelectorAll('.pt-name').forEach(function(input) {
      var lang = input.getAttribute('data-lang');
      var specsInput = container.querySelector('.pt-specs[data-lang="' + lang + '"]');
      var throughputInput = container.querySelector('.pt-throughput[data-lang="' + lang + '"]');
      var name = input.value.trim();
      var specs = specsInput ? specsInput.value.trim() : '';
      var throughput = throughputInput ? throughputInput.value.trim() : '';
      if (name || specs || throughput) {
        items.push({ lang: lang, name: name, specifications: specs, usage: '', throughput: throughput });
      }
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
    if (throughput) texts.push('用途和产能: ' + throughput);

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
      data.translations.forEach(function(t) {
        var nameField = container.querySelector('.pt-name[data-lang="' + t.lang + '"]');
        var specsField = container.querySelector('.pt-specs[data-lang="' + t.lang + '"]');
        var throughputField = container.querySelector('.pt-throughput[data-lang="' + t.lang + '"]');
        if (nameField && !nameField.value && t.name) nameField.value = t.name;
        if (specsField && !specsField.value && t.specifications) specsField.value = t.specifications;
        if (throughputField && !throughputField.value && t.throughput) throughputField.value = t.throughput;
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
