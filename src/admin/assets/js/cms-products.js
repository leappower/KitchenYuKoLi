// cms-products.js — Products page, product form, media helpers, related products
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;

  CMS.renderProducts = function(area) {
    area.innerHTML = '<div class="fade-in"><div class="flex items-center gap-3 mb-4" style="flex-wrap:wrap">' +
      '<input type="hidden" id="prod-cat-filter" value="">' +
      '<div id="prod-cat-btns" class="flex gap-2" style="flex-wrap:wrap"><button class="cat-filter-btn active" data-cat="" onclick="CMS.filterProducts(\'\',this)">全部</button></div>' +
      '<input id="prod-search" type="text" placeholder="搜索型号..." style="flex:1;min-width:150px">' +
      '<button class="btn-ghost" style="color:#059669" onclick="CMS.openExcelImport()">📥 导入 Excel</button>' +
      '<button class="btn-primary ml-auto" onclick="CMS.openProductForm()">+ 新增产品</button></div>' +
      '<div class="grid grid-cols-6" id="prod-grid" style="gap:0.75rem"></div>' +
      '<div id="prod-empty" class="py-16 text-center text-gray-400" style="display:none">暂无产品</div></div>';
    api('/categories').then(function(d) {
      if (!d || !d.categories) return;
      CMS.categories = d.categories;
      var container = document.getElementById('prod-cat-btns');
      CMS.categories.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cat-filter-btn';
        btn.dataset.cat = c.id;
        btn.textContent = c.slug;
        btn.onclick = function() { CMS.filterProducts(c.id, this); };
        container.appendChild(btn);
      });
    });
    CMS.loadProducts();
  };

  CMS.filterProducts = function(catId, btn) {
    var btns = document.querySelectorAll('.cat-filter-btn');
    btns.forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    document.getElementById('prod-cat-filter').value = catId || '';
    CMS.loadProducts();
  };

  CMS.loadProducts = function() {
    var params = new URLSearchParams();
    var catId = document.getElementById('prod-cat-filter').value;
    var search = document.getElementById('prod-search').value;
    if (catId) params.set('category_id', catId);
    if (search) params.set('search', search);

    api('/products?' + params.toString()).then(function(d) {
      if (!d || !d.products) return;
      CMS.products = d.products;
      var grid = document.getElementById('prod-grid');
      var empty = document.getElementById('prod-empty');
      grid.innerHTML = '';
      if (CMS.products.length === 0) { empty.style.display = ''; return; }
      empty.style.display = 'none';
      CMS.products.forEach(function(p) {
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
            if (d) { toast('产品已删除'); CMS.renderPage(); }
          });
        });
      });
    });
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
      '<div class="full"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">产品名称</label>' +
      '<input id="pm-name" placeholder="如：商用电磁翻转炒炉" value="' + esc(p ? (p.name || '') : '') + '"></div>' +
      '<div class="full"><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">产品配置</label>' +
      '<textarea id="pm-specs" rows="3" placeholder="如：功率:15kW 电压:380V 频率:50Hz 材质:304不锈钢" style="width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:0.375rem;font-size:0.85rem;resize:vertical">' + esc(p ? (p.specifications || '') : '') + '</textarea></div>' +
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">产品系列</label>' +
      '<select id="pm-cat"><option value="">未分类</option>';
    CMS.categories.forEach(function(c) {
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
      '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">控制方式</label>' +
      '<input id="pm-control" value="' + esc(p ? (p.control_method || '') : '') + '"></div>' +
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
      '<div id="pm-no-media" class="text-sm text-gray-400" style="padding:1rem' + (hasMedia ? ';display:none' : '') + '">暂无图片或视频</div></div>' +
      // Translations section
      '<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb"><div class="flex items-center justify-between mb-2"><label class="text-sm font-medium text-gray-700">🌐 多语言翻译</label>' +
      '<div class="flex gap-2">' +
      '<button type="button" id="pm-auto-translate" style="font-size:0.75rem;color:#fff;background:#7c3aed;border:none;padding:0.25rem 0.75rem;border-radius:0.375rem;cursor:pointer">🤖 AI 一键翻译</button>' +
      '</div></div>' +
      '<div id="pm-translations" style="display:flex;flex-direction:column;gap:0.75rem"><div class="text-sm text-gray-400" style="padding:0.5rem">保存产品后可编辑翻译</div></div></div>';

    showModal('product-modal', p ? '编辑产品' : '新增产品', html, function() {
      // Validate model name
      var model = document.getElementById('pm-model').value.trim();
      if (!model) { toast('请输入型号', true); return; }
      var body = {
        model: model,
        name: document.getElementById('pm-name').value.trim(),
        specifications: document.getElementById('pm-specs').value.trim(),
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
        control_method: document.getElementById('pm-control').value,
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
        CMS.renderPage();
        // Upload media after modal closed
        if (productId) {
          // Save translations before other async tasks
          CMS._saveProductTranslations(productId);
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
              CMS.renderPage();
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
      // Load translations if editing existing product
      if (p && p.id) {
        api('/products/' + p.id + '/translations').then(function(d) {
          if (d && d.translations && d.translations.length > 0) {
            CMS.renderTranslationFields(d.translations);
          }
        });
      }
      // Related products handlers
      var addRelBtn = document.getElementById('pm-add-related');
      if (addRelBtn) {
        addRelBtn.addEventListener('click', function() {
          CMS.showRelatedPicker(p);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CMS.token },
        body: JSON.stringify({ url: url })
      }).then(function(r) { return r.json(); }).then(function(d) {
        count++;
        if (count === urls.length) { CMS.renderPage(); if (callback) callback(); }
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
        method: 'POST', headers: { 'Authorization': 'Bearer ' + CMS.token }, body: fd
      })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d || !d.images) toast('上传失败', true);
          done++;
          if (done === total) { CMS.renderPage(); if (callback) callback(); }
        })
        .catch(function() { toast('上传失败', true); done++; if (done === total && callback) callback(); });
    });
  }

  // ─── Related Products ──────────────────────────────
  CMS.showRelatedPicker = function(currentProduct) {
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
  };

  function saveRelatedProducts(productId, items) {
    if (!productId) return;
    api('/products/' + productId + '/related', { method: 'PUT', body: items || [] }).catch(function() {});
  }
})();
