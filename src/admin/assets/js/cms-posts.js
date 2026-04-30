// cms-posts.js — Posts management page
(function() {
  'use strict';
  var CMS = window.CMS;
  var api = CMS._deps.api;
  var esc = CMS._deps.esc;
  var toast = CMS._deps.toast;
  var showModal = CMS._deps.showModal;
  var slugify = CMS._deps.slugify;

  var postsState = { category: 'all', active: 'all', search: '', page: 1, limit: 20, total: 0 };

  CMS.renderPostsPage = function(area) {
    area.innerHTML = '<div class="fade-in">' +
      '<div class="flex items-center gap-3 mb-4" style="flex-wrap:wrap">' +
      '<select id="posts-cat-filter" style="width:auto">' +
        '<option value="all">全部分类</option><option value="news">新闻</option><option value="case">案例</option></select>' +
      '<select id="posts-active-filter" style="width:auto">' +
        '<option value="all">全部状态</option><option value="1">已发布</option><option value="0">草稿</option></select>' +
      '<input id="posts-search" type="text" placeholder="搜索标题..." style="flex:1;min-width:150px">' +
      '<button class="btn-primary ml-auto" onclick="CMS.openPostForm()">+ 新建文章</button></div>' +
      '<div class="card" style="overflow:hidden"><table><thead style="background:#f9fafb"><tr>' +
          '<th>标题</th>' +
          '<th style="width:140px">Slug</th>' +
          '<th style="width:80px">分类</th>' +
          '<th style="width:80px">状态</th>' +
          '<th style="width:110px">发布时间</th>' +
          '<th style="width:180px;text-align:right">操作</th>' +
        '</tr></thead><tbody id="posts-tbody"></tbody></table></div>' +
      '<div id="posts-pagination" class="flex items-center justify-center gap-2 mt-4"></div>' +
      '<div id="posts-empty" class="py-16 text-center text-gray-400" style="display:none">暂无文章</div></div>';

    document.getElementById('posts-cat-filter').addEventListener('change', function() { postsState.category = this.value; postsState.page = 1; loadPosts(); });
    document.getElementById('posts-active-filter').addEventListener('change', function() { postsState.active = this.value; postsState.page = 1; loadPosts(); });
    document.getElementById('posts-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') { postsState.search = this.value; postsState.page = 1; loadPosts(); } });
    loadPosts();
  };

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
        var statusBadge = p.is_active
          ? '<span class="badge badge-green">已发布</span>'
          : '<span class="badge badge-gray">草稿</span>';
        var catLabel = p.category === 'case' ? '案例' : (p.category === 'news' ? '新闻' : esc(p.category));
        var pubDate = p.published_at ? new Date(p.published_at).toLocaleDateString('zh-CN') : '—';
        tr.innerHTML =
          '<td><div class="font-medium text-sm" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.title) + '</div>' +
            (p.cover_image ? '<div style="margin-top:0.25rem"><img src="' + esc(p.cover_image) + '" style="width:32px;height:22px;object-fit:cover;border-radius:0.25rem;vertical-align:middle"></div>' : '') +
          '</td>' +
          '<td class="text-sm text-gray-500" style="font-family:monospace;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.slug) + '</td>' +
          '<td>' + catLabel + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td class="text-sm text-gray-500">' + pubDate + '</td>' +
          '<td style="text-align:right">' +
            '<button class="btn-ghost" style="font-size:0.78rem;padding:0.2rem 0.5rem" onclick="CMS.openPostForm(' + p.id + ')">编辑</button> ' +
            '<button class="btn-ghost" style="font-size:0.78rem;padding:0.2rem 0.5rem;color:' + (p.is_active ? '#fbbf24' : '#16a34a') + '" onclick="CMS.togglePostPublish(' + p.id + ',' + (p.is_active ? 0 : 1) + ')">' + (p.is_active ? '取消发布' : '发布') + '</button> ' +
            '<button class="btn-ghost" style="font-size:0.78rem;padding:0.2rem 0.5rem;color:#ef4444" onclick="CMS.deletePost(' + p.id + ')">删除</button>' +
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
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">标题</label>' +
            '<input id="pf-title" type="text" value="' + esc(data.title) + '" placeholder="文章标题"></div>' +
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">Slug</label>' +
            '<input id="pf-slug" type="text" value="' + esc(data.slug) + '" style="font-family:monospace" placeholder="auto-generated"></div>' +
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">分类</label>' +
            '<select id="pf-category">' +
              '<option value="news"' + (data.category === 'news' ? ' selected' : '') + '>新闻</option>' +
              '<option value="case"' + (data.category === 'case' ? ' selected' : '') + '>案例</option></select></div>' +
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">摘要</label>' +
            '<textarea id="pf-excerpt" style="min-height:60px;resize:vertical" placeholder="简短描述...">' + esc(data.excerpt) + '</textarea></div>' +
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">内容 (Markdown)</label>' +
            '<textarea id="pf-content" style="min-height:300px;resize:vertical;font-family:monospace" placeholder="Markdown 内容...">' + esc(data.content_markdown) + '</textarea></div>' +
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">封面图 URL</label>' +
            '<input id="pf-cover" type="text" value="' + esc(data.cover_image) + '" placeholder="https://..."></div>' +
          '<div><label class="text-sm font-medium text-gray-700" style="display:block;margin-bottom:0.25rem">排序权重</label>' +
            '<input id="pf-sort" type="number" value="' + (data.sort_order || 0) + '" style="width:120px"></div>' +
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

  CMS.openPostForm = openPostForm;
  CMS.togglePostPublish = togglePostPublish;
  CMS.deletePost = deletePost;
  CMS.postsGoPage = postsGoPage;
})();
