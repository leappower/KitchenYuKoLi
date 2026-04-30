// cms-media.js — Media library page
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var formatBytes = CMS._deps.formatBytes;
  var showPreview = CMS._deps.showPreview;

  CMS.renderMedia = function(area) {
    var typeFilterHtml = '<div class="flex items-center gap-2 mb-2">' +
      '<span class="text-xs text-gray-400 mr-1">类型:</span>' +
      '<button class="btn-primary media-type-btn active" data-filter="all" style="font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:9999px">全部</button>' +
      '<button class="btn-ghost media-type-btn" data-filter="image" style="font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:9999px">🖼️ 图片</button>' +
      '<button class="btn-ghost media-type-btn" data-filter="video" style="font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:9999px">🎬 视频</button>' +
      '<button class="btn-ghost media-type-btn" data-filter="pdf" style="font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:9999px">📄 PDF</button>' +
      '</div>';

    var catFilterHtml = '<div class="flex items-center gap-2 mb-4 flex-wrap" id="category-filters">' +
      '<span class="text-xs text-gray-400 mr-1">分类:</span>' +
      '<button class="btn-primary media-cat-btn active" data-cat="all" style="font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:9999px">全部</button>' +
      '</div>';

    area.innerHTML = '<div class="fade-in"><div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-semibold">媒体库</h2>' +
      '<span class="text-sm text-gray-400" id="media-count"></span></div>' +
      typeFilterHtml + catFilterHtml +
      '<label class="btn-primary mb-3" style="cursor:pointer;display:inline-block">+ 上传文件' +
      '<input type="file" multiple accept="image/*,video/mp4,.pdf" style="display:none" id="media-upload"></label>' +
      '<div class="grid grid-cols-6 gap-3" id="media-grid"></div>' +
      '<div id="media-empty" class="py-16 text-center text-gray-400" style="display:none">暂无媒体文件</div></div>';

    var filterType = 'all';
    var filterCat = 'all';

    area.querySelectorAll('.media-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        area.querySelectorAll('.media-type-btn').forEach(function(b) { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); b.classList.remove('active'); });
        btn.classList.add('btn-primary'); btn.classList.remove('btn-ghost'); btn.classList.add('active');
        filterType = btn.getAttribute('data-filter');
        applyClientFilter();
      });
    });

    function applyClientFilter() {
      area.querySelectorAll('#media-grid .media-card').forEach(function(card) {
        var typeMatch = (filterType === 'all' || card.getAttribute('data-mtype') === filterType);
        var catMatch = (filterCat === 'all' || card.getAttribute('data-cat') === filterCat);
        card.style.display = (typeMatch && catMatch) ? '' : 'none';
      });
    }

    // Load categories
    api('/media/categories').then(function(d) {
      if (!d || !d.categories) return;
      var container = document.getElementById('category-filters');
      d.categories.forEach(function(cat) {
        var btn = document.createElement('button');
        btn.className = 'btn-ghost media-cat-btn';
        btn.setAttribute('data-cat', String(cat.id));
        btn.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.6rem;border-radius:9999px';
        btn.textContent = cat.name + ' (' + cat.media_count + ')';
        btn.addEventListener('click', function() {
          container.querySelectorAll('.media-cat-btn').forEach(function(b) { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); b.classList.remove('active'); });
          btn.classList.add('btn-primary'); btn.classList.remove('btn-ghost'); btn.classList.add('active');
          filterCat = btn.getAttribute('data-cat');
          applyClientFilter();
        });
        container.appendChild(btn);
      });
    });

    document.getElementById('media-upload').addEventListener('change', function(e) { uploadMedia(e); });
    loadMedia();
  };

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
        card.setAttribute('data-cat', String(m.category_slug || m.category_name || ''));
        // Use category_id from category_name for filtering — derive from the category data
        // We store category_name for display, but for filter matching we use a normalized key
        if (m.product_model) {
          card.setAttribute('data-cat', String(m.category_slug || m.category_name || '_none'));
        }

        var modelLabel = m.product_model ? '<div class="text-xs text-indigo-500 truncate" style="font-weight:500" title="' + esc(m.product_model) + '">' + esc(m.product_model) + '</div>' : '';

        card.innerHTML = '<div class="thumb" style="aspect-ratio:1;position:relative;cursor:pointer" data-preview="' + esc(m.file_path) + '">' +
          (isImg ? '<img src="' + esc(m.file_path) + '" style="width:100%;height:100%;object-fit:cover">' :
            '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9fafb;font-size:2rem">🎬</div>') +
          '<button class="del-btn" title="删除">✕</button>' +
          (isImg ? '<div class="media-badge">' + (m.file_size < 500000 ? '< 500KB' : formatBytes(m.file_size)) + '</div>' : '') +
          '</div><div style="padding:0.5rem">' +
          '<div class="text-xs truncate" style="max-width:100%;font-weight:500" title="' + esc(m.original_name) + '">' + esc(m.original_name) + '</div>' +
          modelLabel +
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
    fetch('/api/cms/media/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + CMS.token }, body: fd })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.media) { toast(d.media.length + ' 个文件已上传'); loadMedia(); }
        else toast('上传失败', true);
      })
      .catch(function() { toast('上传失败', true); });
    e.target.value = '';
  }
})();
