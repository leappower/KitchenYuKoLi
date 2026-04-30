// cms.js — Entry point: initialization, nav bar, routing
(function() {
  'use strict';

  var CMS = window.CMS;
  var token = CMS.token;
  var user = CMS.user;

  CMS.categories = [];
  CMS.products = [];
  CMS.currentPage = 'dashboard';

  var menuItems = [
    { key: 'dashboard', label: '仪表盘', icon: '📊' },
    { divider: '内容管理' },
    { key: 'categories', label: '产品系列', icon: '📦' },
    { key: 'products', label: '产品管理', icon: '🔧' },
    { key: 'media', label: '媒体库', icon: '🖼️' },
    { key: 'posts', label: '新闻案例', icon: '📰' },
    { divider: '站点设置' },
    { key: 'nav', label: '导航管理', icon: '🧭' },
    { key: 'i18n', label: '多语言', icon: '🌐' },
  ];

  var currentPage = 'dashboard';

  // Init
  if (!token) { window.location.href = '/admin/login.html'; return; }
  document.getElementById('app').style.display = '';
  if (user) {
    document.getElementById('user-name').textContent = user.username || '—';
    document.getElementById('user-role').textContent = user.role === 'admin' ? '管理员' : '编辑';
    document.getElementById('user-avatar').textContent = (user.username || '?').charAt(0).toUpperCase();
  }

  // Build nav
  var nav = document.getElementById('nav-menu');
  menuItems.forEach(function(item) {
    if (item.divider) {
      var div = document.createElement('div');
      div.style.cssText = 'padding:0.75rem 0.85rem 0.35rem;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#475569';
      div.textContent = item.divider;
      nav.appendChild(div);
      return;
    }
    var btn = document.createElement('button');
    btn.className = 'sidebar-link' + (item.key === currentPage ? ' active' : '');
    btn.disabled = !!item.disabled;
    btn.innerHTML = '<span>' + item.icon + '</span><span>' + item.label + '</span>';
    btn.addEventListener('click', function() {
      if (item.disabled) return;
      currentPage = item.key;
      CMS.currentPage = currentPage;
      document.getElementById('breadcrumb').textContent = item.label;
      nav.querySelectorAll('.sidebar-link').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      closeSidebar();
      renderPage();
    });
    nav.appendChild(btn);
  });

  // Render page — global function for inline onclick handlers
  function renderPage() {
    var area = document.getElementById('content-area');
    switch (currentPage) {
      case 'dashboard': CMS.renderDashboard(area); break;
      case 'categories': CMS.renderCategories(area); break;
      case 'products': CMS.renderProducts(area); break;
      case 'media': CMS.renderMedia(area); break;
      case 'nav': CMS.renderNavPage(area); break;
      case 'i18n': CMS.renderI18nPage(area); break;
      case 'posts': CMS.renderPostsPage(area); break;
      default: area.innerHTML = '<div class="text-center text-gray-400 py-16">功能开发中</div>';
    }
  }

  CMS.renderPage = renderPage;
  window.renderPage = renderPage;
  window.currentPage = CMS.currentPage;

  // Keep currentPage variable in sync via a setter on window
  // (some inline handlers like onclick="currentPage='products';renderPage()" set it directly)
  Object.defineProperty(window, 'currentPage', {
    get: function() { return CMS.currentPage; },
    set: function(v) { CMS.currentPage = v; }
  });

  // Initial render
  renderPage();
})();
