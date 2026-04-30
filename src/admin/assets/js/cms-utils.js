// cms-utils.js — Shared utilities
(function() {
  'use strict';

  var CMS = window.CMS = window.CMS || {};

  CMS.token = localStorage.getItem('cms_token');
  CMS.user = null;
  try { CMS.user = JSON.parse(localStorage.getItem('cms_user')); } catch(e) {}

  // API helper
  CMS.api = function(path, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    if (CMS.token) headers['Authorization'] = 'Bearer ' + CMS.token;
    if (options.body && typeof options.body !== 'string') options.body = JSON.stringify(options.body);
    options.headers = Object.assign(headers, options.headers || {});
    return fetch('/api/cms' + path, options)
      .then(function(res) {
        if (res.status === 401) { CMS.logout(); return null; }
        return res.text().then(function(text) {
          try { return JSON.parse(text); } catch(e) { return null; }
        });
      })
      .then(function(data) {
        if (data && data.error) { CMS.toast(data.error, true); return null; }
        return data;
      })
      .catch(function(e) { CMS.toast('网络错误: ' + e.message, true); return null; });
  };

  // Escaping helper
  CMS.esc = function(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  // Toast notification
  CMS.toast = function(msg, isError) {
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast ' + (isError ? 'toast-error' : 'toast-success');
    el.textContent = (isError ? '✕ ' : '✓ ') + msg;
    container.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);
  };
  window.toast = CMS.toast;

  // Modal
  CMS.showModal = function(id, title, bodyHtml, onSave, onReady) {
    var existing = document.getElementById(id);
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = '<div class="modal-box modal-lg" style="margin:2rem 0">' +
      '<h3 class="text-lg font-semibold mb-4">' + CMS.esc(title) + '</h3>' +
      '<div id="' + id + '-body">' + bodyHtml + '</div>' +
      '<div class="flex justify-between mt-6">' +
      '<div id="' + id + '-extra"></div><div></div>' +
      '<div class="flex gap-3"><button class="btn-ghost" onclick="document.getElementById(\'' + id + '\').remove()">取消</button>' +
      '<button class="btn-primary" id="' + id + '-save">保存</button></div></div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.getElementById(id + '-save').addEventListener('click', onSave);
    if (onReady) onReady();
  };

  // Close modal convenience
  CMS.closeModal = function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  };

  // Preview modal (image / video)
  CMS.showPreview = function(filePath, name, isImg, isVid) {
    var existing = document.getElementById('preview-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'preview-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:60;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.75rem';
    var content = '';
    if (isImg) {
      content = '<img src="' + CMS.esc(filePath) + '" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:0.5rem">';
    } else if (isVid) {
      content = '<video src="' + CMS.esc(filePath) + '" controls style="max-width:90vw;max-height:80vh;border-radius:0.5rem"></video>';
    } else {
      content = '<div style="padding:2rem;background:#fff;border-radius:0.5rem;max-width:90vw;text-align:center"><div style="font-size:3rem;margin-bottom:0.5rem">📄</div><div class="text-sm text-gray-600">' + CMS.esc(name) + '</div></div>';
    }
    overlay.innerHTML = content +
      '<div style="display:flex;align-items:center;gap:1rem">' +
      '<span class="text-sm" style="color:rgba(255,255,255,0.8);max-width:60vw" title="' + CMS.esc(name) + '">' + CMS.esc(name) + '</span>' +
      '<button style="background:none;border:1px solid rgba(255,255,255,0.3);color:#fff;padding:0.25rem 0.75rem;border-radius:0.375rem;cursor:pointer;font-size:0.75rem" onclick="navigator.clipboard.writeText(\'' + CMS.esc(filePath) + '\').then(function(){document.getElementById(\'preview-copy\').textContent=\'已复制 ✓\'})">📋 复制链接</button>' +
      '<span id="preview-copy" class="text-sm" style="color:#a5b4fc"></span>' +
      '</div>' +
      '<button style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:2rem;height:2rem;border-radius:9999px;cursor:pointer;font-size:1rem;backdrop-filter:blur(4px)" onclick="document.getElementById(\'preview-overlay\').remove()">✕</button>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    // ESC to close
    var escHandler = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  };

  // Format bytes
  CMS.formatBytes = function(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Slugify
  CMS.slugify = function(text) {
    return text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
  };

  // Shorthand aliases (used by other modules via closure)
  var api = function(path, options) { return CMS.api(path, options); };
  var esc = CMS.esc;
  var toast = CMS.toast;
  var showModal = CMS.showModal;
  var formatBytes = CMS.formatBytes;
  var showPreview = CMS.showPreview;

  // Expose via a private registry so each module can grab a reference
  CMS._deps = { api: api, esc: esc, toast: toast, showModal: showModal, formatBytes: formatBytes, showPreview: showPreview };
})();
