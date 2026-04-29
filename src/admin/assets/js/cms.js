(function() {
  'use strict';

  var token = localStorage.getItem('cms_token');
  var user = null;
  try { user = JSON.parse(localStorage.getItem('cms_user')); } catch(e) {}

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
  var categories = [];
  var products = [];

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
      document.getElementById('breadcrumb').textContent = item.label;
      nav.querySelectorAll('.sidebar-link').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      closeSidebar();
      renderPage();
    });
    nav.appendChild(btn);
  });

  // Render page
  function renderPage() {
    var area = document.getElementById('content-area');
    switch (currentPage) {
      case 'dashboard': renderDashboard(area); break;
      case 'categories': renderCategories(area); break;
      case 'products': renderProducts(area); break;
      case 'media': renderMedia(area); break;
      case 'nav': renderNavPage(area); break;
      case 'i18n': renderI18nPage(area); break;
      case 'posts': renderPostsPage(area); break;
      default: area.innerHTML = '<div class="text-center text-gray-400 py-16">功能开发中</div>';
    }
  }

  // Dashboard
  function renderDashboard(area) {
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
  }

  // Categories
  function renderCategories(area) {
    area.innerHTML = '<div class="fade-in"><div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-semibold">产品系列</h2>' +
      '<button class="btn-primary" onclick="CMS.openCategoryForm()">+ 新增系列</button></div>' +
      '<div class="card" style="overflow:hidden"><table><thead style="background:#f9fafb"><tr>' +
      '<th>名称</th><th>URL 别名</th><th>排序</th><th>状态</th><th style="text-align:right">操作</th>' +
      '</tr></thead><tbody id="cat-tbody"></tbody></table>' +
      '<div id="cat-empty" class="py-12 text-center text-gray-400" style="display:none">暂无产品系列</div></div></div>';
    api('/categories').then(function(d) {
      if (!d || !d.categories) return;
      categories = d.categories;
      var tbody = document.getElementById('cat-tbody');
      var empty = document.getElementById('cat-empty');
      if (categories.length === 0) { empty.style.display = ''; return; }
      categories.forEach(function(cat) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td class="text-sm font-medium">' + esc(cat.name || cat.slug) + '</td>' +
          '<td class="text-sm text-gray-500" style="font-family:monospace">' + esc(cat.slug) + '</td>' +
          '<td>' + (cat.sort_order || 0) + '</td>' +
          '<td><span class="badge ' + (cat.is_active ? 'badge-green' : 'badge-gray') + '">' + (cat.is_active ? '启用' : '禁用') + '</span></td>' +
          '<td style="text-align:right"></td>';
        var editBtn = document.createElement('button');
        editBtn.className = 'text-indigo-600'; editBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.75rem';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', function() { CMS.openCategoryForm(cat); });
        var delBtn = document.createElement('button');
        delBtn.className = 'text-red-500'; delBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.75rem;margin-left:0.5rem';
        delBtn.textContent = '删除';
        delBtn.addEventListener('click', function() { CMS.deleteCategory(cat); });
        tr.lastElementChild.appendChild(editBtn);
        tr.lastElementChild.appendChild(delBtn);
        tbody.appendChild(tr);
      });
    });
  }

  // Products
  function renderProducts(area) {
    area.innerHTML = '<div class="fade-in"><div class="flex items-center gap-3 mb-4" style="flex-wrap:wrap">' +
      '<select id="prod-cat-filter" onchange="CMS.loadProducts()" style="width:auto"><option value="">全部系列</option></select>' +
      '<input id="prod-search" type="text" placeholder="搜索型号..." style="flex:1;min-width:150px">' +
      '<button class="btn-primary ml-auto" onclick="CMS.openProductForm()">+ 新增产品</button></div>' +
      '<div class="grid grid-cols-6" id="prod-grid" style="gap:0.75rem"></div>' +
      '<div id="prod-empty" class="py-16 text-center text-gray-400" style="display:none">暂无产品</div></div>';
    api('/categories').then(function(d) {
      if (!d || !d.categories) return;
      categories = d.categories;
      var sel = document.getElementById('prod-cat-filter');
      categories.forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.slug;
        sel.appendChild(opt);
      });
    });
    loadProducts();
  }

  function loadProducts() {
    var params = new URLSearchParams();
    var catId = document.getElementById('prod-cat-filter').value;
    var search = document.getElementById('prod-search').value;
    if (catId) params.set('category_id', catId);
    if (search) params.set('search', search);

    api('/products?' + params.toString()).then(function(d) {
      if (!d || !d.products) return;
      products = d.products;
      var grid = document.getElementById('prod-grid');
      var empty = document.getElementById('prod-empty');
      grid.innerHTML = '';
      if (products.length === 0) { empty.style.display = ''; return; }
      empty.style.display = 'none';
      products.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'card product-card';
        card.style.cssText = 'position:relative';
        card.innerHTML = '<button class="product-del-btn" data-pid="' + p.id + '" title="删除产品" style="position:absolute;top:0.25rem;right:0.25rem;background:rgba(239,68,68,0.85);color:#fff;border:none;width:1.25rem;height:1.25rem;border-radius:9999px;font-size:0.65rem;cursor:pointer;z-index:2;opacity:0;transition:opacity 0.15s">✕</button>' +
          '<div class="img-area">' +
          (p.primary_image ? '<img src="' + esc(p.primary_image) + '">' : '<div style="font-size:2.5rem;color:#d1d5db">📦</div>') +
          '</div><div class="p-3"><div class="font-medium text-sm">' + esc(p.model) + '</div>' +
          '<div class="text-xs text-gray-500 mt-1">' + esc(p.category_slug || '未分类') + '</div>' +
          (p.is_home_core ? '<div class="text-xs mt-1" style="color:#8b5cf6;font-weight:600">⭐ Home 核心</div>' : '') + '</div>';
        card.addEventListener('click', function(e) {
          if (e.target.closest('.product-del-btn')) return;
          CMS.openProductForm(p);
        });
        // Hover show delete
        card.addEventListener('mouseenter', function() { var b = card.querySelector('.product-del-btn'); if (b) b.style.opacity = '1'; });
        card.addEventListener('mouseleave', function() { var b = card.querySelector('.product-del-btn'); if (b) b.style.opacity = '0'; });
        grid.appendChild(card);
      });
      // Bind product delete buttons
      grid.querySelectorAll('.product-del-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var pid = parseInt(btn.getAttribute('data-pid'));
          if (!confirm('确定删除该产品？')) return;
          api('/products/' + pid, { method: 'DELETE' }).then(function(d) {
            if (d) { toast('产品已删除'); renderPage(); }
          });
        });
      });
    });
  }

  // Media
  function renderMedia(area) {
    var mediaFilter = '<div class="flex items-center gap-3 mb-4">' +
      '<button class="btn-primary media-filter-btn active" data-filter="all" style="font-size:0.8rem;padding:0.35rem 0.75rem;border-radius:9999px">全部</button>' +
      '<button class="btn-ghost media-filter-btn" data-filter="image" style="font-size:0.8rem;padding:0.35rem 0.75rem;border-radius:9999px">🖼️ 图片</button>' +
      '<button class="btn-ghost media-filter-btn" data-filter="video" style="font-size:0.8rem;padding:0.35rem 0.75rem;border-radius:9999px">🎬 视频</button>' +
      '<button class="btn-ghost media-filter-btn" data-filter="pdf" style="font-size:0.8rem;padding:0.35rem 0.75rem;border-radius:9999px">📄 PDF</button>' +
      '<label class="btn-primary ml-auto" style="cursor:pointer">+ 上传文件' +
      '<input type="file" multiple accept="image/*,video/mp4,.pdf" style="display:none" id="media-upload"></label></div>';

    area.innerHTML = '<div class="fade-in"><div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-semibold">媒体库</h2>' +
      '<span class="text-sm text-gray-400" id="media-count"></span></div>' +
      mediaFilter +
      '<div class="grid grid-cols-6 gap-3" id="media-grid"></div>' +
      '<div id="media-empty" class="py-16 text-center text-gray-400" style="display:none">暂无媒体文件</div></div>';

    var filterType = 'all';
    area.querySelectorAll('.media-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        area.querySelectorAll('.media-filter-btn').forEach(function(b) { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); b.classList.remove('active'); });
        btn.classList.add('btn-primary'); btn.classList.remove('btn-ghost'); btn.classList.add('active');
        filterType = btn.getAttribute('data-filter');
        area.querySelectorAll('#media-grid .media-card').forEach(function(card) {
          card.style.display = (filterType === 'all' || card.getAttribute('data-mtype') === filterType) ? '' : 'none';
        });
      });
    });

    document.getElementById('media-upload').addEventListener('change', function(e) { uploadMedia(e); });
    loadMedia();
  }

  function loadMedia() {
    api('/media?limit=100').then(function(d) {
      if (!d || !d.media) return;
      var grid = document.getElementById('media-grid');
      var empty = document.getElementById('media-empty');
      var countEl = document.getElementById('media-count');
      if (countEl) countEl.textContent = d.total + ' 个文件';
      grid.innerHTML = '';
      if (d.media.length === 0) { empty.style.display = ''; return; }
      empty.style.display = 'none';
      d.media.forEach(function(m) {
        var isImg = m.mime_type && m.mime_type.startsWith('image/');
        var isVid = m.mime_type === 'video/mp4';
        var mtype = isImg ? 'image' : (isVid ? 'video' : 'pdf');
        var card = document.createElement('div');
        card.className = 'card media-card';
        card.setAttribute('data-mtype', mtype);
        card.innerHTML = '<div class="thumb" style="aspect-ratio:1;position:relative;cursor:pointer" data-preview="' + esc(m.file_path) + '">' +
          (isImg ? '<img src="' + esc(m.file_path) + '" style="width:100%;height:100%;object-fit:cover">' :
            '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9fafb;font-size:2rem">🎬</div>') +
          '<button class="del-btn" title="删除">✕</button>' +
          (isImg ? '<div class="media-badge">' + (m.file_size < 500000 ? '< 500KB' : formatBytes(m.file_size)) + '</div>' : '') +
          '</div><div style="padding:0.5rem"><div class="text-xs truncate" style="max-width:100%;font-weight:500" title="' + esc(m.original_name) + '">' + esc(m.original_name) + '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between"><span class="text-xs text-gray-400">' + formatBytes(m.file_size) + '</span>' +
          '<button class="media-copy-btn" data-url="' + esc(m.file_path) + '" title="复制链接" style="background:none;border:none;color:#6366f1;cursor:pointer;font-size:0.7rem;padding:1px 4px;border-radius:4px">📋</button></div></div>';
        card.querySelector('.del-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          if (!confirm('确定删除 ' + m.original_name + '？')) return;
          api('/media/' + m.id, { method: 'DELETE' }).then(function() { card.remove(); toast('已删除'); });
        });
        card.querySelector('.media-copy-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          var url = card.querySelector('.media-copy-btn').getAttribute('data-url');
          // Build full URL for clipboard
          var fullUrl = url.startsWith('http') ? url : window.location.origin + url;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullUrl).then(function() { toast('链接已复制'); });
          } else {
            // Fallback for non-HTTPS
            var ta = document.createElement('textarea');
            ta.value = fullUrl;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); toast('链接已复制'); } catch(e) { toast('复制失败，请手动复制: ' + fullUrl); }
            document.body.removeChild(ta);
          }
        });
        card.querySelector('[data-preview]').addEventListener('click', function(e) {
          e.stopPropagation();
          var path = e.currentTarget.getAttribute('data-preview');
          showPreview(path, m.original_name, isImg, isVid);
        });
        // Handle broken images
        var img = card.querySelector('img');
        if (img) img.onerror = function() { this.outerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1e293b;font-size:0.7rem;color:#94a3b8">缺失</div>'; };
        grid.appendChild(card);
      });
    });
  }

  function uploadMedia(e) {
    var files = Array.from(e.target.files);
    if (!files.length) return;
    var fd = new FormData();
    files.forEach(function(f) { fd.append('files', f); });
    toast('上传中...');
    fetch('/api/cms/media/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.media) { toast(d.media.length + ' 个文件已上传'); loadMedia(); }
        else toast('上传失败', true);
      })
      .catch(function() { toast('上传失败', true); });
    e.target.value = '';
  }

  // Category modal
  window.CMS = window.CMS || {};
  CMS.openCategoryForm = function(cat) {
    showModal('category-modal', cat ? '编辑系列' : '新增系列',
      '<div class="flex flex-col gap-3">' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">系列名称 *</label>' +
      '<input id="cm-name" required placeholder="如：切配系列" value="' + esc(cat ? (cat.name || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">URL 别名 *</label>' +
      '<input id="cm-slug" required placeholder="如：cutting" value="' + esc(cat ? cat.slug : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">翻译键</label>' +
      '<input id="cm-i18n" placeholder="如：nav_products_cutting" value="' + esc(cat ? (cat.i18n_key || '') : '') + '"></div>' +
      '<div class="flex gap-3"><div class="flex-1"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">排序</label>' +
      '<input id="cm-sort" type="number" value="' + (cat ? cat.sort_order : 0) + '"></div>' +
      '<div class="flex-1"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">状态</label>' +
      '<select id="cm-active"><option value="true"' + (cat && cat.is_active ? ' selected' : '') + '>启用</option>' +
      '<option value="false"' + (cat && !cat.is_active ? ' selected' : '') + '>禁用</option></select></div></div></div>',
      function() {
        var body = {
          name: document.getElementById('cm-name').value,
          slug: document.getElementById('cm-slug').value,
          i18n_key: document.getElementById('cm-i18n').value,
          sort_order: parseInt(document.getElementById('cm-sort').value) || 0,
          is_active: document.getElementById('cm-active').value === 'true'
        };
        var promise;
        if (cat) promise = api('/categories/' + cat.id, { method: 'PUT', body: body });
        else promise = api('/categories', { method: 'POST', body: body });
        promise.then(function(d) { if (d) { document.getElementById('category-modal').remove(); toast('保存成功'); renderPage(); } });
      });
  };

  CMS.deleteCategory = function(cat) {
    if (!confirm('确定删除系列 ' + (cat.name || cat.slug) + '？')) return;
    api('/categories/' + cat.id, { method: 'DELETE' }).then(function() { toast('已删除'); renderPage(); });
  };

  // Product modal
  CMS.openProductForm = function(p) { 
    // Load related products for this product
    if (p && p.id) {
      api('/products/' + p.id + '/related').then(function(d) {
          if (d && d.manual) p.related = d.manual;
        else p.related = null;
        _renderProductForm(p);
      });
    } else {
      _renderProductForm(p);
    }
  };

  var _renderProductForm = function(p) { 
    var renderForm = function(p) {
    var html = '<div class="form-grid">' +
      '<div class="full"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">型号 *</label>' +
      '<input id="pm-model" required value="' + esc(p ? p.model : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">产品系列</label>' +
      '<select id="pm-cat"><option value="">未分类</option>';
    categories.forEach(function(c) {
      html += '<option value="' + c.id + '"' + (p && p.category_id == c.id ? ' selected' : '') + '>' + esc(c.slug) + '</option>';
    });
    html += '</select></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">子类</label>' +
      '<input id="pm-sub" placeholder="如：P_ESL" value="' + esc(p ? (p.sub_category || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">排序</label>' +
      '<input id="pm-sort" type="number" value="' + (p ? p.sort_order : 0) + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">状态</label>' +
      '<select id="pm-status"><option' + (p && p.status !== '在售' ? '' : ' selected') + '>在售</option><option' + (p && p.status === '停产' ? ' selected' : '') + '>停产</option><option' + (p && p.status === '预售' ? ' selected' : '') + '>预售</option></select></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">Badge</label>' +
      '<input id="pm-badge" placeholder="如：热销" value="' + esc(p ? (p.badge || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">等级</label>' +
      '<select id="pm-tier"><option value="">全部</option><option value="工业级"' + (p && p.tier === '工业级' ? ' selected' : '') + '>工业级</option><option value="商用级"' + (p && p.tier === '商用级' ? ' selected' : '') + '>商用级</option><option value="紧凑型"' + (p && p.tier === '紧凑型' ? ' selected' : '') + '>紧凑型</option></select></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem"><input id="pm-home-core" type="checkbox"' + (p && p.is_home_core ? ' checked' : '') + ' style="width:1rem;height:1rem;cursor:pointer"> Home 核心产品</label></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">功率</label>' +
      '<input id="pm-power" value="' + esc(p ? (p.power || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">产能</label>' +
      '<input id="pm-throughput" value="' + esc(p ? (p.throughput || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">电压</label>' +
      '<input id="pm-voltage" value="' + esc(p ? (p.voltage || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">频率</label>' +
      '<input id="pm-freq" value="' + esc(p ? (p.frequency || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">材质</label>' +
      '<input id="pm-material" value="' + esc(p ? (p.material || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">尺寸</label>' +
      '<input id="pm-dims" value="' + esc(p ? (p.product_dimensions || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">颜色</label>' +
      '<input id="pm-color" value="' + esc(p ? (p.color || '') : '') + '"></div></div>';

    // Media section (images + videos)
    var hasMedia = p && p.images && p.images.length > 0;
    // Related products selector
    html += '<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.5rem">推荐产品</label><div class="text-xs text-gray-400" style="margin-bottom:0.5rem">不选则自动推荐同分类产品</div><div id="pm-related" style="display:flex;flex-wrap:wrap;gap:0.5rem;min-height:36px;padding:0.5rem;border:1px dashed #d1d5db;border-radius:8px">' + (p && p.related ? p.related.map(function(r) { return '<span class="pm-related-tag" data-rid="' + r.id + '" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:9999px;font-size:0.75rem;cursor:pointer">' + esc(r.model) + ' <span style="color:#ef4444;font-weight:bold">×</span></span>'; }).join('') : '') + '</div><button type="button" id="pm-add-related" style="margin-top:0.5rem;font-size:0.75rem;color:#4f46e5;cursor:pointer;background:none;border:none;padding:0">+ 添加推荐产品</button></div>';
    html += '<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb"><div class="flex items-center justify-between mb-2"><label class="text-sm font-medium text-gray-700">产品图片与视频</label>' +
      '<div class="flex gap-2">' +
      '<label style="font-size:0.75rem;color:#4f46e5;cursor:pointer">+ 上传图片 <input type="file" accept="image/*" multiple style="display:none" id="pm-img-upload"></label>' +
      '<label style="font-size:0.75rem;color:#4f46e5;cursor:pointer">+ 上传视频 <input type="file" accept="video/mp4" style="display:none" id="pm-vid-upload"></label>' +
      '</div></div>' +
      '<div style="display:flex;gap:0.25rem;margin-bottom:0.5rem">' +
      '<input id="pm-url-input" placeholder="粘贴媒体库链接（如 /admin/uploads/xxx.jpg）" style="flex:1;font-size:0.75rem;padding:0.25rem 0.5rem;border:1px solid #d1d5db;border-radius:0.375rem">' +
      '<button id="pm-url-add" class="btn-primary" style="font-size:0.7rem;padding:0.25rem 0.75rem">添加链接</button>' +
      '</div>' +
      '<div class="flex" style="flex-wrap:wrap;gap:0.5rem" id="pm-images"></div>' +
      '<div id="pm-no-media" class="text-sm text-gray-400" style="padding:1rem' + (hasMedia ? ';display:none' : '') + '">暂无图片或视频</div></div>';

    showModal('product-modal', p ? '编辑产品' : '新增产品', html, function() {
      // Validate model name
      var model = document.getElementById('pm-model').value.trim();
      if (!model) { toast('请输入型号', true); return; }
      var body = {
        model: model,
        sub_category: document.getElementById('pm-sub').value,
        category_id: document.getElementById('pm-cat').value || null,
        status: document.getElementById('pm-status').value,
        badge: document.getElementById('pm-badge').value,
        tier: document.getElementById('pm-tier').value,
        power: document.getElementById('pm-power').value,
        throughput: document.getElementById('pm-throughput').value,
        voltage: document.getElementById('pm-voltage').value,
        frequency: document.getElementById('pm-freq').value,
        material: document.getElementById('pm-material').value,
        product_dimensions: document.getElementById('pm-dims').value,
        color: document.getElementById('pm-color').value,
        sort_order: parseInt(document.getElementById('pm-sort').value) || 0,
        is_home_core: document.getElementById('pm-home-core').checked ? 1 : 0
      };
      // Use global pending arrays (populated by file input change handlers)
      var pendingImages = window._pmPendingImages || [];
      var pendingVideos = window._pmPendingVideos || [];
      var pendingUrls = window._pmPendingUrls || [];

      var saveBtn = document.getElementById('product-modal-save');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }

      var promise;
      if (p) promise = api('/products/' + p.id, { method: 'PUT', body: body });
      else promise = api('/products', { method: 'POST', body: body });
      promise.then(function(d) {
        if (!d) { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; } return; }
        var productId = p ? p.id : (d.product ? d.product.id : null);
        // Close modal first — but collect related tags BEFORE removing
        var relatedTags = document.querySelectorAll('.pm-related-tag');
        var relatedItems = [];
        relatedTags.forEach(function(t) { relatedItems.push({ id: t.dataset.rid }); });
        document.getElementById('product-modal').remove();
        var hasMedia = pendingImages.length || pendingVideos.length || pendingUrls.length;
        renderPage();
        // Upload media after modal closed
        if (productId) {
          var pendingTasks = 0;
          var pendingDone = 0;
          function onTaskDone() {
            pendingDone++;
            if (pendingDone === pendingTasks) {
              var msg = p ? '产品已更新' : '产品已创建';
              var parts = [];
              if (pendingImages.length) parts.push(pendingImages.length + ' 张图片');
              if (pendingVideos.length) parts.push(pendingVideos.length + ' 个视频');
              if (pendingUrls.length) parts.push(pendingUrls.length + ' 个链接');
              if (parts.length) msg += '，已添加' + parts.join('、');
              toast(msg);
              renderPage();
            }
          }
          var hasUploads = pendingImages.length || pendingVideos.length;
          var hasUrls = pendingUrls.length;
          if (hasUploads) {
            pendingTasks++;
            var pendingFiles = [];
            if (pendingImages.length) pendingFiles.push({ files: pendingImages, type: 'image' });
            if (pendingVideos.length) pendingFiles.push({ files: pendingVideos, type: 'video' });
            uploadProductMediaFiles(productId, pendingFiles, onTaskDone);
          }
          // Add URLs as product images
          if (hasUrls) {
            pendingTasks++;
            addProductMediaUrls(productId, pendingUrls, onTaskDone);
          }
          // Save related products
          saveRelatedProducts(productId, relatedItems);
          // No media at all: show simple toast now
          if (pendingTasks === 0) {
            toast(p ? '产品已更新' : '产品已创建');
          }
        } else {
          toast(p ? '产品已更新' : '产品已创建');
        }
        // Clear pending
        window._pmPendingImages = [];
        window._pmPendingVideos = [];
        window._pmPendingUrls = [];
      });
    }, function() {
      // onReady: init pending arrays, render existing media, bind handlers
      window._pmPendingImages = [];
      window._pmPendingVideos = [];
      window._pmPendingUrls = [];
      renderProductMedia(p);
      // Related products handlers
      var addRelBtn = document.getElementById('pm-add-related');
      if (addRelBtn) {
        addRelBtn.addEventListener('click', function() {
          showRelatedPicker(p);
        });
      }
      // Remove tag on click
      document.getElementById('pm-related').addEventListener('click', function(e) {
        var tag = e.target.closest('.pm-related-tag');
        if (tag) tag.remove();
      });
      // File upload handlers
      var imgInput = document.getElementById('pm-img-upload');
      var vidInput = document.getElementById('pm-vid-upload');
      if (imgInput) {
        imgInput.addEventListener('change', function(e) {
          Array.from(e.target.files).forEach(function(file) {
            window._pmPendingImages.push(file);
            addPendingPreview(file, 'image');
          });
          e.target.value = '';
        });
      }
      if (vidInput) {
        vidInput.addEventListener('change', function(e) {
          Array.from(e.target.files).forEach(function(file) {
            window._pmPendingVideos.push(file);
            addPendingPreview(file, 'video');
          });
          e.target.value = '';
        });
      }
      // URL input handler
      var urlInput = document.getElementById('pm-url-input');
      var urlBtn = document.getElementById('pm-url-add');
      if (urlBtn) {
        urlBtn.addEventListener('click', function() { addMediaUrl(urlInput); });
      }
      if (urlInput) {
        urlInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); addMediaUrl(urlInput); }
        });
      }
    });
    }; // end of renderForm
    if (p && !p.images) {
      api('/products/' + p.id).then(function(d) {
        if (d && d.product) { d.product.related = p.related; renderForm(d.product); }
        else renderForm(p);
      });
    } else {
      renderForm(p || null);
    }
  };

  // Show instant preview for files selected in new product form
  // Add media URL from input (for linking media library files)
  function addMediaUrl(urlInput) {
    var url = urlInput.value.trim();
    if (!url) return;
    // Support: relative path (/admin/uploads/xxx) or full URL (https://xxx)
    var previewUrl = url;
    var isExternal = false;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      isExternal = true;
      try { url = new URL(url).pathname; } catch(e) {}
      previewUrl = url;
    }
    if (!url.startsWith('/')) url = '/' + url;
    if (!isExternal) previewUrl = url;
    window._pmPendingUrls = window._pmPendingUrls || [];
    window._pmPendingUrls.push(url);
    urlInput.value = '';
    var container = document.getElementById('pm-images');
    var emptyMsg = document.getElementById('pm-no-media');
    if (!container) return;
    if (emptyMsg) emptyMsg.style.display = 'none';
    var isVid = /\.mp4/i.test(url);
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:5.5rem;height:5.5rem;border-radius:0.5rem;border:1px dashed #a5b4fc;overflow:hidden;flex-shrink:0';
    if (isVid) {
      wrap.appendChild(Object.assign(document.createElement('div'), { style: 'width:100%;height:100%;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:1.5rem', textContent: '🎬' }));
    } else {
      var img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      img.src = previewUrl;
      img.onerror = function() {
        var errDiv = document.createElement('div');
        errDiv.style.cssText = 'width:100%;height:100%;background:#1e293b;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:0.6rem';
        errDiv.textContent = '加载失败';
        this.replaceWith(errDiv);
      };
      wrap.appendChild(img);
    }
    var linkBadge = document.createElement('div');
    linkBadge.style.cssText = 'position:absolute;top:0.25rem;left:0.25rem;background:#8b5cf6;color:#fff;font-size:0.5rem;padding:1px 4px;border-radius:0.25rem';
    linkBadge.textContent = '链接';
    wrap.appendChild(linkBadge);
    var delBtn = document.createElement('button');
    delBtn.title = '移除';
    delBtn.style.cssText = 'position:absolute;top:0.25rem;right:0.25rem;background:rgba(239,68,68,0.85);color:#fff;border:none;width:1rem;height:1rem;border-radius:9999px;font-size:0.55rem;cursor:pointer';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() {
      var idx = window._pmPendingUrls.indexOf(url);
      if (idx > -1) window._pmPendingUrls.splice(idx, 1);
      wrap.remove();
      if (!container.children.length && emptyMsg) emptyMsg.style.display = '';
    });
    wrap.appendChild(delBtn);
    container.appendChild(wrap);
    toast('已添加链接，保存后生效');
  }
  // Add URLs as product images via API (after product is saved)
  function addProductMediaUrls(productId, urls, callback) {
    var count = 0;
    urls.forEach(function(url) {
      fetch('/api/cms/products/' + productId + '/images/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ url: url })
      }).then(function(r) { return r.json(); }).then(function(d) {
        count++;
        if (count === urls.length) { renderPage(); if (callback) callback(); }
      });
    });
  }

  function addPendingPreview(file, type) {
    var container = document.getElementById('pm-images');
    var emptyMsg = document.getElementById('pm-no-media');
    if (!container) return;
    if (emptyMsg) emptyMsg.style.display = 'none';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:5.5rem;height:5.5rem;border-radius:0.5rem;border:1px dashed #a5b4fc;overflow:hidden;flex-shrink:0';
    if (type === 'image') {
      var reader = new FileReader();
      reader.onload = function(e) {
        wrap.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover">';
      };
      reader.readAsDataURL(file);
    } else {
      wrap.innerHTML = '<div style="width:100%;height:100%;background:#f9fafb;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.25rem"><span style="font-size:1.25rem">🎬</span><span style="color:#fff;font-size:0.5rem">' + esc(file.name) + '</span></div>';
    }
    wrap.innerHTML += '<div style="position:absolute;top:0.25rem;left:0.25rem;background:#6366f1;color:#fff;font-size:0.5rem;padding:1px 4px;border-radius:0.25rem">待上传</div>';
    wrap.innerHTML += '<button title="移除" style="position:absolute;top:0.25rem;right:0.25rem;background:rgba(239,68,68,0.85);color:#fff;border:none;width:1rem;height:1rem;border-radius:9999px;font-size:0.55rem;cursor:pointer">✕</button>';
    wrap.querySelector('button').addEventListener('click', function() {
      var arr = type === 'image' ? window._pmPendingImages : window._pmPendingVideos;
      var idx = arr ? arr.indexOf(file) : -1;
      if (idx > -1) arr.splice(idx, 1);
      wrap.remove();
      if (!container.children.length && emptyMsg) emptyMsg.style.display = '';
    });
    container.appendChild(wrap);
  }

  function renderProductMedia(p) {
    var container = document.getElementById('pm-images');
    var emptyMsg = document.getElementById('pm-no-media');
    if (!container) return;
    container.innerHTML = '';
    if (!p || !p.images || !p.images.length) {
      if (emptyMsg) emptyMsg.style.display = '';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    p.images.forEach(function(img) {
      var isVid = img.file_path && img.file_path.match(/\.mp4/i);
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:5.5rem;height:5.5rem;border-radius:0.5rem;border:1px solid ' + (img.is_primary ? '#4f46e5' : '#e5e7eb') + ';overflow:hidden;flex-shrink:0';
      var html = isVid
        ? '<div style="width:100%;height:100%;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>'
        : '<img src="' + esc(img.file_path) + '" style="width:100%;height:100%;object-fit:cover">';
      if (img.is_primary) {
        html += '<div style="position:absolute;top:0;left:0;background:#4f46e5;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:0 0 0.375rem 0">主图</div>';
      }
      html += '<div style="position:absolute;bottom:0;right:0;display:flex;gap:0">';
      if (!img.is_primary) {
        html += '<button class="pm-img-action" data-action="setPrimary" data-imgid="' + img.id + '" title="设为主图" style="background:#4f46e5;color:#fff;border:none;width:1.25rem;height:1.25rem;font-size:0.625rem;cursor:pointer">★</button>';
      }
      html += '<button class="pm-img-action" data-action="delete" data-imgid="' + img.id + '" data-pid="' + p.id + '" title="删除" style="background:#ef4444;color:#fff;border:none;width:1.25rem;height:1.25rem;font-size:0.625rem;cursor:pointer">✕</button>';
      html += '</div>';
      wrap.innerHTML = html;
      container.appendChild(wrap);
    });

    // Bind action buttons
    container.querySelectorAll('.pm-img-action').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var action = btn.getAttribute('data-action');
        var imgId = parseInt(btn.getAttribute('data-imgid'));
        if (action === 'setPrimary') {
          api('/products/' + p.id + '/images/reorder', {
            method: 'PUT',
            body: p.images.map(function(im) { return { id: im.id, sort_order: im.sort_order, is_primary: im.id === imgId }; })
          }).then(function() { toast('已设为主图'); CMS.openProductForm(p); });
        } else if (action === 'delete') {
          if (!confirm('确定删除该图片？')) return;
          api('/products/' + p.id + '/images/' + imgId, { method: 'DELETE' }).then(function() {
            toast('已删除');
            // Remove from local array
            p.images = p.images.filter(function(im) { return im.id !== imgId; });
            renderProductMedia(p);
          });
        }
      });
    });
  }

  function bindProductUpload(productId) {
    var imgInput = document.getElementById('pm-img-upload');
    var vidInput = document.getElementById('pm-vid-upload');
    if (imgInput) {
      imgInput.addEventListener('change', function(e) {
        if (!e.target.files.length) return;
        uploadProductMediaFiles(productId, [{ files: Array.from(e.target.files), type: 'image' }]);
        e.target.value = '';
      });
    }
    if (vidInput) {
      vidInput.addEventListener('change', function(e) {
        if (!e.target.files.length) return;
        uploadProductMediaFiles(productId, [{ files: Array.from(e.target.files), type: 'video' }]);
        e.target.value = '';
      });
    }
  }

  function uploadProductMediaFiles(productId, pendingFiles, callback) {
    var done = 0, total = pendingFiles.length;
    pendingFiles.forEach(function(pf) {
      var fd = new FormData();
      pf.files.forEach(function(f) { fd.append('files', f); });
      fetch('/api/cms/products/' + productId + '/images', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd
      })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d || !d.images) toast('上传失败', true);
          done++;
          if (done === total) { renderPage(); if (callback) callback(); }
        })
        .catch(function() { toast('上传失败', true); done++; if (done === total && callback) callback(); });
    });
  }

  CMS.loadProducts = loadProducts;

  // ─── NAV MANAGEMENT ───────────────────────────────────────────────
  function renderNavPage(area) {
    area.innerHTML = '<div class="fade-in"><div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-semibold">导航管理</h2>' +
      '<button class="btn-primary" onclick="openNavEditor()">+ 新增导航项</button></div>' +
      '<div id="nav-container"><div class="text-center py-8 text-gray-400">加载中...</div></div></div>';
    loadNavData();
  }

  function loadNavData() {
    var container = document.getElementById('nav-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';
    api('/nav').then(function(data) {
      if (!data) return;
      // Cache flat items list for client-side duplicate checks
      window._navItems = data.items || [];
      renderNavTree(data.tree, container);
    });
  }

  function renderNavTree(tree, container) {
    container.innerHTML = '';
    if (!tree || !tree.length) {
      container.innerHTML = '<div class="text-center py-8 text-gray-400">暂无导航项，点击"新增"添加</div>';
      return;
    }
    tree.forEach(function(item) {
      var div = document.createElement('div');
      div.style.cssText = 'border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.75rem;margin-bottom:0.5rem';
      div.className = item.is_active ? '' : 'opacity-50';

      var header = document.createElement('div');
      header.className = 'flex items-center justify-between';
      header.innerHTML = '<div class="flex items-center gap-2">' +
        '<span class="text-lg">' + (item.icon || '📄') + '</span>' +
        '<span class="font-medium">' + esc(item.default_label || item.i18n_key) + '</span>' +
        '<span class="text-xs text-gray-400">' + esc(item.path || '') + '</span>' +
        (item.is_active ? '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">启用</span>' : '<span class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">禁用</span>') +
        '</div>' +
        '<div class="flex gap-1">' +
        '<button class="nav-action" data-id="' + item.id + '" data-action="edit" style="font-size:0.75rem;padding:0.25rem 0.5rem;background:#4f46e5;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">编辑</button>' +
        '<button class="nav-action" data-id="' + item.id + '" data-action="delete" style="font-size:0.75rem;padding:0.25rem 0.5rem;background:#ef4444;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">删除</button>' +
        '</div>';
      div.appendChild(header);

      // Children
      if (item.children && item.children.length) {
        var childContainer = document.createElement('div');
        childContainer.style.cssText = 'margin-top:0.5rem;padding-left:1.5rem;border-left:2px solid #e5e7eb';
        item.children.forEach(function(child) {
          var childDiv = document.createElement('div');
          childDiv.className = child.is_active ? '' : 'opacity-50';
          childDiv.style.cssText = 'padding:0.375rem 0.5rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f3f4f6';
          childDiv.innerHTML = '<div class="flex items-center gap-2">' +
            '<span>' + esc(child.icon || '') + '</span>' +
            '<span class="text-sm">' + esc(child.default_label || child.i18n_key) + '</span>' +
            '<span class="text-xs text-gray-400 font-mono">' + esc(child.path || child.href || '') + '</span>' +
            (child.badge ? '<span class="text-xs bg-amber-100 text-amber-700 px-1 rounded">HOT</span>' : '') +
            (child.target === '_blank' ? '<span class="text-xs bg-blue-100 text-blue-700 px-1 rounded">↗</span>' : '') +
            '</div>' +
            '<div class="flex gap-1">' +
            '<button class="nav-action" data-id="' + child.id + '" data-action="edit" style="font-size:0.7rem;padding:0.125rem 0.375rem;background:#4f46e5;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">编辑</button>' +
            '<button class="nav-action" data-id="' + child.id + '" data-action="delete" style="font-size:0.7rem;padding:0.125rem 0.375rem;background:#ef4444;color:#fff;border:none;border-radius:0.25rem;cursor:pointer">删除</button>' +
            '</div>';
          childContainer.appendChild(childDiv);
        });
        div.appendChild(childContainer);
      }
      container.appendChild(div);
    });

    // Bind events
    container.querySelectorAll('.nav-action').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = parseInt(btn.getAttribute('data-id'));
        var action = btn.getAttribute('data-action');
        if (action === 'edit') openNavEditor(id);
        else if (action === 'delete') {
          if (!confirm('确定删除？子项也会被删除。')) return;
          api('/nav/' + id, { method: 'DELETE' }).then(function() { toast('已删除'); loadNavData(); });
        }
      });
    });
  }

  function openNavEditor(id) {
    var isEdit = !!id;
    var done = function(cb) {
      if (isEdit) {
        api('/nav').then(function(data) {
          if (!data) return;
          var item = data.items.find(function(i) { return i.id === id; });
          if (item) cb(item);
        });
      } else {
        cb({ parent_id: null, sort_order: 0, is_active: 1, i18n_key: '', default_label: '', path: '', icon: '', badge: 0, target: '', group_key: '' });
      }
    };
    done(function(item) {
      // Build parent select options from cached tree
      var parentOpts = '<option value="">无（主菜单）</option>';
      if (typeof renderNavTree === 'undefined' || !window._navTree) {
        parentOpts = '<div><label class="text-sm font-medium">父级菜单</label><select id="ne-parent" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.85rem"><option value="">无（主菜单）</option></select></div>';
      }

      var html = '<div class="form-grid">' +
        '<div><label class="text-sm font-medium">i18n Key</label><input id="ne-key" value="' + esc(item.i18n_key) + '" placeholder="nav_xxx"></div>' +
        '<div><label class="text-sm font-medium">默认标签</label><input id="ne-label" value="' + esc(item.default_label) + '" placeholder="产品中心"></div>' +
        '<div><label class="text-sm font-medium">路径</label><input id="ne-path" value="' + esc(item.path) + '" placeholder="/products/"></div>' +
        '<div><label class="text-sm font-medium">图标</label><input id="ne-icon" value="' + esc(item.icon) + '" placeholder="kitchen"></div>' +
        '<div><label class="text-sm font-medium">分组</label><input id="ne-group" value="' + esc(item.group_key) + '" placeholder="products/solutions/..."></div>' +
        '<div><label class="text-sm font-medium">排序</label><input id="ne-sort" type="number" value="' + item.sort_order + '"></div>' +
        '<div><label class="text-sm font-medium">打开方式</label><select id="ne-target" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.85rem"><option value=""' + (!item.target ? ' selected' : '') + '>当前窗口</option><option value="_blank"' + (item.target === '_blank' ? ' selected' : '') + '>新窗口</option></select></div>' +
        '<div><label class="text-sm font-medium">父级 ID</label><input id="ne-parent" type="number" value="' + (item.parent_id || '') + '" placeholder="留空=主菜单"></div>' +
        '<div class="flex items-end gap-2"><label class="text-sm font-medium flex items-center gap-2"><input id="ne-active" type="checkbox" ' + (item.is_active ? 'checked' : '') + '> 启用</label>' +
        '<label class="text-sm font-medium flex items-center gap-2"><input id="ne-badge" type="checkbox" ' + (item.badge ? 'checked' : '') + '> HOT 标签</label></div></div>';
      showModal('nav-modal', (isEdit ? '编辑导航项' : '新增导航项'), html, function() {
        var body = {
          i18n_key: document.getElementById('ne-key').value.trim(),
          default_label: document.getElementById('ne-label').value.trim(),
          path: document.getElementById('ne-path').value.trim(),
          icon: document.getElementById('ne-icon').value.trim(),
          group_key: document.getElementById('ne-group').value.trim(),
          sort_order: parseInt(document.getElementById('ne-sort').value) || 0,
          parent_id: document.getElementById('ne-parent').value ? parseInt(document.getElementById('ne-parent').value) : null,
          is_active: document.getElementById('ne-active').checked ? 1 : 0,
          badge: document.getElementById('ne-badge').checked ? 1 : 0,
          target: document.getElementById('ne-target').value || ''
        };
        if (!body.i18n_key) { toast('请输入 i18n Key', true); return; }
        if (!body.default_label) { toast('请输入默认标签', true); return; }
        if (!body.path) { toast('请输入路径', true); return; }
        // Client-side duplicate check against cached nav data
        var navItems = window._navItems || [];
        var dupKey = navItems.find(function(n) { return n.i18n_key === body.i18n_key && (!isEdit || n.id !== id); });
        if (dupKey) { toast('i18n Key "' + body.i18n_key + '" 已被 "' + (dupKey.default_label || dupKey.i18n_key) + '" 使用', true); return; }
        var dupPath = navItems.find(function(n) { return n.path && n.path === body.path && (!isEdit || n.id !== id); });
        if (dupPath) { toast('路径 "' + body.path + '" 已被 "' + (dupPath.default_label || dupPath.i18n_key) + '" 使用', true); return; }
        var promise;
        if (isEdit) promise = api('/nav/' + id, { method: 'PUT', body: body });
        else promise = api('/nav', { method: 'POST', body: body });
        promise.then(function() { toast(isEdit ? '已更新' : '已创建'); document.getElementById('nav-modal').remove(); loadNavData(); });
      });
    });
  }

  window.openNavEditor = openNavEditor;

  // ─── POSTS MANAGEMENT ─────────────────────────────────────────────
  var postsState = { category: 'all', active: 'all', search: '', page: 1, limit: 20, total: 0 };

  function renderPostsPage(area) {
    area.innerHTML = '<div class="fade-in">' +
      '<div class="flex items-center gap-3 mb-4" style="flex-wrap:wrap">' +
      '<select id="posts-cat-filter" style="width:auto;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.4rem 0.6rem;font-size:0.85rem">' +
        '<option value="all">全部分类</option><option value="news">新闻</option><option value="case">案例</option></select>' +
      '<select id="posts-active-filter" style="width:auto;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.4rem 0.6rem;font-size:0.85rem">' +
        '<option value="all">全部状态</option><option value="1">已发布</option><option value="0">草稿</option></select>' +
      '<input id="posts-search" type="text" placeholder="搜索标题..." style="flex:1;min-width:150px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.4rem 0.6rem;font-size:0.85rem">' +
      '<button class="btn-primary ml-auto" onclick="CMS.openPostForm()">+ 新建文章</button></div>' +
      '<div style="overflow-x:auto"><table class="w-full text-sm" style="border-collapse:collapse">' +
        '<thead><tr style="background:#1e293b;color:#94a3b8;text-align:left">' +
          '<th style="padding:0.6rem 0.75rem;border-bottom:1px solid #334155">标题</th>' +
          '<th style="padding:0.6rem 0.75rem;border-bottom:1px solid #334155;width:140px">Slug</th>' +
          '<th style="padding:0.6rem 0.75rem;border-bottom:1px solid #334155;width:80px">分类</th>' +
          '<th style="padding:0.6rem 0.75rem;border-bottom:1px solid #334155;width:80px">状态</th>' +
          '<th style="padding:0.6rem 0.75rem;border-bottom:1px solid #334155;width:110px">发布时间</th>' +
          '<th style="padding:0.6rem 0.75rem;border-bottom:1px solid #334155;width:180px;text-align:right">操作</th>' +
        '</tr></thead><tbody id="posts-tbody"></tbody></table></div>' +
      '<div id="posts-pagination" class="flex items-center justify-center gap-2 mt-4"></div>' +
      '<div id="posts-empty" class="py-16 text-center text-gray-400" style="display:none">暂无文章</div></div>';

    document.getElementById('posts-cat-filter').addEventListener('change', function() { postsState.category = this.value; postsState.page = 1; loadPosts(); });
    document.getElementById('posts-active-filter').addEventListener('change', function() { postsState.active = this.value; postsState.page = 1; loadPosts(); });
    document.getElementById('posts-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') { postsState.search = this.value; postsState.page = 1; loadPosts(); } });
    loadPosts();
  }

  function loadPosts() {
    var params = new URLSearchParams();
    params.set('category', postsState.category);
    params.set('active', postsState.active);
    params.set('page', postsState.page);
    params.set('limit', postsState.limit);
    if (postsState.search) params.set('search', postsState.search);

    api('/posts?' + params.toString()).then(function(d) {
      if (!d) return;
      var posts = d.posts || d.data || [];
      postsState.total = d.total || d.pagination?.total || posts.length;
      var tbody = document.getElementById('posts-tbody');
      var empty = document.getElementById('posts-empty');
      tbody.innerHTML = '';
      if (posts.length === 0) { empty.style.display = ''; return; }
      empty.style.display = 'none';
      posts.forEach(function(p) {
        var tr = document.createElement('tr');
        tr.style.cssText = 'background:#f9fafb;color:#e2e8f0;transition:background 0.15s';
        tr.onmouseenter = function() { tr.style.background = '#1e293b'; };
        tr.onmouseleave = function() { tr.style.background = '#0f172a'; };
        var statusBadge = p.is_active
          ? '<span style="background:#065f46;color:#6ee7b7;padding:0.15rem 0.5rem;border-radius:9999px;font-size:0.75rem">已发布</span>'
          : '<span style="background:#78350f;color:#fcd34d;padding:0.15rem 0.5rem;border-radius:9999px;font-size:0.75rem">草稿</span>';
        var catLabel = p.category === 'case' ? '案例' : (p.category === 'news' ? '新闻' : esc(p.category));
        var pubDate = p.published_at ? new Date(p.published_at).toLocaleDateString('zh-CN') : '—';
        tr.innerHTML =
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6">' +
            '<div class="font-medium" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.title) + '</div>' +
            (p.cover_image ? '<div style="margin-top:0.25rem"><img src="' + esc(p.cover_image) + '" style="width:32px;height:22px;object-fit:cover;border-radius:0.25rem;vertical-align:middle"></div>' : '') +
          '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;color:#94a3b8;font-size:0.8rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.slug) + '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6">' + catLabel + '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6">' + statusBadge + '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;color:#94a3b8;font-size:0.8rem">' + pubDate + '</td>' +
          '<td style="padding:0.6rem 0.75rem;border-bottom:1px solid #f3f4f6;text-align:right">' +
            '<button class="btn-ghost" style="font-size:0.78rem;padding:0.2rem 0.5rem" onclick="CMS.openPostForm(' + p.id + ')">编辑</button> ' +
            '<button class="btn-ghost" style="font-size:0.78rem;padding:0.2rem 0.5rem;color:' + (p.is_active ? '#fbbf24' : '#6ee7b7') + '" onclick="CMS.togglePostPublish(' + p.id + ',' + (p.is_active ? 0 : 1) + ')">' + (p.is_active ? '取消发布' : '发布') + '</button> ' +
            '<button class="btn-ghost" style="font-size:0.78rem;padding:0.2rem 0.5rem;color:#f87171" onclick="CMS.deletePost(' + p.id + ')">删除</button>' +
          '</td>';
        tbody.appendChild(tr);
      });
      renderPostsPagination();
    });
  }

  function renderPostsPagination() {
    var el = document.getElementById('posts-pagination');
    var pages = Math.ceil(postsState.total / postsState.limit) || 1;
    if (pages <= 1) { el.innerHTML = '<span style="color:#64748b;font-size:0.8rem">共 ' + postsState.total + ' 条</span>'; return; }
    var html = '<span style="color:#64748b;font-size:0.8rem">共 ' + postsState.total + ' 条</span>';
    html += '<button class="btn-ghost" style="font-size:0.8rem;padding:0.2rem 0.5rem" onclick="CMS.postsGoPage(' + (postsState.page - 1) + ')"' + (postsState.page <= 1 ? ' disabled' : '') + '>‹</button>';
    var start = Math.max(1, postsState.page - 2);
    var end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    for (var i = start; i <= end; i++) {
      if (i === postsState.page) {
        html += '<span style="background:#3b82f6;color:#fff;padding:0.2rem 0.55rem;border-radius:0.375rem;font-size:0.8rem">' + i + '</span>';
      } else {
        html += '<button class="btn-ghost" style="font-size:0.8rem;padding:0.2rem 0.5rem" onclick="CMS.postsGoPage(' + i + ')">' + i + '</button>';
      }
    }
    html += '<button class="btn-ghost" style="font-size:0.8rem;padding:0.2rem 0.5rem" onclick="CMS.postsGoPage(' + (postsState.page + 1) + ')"' + (postsState.page >= pages ? ' disabled' : '') + '>›</button>';
    el.innerHTML = html;
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
  }

  function openPostForm(postId) {
    var isEdit = !!postId;
    var title = '新建文章';
    var formData = { title: '', slug: '', category: 'news', excerpt: '', content_markdown: '', cover_image: '', sort_order: 0 };

    if (isEdit) {
      title = '编辑文章';
      api('/posts/' + postId).then(function(d) {
        if (!d || !d.post) { toast('文章不存在', true); return; }
        var p = d.post;
        formData = { title: p.title || '', slug: p.slug || '', category: p.category || 'news', excerpt: p.excerpt || '', content_markdown: p.content_markdown || '', cover_image: p.cover_image || '', sort_order: p.sort_order || 0, is_active: p.is_active };
        fillForm(p.id, formData);
      });
    } else {
      fillForm(null, formData);
    }

    function fillForm(id, data) {
      var bodyHtml =
        '<div style="display:flex;flex-direction:column;gap:0.85rem">' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">标题</label>' +
            '<input id="pf-title" type="text" value="' + esc(data.title) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem" placeholder="文章标题"></div>' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">Slug</label>' +
            '<input id="pf-slug" type="text" value="' + esc(data.slug) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem;font-family:monospace" placeholder="auto-generated"></div>' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">分类</label>' +
            '<select id="pf-category" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem">' +
              '<option value="news"' + (data.category === 'news' ? ' selected' : '') + '>新闻</option>' +
              '<option value="case"' + (data.category === 'case' ? ' selected' : '') + '>案例</option></select></div>' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">摘要</label>' +
            '<textarea id="pf-excerpt" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem;min-height:60px;resize:vertical" placeholder="简短描述...">' + esc(data.excerpt) + '</textarea></div>' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">内容 (Markdown)</label>' +
            '<textarea id="pf-content" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem;min-height:300px;resize:vertical;font-family:monospace" placeholder="Markdown 内容...">' + esc(data.content_markdown) + '</textarea></div>' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">封面图 URL</label>' +
            '<input id="pf-cover" type="text" value="' + esc(data.cover_image) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem" placeholder="https://..."></div>' +
          '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">排序权重</label>' +
            '<input id="pf-sort" type="number" value="' + (data.sort_order || 0) + '" style="width:120px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem 0.65rem;font-size:0.85rem"></div>' +
        '</div>';

      showModal('post-form-modal', title, bodyHtml, function() {
        var t = document.getElementById('pf-title').value.trim();
        var s = document.getElementById('pf-slug').value.trim();
        if (!t) { toast('请输入标题', true); return false; }
        if (!s) s = slugify(t);

        var body = {
          title: t,
          slug: s,
          category: document.getElementById('pf-category').value,
          excerpt: document.getElementById('pf-excerpt').value.trim(),
          content_markdown: document.getElementById('pf-content').value,
          cover_image: document.getElementById('pf-cover').value.trim(),
          sort_order: parseInt(document.getElementById('pf-sort').value) || 0
        };

        var promise;
        if (isEdit) {
          body.is_active = data.is_active;
          promise = api('/posts/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
          promise = api('/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        promise.then(function() { toast(isEdit ? '已更新' : '已创建'); loadPosts(); });
        return false; // modal stays until we close it ourselves
      }, function() {
        // Auto-slug from title
        var titleInput = document.getElementById('pf-title');
        var slugInput = document.getElementById('pf-slug');
        if (titleInput && slugInput) {
          titleInput.addEventListener('input', function() {
            if (!slugInput.dataset.touched) slugInput.value = slugify(titleInput.value);
          });
          slugInput.addEventListener('input', function() { slugInput.dataset.touched = '1'; });
        }
      });
    }
  }

  function togglePostPublish(id, active) {
    if (!confirm(active ? '确认发布这篇文章？' : '确认取消发布？取消后文章将变为草稿。')) return;
    api('/posts/' + id + '/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: active }) })
      .then(function() { toast(active ? '已发布' : '已取消发布'); loadPosts(); });
  }

  function deletePost(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;
    api('/posts/' + id, { method: 'DELETE' }).then(function() { toast('已删除'); loadPosts(); });
  }

  function postsGoPage(p) {
    var pages = Math.ceil(postsState.total / postsState.limit) || 1;
    if (p < 1 || p > pages) return;
    postsState.page = p;
    loadPosts();
  }

  window.CMS = window.CMS || {};
  window.CMS.openPostForm = openPostForm;
  window.CMS.togglePostPublish = togglePostPublish;
  window.CMS.deletePost = deletePost;
  window.CMS.postsGoPage = postsGoPage;


  // ─── PAGE CONTENT MANAGEMENT ──────────────────────────────────────
  var pagesState = { currentView: 'list', currentPageId: null };

  function renderPagesPage(area) {
    currentPage = 'i18n';
    document.getElementById('breadcrumb').textContent = '多语言与页面';
    var nav = document.getElementById('nav-menu');
    nav.querySelectorAll('.sidebar-link').forEach(function(b) { b.classList.remove('active'); });
    nav.querySelector('[data-key="i18n"]') || nav.querySelectorAll('.sidebar-link').forEach(function(b) { if (b.textContent.includes('多语言')) b.classList.add('active'); });
    renderI18nPage(area);
    // Auto-switch to pages tab after render
    setTimeout(function() {
      var tabPages = document.getElementById('i18n-tab-pages');
      if (tabPages) tabPages.click();
    }, 50);
  }

  function loadPagesList() {
    var container = document.getElementById('pages-list');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    api('/pages').then(function(d) {
      if (!d || !d.pages) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }

      var html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
      d.pages.forEach(function(p) {
        html += '<div class="p-4 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-all" data-page="' + esc(p.page_id) + '">' +
          '<div class="flex items-center gap-3 mb-2">' +
          '<span class="text-2xl">' + p.icon + '</span>' +
          '<div class="flex-1 min-w-0">' +
          '<div class="font-medium text-gray-900">' + esc(p.label) + '</div>' +
          '<div class="text-xs text-gray-500 font-mono">' + esc(p.page_id) + '</div>' +
          '</div>' +
          '<span class="text-xs px-2 py-0.5 rounded-full ' + (p.section_count > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + p.section_count + ' sections</span>' +
          '</div></div>';
      });
      html += '</div>';
      container.innerHTML = html;

      container.querySelectorAll('[data-page]').forEach(function(card) {
        card.addEventListener('click', function() {
          loadPageEditor(card.getAttribute('data-page'));
        });
      });
    });
  }

  function loadPageEditor(pageId) {
    document.getElementById('pages-list').style.display = 'none';
    var editor = document.getElementById('pages-editor');
    editor.style.display = '';

    api('/pages/' + encodeURIComponent(pageId)).then(function(d) {
      if (!d) { editor.innerHTML = '<div class="text-red-400">加载失败</div>'; return; }
      var sections = d.sections || [];

      var html = '<button id="pages-back-btn" class="btn-ghost mb-4">← 返回页面列表</button>' +
        '<h3 class="text-lg font-semibold mb-4">' + esc(pageId) + ' — 内容编辑</h3>';

      if (sections.length === 0) {
        html += '<div class="py-12 text-center text-gray-400"><div class="text-4xl mb-3">📭</div><div>暂无内容，点击"从 HTML 自动检测"按钮导入</div></div>';
      } else {
        html += '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">' +
          '<thead><tr style="border-bottom:2px solid #e5e7eb;text-align:left">' +
          '<th style="padding:0.5rem">Section Key</th>' +
          '<th style="padding:0.5rem">类型</th>' +
          '<th style="padding:0.5rem">内容预览</th>' +
          '<th style="padding:0.5rem;text-align:center">操作</th>' +
          '</tr></thead><tbody>';

        sections.forEach(function(s) {
          var preview = '';
          if (s.content) {
            var vals = Object.values(s.content);
            preview = vals.map(function(v) { return typeof v === 'string' ? v : JSON.stringify(v); }).join(', ').slice(0, 80);
          }
          var i18nHint = '';
          if (s.section_key) {
            i18nHint = '<div style="margin-top:2px;font-size:0.7rem;color:#94a3b8" title="翻译 key: ' + esc(s.section_key) + '">' + esc(s.section_key) + '</div>';
          }
          html += '<tr style="border-bottom:1px solid #f3f4f6" data-section="' + esc(s.section_key) + '">' +
            '<td style="padding:0.5rem;font-family:monospace;font-size:0.75rem;color:#94a3b8">' + esc(s.section_key) + i18nHint + '</td>' +
            '<td style="padding:0.5rem"><span style="font-size:0.7rem;padding:0.125rem 0.375rem;border-radius:0.25rem;background:#f3f4f6;color:#94a3b8">' + esc(s.section_type) + '</span></td>' +
            '<td style="padding:0.5rem;color:#64748b;font-size:0.8rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(preview) + '">' + esc(preview) + '</td>' +
            '<td style="padding:0.5rem;text-align:center"><button class="btn-ghost edit-section-btn" style="font-size:0.75rem;padding:0.2rem 0.5rem">编辑</button></td>' +
            '</tr>';
        });

        html += '</tbody></table>';
      }
      editor.innerHTML = html;

      document.getElementById('pages-back-btn').addEventListener('click', function() {
        editor.style.display = 'none';
        document.getElementById('pages-list').style.display = '';
        pagesState.currentPageId = null;
      });

      editor.querySelectorAll('.edit-section-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var row = btn.closest('tr');
          var sectionKey = row.getAttribute('data-section');
          var section = sections.find(function(s) { return s.section_key === sectionKey; });
          if (section) openSectionEditor(pageId, section);
        });
      });
    });
  }

  function openSectionEditor(pageId, section) {
    var content = section.content || {};
    var images = section.images || [];
    var isI18n = section.section_type === 'i18n_text';

    var bodyHtml = '<div style="display:flex;flex-direction:column;gap:0.85rem">' +
      '<div class="text-sm text-gray-400 mb-2">Section: <span class="font-mono text-gray-900">' + esc(section.section_key) + '</span>' +
      (isI18n ? ' <span class="text-xs text-amber-400 ml-2">💡 此字段可通过多语言管理编辑</span>' : '') + '</div>';

    // Content fields
    var contentKeys = Object.keys(content);
    if (contentKeys.length > 0) {
      contentKeys.forEach(function(k) {
        var v = content[k];
        if (typeof v === 'string' && v.length > 100) {
          bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">' + esc(k) + '</label>' +
            '<textarea class="section-field" data-field="' + esc(k) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem;font-size:0.85rem;min-height:100px;resize:vertical">' + esc(v) + '</textarea></div>';
        } else {
          bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">' + esc(k) + '</label>' +
            '<input class="section-field" data-field="' + esc(k) + '" type="text" value="' + esc(String(v || '')) + '" style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.5rem;padding:0.5rem;font-size:0.85rem"></div>';
        }
      });
    }

    // Image management
    if (images.length > 0 || section.section_type === 'image') {
      bodyHtml += '<div><label style="color:#94a3b8;font-size:0.8rem;display:block;margin-bottom:0.25rem">图片</label>';
      images.forEach(function(img, idx) {
        bodyHtml += '<div class="flex items-center gap-2 mb-2">' +
          (img.image_url ? '<img src="' + esc(img.image_url) + '" style="width:48px;height:48px;object-fit:cover;border-radius:0.25rem">' : '<div style="width:48px;height:48px;background:#f3f4f6;border-radius:0.25rem"></div>') +
          '<input class="img-url" data-idx="' + idx + '" value="' + esc(img.image_url || '') + '" placeholder="图片 URL" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.8rem">' +
          '<button class="remove-img-btn" data-idx="' + idx + '" style="color:#f87171;font-size:0.8rem;padding:0.25rem 0.5rem;background:none;border:none;cursor:pointer">✕</button>' +
          '</div>';
      });
      bodyHtml += '<button id="add-img-btn" style="font-size:0.8rem;padding:0.25rem 0.5rem;background:#f3f4f6;color:#94a3b8;border:none;border-radius:0.25rem;cursor:pointer">+ 添加图片</button>';
      bodyHtml += '</div>';
    }

    bodyHtml += '</div>';

    showModal('section-editor-modal', '编辑 Section: ' + section.section_key, bodyHtml, function() {
      // Collect content
      var newContent = {};
      document.querySelectorAll('.section-field').forEach(function(field) {
        newContent[field.getAttribute('data-field')] = field.value;
      });

      // Collect images
      var newImages = [];
      document.querySelectorAll('.img-url').forEach(function(input) {
        newImages.push({ image_url: input.value, alt_text: '', sort_order: newImages.length });
      });

      // Save
      api('/pages/' + encodeURIComponent(pageId) + '/sections/' + encodeURIComponent(section.section_key), {
        method: 'PUT',
        body: { section_type: section.section_type, content: newContent, sort_order: section.sort_order, is_active: section.is_active }
      }).then(function() {
        if (newImages.length > 0) {
          return api('/pages/' + encodeURIComponent(pageId) + '/sections/' + encodeURIComponent(section.section_key) + '/images', {
            method: 'PUT',
            body: { images: newImages }
          });
        }
      }).then(function() {
        toast('已保存');
        loadPageEditor(pageId);
      });
      return false;
    }, function() {
      // Add image button handler
      var addBtn = document.getElementById('add-img-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function() {
          var container = addBtn.parentElement;
          var idx = container.querySelectorAll('.img-url').length;
          var row = document.createElement('div');
          row.className = 'flex items-center gap-2 mb-2';
          row.innerHTML = '<div style="width:48px;height:48px;background:#f3f4f6;border-radius:0.25rem"></div>' +
            '<input class="img-url" data-idx="' + idx + '" placeholder="图片 URL" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.8rem">' +
            '<button class="remove-img-btn" data-idx="' + idx + '" style="color:#f87171;font-size:0.8rem;padding:0.25rem 0.5rem;background:none;border:none;cursor:pointer">✕</button>';
          addBtn.before(row);
          row.querySelector('.remove-img-btn').addEventListener('click', function() { row.remove(); });
        });
      }
      // Remove image handlers
      document.querySelectorAll('.remove-img-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { btn.closest('.flex').remove(); });
      });
    });
  }

  function syncAllPages() {
    var btn = document.getElementById('pages-sync-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '检测中...';

    var pageIds = [
      'home', 'about',
      'solutions/deploy-fast-food', 'solutions/deploy-cloud-kitchen', 'solutions/deploy-canteen', 'solutions/deploy-southeast-asian',
      'applications/cases'
    ];

    var promises = pageIds.map(function(pid) {
      return api('/pages/' + encodeURIComponent(pid) + '/sync', { method: 'POST' });
    });

    Promise.all(promises).then(function(results) {
      var totalSections = 0;
      results.forEach(function(r, i) {
        if (r && r.detected_sections) {
          totalSections += r.detected_sections;
          // Save detected sections
          var sections = r.sections || [];
          sections.forEach(function(s) {
            api('/pages/' + encodeURIComponent(pageIds[i]) + '/sections/' + encodeURIComponent(s.section_key), {
              method: 'PUT',
              body: { section_type: s.section_type, content: s.content, sort_order: totalSections }
            });
          });
        }
      });

      btn.disabled = false;
      btn.textContent = '🔄 从 HTML 自动检测';
      toast('检测完成: ' + totalSections + ' 个 sections');
      loadPagesList();
    });
  }

  // ─── I18N MANAGEMENT ──────────────────────────────────────────────
  var i18nState = {
    lang: 'zh-CN',
    type: 'ui',
    search: '',
    page: 1,
    pageSize: 50,
    total: 0,
    edits: {},      // key -> new value (unsaved changes)
    editCount: 0
  };

  function renderI18nPage(area) {
    area.innerHTML = '<div class="fade-in">' +
      // Header with tabs
      '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
        '<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">' +
          '<button id="i18n-tab-trans" class="i18n-tab active" style="padding:0.375rem 0.875rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">🌐 翻译管理</button>' +
          '<button id="i18n-tab-pages" class="i18n-tab" style="padding:0.375rem 0.875rem;border:none;border-radius:0.5rem;font-size:0.85rem;font-weight:500;cursor:pointer;transition:all 0.15s">📄 页面内容</button>' +
        '</div>' +
      '</div>' +
      // Translation panel
      '<div id="i18n-trans-panel">' +
        '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
          '<h2 class="text-lg font-semibold">翻译管理</h2>' +
          '<div class="flex gap-3 flex-wrap">' +
            '<select id="i18n-lang" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.6rem;border-radius:0.5rem;font-size:0.85rem">' +
              '<option value="zh-CN"' + (i18nState.lang === 'zh-CN' ? ' selected' : '') + '>中文</option>' +
              '<option value="en"' + (i18nState.lang === 'en' ? ' selected' : '') + '>English</option>' +
            '</select>' +
            '<select id="i18n-type" style="border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.6rem;border-radius:0.5rem;font-size:0.85rem">' +
              '<option value="ui"' + (i18nState.type === 'ui' ? ' selected' : '') + '>UI 文案</option>' +
              '<option value="product"' + (i18nState.type === 'product' ? ' selected' : '') + '>产品翻译</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        // Stats bar
        '<div id="i18n-stats" class="flex items-center gap-4 mb-4 text-sm text-gray-500"></div>' +
        // Search
        '<div class="flex gap-3 mb-4">' +
          '<input id="i18n-search" placeholder="搜索翻译键或值..." value="' + esc(i18nState.search) + '" style="flex:1;border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.5rem 0.75rem;border-radius:0.5rem;font-size:0.85rem">' +
          '<button id="i18n-search-btn" class="btn-primary" style="font-size:0.85rem">搜索</button>' +
        '</div>' +
        // Unsaved changes bar
        '<div id="i18n-unsaved-bar" class="hidden mb-4 flex items-center justify-between px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">' +
          '<span class="text-sm text-amber-700" id="i18n-unsaved-text">0 条未保存修改</span>' +
          '<div class="flex gap-3">' +
            '<button id="i18n-discard-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.35rem 0.875rem">放弃</button>' +
            '<button id="i18n-unsaved-save-btn" class="btn-primary" style="font-size:0.85rem;padding:0.35rem 0.875rem;background:#f59e0b">保存修改</button>' +
          '</div>' +
        '</div>' +
        // Table container
        '<div id="i18n-container" style="overflow-x:auto"><div class="text-center py-8 text-gray-400">加载中...</div></div>' +
        // Pagination
        '<div id="i18n-pagination" class="flex items-center justify-between mt-4 text-sm text-gray-500"></div>' +
        // Import/Export bar
        '<div class="flex items-center justify-end gap-3 mt-4">' +
          '<button id="i18n-export-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">📥 导出 JSON</button>' +
          '<button id="i18n-import-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">📤 导入 JSON</button>' +
          '<input type="file" id="i18n-import-file" accept=".json" style="display:none">' +
        '</div>' +
      '</div>' +
      // Pages panel (hidden by default)
      '<div id="i18n-pages-panel" style="display:none">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h2 class="text-lg font-semibold">页面内容管理</h2>' +
          '<button id="pages-sync-btn" class="btn-ghost" style="font-size:0.85rem;padding:0.375rem 0.875rem">🔄 从 HTML 自动检测</button>' +
        '</div>' +
        '<div id="pages-list"></div>' +
        '<div id="pages-editor" style="display:none"></div>' +
      '</div>' +
      '</div>';

    // Tab switching
    var tabTrans = document.getElementById('i18n-tab-trans');
    var tabPages = document.getElementById('i18n-tab-pages');
    var panelTrans = document.getElementById('i18n-trans-panel');
    var panelPages = document.getElementById('i18n-pages-panel');
    function activateTab(active, inactive, showPanel, hidePanel) {
      active.style.background = '#fff'; active.style.color = '#111827'; active.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      inactive.style.background = 'transparent'; inactive.style.color = '#6b7280'; inactive.style.boxShadow = 'none';
      showPanel.style.display = ''; hidePanel.style.display = 'none';
    }
    activateTab(tabTrans, tabPages, panelTrans, panelPages);
    tabTrans.addEventListener('click', function() { activateTab(tabTrans, tabPages, panelTrans, panelPages); });
    tabPages.addEventListener('click', function() { activateTab(tabPages, tabTrans, panelPages, panelTrans); loadPagesList(); });
    document.getElementById('pages-sync-btn').addEventListener('click', syncAllPages);

    // Bind events
    document.getElementById('i18n-lang').addEventListener('change', function() {
      i18nState.lang = this.value;
      i18nState.page = 1;
      i18nState.search = '';
      document.getElementById('i18n-search').value = '';
      loadI18nKeys();
    });
    document.getElementById('i18n-type').addEventListener('change', function() {
      i18nState.type = this.value;
      i18nState.page = 1;
      loadI18nKeys();
    });
    document.getElementById('i18n-search-btn').addEventListener('click', function() {
      i18nState.search = document.getElementById('i18n-search').value.trim();
      i18nState.page = 1;
      loadI18nKeys();
    });
    document.getElementById('i18n-search').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        i18nState.search = this.value.trim();
        i18nState.page = 1;
        loadI18nKeys();
      }
    });
    document.getElementById('i18n-discard-btn').addEventListener('click', function() {
      i18nState.edits = {};
      i18nState.editCount = 0;
      updateUnsavedBar();
      loadI18nKeys();
    });
    document.getElementById('i18n-unsaved-save-btn').addEventListener('click', saveI18nEdits);
    document.getElementById('i18n-export-btn').addEventListener('click', exportI18n);
    document.getElementById('i18n-import-btn').addEventListener('click', function() {
      document.getElementById('i18n-import-file').click();
    });
    document.getElementById('i18n-import-file').addEventListener('change', importI18nFile);

    loadI18nKeys();
  }

  function loadI18nKeys() {
    var container = document.getElementById('i18n-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8 text-gray-400">加载中...</div>';

    var params = '?lang=' + i18nState.lang + '&type=' + i18nState.type +
      '&page=' + i18nState.page + '&limit=' + i18nState.pageSize +
      (i18nState.search ? '&search=' + encodeURIComponent(i18nState.search) : '');

    // Fetch primary + comparison language
    var lang2 = i18nState.lang === 'zh-CN' ? 'en' : 'zh-CN';
    api('/i18n/keys' + params).then(function(data1) {
      if (!data1) { container.innerHTML = '<div class="text-center py-8 text-red-400">加载失败</div>'; return; }
      i18nState.total = data1.total || 0;

      // Fetch comparison
      var compParams = '?lang=' + lang2 + '&type=' + i18nState.type + '&limit=' + i18nState.pageSize +
        '&page=' + i18nState.page +
        (i18nState.search ? '&search=' + encodeURIComponent(i18nState.search) : '');
      api('/i18n/keys' + compParams).then(function(data2) {
        var map2 = {};
        if (data2 && data2.keys) data2.keys.forEach(function(k) { map2[k.key] = k.value; });

        // Also fetch total for comparison for stats
        api('/i18n/keys?lang=' + lang2 + '&type=' + i18nState.type + '&limit=1').then(function(compInfo) {
          var compTotal = (compInfo && compInfo.total) || 0;
          var missingCount = data1.keys.filter(function(e) { return !map2[e.key]; }).length;

          // Update stats
          var statsEl = document.getElementById('i18n-stats');
          if (statsEl) {
            statsEl.innerHTML =
              '<span>当前语言: <strong class="text-gray-900">' + i18nState.lang + '</strong></span>' +
              '<span>对照: <strong class="text-gray-900">' + lang2 + '</strong></span>' +
              '<span>总条目: <strong class="text-gray-900">' + i18nState.total + '</strong></span>' +
              '<span class="text-red-500">缺失翻译: <strong>' + missingCount + '</strong></span>' +
              '<span>覆盖率: <strong class="' + (missingCount === 0 ? 'text-green-600' : 'text-amber-600') + '">' +
                (data1.keys.length ? Math.round((1 - missingCount / data1.keys.length) * 100) : 0) + '%</strong></span>';
          }

          renderI18nTable(data1.keys, map2, lang2);
          renderI18nPagination();
          updateUnsavedBar();
        });
      });
    });
  }

  function renderI18nTable(entries, map2, lang2) {
    var container = document.getElementById('i18n-container');
    if (!container) return;

    if (!entries.length) {
      container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="text-4xl mb-3">📭</div><div>没有找到匹配的翻译条目</div></div>';
      return;
    }

    // Group by prefix (e.g. "nav_" or "products_")
    var groups = {};
    entries.forEach(function(e) {
      var prefix = e.key.split('_')[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(e);
    });

    var html = '<table style="width:100%;border-collapse:collapse;font-size:0.875rem">' +
      '<thead style="position:sticky;top:0;z-index:1;background:#f9fafb"><tr style="border-bottom:2px solid #e5e7eb">' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:25%">Key</th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:35%">' + i18nState.lang + ' <span class="text-xs text-gray-400">(可编辑)</span></th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:left;width:35%">' + lang2 + ' <span class="text-xs text-gray-400">(可编辑)</span></th>' +
      '<th style="padding:0.625rem 0.5rem;text-align:center;width:5%">状态</th>' +
      '</tr></thead><tbody>';

    var lastPrefix = '';
    entries.forEach(function(entry) {
      var prefix = entry.key.split('_')[0];
      // Group separator row
      if (prefix !== lastPrefix && Object.keys(groups).length > 1) {
        if (lastPrefix) html += '<tr><td colspan="4" style="padding:0;height:0.5rem"></td></tr>';
        html += '<tr style="border-bottom:1px solid #e5e7eb"><td colspan="4" style="padding:0.375rem 0.5rem">' +
          '<span style="font-size:0.7rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">' +
          esc(prefix) + ' <span style="color:#9ca3af">(' + groups[prefix].length + ')</span></span></td></tr>';
        lastPrefix = prefix;
      }

      var v2 = map2[entry.key] || '';
      var missing = !v2;
      var editedKey = entry.key;
      var currentVal = i18nState.edits.hasOwnProperty(entry.key) ? i18nState.edits[entry.key] : entry.value;
      var currentV2 = i18nState.edits.hasOwnProperty(entry.key + ':' + lang2) ? i18nState.edits[entry.key + ':' + lang2] : v2;

      var rowBg = missing && !i18nState.edits.hasOwnProperty(entry.key + ':' + lang2) ? '#fef2f2' : (i18nState.edits.hasOwnProperty(entry.key) ? '#fffbeb' : '');
      html += '<tr style="border-bottom:1px solid #f3f4f6;' + (rowBg ? 'background:' + rowBg : '') +
        '" data-key="' + esc(entry.key) + '">' +
        '<td style="padding:0.5rem;font-family:monospace;font-size:0.7rem;color:#6b7280;word-break:break-all;line-height:1.4" title="' + esc(entry.key) + '">' + esc(entry.key) + '</td>' +
        '<td style="padding:0.25rem 0.5rem"><input class="i18n-edit" data-lang="' + i18nState.lang + '" data-key="' + esc(entry.key) + '" value="' + esc(currentVal) + '" ' +
        'style="width:100%;border:1px solid #d1d5db;background:#fff;color:#111827;padding:0.375rem 0.5rem;border-radius:0.375rem;font-size:0.8rem;line-height:1.4"></td>' +
        '<td style="padding:0.25rem 0.5rem"><input class="i18n-edit" data-lang="' + lang2 + '" data-key="' + esc(entry.key) + '" value="' + esc(currentV2) + '" ' +
        'style="width:100%;border:1px solid #d1d5db;background:#fff;color:' + (missing ? '#dc2626' : '#111827') + ';padding:0.375rem 0.5rem;border-radius:0.375rem;font-size:0.8rem;line-height:1.4" ' +
        'placeholder="' + esc(v2 || '(点击输入翻译)') + '"></td>' +
        '<td style="padding:0.5rem;text-align:center">' +
        (i18nState.edits.hasOwnProperty(entry.key) || i18nState.edits.hasOwnProperty(entry.key + ':' + lang2)
          ? '<span style="color:#f59e0b;font-size:0.75rem" title="已修改未保存">✏️</span>'
          : (missing ? '<span style="color:#ef4444;font-size:0.75rem" title="缺失翻译">⚠️</span>' : '<span style="color:#22c55e;font-size:0.75rem">✅</span>')) +
        '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Track edits
    container.querySelectorAll('.i18n-edit').forEach(function(input) {
      input.addEventListener('input', function() {
        var lang = input.getAttribute('data-lang');
        var key = input.getAttribute('data-key');
        var editKey = lang === i18nState.lang ? key : key + ':' + lang;
        if (input.value === '') delete i18nState.edits[editKey];
        else i18nState.edits[editKey] = input.value;
        i18nState.editCount = Object.keys(i18nState.edits).length;
        updateUnsavedBar();
        // Update row highlight
        var row = input.closest('tr');
        if (row) row.style.background = input.value ? '#fffbeb' : '';
      });
    });
  }

  function renderI18nPagination() {
    var el = document.getElementById('i18n-pagination');
    if (!el) return;
    var totalPages = Math.ceil(i18nState.total / i18nState.pageSize);
    var page = i18nState.page;
    if (totalPages <= 1) { el.innerHTML = '<span>共 ' + i18nState.total + ' 条</span><span></span>'; return; }

    var start = (page - 1) * i18nState.pageSize + 1;
    var end = Math.min(page * i18nState.pageSize, i18nState.total);

    var pages = [];
    if (page > 1) pages.push({ n: page - 1, t: '‹' });
    for (var i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      pages.push({ n: i, t: String(i) });
    }
    if (page < totalPages) pages.push({ n: page + 1, t: '›' });

    var btns = pages.map(function(p) {
      var active = p.n === page;
      return '<button data-page="' + p.n + '" style="padding:0.25rem 0.5rem;border:1px solid ' +
        (active ? '#4f46e5' : '#d1d5db') + ';background:' + (active ? '#4f46e5' : '#fff') +
        ';color:' + (active ? '#fff' : '#374151') + ';border-radius:0.375rem;cursor:pointer;font-size:0.8rem;min-width:2rem">' + p.t + '</button>';
    }).join('');

    el.innerHTML = '<span>显示 ' + start + '-' + end + ' / 共 ' + i18nState.total + ' 条</span>' +
      '<div class="flex gap-1">' + btns + '</div>';

    el.querySelectorAll('[data-page]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        i18nState.page = parseInt(this.getAttribute('data-page'));
        loadI18nKeys();
        document.getElementById('i18n-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function updateUnsavedBar() {
    var bar = document.getElementById('i18n-unsaved-bar');
    var text = document.getElementById('i18n-unsaved-text');
    if (!bar) return;
    if (i18nState.editCount > 0) {
      bar.classList.remove('hidden');
      if (text) text.textContent = i18nState.editCount + ' 条未保存修改';
    } else {
      bar.classList.add('hidden');
    }
  }

  function saveI18nEdits() {
    if (!i18nState.editCount) return;
    var updates = [];
    Object.keys(i18nState.edits).forEach(function(editKey) {
      var isComp = editKey.indexOf(':') > -1;
      var key = isComp ? editKey.split(':')[0] : editKey;
      var lang = isComp ? editKey.split(':')[1] : i18nState.lang;
      var type = isComp ? i18nState.type : i18nState.type;
      updates.push({ key: key, value: i18nState.edits[editKey], lang: lang, type: type });
    });

    // Group by lang+type to minimize API calls
    var groups = {};
    updates.forEach(function(u) {
      var gk = u.lang + '|' + u.type;
      if (!groups[gk]) groups[gk] = { lang: u.lang, type: u.type, updates: [] };
      groups[gk].updates.push({ key: u.key, value: u.value });
    });

    var promises = Object.values(groups).map(function(g) {
      return api('/i18n/batch', { method: 'PUT', body: g });
    });

    Promise.all(promises).then(function(results) {
      var totalSaved = 0;
      results.forEach(function(r) { if (r && r.count) totalSaved += r.count; });
      if (totalSaved > 0) {
        i18nState.edits = {};
        i18nState.editCount = 0;
        updateUnsavedBar();
        toast('已保存 ' + totalSaved + ' 条翻译');
        loadI18nKeys(); // Refresh
      }
    });
  }

  function exportI18n() {
    var url = '/api/cms/i18n/export?lang=' + i18nState.lang + '&type=' + i18nState.type;
    fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.text(); })
      .then(function(text) {
        var blob = new Blob([text], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = i18nState.lang + '-' + i18nState.type + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('导出成功');
      })
      .catch(function(e) { toast('导出失败: ' + e.message, true); });
  }

  function importI18nFile(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || Array.isArray(data)) {
          toast('无效的 JSON 格式', true); return;
        }
        api('/i18n/import', {
          method: 'POST',
          body: { lang: i18nState.lang, type: i18nState.type, data: data, mode: 'merge' }
        }).then(function(result) {
          if (result) {
            toast(result.message || '导入成功');
            loadI18nKeys();
          }
        });
      } catch (err) {
        toast('JSON 解析失败: ' + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  window.loadI18nUI = function(lang, type, search) {
    i18nState.lang = lang || i18nState.lang;
    i18nState.type = type || i18nState.type;
    if (search !== undefined) i18nState.search = search;
    i18nState.page = 1;
    loadI18nKeys();
  };

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

  // API helper
  function api(path, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (options.body && typeof options.body !== 'string') options.body = JSON.stringify(options.body);
    options.headers = Object.assign(headers, options.headers || {});
    return fetch('/api/cms' + path, options)
      .then(function(res) {
        if (res.status === 401) { logout(); return null; }
        return res.text().then(function(text) {
          try { return JSON.parse(text); } catch(e) { return null; }
        });
      })
      .then(function(data) {
        if (data && data.error) { toast(data.error, true); return null; }
        return data;
      })
      .catch(function(e) { toast('网络错误: ' + e.message, true); return null; });
  }

  // Modal
  function showModal(id, title, bodyHtml, onSave, onReady) {
    var existing = document.getElementById(id);
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = '<div class="modal-box modal-lg" style="margin:2rem 0">' +
      '<h3 class="text-lg font-semibold mb-4">' + esc(title) + '</h3>' +
      '<div id="' + id + '-body">' + bodyHtml + '</div>' +
      '<div class="flex justify-between mt-6">' +
      '<div id="' + id + '-extra"></div><div></div>' +
      '<div class="flex gap-3"><button class="btn-ghost" onclick="document.getElementById(\'' + id + '\').remove()">取消</button>' +
      '<button class="btn-primary" id="' + id + '-save">保存</button></div></div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.getElementById(id + '-save').addEventListener('click', onSave);
    if (onReady) onReady();
  }

  // Preview modal (image / video)
  function showPreview(filePath, name, isImg, isVid) {
    var existing = document.getElementById('preview-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'preview-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:60;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.75rem';
    var content = '';
    if (isImg) {
      content = '<img src="' + esc(filePath) + '" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:0.5rem">';
    } else if (isVid) {
      content = '<video src="' + esc(filePath) + '" controls style="max-width:90vw;max-height:80vh;border-radius:0.5rem"></video>';
    } else {
      content = '<div style="padding:2rem;background:#fff;border-radius:0.5rem;max-width:90vw;text-align:center"><div style="font-size:3rem;margin-bottom:0.5rem">📄</div><div class="text-sm text-gray-600">' + esc(name) + '</div></div>';
    }
    overlay.innerHTML = content +
      '<div style="display:flex;align-items:center;gap:1rem">' +
      '<span class="text-sm" style="color:rgba(255,255,255,0.8);max-width:60vw" title="' + esc(name) + '">' + esc(name) + '</span>' +
      '<button style="background:none;border:1px solid rgba(255,255,255,0.3);color:#fff;padding:0.25rem 0.75rem;border-radius:0.375rem;cursor:pointer;font-size:0.75rem" onclick="navigator.clipboard.writeText(\'' + esc(filePath) + '\').then(function(){document.getElementById(\'preview-copy\').textContent=\'已复制 ✓\'})">📋 复制链接</button>' +
      '<span id="preview-copy" class="text-sm" style="color:#a5b4fc"></span>' +
      '</div>' +
      '<button style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:2rem;height:2rem;border-radius:9999px;cursor:pointer;font-size:1rem;backdrop-filter:blur(4px)" onclick="document.getElementById(\'preview-overlay\').remove()">✕</button>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    // ESC to close
    var escHandler = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  // Toast
  function toast(msg, isError) {
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast ' + (isError ? 'toast-error' : 'toast-success');
    el.textContent = (isError ? '✕ ' : '✓ ') + msg;
    container.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);
  }
  window.toast = toast;

  // Utils
  function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ─── Related Products ──────────────────────────────
  function showRelatedPicker(currentProduct) {
    api('/products').then(function(d) {
      var products = (d && d.products) ? d.products : (Array.isArray(d) ? d : []);
      if (!products.length) return;
      var items = products.filter(function(p) { return p.is_active && (!currentProduct || p.id !== currentProduct.id); });
      var overlay = document.createElement('div');
      overlay.id = 'related-picker-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
      var selected = {};
      document.querySelectorAll('.pm-related-tag').forEach(function(t) { selected[t.dataset.rid] = true; });
      var h = '<div style="background:#fff;border-radius:16px;padding:1.5rem;max-width:520px;width:92%;max-height:75vh;display:flex;flex-direction:column">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem"><span style="font-weight:700;font-size:1.1rem">选择推荐产品</span><span style="color:#9ca3af;font-size:0.8rem">不选则自动推荐同分类产品</span></div>';
      h += '<input type="text" id="rp-search" placeholder="搜索型号..." style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:0.75rem;outline:none;font-size:0.875rem">';
      h += '<div id="rp-list" style="flex:1;overflow-y:auto">';
      items.forEach(function(p) {
        var checked = selected[p.id] ? 'checked' : '';
        var img = p.primary_image ? '<img src="' + esc(p.primary_image) + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px;background:#f3f4f6" onerror="this.style.display=\'none\'">' : '<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:1.2rem">📦</div>';
        h += '<label data-model="' + esc(p.model.toLowerCase()) + '" style="display:flex;align-items:center;gap:10px;padding:8px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:background 0.1s" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">';
        h += '<input type="checkbox" class="rp-cb" value="' + p.id + '" ' + checked + ' style="width:16px;height:16px;flex-shrink:0;accent-color:#4f46e5">';
        h += img;
        h += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.875rem;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.model) + '</div>';
        h += '<div style="font-size:0.75rem;color:#94a3b8">' + esc(p.sub_category || '') + '</div></div>';
        h += '</label>';
      });
      h += '</div>';
      h += '<div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;padding-top:0.75rem;border-top:1px solid #f3f4f6"><button id="rp-cancel" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:10px;cursor:pointer;font-size:0.875rem;background:#fff">取消</button><button id="rp-confirm" style="padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:10px;cursor:pointer;font-size:0.875rem;font-weight:600">确定</button></div>';
      h += '</div>';
      overlay.innerHTML = h;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
      document.getElementById('rp-cancel').onclick = function() { overlay.remove(); };
      document.getElementById('rp-search').oninput = function() {
        var q = this.value.toLowerCase();
        document.querySelectorAll('#rp-list label').forEach(function(l) {
          l.style.display = (l.dataset.model || '').indexOf(q) >= 0 ? 'flex' : 'none';
        });
      };
      document.getElementById('rp-confirm').onclick = function() {
        var chosen = [];
        document.querySelectorAll('.rp-cb:checked').forEach(function(cb) {
          var id = cb.value;
          var info = cb.closest('label').querySelector('div > div');
          chosen.push({ id: id, model: info ? info.textContent : cb.value });
        });
        var container = document.getElementById('pm-related');
        container.innerHTML = chosen.map(function(c) {
          return '<span class="pm-related-tag" data-rid="' + c.id + '" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:9999px;font-size:0.75rem;cursor:pointer">' + esc(c.model) + ' <span style="color:#ef4444;font-weight:bold">×</span></span>';
        }).join('');
        container.querySelectorAll('.pm-related-tag').forEach(function(tag) {
          tag.addEventListener('click', function() { this.remove(); });
        });
        overlay.remove();
      };
    });
  }

  function saveRelatedProducts(productId, items) {
    if (!productId) return;
    api('/products/' + productId + '/related', { method: 'PUT', body: items || [] }).catch(function() {});
  }

  // Initial render
  renderPage();
})();
