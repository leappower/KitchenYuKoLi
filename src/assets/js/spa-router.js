/**
 * spa-router.js - 混合 SPA + SSG 路由器
 *
 * 核心特性：
 * - SSG 提供 SEO 优化的静态 HTML
 * - SPA 提供流畅的页面切换体验
 * - Navigator/Footer 持久化（只加载一次）
 * - 内容智能缓存
 * - 骨架屏加载（无白屏）
 * - 完整的浏览器历史记录支持
 *
 * 架构：SSG 基础 + SPA 增强体验
 */

(function(global) {
  'use strict';

  var SpaRouter = {
    // 路由定义（SEO 友好目录 URL）
    routes: {
      '/':               '/home/index.html',
      '/home/':          '/home/index.html',
      '/products/':       '/products/index.html',
      '/applications/':   '/applications/index.html',
      '/solutions/':      '/solutions/index.html',
      '/cases/':         '/cases/index.html',
      '/case-download/': '/case-download/index.html',
      '/esg/':          '/esg/index.html',
      '/roi/':          '/roi/index.html',
      '/quote/':        '/quote/index.html',
      '/contact/':      '/quote/index.html',
      '/support/':      '/support/index.html',
      '/thank-you/':    '/thank-you/index.html',
      '/landing/':      '/landing/index.html'
    },

    // 设备特定页面映射
    getDevicePage: function(basePath) {
      // 使用 DeviceUtils 统一管理设备判断（安全检测）
      if (typeof DeviceUtils !== 'undefined' && DeviceUtils && DeviceUtils.getDevicePagePath) {
        return DeviceUtils.getDevicePagePath(basePath);
      }
      // 降级处理
      return basePath;
    },

    // 当前路由
    currentRoute: null,
    
    // 组件挂载状态
    headerMounted: false,
    footerMounted: false,
    
    // 日志函数
    log: function() {
      console.log('[SpaRouter]', Array.prototype.slice.call(arguments).join(' '));
    },

    // 获取当前路径（规范化）
    getCurrentPath: function() {
      var path = window.location.pathname;
      
      // 处理设备特定文件路径，例如：
      // /products/index-tablet.html -> /products/
      // /products/index.html -> /products/
      if (path.endsWith('.html')) {
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash > 0) {
          path = path.substring(0, lastSlash + 1);
        }
      }
      
      if (!path.endsWith('/')) {
        path = path + '/';
      }
      return path;
    },

    // 导航到路由（添加历史记录）
    navigate: function(path) {
      var normalizedPath = path.startsWith('/') ? path : '/' + path;
      if (!normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath + '/';
      }

      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;
      console.log('[SpaRouter] SPA flag set: window.__spaNavigating =', window.__spaNavigating);

      history.pushState({ path: normalizedPath }, '', normalizedPath);
      console.log('[SpaRouter] PushState called with:', normalizedPath);
      console.log('[SpaRouter] Current URL after pushState:', window.location.href);

      this.loadRoute(normalizedPath);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function() {
        window.__spaNavigating = false;
        console.log('[SpaRouter] SPA flag cleared: window.__spaNavigating =', window.__spaNavigating);
      }, 500);
    },

    // 替换当前路由（不添加历史记录）
    replace: function(path) {
      var normalizedPath = path.startsWith('/') ? path : '/' + path;
      if (!normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath + '/';
      }

      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;
      console.log('[SpaRouter] SPA flag set (replace): window.__spaNavigating =', window.__spaNavigating);

      history.replaceState({ path: normalizedPath }, '', normalizedPath);
      console.log('[SpaRouter] ReplaceState called with:', normalizedPath);

      this.loadRoute(normalizedPath);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function() {
        window.__spaNavigating = false;
        console.log('[SpaRouter] SPA flag cleared (replace): window.__spaNavigating =', window.__spaNavigating);
      }, 500);
    },

    // 提取主要内容（<main id="spa-content"> 内部内容）
    extractContent: function(html) {
      // 优先提取 <main id="spa-content"> 内部内容
      var mainMatch = html.match(/<main[^>]*id="spa-content"[^>]*>([\s\S]*)<\/main>/i);
      if (mainMatch) {
        return mainMatch[1].trim();
      }

      // 回退：提取 <body> 内容，移除 Header/Footer/Navigator
      var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (!bodyMatch) return null;

      var bodyContent = bodyMatch[1];
      
      // 移除 Header/Footer/Navigator（因为已经持久化）
      bodyContent = bodyContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
      bodyContent = bodyContent.replace(/<navigator[^>]*>[\s\S]*?<\/navigator>/gi, '');
      bodyContent = bodyContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
      
      // 移除所有 <script> 标签（SPA 导航不需要重新执行）
      bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');
      
      // 移除骨架屏容器（如果存在）
      bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*skeleton-container[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      
      return bodyContent.trim();
    },

    // 提取标题
    extractTitle: function(html) {
      var match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match ? match[1] : null;
    },

    // 提取 Meta Description
    extractDescription: function(html) {
      var match = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      return match ? match[1] : null;
    },

    // 提取 Meta Tags (用于更新)
    extractMetaTags: function(html) {
      var tags = {};
      var descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      if (descriptionMatch) {
        tags.description = descriptionMatch[1];
      }
      var ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
      if (ogTitleMatch) {
        tags.ogTitle = ogTitleMatch[1];
      }
      var ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
      if (ogDescMatch) {
        tags.ogDescription = ogDescMatch[1];
      }
      var ogUrlMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i);
      if (ogUrlMatch) {
        tags.ogUrl = ogUrlMatch[1];
      }
      return tags;
    },

    // 更新 Meta Tags
    updateMetaTags: function(tags) {
      if (tags.description) {
        var descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute('content', tags.description);
        }
      }
      if (tags.ogTitle) {
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
          ogTitle.setAttribute('content', tags.ogTitle);
        }
      }
      if (tags.ogDescription) {
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
          ogDesc.setAttribute('content', tags.ogDescription);
        }
      }
      if (tags.ogUrl) {
        var ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
          ogUrl.setAttribute('content', tags.ogUrl);
        }
      }
    },

    // 显示骨架屏
    showSkeleton: function() {
      var container = document.getElementById('spa-content');
      if (!container) return;

      // 检查是否已存在骨架屏
      if (container.querySelector('.skeleton-container')) return;

      // 创建骨架屏
      var skeletonHTML = this.getSkeletonHTML();
      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = skeletonHTML;
      var skeletonElement = tempDiv.firstChild;
      
      // 插入骨架屏（在现有内容之前）
      container.insertBefore(skeletonElement, container.firstChild);
    },

    // 隐藏骨架屏
    hideSkeleton: function() {
      var skeleton = document.querySelector('.skeleton-container');
      if (skeleton) {
        skeleton.remove();
      }
    },

    // 获取骨架屏 HTML
    getSkeletonHTML: function() {
      return '<div class="skeleton-container">' +
        '<div class="skeleton-header">' +
          '<div class="skeleton-logo"></div>' +
          '<div class="skeleton-nav">' +
            '<div class="skeleton-nav-item"></div>' +
            '<div class="skeleton-nav-item"></div>' +
            '<div class="skeleton-nav-item"></div>' +
            '<div class="skeleton-nav-item"></div>' +
            '<div class="skeleton-nav-item"></div>' +
          '</div>' +
        '</div>' +
        '<div class="skeleton-hero">' +
          '<div class="skeleton-title"></div>' +
          '<div class="skeleton-subtitle"></div>' +
          '<div class="skeleton-cta"></div>' +
        '</div>' +
        '<div class="skeleton-content">' +
          '<div class="skeleton-card"></div>' +
          '<div class="skeleton-card"></div>' +
          '<div class="skeleton-card"></div>' +
        '</div>' +
      '</div>';
    },

    // 挂载 Header（首次）
    // 注意：navigator.js 可能在 SpaRouter 之前加载并执行了 mount()，
    // 所以 `<navigator>` 占位符可能已经被替换成 `<header>` 了
    mountHeader: function(html) {
      if (this.headerMounted) return;

      // 检查是否已经有 <header> 元素存在（由 navigator.js 的 mount() 创建）
      var existingHeader = document.querySelector('header');
      if (existingHeader) {
        this.headerMounted = true;
        // Header already mounted (e.g. by navigator.js), update active state
        this.updateHeaderActiveNav(html);
        return;
      }

      // 如果没有 header，找 navigator 占位符并替换
      var headerContainer = document.querySelector('navigator[data-component="navigator"]');
      if (!headerContainer) return;

      // 使用更健壮的正则表达式，支持多行标签
      var headerMatch = html.match(/<navigator[\s\S]*?<\/navigator>/i);
      if (!headerMatch) return;

      // 直接用 outerHTML 替换容器,保留所有属性
      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = headerMatch[0];
      var newHeader = tempDiv.firstChild;
      headerContainer.parentNode.replaceChild(newHeader, headerContainer);

      // 挂载组件
      if (window.Navigator && window.Navigator.mount) {
        window.Navigator.mount();
      }

      this.headerMounted = true;
    },

    // 挂载 Footer（首次）
    mountFooter: function(html) {
      if (this.footerMounted) return;

      // 检查是否已经有 footer 元素存在（由 footer.js 的 mount() 创建）
      var existingFooter = document.querySelector('footer[data-component="footer"]');
      if (existingFooter) {
        this.footerMounted = true;
        this.updateFooterActiveNav(html);
        return;
      }

      // 如果没有 footer，找 footer 占位符
      var footerContainer = document.querySelector('footer[data-component="footer"]');
      if (!footerContainer) return;

      // 使用更健壮的正则表达式，支持多行标签
      var footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
      if (!footerMatch) return;

      // 直接用 outerHTML 替换容器,保留所有属性
      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = footerMatch[0];
      var newFooter = tempDiv.firstChild;
      footerContainer.parentNode.replaceChild(newFooter, footerContainer);

      // 挂载组件
      if (window.Footer && window.Footer.mount) {
        window.Footer.mount();
      }

      this.footerMounted = true;
    },

    // 更新 Header active 状态
    updateHeaderActiveNav: function(html) {
      // 直接从 HTML 提取 data-active 属性（使用更健壮的正则，支持多行）
      var headerMatch = html.match(/<navigator[\s\S]*?data-component="navigator"[\s\S]*?>/i);
      if (!headerMatch) return;

      var activeValue = headerMatch[0].match(/data-active="([^"]*)"/i);
      if (!activeValue) return;

      var activeNav = activeValue[1];
      if (!activeNav) return;

      // 使用 Navigator.updateActive() 更新
      if (window.Navigator && typeof window.Navigator.updateActive === 'function') {
        window.Navigator.updateActive(activeNav);
      }
    },

    // 更新 Footer active 状态
    updateFooterActiveNav: function(html) {
      // 直接从 HTML 提取 data-active 属性（使用更健壮的正则，支持多行）
      var footerMatch = html.match(/<footer[\s\S]*?data-component="footer"[\s\S]*?>/i);
      if (!footerMatch) return;

      var activeValue = footerMatch[0].match(/data-active="([^"]*)"/i);
      if (!activeValue) return;

      var activeNav = activeValue[1];
      if (!activeNav) return;

      // 使用 Footer.updateActive() 更新
      if (window.Footer && typeof window.Footer.updateActive === 'function') {
        window.Footer.updateActive(activeNav);
      }
    },

    // 加载路由
    loadRoute: function(routePath) {
      var _self = this;
      var pagePath = this.routes[routePath];
      
      if (!pagePath) {
        this.log('Unknown route:', routePath, '- redirecting to home');
        this.navigate('/home/');
        return;
      }

      // 获取设备特定页面
      pagePath = this.getDevicePage(pagePath);
      this.log('Loading:', pagePath);

      // 显示骨架屏
      this.showSkeleton();

      // 加载页面（不使用内存缓存，始终获取最新内容）
      fetch(pagePath)
        .then(function(response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.text();
        })
        .then(function(html) {
          self.renderContent(pagePath, html);
        })
        .catch(function(error) {
          self.log('Failed to load:', error);
          self.hideSkeleton();
        });
    },

    // 渲染内容（无白屏）
    renderContent: function(pagePath, html) {
      var content = this.extractContent(html);
      var title = this.extractTitle(html);
      var metaTags = this.extractMetaTags(html);
      var container = document.getElementById('spa-content');
      var _self = this;

      if (!container) {
        this.log('Content container not found');
        this.hideSkeleton();
        return;
      }

      // 更新标题
      if (title) {
        document.title = title;
      }

      // 更新 Meta Tags
      if (metaTags) {
        this.updateMetaTags(metaTags);
      }

      // 首次挂载 Header/Footer
      if (!this.headerMounted) {
        this.mountHeader(html);
      } else {
        // 只更新 active 状态
        this.updateHeaderActiveNav(html);
      }

      if (!this.footerMounted) {
        this.mountFooter(html);
      } else {
        // 只更新 active 状态
        this.updateFooterActiveNav(html);
      }

      // 替换内容并触发 fade-in 动画
      container.style.opacity = '0';
      container.innerHTML = content;

      // 隐藏骨架屏
      this.hideSkeleton();

      // 滚动到页面顶部
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      // Fade in 新内容
      requestAnimationFrame(function() {
        container.style.transition = 'opacity 0.6s ease-out';
        container.style.opacity = '1';
        // 动画结束后清除内联样式，避免影响后续过渡
        setTimeout(function() {
          container.style.transition = '';
          container.style.opacity = '';
        }, 240);
      });

      // 更新当前路由
      this.currentRoute = window.location.pathname;

      // 触发事件（翻译初始化等）
      document.dispatchEvent(new Event('spa:load'));

      this.log('Content rendered for:', pagePath);
    },

    // 处理 popstate（浏览器返回）
    onPopState: function(_event) {
      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;
      console.log('[SpaRouter] SPA flag set (popstate): window.__spaNavigating =', window.__spaNavigating);

      var path = this.getCurrentPath();
      this.log('Popstate to:', path);
      this.loadRoute(path);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function() {
        window.__spaNavigating = false;
        console.log('[SpaRouter] SPA flag cleared (popstate): window.__spaNavigating =', window.__spaNavigating);
      }, 500);
    },

    // 获取当前设备特定页面路径
    getCurrentDevicePagePath: function(routePath) {
      var pagePath = this.routes[routePath];
      if (!pagePath) return null;
      return this.getDevicePage(pagePath);
    },
    
    // 重新加载当前路由（设备类型变化时调用）
    reloadCurrentRoute: function() {
      var currentPath = this.getCurrentPath();
      if (this.routes[currentPath]) {
        this.log('Device changed, reloading route:', currentPath);
        this.loadRoute(currentPath);
      }
    },

    // 初始化路由器
    init: function() {
      var _self = this;

      this.log('Initializing...');

      // 监听 popstate
      window.addEventListener('popstate', function(event) {
        self.onPopState(event);
      });

      // 监听设备类型变化
      if (window.DeviceUtils && typeof window.DeviceUtils.onDeviceChange === 'function') {
        window.DeviceUtils.onDeviceChange(function(newDeviceType, oldDeviceType) {
          self.log('Device type changed detected:', oldDeviceType, '->', newDeviceType);
          self.reloadCurrentRoute();
        });
      }

      // 处理初始加载
      var currentPath = this.getCurrentPath();
      if (this.routes[currentPath]) {
        // 已在正确的路由上，不需要导航
        this.log('Already on route:', currentPath);
        // 但需要初始化组件
        this.loadRoute(currentPath);
      } else if (currentPath === '/' || currentPath === '//') {
        this.replace('/home/');
      } else {
        this.log('Unknown initial route:', currentPath, '- redirecting to home');
        this.navigate('/home/');
      }

      // 拦截链接点击 - 只拦截已知路由的链接
      document.addEventListener('click', function(event) {
        var link = event.target.closest('a');
        if (!link) return;

        var href = link.getAttribute('href');
        if (!href) return;
        if (href.startsWith('http')) return;  // 外部链接
        if (href.startsWith('#')) return;     // Hash 链接
        if (href.startsWith('mailto:')) return;
        if (href.startsWith('tel:')) return;

        // 规范化路径
        var targetPath = href.startsWith('/') ? href : '/' + href;
        if (!targetPath.endsWith('/')) {
          targetPath = targetPath + '/';
        }

        // 处理 /pages/.../index*.html -> /<basename>
        var pagesMatch = targetPath.match(/^\/pages\/([^/]+)\/index(?:-[a-z0-9-]+)?\.html$/i);
        if (pagesMatch && pagesMatch[1]) {
          targetPath = '/' + pagesMatch[1] + '/';
        }

        // 只拦截已知路由的链接,其他链接让浏览器默认处理
        if (!self.routes[targetPath]) {
          self.log('Skipping SPA for unknown route:', targetPath);
          return;
        }

        // 阻止默认行为，使用 SPA 导航
        event.preventDefault();

        self.log('SPA navigation to:', targetPath);
        self.navigate(targetPath);
      });

      this.log('Initialized successfully');
    }
  };

  // 导出到全局
  global.SpaRouter = SpaRouter;

})(window);
