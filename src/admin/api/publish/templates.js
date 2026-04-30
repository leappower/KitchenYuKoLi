'use strict';

// HTML template generators for SSG (static site generation).
// Used by ssg.js to render news detail pages and index pages
// for PC, tablet, and mobile viewports.

// ── Markdown → HTML ──────────────────────────────────────────
function mdToHtml(md) {
  if (!md) return '';
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^!\[(.+?)\]\((.+?)\)$/gm, '<img src="$2" alt="$1" class="w-full rounded-lg my-4">')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

// ── Detail page templates (based on existing detail-*.html) ──
function detailPcHtml(post) {
  const bodyHtml = mdToHtml(post.content_markdown);
  const escTitle = (post.title || '').replace(/"/g, '&quot;');
  const escExcerpt = (post.excerpt || '').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/news/${post.slug}/" />
<meta name="description" content="${escExcerpt || escTitle}">
<meta property="og:type" content="article">
<meta property="og:title" content="YuKoLi 智能厨具 | ${escTitle}">
<meta property="og:description" content="${escExcerpt || escTitle}">
<meta property="og:url" content="https://www.kitchen.yukoli.com/news/${post.slug}/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | ${escTitle}</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<style>
  body { font-family: 'Public Sans', sans-serif; }
  .article-body p { margin-bottom: 1.25em; line-height: 1.8; }
  .article-body h2 { margin-top: 2em; margin-bottom: 0.75em; }
</style>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${escTitle}",
  "description": "${escExcerpt || escTitle}",
  "datePublished": "${post.published_at || ''}",
  "publisher": {
    "@type": "Organization",
    "name": "YuKoLi 跃迁力科技",
    "url": "https://www.kitchen.yukoli.com"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "YuKoLi 智能厨具",
    "url": "https://www.kitchen.yukoli.com"
  }
}
</script>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<div class="relative flex h-auto min-h-screen w-full flex-col">

<!-- Top Navigation Bar -->
<navigator data-component="navigator"
  data-variant="pc"
  data-active="news"
  data-cta-text-key="nav_get_quote"
  data-cta-href="/quote"></navigator>

<main id="spa-content" class="flex-1">

<!-- Article Section -->
<section class="py-16 md:py-24">
<div class="px-6 md:px-10 lg:px-16 xl:px-20 max-w-4xl mx-auto">

  <!-- Breadcrumb / Back -->
  <a href="/news/" class="inline-flex items-center gap-1 text-primary font-semibold text-sm mb-8 hover:gap-2 transition-all">
    <span class="material-symbols-outlined text-base">arrow_back</span>
    <span>返回新闻列表</span>
  </a>

  <!-- Article Header -->
  <header class="mb-10">
    <div class="flex items-center gap-3 mb-4">
      <span class="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
        ${post.category === 'case' ? '客户案例' : '新闻资讯'}
      </span>
      <time class="text-sm text-slate-500 dark:text-slate-400 font-medium">
        发布于 ${(post.published_at || '').slice(0, 10)}
      </time>
    </div>
    <h1 class="text-4xl md:text-5xl font-black leading-tight tracking-tight">${post.title}</h1>
  </header>

  <!-- Article Body -->
  <article class="article-body text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
  ${bodyHtml}
  </article>

  <!-- Share & Actions -->
  <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
    <a href="/news/" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      返回新闻列表
    </a>
    <button class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <span class="material-symbols-outlined text-base">share</span>
      分享
    </button>
  </div>

</div>
</section>

</main>

</div>

    <script src="/assets/js/ui/dropdown-styles.js"></script>
<script defer src="/assets/js/ui/products-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/nav-config.js?v=20260415"></script>
    <script defer src="/assets/js/ui/navigator.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/search-engine.js"></script>
<script defer src="/assets/js/ui/footer.js?v=20260322-v3"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/translations-dropdown-template.js"></script>
<script defer src="/assets/js/contacts.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.translationManager) window.translationManager.initialize();
  });
</script>

<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
      window.SpaRouter.init();
    }
  });
</script>
</body>
</html>`;
}

function detailTabletHtml(post) {
  const bodyHtml = mdToHtml(post.content_markdown);
  const escTitle = (post.title || '').replace(/"/g, '&quot;');
  const escExcerpt = (post.excerpt || '').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/news/${post.slug}/" />
<meta name="description" content="${escExcerpt || escTitle}">
<meta property="og:type" content="article">
<meta property="og:title" content="YuKoLi 智能厨具 | ${escTitle}">
<meta property="og:description" content="${escExcerpt || escTitle}">
<meta property="og:url" content="https://www.kitchen.yukoli.com/news/${post.slug}/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | ${escTitle}</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<style>
  .article-body p { margin-bottom: 1.25em; line-height: 1.8; }
</style>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<div class="relative flex min-h-screen flex-col">

<!-- Navigator -->
<navigator data-component="navigator"
  data-variant="tablet"
  data-search="true"
  data-active="news"
  data-cta-text-key="nav_get_quote"
  data-cta-href="/quote"></navigator>

<!-- Main Content -->
<main id="spa-content" class="flex-1 max-w-4xl mx-auto w-full px-6 py-8 pb-24">

  <!-- Back -->
  <a href="/news/" class="inline-flex items-center gap-1 text-primary font-semibold text-sm mb-6 hover:gap-2 transition-all">
    <span class="material-symbols-outlined text-base">arrow_back</span>
    返回新闻列表
  </a>

  <!-- Article Header -->
  <header class="mb-8">
    <div class="flex items-center gap-3 mb-4">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
        ${post.category === 'case' ? '客户案例' : '新闻资讯'}
      </span>
      <time class="text-sm text-slate-500 dark:text-slate-400 font-medium">
        发布于 ${(post.published_at || '').slice(0, 10)}
      </time>
    </div>
    <h1 class="text-3xl md:text-4xl font-black leading-tight">${post.title}</h1>
  </header>

  <!-- Article Body -->
  <article class="article-body text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
  ${bodyHtml}
  </article>

  <!-- Share & Actions -->
  <div class="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
    <a href="/news/" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      返回新闻列表
    </a>
    <button class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <span class="material-symbols-outlined text-base">share</span>
      分享
    </button>
  </div>

</main>

<footer data-component="footer"
  data-variant="tablet"
  data-active="news">
</footer>

<script defer src="/assets/js/nav-config.js?v=20260415"></script>
    <script defer src="/assets/js/ui/navigator.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/footer.js?v=20260322-v3"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/translations-dropdown-template.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.translationManager) window.translationManager.initialize();
  });
</script>

<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
      window.SpaRouter.init();
    }
  });
</script>
</body>
</html>`;
}

function detailMobileHtml(post) {
  const bodyHtml = mdToHtml(post.content_markdown);
  const escTitle = (post.title || '').replace(/"/g, '&quot;');
  const escExcerpt = (post.excerpt || '').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/news/${post.slug}/" />
<meta name="description" content="${escExcerpt || escTitle}">
<meta property="og:type" content="article">
<meta property="og:title" content="YuKoLi 智能厨具 | ${escTitle}">
<meta property="og:description" content="${escExcerpt || escTitle}">
<meta property="og:url" content="https://www.kitchen.yukoli.com/news/${post.slug}/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | ${escTitle}</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<style>
  body { min-height: 100dvh; }
  .article-body p { margin-bottom: 1em; line-height: 1.75; }
</style>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<navigator data-component="navigator"
  data-variant="mobile"
  data-active="news">
</navigator>

<div class="relative flex min-h-screen flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-background-light dark:bg-background-dark pb-24">

<main id="spa-content" class="flex-1 px-5 py-6">

  <!-- Back -->
  <a href="/news/" class="inline-flex items-center gap-1 text-primary font-semibold text-sm mb-5">
    <span class="material-symbols-outlined text-base">arrow_back</span>
    返回新闻列表
  </a>

  <!-- Article Header -->
  <header class="mb-6">
    <div class="flex items-center gap-2 mb-3">
      <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
        ${post.category === 'case' ? '客户案例' : '新闻资讯'}
      </span>
      <time class="text-xs text-slate-500 dark:text-slate-400 font-medium">
        发布于 ${(post.published_at || '').slice(0, 10)}
      </time>
    </div>
    <h1 class="text-2xl font-black leading-tight">${post.title}</h1>
  </header>

  <!-- Article Body -->
  <article class="article-body text-base text-slate-700 dark:text-slate-300">
  ${bodyHtml}
  </article>

  <!-- Actions -->
  <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
    <a href="/news/" class="inline-flex items-center gap-1.5 text-primary font-semibold text-sm">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      返回新闻列表
    </a>
    <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium">
      <span class="material-symbols-outlined text-sm">share</span>
      分享
    </button>
  </div>

</main>

<footer data-component="footer"
  data-variant="mobile"
  data-active="news">
</footer>

<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/translations-dropdown-template.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.translationManager) window.translationManager.initialize();
  });
</script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
      window.SpaRouter.init();
    }
  });
</script>
</body>
</html>`;
}

// ── Index page templates (replace hardcoded articles with dynamic rendering) ──
function indexPcHtml() {
  const ts = Date.now();
  return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/news/" />
<meta name="description" content="YuKoLi 新闻资讯 — 了解商用厨房自动化最新动态、智能厨具行业趋势与东南亚市场资讯。">
<meta property="og:type" content="website">
<meta property="og:title" content="YuKoLi 智能厨具 | 新闻资讯">
<meta property="og:description" content="YuKoLi 新闻资讯 — 商用厨房自动化最新动态、智能厨具行业趋势与东南亚市场资讯。">
<meta property="og:url" content="https://www.kitchen.yukoli.com/news/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | 新闻资讯</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<style>
  body { font-family: 'Public Sans', sans-serif; }
</style>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "YuKoLi 智能厨具 | 新闻资讯",
  "description": "YuKoLi 新闻资讯 — 了解商用厨房自动化最新动态、智能厨具行业趋势。",
  "url": "https://www.kitchen.yukoli.com/news/",
  "isPartOf": {
    "@type": "WebSite",
    "name": "YuKoLi 智能厨具",
    "url": "https://www.kitchen.yukoli.com"
  }
}
</script>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<div class="relative flex h-auto min-h-screen w-full flex-col">

<!-- Top Navigation Bar -->
<navigator data-component="navigator"
  data-variant="pc"
  data-active="news"
  data-cta-text-key="nav_get_quote"
  data-cta-href="/quote"></navigator>

<main id="spa-content">

<!-- Hero Section -->
<section class="min-h-[60vh] flex items-center py-16 md:py-24">
<div class="px-6 md:px-10 lg:px-16 xl:px-20 max-w-5xl w-full">
  <div class="flex flex-col gap-4 items-center text-center">
    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
      <span class="material-symbols-outlined text-xs leading-none">newspaper</span>
      新闻资讯
    </span>
    <h1 class="text-6xl xl:text-8xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white">新闻资讯</h1>
    <p class="text-lg xl:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">了解商用厨房自动化最新动态</p>
  </div>
</div>
</section>

<!-- News List Section -->
<section class="pb-24">
<div class="px-6 md:px-10 lg:px-16 xl:px-20 max-w-5xl">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    <div id="news-grid">
      <!-- Dynamically rendered by post-list.js -->
    </div>
  </div>
</div>
</section>

</main>

</div>

    <script src="/assets/js/ui/dropdown-styles.js"></script>
<script defer src="/assets/js/ui/products-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/nav-config.js?v=20260415"></script>
    <script defer src="/assets/js/ui/navigator.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/search-engine.js"></script>
<script defer src="/assets/js/ui/footer.js?v=20260322-v3"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/translations-dropdown-template.js"></script>
<script defer src="/assets/js/contacts.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.translationManager) window.translationManager.initialize();
  });
</script>

<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
      window.SpaRouter.init();
    }
  });
</script>
<script defer src="/assets/js/post-list.js?v=${ts}"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var grid = document.getElementById('news-grid');
  if (!grid || !window.POST_LIST) return;
  var parent = grid.parentElement;
  grid.remove();
  window.POST_LIST.forEach(function(post) {
    var article = document.createElement('article');
    article.className = 'group md:col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-shadow';
    article.innerHTML =
      (post.cover_image ? '<div class="aspect-video overflow-hidden"><img loading="lazy" alt="' + (post.title||'').replace(/"/g,'&quot;') + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="' + post.cover_image + '"></div>' : '') +
      '<div class="p-6">' +
      '<div class="flex items-center gap-2 mb-2">' +
      '<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">' + (post.category === 'case' ? '客户案例' : '新闻资讯') + '</span>' +
      '<time class="text-xs text-slate-500">' + (post.published_at || '').slice(0, 10) + '</time></div>' +
      '<h3 class="text-lg font-bold mb-2 text-slate-900 dark:text-white line-clamp-2">' + (post.title||'') + '</h3>' +
      (post.excerpt ? '<p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">' + post.excerpt + '</p>' : '') +
      '<a href="/news/' + post.slug + '/" class="inline-flex items-center gap-1 mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">阅读更多 <span class="material-symbols-outlined" style="font-size:1rem">arrow_forward</span></a>' +
      '</div>';
    parent.appendChild(article);
  });
});
</script>
</body>
</html>`;
}

function indexTabletHtml() {
  const ts = Date.now();
  return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/news/" />
<meta name="description" content="YuKoLi 新闻资讯 — 了解商用厨房自动化最新动态、智能厨具行业趋势与东南亚市场资讯。">
<meta property="og:type" content="website">
<meta property="og:title" content="YuKoLi 智能厨具 | 新闻资讯">
<meta property="og:description" content="YuKoLi 新闻资讯 — 商用厨房自动化最新动态、智能厨具行业趋势与东南亚市场资讯。">
<meta property="og:url" content="https://www.kitchen.yukoli.com/news/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | 新闻资讯</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<div class="relative flex min-h-screen flex-col">

<!-- ═══ Max Display Header (Tablet) ═══ -->
<navigator data-component="navigator"
  data-variant="tablet"
  data-search="true"
  data-active="news"
  data-cta-text-key="nav_get_quote"
  data-cta-href="/quote"></navigator>

<!-- ─── Main Content ─────────────────────────────────────────────────────── -->
<main id="spa-content" class="flex-1 max-w-4xl mx-auto w-full py-8 pb-24">

  <!-- Hero Section -->
  <div class="relative overflow-hidden rounded-2xl bg-slate-900 aspect-[21/9] flex items-end mb-8"
       style="background-image: linear-gradient(to top, rgba(34,22,16,0.9), rgba(34,22,16,0)); background-size: cover; background-position: center;">
    <div class="p-8 w-full">
      <span class="inline-block px-2 py-1 mb-3 rounded bg-primary text-white text-xs font-bold uppercase tracking-wider">新闻资讯</span>
      <h2 class="text-white text-4xl font-bold leading-tight">新闻资讯</h2>
      <p class="text-slate-300 text-base mt-2">了解商用厨房自动化最新动态</p>
    </div>
  </div>

  <!-- News List -->
  <div id="news-list" class="flex flex-col gap-6">
    <!-- Dynamically rendered by post-list.js -->
  </div>

</main>

<footer data-component="footer"
  data-variant="tablet"
  data-active="news">
</footer>

<script defer src="/assets/js/nav-config.js?v=20260415"></script>
    <script defer src="/assets/js/ui/navigator.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/footer.js?v=20260322-v3"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/translations-dropdown-template.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.translationManager) window.translationManager.initialize();
  });
</script>

<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
      window.SpaRouter.init();
    }
  });
</script>
<script defer src="/assets/js/post-list.js?v=${ts}"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var list = document.getElementById('news-list');
  if (!list || !window.POST_LIST) return;
  list.innerHTML = window.POST_LIST.map(function(post) {
    return '<article class="group rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-shadow">' +
      (post.cover_image ? '<div class="aspect-[21/9] overflow-hidden"><img loading="lazy" alt="' + (post.title||'').replace(/"/g,'&quot;') + '" class="w-full h-full object-cover" src="' + post.cover_image + '"></div>' : '') +
      '<div class="p-6 flex flex-col gap-3">' +
      '<time class="text-sm text-slate-500 dark:text-slate-400 font-medium">' + (post.published_at || '').slice(0, 10) + '</time>' +
      '<h3 class="text-lg font-bold leading-snug group-hover:text-primary transition-colors">' + (post.title||'') + '</h3>' +
      (post.excerpt ? '<p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">' + post.excerpt + '</p>' : '') +
      '<a href="/news/' + post.slug + '/" class="inline-flex items-center gap-1 text-primary font-semibold text-sm mt-2 hover:gap-2 transition-all">阅读更多 <span class="material-symbols-outlined text-base">arrow_forward</span></a>' +
      '</div></article>';
  }).join('');
});
</script>
</body>
</html>`;
}

function indexMobileHtml() {
  const ts = Date.now();
  return `<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/news/" />
<meta name="description" content="YuKoLi 新闻资讯 — 了解商用厨房自动化最新动态、智能厨具行业趋势与东南亚市场资讯。">
<meta property="og:type" content="website">
<meta property="og:title" content="YuKoLi 智能厨具 | 新闻资讯">
<meta property="og:description" content="YuKoLi 新闻资讯 — 商用厨房自动化最新动态、智能厨具行业趋势与东南亚市场资讯。">
<meta property="og:url" content="https://www.kitchen.yukoli.com/news/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | 新闻资讯</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<style>
  body {
    min-height: 100dvh;
  }
</style>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<navigator data-component="navigator"
  data-variant="mobile"
  data-active="news">
</navigator>

<div class="relative flex min-h-screen flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-background-light dark:bg-background-dark pb-24">

<main id="spa-content" class="flex-1 px-5 py-6">

  <!-- Hero Section -->
  <div class="mb-8">
    <h1 class="text-3xl font-black leading-tight">新闻资讯</h1>
    <p class="text-base text-slate-600 dark:text-slate-400 mt-2">了解商用厨房自动化最新动态</p>
  </div>

  <!-- News List -->
  <div id="news-list" class="flex flex-col gap-5">
    <!-- Dynamically rendered by post-list.js -->
  </div>

</main>

<footer data-component="footer"
  data-variant="mobile"
  data-active="news">
</footer>

<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
      window.SpaRouter.init();
    }
  });
</script>
<script defer src="/assets/js/post-list.js?v=${ts}"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var list = document.getElementById('news-list');
  if (!list || !window.POST_LIST) return;
  list.innerHTML = window.POST_LIST.map(function(post) {
    return '<article class="group rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">' +
      (post.cover_image ? '<div class="aspect-[16/9] overflow-hidden"><img loading="lazy" alt="' + (post.title||'').replace(/"/g,'&quot;') + '" class="w-full h-full object-cover" src="' + post.cover_image + '"></div>' : '') +
      '<div class="p-5 flex flex-col gap-2">' +
      '<time class="text-xs text-slate-500 dark:text-slate-400 font-medium">' + (post.published_at || '').slice(0, 10) + '</time>' +
      '<h3 class="text-base font-bold leading-snug">' + (post.title||'') + '</h3>' +
      (post.excerpt ? '<p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">' + post.excerpt + '</p>' : '') +
      '<a href="/news/' + post.slug + '/" class="inline-flex items-center gap-1 text-primary font-semibold text-sm mt-1">阅读更多 <span class="material-symbols-outlined text-base">arrow_forward</span></a>' +
      '</div></article>';
  }).join('');
});
</script>
</body>
</html>`;
}

module.exports = {
  mdToHtml,
  detailPcHtml,
  detailTabletHtml,
  detailMobileHtml,
  indexPcHtml,
  indexTabletHtml,
  indexMobileHtml
};
