// cms-publish.js — Publish functionality + sidebar + logout
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var toast = CMS._deps.toast;

  // Publish
  window.publishProducts = function() {
    if (!confirm('确认发布？这将更新产品数据并推送到网站仓库。')) return;
    var btn = document.getElementById('btn-publish');
    btn.disabled = true; btn.textContent = '发布中...';
    api('/publish/products', { method: 'POST' }).then(function(d) {
      btn.disabled = false; btn.textContent = '🚀 发布';
      if (d) toast('发布成功！');
    }).catch(function() {
      btn.disabled = false; btn.textContent = '🚀 发布';
    });
  };

  // Sidebar
  window.openSidebar = function() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  };
  window.closeSidebar = function() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  };
  window.logout = function() {
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_user');
    window.location.href = '/admin/login.html';
  };

  CMS.logout = window.logout;
})();
