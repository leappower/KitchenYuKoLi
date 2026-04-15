(function() {
  'use strict';

  var token = localStorage.getItem('cms_token');
  var user = null;
  try { user = JSON.parse(localStorage.getItem('cms_user')); } catch(e) {}

  var menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'categories', label: '产品系列', icon: '📦' },
    { key: 'products', label: '产品管理', icon: '🔧' },
    { key: 'media', label: '媒体库', icon: '🖼️' },
    { key: 'nav', label: '导航管理', icon: '📝' },
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
      default: area.innerHTML = '<div class="text-center text-gray-400 py-16">功能开发中</div>';
    }
  }

  // Dashboard
  function renderDashboard(area) {
    area.innerHTML = '<div class="fade-in"><div class="grid grid-cols-3 gap-4 mb-6">' +
      '<div class="card stat-card"><div class="text-sm text-gray-500">产品总数</div><div class="text-2xl font-bold mt-1" id="stat-prod">-</div></div>' +
      '<div class="card stat-card"><div class="text-sm text-gray-500">产品系列</div><div class="text-2xl font-bold mt-1" id="stat-cat">-</div></div>' +
      '<div class="card stat-card"><div class="text-sm text-gray-500">媒体文件</div><div class="text-2xl font-bold mt-1" id="stat-media">-</div></div>' +
      '</div><div class="card"><div class="px-4 py-3 border-b font-medium text-sm">CMS 就绪</div>' +
      '<div class="px-4 py-8 text-center text-gray-400 text-sm">使用侧边栏管理产品系列、产品和媒体文件</div></div></div>';
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
      '<th>URL 别名</th><th>翻译键</th><th>排序</th><th>状态</th><th style="text-align:right">操作</th>' +
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
        tr.innerHTML = '<td class="text-sm" style="font-family:monospace">' + esc(cat.slug) + '</td>' +
          '<td class="text-gray-600">' + esc(cat.i18n_key || '—') + '</td>' +
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
      '<div class="grid grid-cols-2" id="prod-grid" style="gap:1rem"></div>' +
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
        card.innerHTML = '<div class="img-area">' +
          (p.primary_image ? '<img src="' + esc(p.primary_image) + '">' : '<div style="font-size:2.5rem;color:#d1d5db">📦</div>') +
          '</div><div class="p-3"><div class="font-medium text-sm">' + esc(p.model) + '</div>' +
          '<div class="text-xs text-gray-500 mt-1">' + esc(p.category_slug || '未分类') + '</div></div>';
        card.addEventListener('click', function() { CMS.openProductForm(p); });
        grid.appendChild(card);
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
            '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0f172a;font-size:2rem">🎬</div>') +
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
          navigator.clipboard.writeText(url).then(function() { toast('链接已复制'); });
        });
        card.querySelector('[data-preview]').addEventListener('click', function(e) {
          e.stopPropagation();
          var path = e.currentTarget.getAttribute('data-preview');
          showPreview(path, m.original_name, isImg, isVid);
        });
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
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">URL 别名 *</label>' +
      '<input id="cm-slug" required placeholder="如：large-wok" value="' + esc(cat ? cat.slug : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">翻译键</label>' +
      '<input id="cm-i18n" placeholder="如：nav_large_wok" value="' + esc(cat ? (cat.i18n_key || '') : '') + '"></div>' +
      '<div class="flex gap-3"><div class="flex-1"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">排序</label>' +
      '<input id="cm-sort" type="number" value="' + (cat ? cat.sort_order : 0) + '"></div>' +
      '<div class="flex-1"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">状态</label>' +
      '<select id="cm-active"><option value="true"' + (cat && cat.is_active ? ' selected' : '') + '>启用</option>' +
      '<option value="false"' + (cat && !cat.is_active ? ' selected' : '') + '>禁用</option></select></div></div></div>',
      function() {
        var body = {
          slug: document.getElementById('cm-slug').value,
          i18n_key: document.getElementById('cm-i18n').value,
          sort_order: parseInt(document.getElementById('cm-sort').value) || 0,
          is_active: document.getElementById('cm-active').value === 'true'
        };
        var promise;
        if (cat) promise = api('/categories/' + cat.id, { method: 'PUT', body: body });
        else promise = api('/categories', { method: 'POST', body: body });
        promise.then(function(d) { if (d) { toast('保存成功'); renderPage(); } });
      });
  };

  CMS.deleteCategory = function(cat) {
    if (!confirm('确定删除系列 ' + cat.slug + '？')) return;
    api('/categories/' + cat.id, { method: 'DELETE' }).then(function() { toast('已删除'); renderPage(); });
  };

  // Product modal
  CMS.openProductForm = function(p) {
    var html = '<div class="form-grid">' +
      '<div class="full"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">型号 *</label>' +
      '<input id="pm-model" required value="' + esc(p ? p.model : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">子类</label>' +
      '<input id="pm-sub" placeholder="如：P_ESL" value="' + esc(p ? (p.sub_category || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">产品系列</label>' +
      '<select id="pm-cat"><option value="">未分类</option>';
    categories.forEach(function(c) {
      html += '<option value="' + c.id + '"' + (p && p.category_id == c.id ? ' selected' : '') + '>' + esc(c.slug) + '</option>';
    });
    html += '</select></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">状态</label>' +
      '<select id="pm-status"><option' + (p && p.status !== '在售' ? '' : ' selected') + '>在售</option><option' + (p && p.status === '停产' ? ' selected' : '') + '>停产</option><option' + (p && p.status === '预售' ? ' selected' : '') + '>预售</option></select></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">Badge</label>' +
      '<input id="pm-badge" placeholder="如：热销" value="' + esc(p ? (p.badge || '') : '') + '"></div>' +
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
      '<input id="pm-color" value="' + esc(p ? (p.color || '') : '') + '"></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">排序</label>' +
      '<input id="pm-sort" type="number" value="' + (p ? p.sort_order : 0) + '"></div></div>';

    // Media section (images + videos)
    var hasMedia = p && p.images && p.images.length > 0;
    html += '<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb">' +
      '<div class="flex items-center justify-between mb-2"><label class="text-sm font-medium text-gray-700">产品图片与视频</label>' +
      '<div class="flex gap-2">' +
      '<label style="font-size:0.75rem;color:#4f46e5;cursor:pointer">+ 图片 <input type="file" accept="image/*" multiple style="display:none" id="pm-img-upload"></label>' +
      '<label style="font-size:0.75rem;color:#4f46e5;cursor:pointer">+ 视频 <input type="file" accept="video/mp4" style="display:none" id="pm-vid-upload"></label>' +
      '</div></div>' +
      '<div class="flex" style="flex-wrap:wrap;gap:0.5rem" id="pm-images"></div>' +
      '<div id="pm-no-media" class="text-sm text-gray-400" style="padding:1rem' + (hasMedia ? ';display:none' : '') + '">暂无图片或视频，点击上方按钮上传</div></div>';

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
        power: document.getElementById('pm-power').value,
        throughput: document.getElementById('pm-throughput').value,
        voltage: document.getElementById('pm-voltage').value,
        frequency: document.getElementById('pm-freq').value,
        material: document.getElementById('pm-material').value,
        product_dimensions: document.getElementById('pm-dims').value,
        color: document.getElementById('pm-color').value,
        sort_order: parseInt(document.getElementById('pm-sort').value) || 0
      };
      // Capture pending files BEFORE saving (modal still exists)
      var imgInput = document.getElementById('pm-img-upload');
      var vidInput = document.getElementById('pm-vid-upload');
      var pendingImages = imgInput ? Array.from(imgInput.files) : [];
      var pendingVideos = vidInput ? Array.from(vidInput.files) : [];

      var saveBtn = document.getElementById('product-modal-save');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }

      var promise;
      if (p) promise = api('/products/' + p.id, { method: 'PUT', body: body });
      else promise = api('/products', { method: 'POST', body: body });
      promise.then(function(d) {
        if (!d) { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; } return; }
        var productId = p ? p.id : (d.product ? d.product.id : null);
        // Close modal first
        document.getElementById('product-modal').remove();
        toast(productId ? '保存成功' : '保存成功（未获取产品ID）');
        renderPage();
        // Upload media after modal closed
        if (productId && (pendingImages.length || pendingVideos.length)) {
          toast('正在上传媒体...');
          var pendingFiles = [];
          if (pendingImages.length) pendingFiles.push({ files: pendingImages, type: 'image' });
          if (pendingVideos.length) pendingFiles.push({ files: pendingVideos, type: 'video' });
          uploadProductMediaFiles(productId, pendingFiles);
        }
      });
    }, function() {
      // onReady: render existing media + bind upload handlers for ALL products (new & existing)
      renderProductMedia(p);
      // Bind change handlers to show instant preview
      var imgInput = document.getElementById('pm-img-upload');
      var vidInput = document.getElementById('pm-vid-upload');
      if (imgInput) {
        imgInput.addEventListener('change', function(e) {
          Array.from(e.target.files).forEach(function(file) { addPendingPreview(file, 'image'); });
          e.target.value = '';
        });
      }
      if (vidInput) {
        vidInput.addEventListener('change', function(e) {
          Array.from(e.target.files).forEach(function(file) { addPendingPreview(file, 'video'); });
          e.target.value = '';
        });
      }
    });
  };

  // Show instant preview for files selected in new product form
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
      wrap.innerHTML = '<div style="width:100%;height:100%;background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.25rem"><span style="font-size:1.25rem">🎬</span><span style="color:#fff;font-size:0.5rem">' + esc(file.name) + '</span></div>';
    }
    wrap.innerHTML += '<div style="position:absolute;top:0.25rem;left:0.25rem;background:#6366f1;color:#fff;font-size:0.5rem;padding:1px 4px;border-radius:0.25rem">待上传</div>';
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
      if (isVid) {
        wrap.innerHTML = '<div style="width:100%;height:100%;background:#0f172a;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>';
      } else {
        wrap.innerHTML = '<img src="' + esc(img.file_path) + '" style="width:100%;height:100%;object-fit:cover">';
      }
      // Primary badge
      if (img.is_primary) {
        wrap.innerHTML += '<div style="position:absolute;top:0;left:0;background:#4f46e5;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:0 0 0.375rem 0">主图</div>';
      }
      // Action buttons (bottom-right)
      wrap.innerHTML += '<div style="position:absolute;bottom:0;right:0;display:flex;gap:0;opacity:0;transition:opacity 0.15s" class="media-actions">';
      if (!img.is_primary) {
        wrap.innerHTML += '<button class="pm-img-action" data-action="setPrimary" data-imgid="' + img.id + '" title="设为主图" style="background:#4f46e5;color:#fff;border:none;width:1.25rem;height:1.25rem;font-size:0.625rem;cursor:pointer">★</button>';
      }
      wrap.innerHTML += '<button class="pm-img-action" data-action="delete" data-imgid="' + img.id + '" data-pid="' + p.id + '" title="删除" style="background:#ef4444;color:#fff;border:none;width:1.25rem;height:1.25rem;font-size:0.625rem;cursor:pointer">✕</button>';
      wrap.innerHTML += '</div>';
      // Hover show actions
      wrap.addEventListener('mouseenter', function() { var a = wrap.querySelector('.media-actions'); if (a) a.style.opacity = '1'; });
      wrap.addEventListener('mouseleave', function() { var a = wrap.querySelector('.media-actions'); if (a) a.style.opacity = '0'; });
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

  function uploadProductMediaFiles(productId, pendingFiles) {
    pendingFiles.forEach(function(pf) {
      var fd = new FormData();
      pf.files.forEach(function(f) { fd.append('files', f); });
      fetch('/api/cms/products/' + productId + '/images', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd
      })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d && d.images) toast((pf.type === 'video' ? '视频' : '图片') + '已上传');
          else toast('上传失败', true);
          renderPage();
        })
        .catch(function() { toast('上传失败', true); });
    });
  }

  CMS.loadProducts = loadProducts;

  // Publish
  window.publishProducts = function() {
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

  // Initial render
  renderPage();
})();
