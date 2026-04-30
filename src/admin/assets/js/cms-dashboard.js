// cms-dashboard.js — Dashboard page
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;

  CMS.renderDashboard = function(area) {
    area.innerHTML = '<div class="fade-in">' +
      // Welcome banner
      '<div class="card" style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#fff;padding:1.5rem 2rem;margin-bottom:1.5rem;border:none">' +
      '<div class="flex items-center gap-4"><div style="font-size:2.5rem">🍳</div><div>' +
      '<div class="text-xl font-bold">YuKoLi CMS</div>' +
      '<div style="opacity:0.8;font-size:0.875rem;margin-top:0.25rem">智能商厨后台管理系统</div></div></div>' +
      // Stats row
      '<div class="grid grid-cols-3 gap-4 mb-6">' +
      '<div class="card stat-card" style="border-left:3px solid #4f46e5"><div class="text-sm text-gray-500">产品总数</div><div class="text-2xl font-bold mt-1" id="stat-prod" style="color:#4f46e5">-</div></div>' +
      '<div class="card stat-card" style="border-left:3px solid #10b981"><div class="text-sm text-gray-500">产品系列</div><div class="text-2xl font-bold mt-1" id="stat-cat" style="color:#10b981">-</div></div>' +
      '<div class="card stat-card" style="border-left:3px solid #f59e0b"><div class="text-sm text-gray-500">媒体文件</div><div class="text-2xl font-bold mt-1" id="stat-media" style="color:#f59e0b">-</div></div>' +
      '</div>' +
      // Quick actions + Info
      '<div class="grid grid-cols-2 gap-4">' +
      '<div class="card" style="padding:1.25rem"><div class="font-medium text-sm mb-4">⚡ 快速操作</div>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem">' +
      '<button onclick="currentPage=\'products\';renderPage()" class="quick-action-btn">🔧 管理产品</button>' +
      '<button onclick="currentPage=\'media\';renderPage()" class="quick-action-btn">🖼️ 媒体库</button>' +
      '<button onclick="CMS.openProductForm()" class="quick-action-btn">➕ 新增产品</button>' +
      '<button onclick="publishProducts()" class="quick-action-btn">🚀 发布站点</button>' +
      '</div></div>' +
      '<div class="card" style="padding:1.25rem"><div class="font-medium text-sm mb-3">ℹ️ 系统信息</div>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.8rem;color:#6b7280">' +
      '<div class="flex justify-between"><span>站点</span><span class="text-gray-900 font-medium">yukoli.com</span></div>' +
      '<div class="flex justify-between"><span>分支</span><span class="text-gray-900 font-medium">dev</span></div>' +
      '<div class="flex justify-between"><span>语言</span><span class="text-gray-900 font-medium">11 种</span></div>' +
      '</div></div>' +
      '</div></div>';
    api('/products?limit=1').then(function(d) { if (d) document.getElementById('stat-prod').textContent = d.total || 0; });
    api('/categories').then(function(d) { if (d && d.categories) document.getElementById('stat-cat').textContent = d.categories.length; });
    api('/media?limit=1').then(function(d) { if (d) document.getElementById('stat-media').textContent = d.total || 0; });
  };
})();
