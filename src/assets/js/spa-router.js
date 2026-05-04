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

(function (global) {
  "use strict";

  var SpaRouter = {
    // 路由定义（SEO 友好目录 URL）
    routes: {
      "/": "/home/index.html",
      "/home/": "/home/index.html",
      "/products/": "/products/index.html",
      "/products/cutting/": "/products/index.html",
      "/products/stirfry/": "/products/index.html",
      "/products/frying/": "/products/index.html",
      "/products/stewing/": "/products/index.html",
      "/products/steaming/": "/products/index.html",
      "/products/other/": "/products/index.html",
      "/applications/": "/applications/index.html",
      "/applications/chain-restaurant/": "/applications/chain-restaurant/index.html",
      "/applications/food-factory/": "/applications/food-factory/index.html",
      "/applications/central-kitchen/": "/applications/central-kitchen/index.html",
      "/applications/small-restaurant/": "/applications/small-restaurant/index.html",
      "/applications/canteen/": "/applications/canteen/index.html",
      "/applications/menu-lab/": "/applications/menu-lab/index.html",
      "/applications/trust/": "/applications/trust/index.html",
      "/cases/": "/cases/index.html",
      "/profit-calculator/": "/profit-calculator/index.html",
      "/products/compare/": "/products/compare/index.html",
      "/about/": "/about/index.html",
      "/news/detail/": "/news/detail-pc.html",
      "/roi/": "/profit-calculator/index.html",
      "/quote/": "/quote/index.html",
      "/contact/": "/contact/index.html",
      "/news/": "/news/index.html",
      "/support/": "/support/index.html",
      "/support/installation/": "/support/installation/index.html",
      "/support/warranty/": "/support/warranty/index.html",
      "/support/spare-parts/": "/support/spare-parts/index.html",
      "/support/training/": "/support/training/index.html",
      "/support/faq/": "/support/faq/index.html",
      "/thank-you/": "/thank-you/index.html",
      "/landing/": "/landing/index.html",
      "/applications/cases/": "/cases/index.html",
    },

    // Category slugs used for /products/<slug>/ routing
    // Known categories map to products list; everything else → PDP
    CATEGORY_SLUGS: ['cutting', 'stirfry', 'frying', 'stewing', 'steaming', 'other'],

    // 设备特定页面映射
    getDevicePage: function (basePath) {
      // Use DeviceUtils if available
      if (typeof DeviceUtils !== "undefined" && DeviceUtils && DeviceUtils.getDevicePagePath) {
        return DeviceUtils.getDevicePagePath(basePath);
      }
      // Fallback: inline device detection via viewport width
      var w = window.innerWidth;
      var suffix;
      if (w < 768) {
        suffix = "index-mobile.html";
      } else if (w < 1280) {
        suffix = "index-tablet.html";
      } else {
        suffix = "index-pc.html";
      }
      return basePath.replace("index.html", suffix);
    },

    // 当前路由
    currentRoute: null,

    // 组件挂载状态
    headerMounted: false,
    footerMounted: false,

    // 日志函数
    log: function () {},

    // 获取当前路径（规范化）
    getCurrentPath: function () {
      var path = window.location.pathname;

      // 处理设备特定文件路径，例如：
      // /products/index-tablet.html -> /products/
      // /products/index.html -> /products/
      if (path.endsWith(".html")) {
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash > 0) {
          path = path.substring(0, lastSlash + 1);
        }
      }

      if (!path.endsWith("/")) {
        path = path + "/";
      }
      return path;
    },

    // 导航到路由（添加历史记录）
    navigate: function (path) {
      var normalizedPath = path.startsWith("/") ? path : "/" + path;
      if (!normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath + "/";
      }

      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;

      // Same-page navigation (hash anchor on current page): just scroll, don't reload
      var currentPath = this.getCurrentPath();
      if (normalizedPath === currentPath || normalizedPath.replace(/\/$/, "") === currentPath.replace(/\/$/, "")) {
        // Same page — just scroll to anchor if pending
        if (this._pendingScroll) {
          var anchorId = this._pendingScroll;
          this._pendingScroll = null;
          var el = document.getElementById(anchorId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
        window.__spaNavigating = false;
        return;
      }

      history.pushState({ path: normalizedPath }, "", normalizedPath);

      this.loadRoute(normalizedPath);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function () {
        window.__spaNavigating = false;
      }, 500);
    },

    // 替换当前路由（不添加历史记录）
    replace: function (path) {
      var normalizedPath = path.startsWith("/") ? path : "/" + path;
      if (!normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath + "/";
      }

      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;

      history.replaceState({ path: normalizedPath }, "", normalizedPath);

      this.loadRoute(normalizedPath);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function () {
        window.__spaNavigating = false;
      }, 500);
    },

    // 提取主要内容（<main id="spa-content"> 内部内容）
    extractContent: function (html) {
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
      bodyContent = bodyContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
      bodyContent = bodyContent.replace(/<navigator[^>]*>[\s\S]*?<\/navigator>/gi, "");
      bodyContent = bodyContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

      // 移除所有 <script> 标签（SPA 导航不需要重新执行）
      bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, "");

      // 移除骨架屏容器（如果存在）
      bodyContent = bodyContent.replace(/<div[^>]*class="[^"]*skeleton-container[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

      return bodyContent.trim();
    },

    // 提取标题
    extractTitle: function (html) {
      var match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match ? match[1] : null;
    },

    // 提取 Meta Description
    extractDescription: function (html) {
      var match = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      return match ? match[1] : null;
    },

    // 提取 Meta Tags (用于更新)
    extractMetaTags: function (html) {
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
    updateMetaTags: function (tags) {
      if (tags.description) {
        var descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
          descMeta.setAttribute("content", tags.description);
        }
      }
      if (tags.ogTitle) {
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
          ogTitle.setAttribute("content", tags.ogTitle);
        }
      }
      if (tags.ogDescription) {
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
          ogDesc.setAttribute("content", tags.ogDescription);
        }
      }
      if (tags.ogUrl) {
        var ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
          ogUrl.setAttribute("content", tags.ogUrl);
        }
      }
    },

    // 显示骨架屏
    showSkeleton: function () {
      var container = document.getElementById("spa-content");
      if (!container) return;

      // 检查是否已存在骨架屏
      if (container.querySelector(".skeleton-container")) return;

      // 创建骨架屏
      var skeletonHTML = this.getSkeletonHTML();
      var tempDiv = document.createElement("div");
      tempDiv.innerHTML = skeletonHTML;
      var skeletonElement = tempDiv.firstChild;

      // 插入骨架屏（在现有内容之前）
      container.insertBefore(skeletonElement, container.firstChild);
    },

    // 隐藏骨架屏
    hideSkeleton: function () {
      var skeleton = document.querySelector(".skeleton-container");
      if (skeleton) {
        skeleton.remove();
      }
    },

    // 获取骨架屏 HTML
    getSkeletonHTML: function () {
      return (
        '<div class="skeleton-container">' +
        '<div class="skeleton-header">' +
        '<div class="skeleton-logo"></div>' +
        '<div class="skeleton-nav">' +
        '<div class="skeleton-nav-item"></div>' +
        '<div class="skeleton-nav-item"></div>' +
        '<div class="skeleton-nav-item"></div>' +
        '<div class="skeleton-nav-item"></div>' +
        '<div class="skeleton-nav-item"></div>' +
        "</div>" +
        "</div>" +
        '<div class="skeleton-hero">' +
        '<div class="skeleton-title"></div>' +
        '<div class="skeleton-subtitle"></div>' +
        '<div class="skeleton-cta"></div>' +
        "</div>" +
        '<div class="skeleton-content">' +
        '<div class="skeleton-card"></div>' +
        '<div class="skeleton-card"></div>' +
        '<div class="skeleton-card"></div>' +
        "</div>" +
        "</div>"
      );
    },

    // 挂载 Header（首次）
    // 注意：navigator.js 可能在 SpaRouter 之前加载并执行了 mount()，
    // 所以 `<navigator>` 占位符可能已经被替换成 `<header>` 了
    mountHeader: function (html) {
      if (this.headerMounted) return;

      // 检查是否已经有 <header> 元素存在（由 navigator.js 的 mount() 创建）
      var existingHeader = document.querySelector("header");
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
      var tempDiv = document.createElement("div");
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
    mountFooter: function (html) {
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
      var tempDiv = document.createElement("div");
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
    updateHeaderActiveNav: function (html) {
      // 直接从 HTML 提取 data-active 属性（使用更健壮的正则，支持多行）
      var headerMatch = html.match(/<navigator[\s\S]*?data-component="navigator"[\s\S]*?>/i);
      if (!headerMatch) return;

      var activeValue = headerMatch[0].match(/data-active="([^"]*)"/i);
      if (!activeValue) return;

      var activeNav = activeValue[1];
      if (!activeNav) return;

      // 使用 Navigator.updateActive() 更新
      if (window.Navigator && typeof window.Navigator.updateActive === "function") {
        window.Navigator.updateActive(activeNav);
      }
    },

    // 更新 Footer active 状态
    updateFooterActiveNav: function (html) {
      var footerMatch = html && html.match(/<footer[\s\S]*?data-component="footer"[\s\S]*?>/i);
      var activeNav = null;
      if (footerMatch) {
        var activeValue = footerMatch[0].match(/data-active="([^"]*)"/i);
        if (activeValue) activeNav = activeValue[1];
      }
      // Fallback: derive from current route path
      if (!activeNav) {
        var path = window.location.pathname.replace(/\/$/, "");
        var map = { "/home": "home", "/products": "products", "/support": "support", "/about": "about", "/contact": "contact", "/cases": "cases", "/profit-calculator": "profit-calculator" };
        var best = "";
        for (var key in map) {
          if (path.indexOf(key) === 0 && key.length > best.length) best = key;
        }
        activeNav = map[best] || "home";
      }
      if (window.Footer && typeof window.Footer.updateActive === "function") {
        window.Footer.updateActive(activeNav);
      }
    },

    // 加载路由
    loadRoute: function (routePath) {
      var _self = this;
      var pagePath = this.routes[routePath];

      // Dynamic route: /products/<segment>/ — category or PDP
      if (!pagePath && routePath.match(/^\/products\/[^/]+\/$/)) {
        var segment = routePath.replace(/^\/products\/|\/$/g, '');
        if (this.CATEGORY_SLUGS.indexOf(segment) >= 0) {
          pagePath = '/products/index.html';
        } else {
          pagePath = '/products/detail/index.html';
        }
      }

      if (!pagePath) {
        this.log("Unknown route:", routePath, "- redirecting to home");
        this.navigate("/home/");
        return;
      }

      // Use the device-specific HTML directly (index-pc/tablet/mobile.html)
      // instead of index.html (which is a redirect bounce)
      var devicePath = this.getDevicePage(pagePath);
      this.log("Loading:", devicePath);

      // 添加 BASE_PATH 前缀（如果存在）
      var basePath = (typeof window !== "undefined" && window.BASE_PATH) || "";
      if (basePath && devicePath.startsWith("/")) {
        devicePath = basePath + devicePath;
      }

      // 显示骨架屏
      this.showSkeleton();

      // 加载页面（不使用内存缓存，始终获取最新内容）
      fetch(devicePath)
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.text();
        })
        .then(function (html) {
          _self.renderContent(devicePath, html);
        })
        .catch(function (error) {
          _self.log("Failed to load:", devicePath, error);
          _self.hideSkeleton();
        });
    },

    // 渲染内容（无白屏）
    renderContent: function (pagePath, html) {
      var content = this.extractContent(html);
      var title = this.extractTitle(html);
      var metaTags = this.extractMetaTags(html);
      var container = document.getElementById("spa-content");
      var _self = this;

      if (!container) {
        this.log("Content container not found");
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
      container.style.opacity = "0";
      container.innerHTML = content;

      // 动态加载页面专属脚本（SPA 移除了 script 标签，需手动补充）
      _self.loadPageScripts(pagePath);

      // 隐藏骨架屏
      this.hideSkeleton();

      // 滚动到页面顶部
      if (this._pendingScroll) {
        // 有待滚动锚点，延迟等 DOM 渲染完成
        var anchorId = this._pendingScroll;
        this._pendingScroll = null;
        setTimeout(function () {
          var el = document.getElementById(anchorId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }

      // Fade in 新内容
      requestAnimationFrame(function () {
        container.style.transition = "opacity 0.6s ease-out";
        container.style.opacity = "1";
        // 动画结束后清除内联样式，避免影响后续过渡
        setTimeout(function () {
          container.style.transition = "";
          container.style.opacity = "";
        }, 240);
      });

      // 记录上一个路径（供 navigator 判断 ROI 来源菜单）
      if (!window._prevSpaPath) window._prevSpaPath = this.currentRoute || "/";
      else window._prevSpaPath = this.currentRoute || window._prevSpaPath;

      // 更新当前路由
      this.currentRoute = window.location.pathname;

      // 触发事件（翻译初始化等）
      document.dispatchEvent(new Event("spa:load"));

      this.log("Content rendered for:", pagePath);
    },

    // 处理 popstate（浏览器返回）
    onPopState: function (_event) {
      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;

      var path = this.getCurrentPath();
      this.log("Popstate to:", path);
      this.loadRoute(path);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function () {
        window.__spaNavigating = false;
      }, 500);
    },

    // 获取当前设备特定页面路径
    getCurrentDevicePagePath: function (routePath) {
      var pagePath = this.routes[routePath];
      if (!pagePath) return null;
      return this.getDevicePage(pagePath);
    },

    // 重新加载当前路由（设备类型变化时调用）
    reloadCurrentRoute: function () {
      var currentPath = this.getCurrentPath();
      if (this.routes[currentPath]) {
        this.log("Device changed, reloading route:", currentPath);
        this.loadRoute(currentPath);
      }
    },

    // 初始化路由器
    init: function () {
      var _self = this;

      this.log("Initializing...");

      // 监听 popstate
      window.addEventListener("popstate", function (event) {
        _self.onPopState(event);
      });

      // 监听设备类型变化
      if (window.DeviceUtils && typeof window.DeviceUtils.onDeviceChange === "function") {
        window.DeviceUtils.onDeviceChange(function (newDeviceType, oldDeviceType) {
          _self.log("Device type changed detected:", oldDeviceType, "->", newDeviceType);
          _self.reloadCurrentRoute();
        });
      }

      // 处理初始加载
      var currentPath = this.getCurrentPath();
      var initialHash = window.location.hash.replace("#", "");
      if (this.routes[currentPath]) {
        // 已在正确的路由上，不需要导航
        this.log("Already on route:", currentPath);
        if (initialHash) {
          this._pendingScroll = initialHash;
        }
        // 但需要初始化组件
        this.loadRoute(currentPath);
      } else if (currentPath === "/" || currentPath === "//") {
        this.replace("/home/");
      } else if (currentPath.match(/^\/products\/[^/]+\/$/)) {
        // Dynamic PDP/category route — load it directly
        this.log("Dynamic route on init:", currentPath);
        this.loadRoute(currentPath);
      } else {
        this.log("Unknown initial route:", currentPath, "- redirecting to home");
        this.navigate("/home/");
      }

      // 解析路径中的 hash 锚点（如 /support/#faq → path=/support/ hash=faq）
    function parseHashHref(href) {
      var match = href.match(/^(\/[^#]*?)#([^#]*)$/);
      return match ? { path: match[1], hash: match[2] } : null;
    }

    // 拦截链接点击 - 只拦截已知路由的链接
      document.addEventListener("click", function (event) {
        var link = event.target.closest("a");
        if (!link) return;

        var href = link.getAttribute("href");
        if (!href) return;
        if (href.startsWith("http")) return; // 外部链接
        if (href.startsWith("#")) return; // 纯 Hash 链接（当前页面滚动）
        if (href.startsWith("mailto:")) return;
        if (href.startsWith("tel:")) return;

        // 检查是否含 hash 锚点（/support/#faq）
        var hashInfo = parseHashHref(href);
        var targetPath, scrollAnchor = null;

        if (hashInfo) {
          targetPath = hashInfo.path;
          scrollAnchor = hashInfo.hash;
          if (!targetPath.endsWith("/")) targetPath += "/";
        } else {
          targetPath = href.startsWith("/") ? href : "/" + href;
          if (!targetPath.endsWith("/")) targetPath += "/";
        }

        // 处理 /pages/.../index*.html -> /<basename>
        var pagesMatch = targetPath.match(/^\/pages\/([^/]+)\/index(?:-[a-z0-9-]+)?\.html$/i);
        if (pagesMatch && pagesMatch[1]) {
          targetPath = "/" + pagesMatch[1] + "/";
        }

        // 只拦截已知路由的链接（含动态 /products/<slug>/ 路由），其他让浏览器默认处理
        var isKnown = !!_self.routes[targetPath];
        // Dynamic: /products/<slug>/ — category slug or PDP model
        if (!isKnown) {
          var dynMatch = targetPath.match(/^\/products\/([^/]+)\/$/);
          if (dynMatch) isKnown = true;
        }
        if (!isKnown) {
          _self.log("Skipping SPA for unknown route:", targetPath);
          return;
        }

        // 阻止默认行为，使用 SPA 导航
        event.preventDefault();
        // 移除焦点，避免按钮/链接残留 active 样式
        if (document.activeElement) document.activeElement.blur();

        if (scrollAnchor) {
          // 含锚点：导航到父页面后滚动到锚点
          _self.log("SPA navigation to:", targetPath, "scroll to #", scrollAnchor);
          _self._pendingScroll = scrollAnchor;
          _self.navigate(targetPath);
        } else {
          _self.log("SPA navigation to:", targetPath);
          _self.navigate(targetPath);
        }
      });

      this.log("Initialized successfully");
    },

    // 页面专属脚本映射（SPA 导航时按需加载）
    loadPageScripts: function(pagePath) {
      var scripts = [];
      var path = pagePath.replace(/\/index-(pc|mobile|tablet)\.html$/, "/");

      // Profit calculator needs Chart.js + pi-roi.js
      if (path.indexOf("/profit-calculator/") !== -1 || path.indexOf("/roi/") !== -1) {
        if (typeof global.Chart === "undefined") {
          scripts.push({ src: "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js", id: "spa-chart-js" });
        }
        scripts.push({ src: "/assets/js/ui/pi-roi.js", id: "spa-pi-roi" });
      }

      // Support 页面需要 contact-channels 组件 + 微信弹窗
      if (path.indexOf("/support/") !== -1) {
        scripts.push({ src: "/assets/js/support-contact-channels.js", id: "spa-support-contact-channels" });
        scripts.push({ src: "/assets/js/support-wechat-modal.js", id: "spa-support-wechat-modal" });
      }

      // Maps 页面需要 pi-maps.js
      if (path.indexOf("/support/installation/") !== -1) {
        scripts.push({ src: "/assets/js/ui/pi-maps.js", id: "spa-pi-maps" });
      }

      // Deploy 方案页面需要 deploy-roi.js
      if (/\/deploy-/.test(path)) {
        scripts.push({ src: "/assets/js/ui/deploy-roi.js", id: "spa-deploy-roi" });
      }

      // Cases 页面需要 cases-page.js（筛选、modal、CTA）
      if (path.indexOf("/cases/") !== -1 || path.indexOf("/applications/cases/") !== -1) {
        scripts.push({ src: "/assets/js/cases-page.js", id: "spa-cases-page" });
      }

      // Home 页面需要 home-core-products.js（动态渲染核心产品卡片）
      if (path.indexOf("/home") !== -1) {
        scripts.push({ src: "/assets/js/home-core-products.js", id: "spa-home-core-products" });
      }

      scripts.forEach(function(s) {
        if (document.getElementById(s.id)) return; // 已加载
        var el = document.createElement("script");
        el.id = s.id;
        el.src = s.src + (s.src.indexOf("?") === -1 ? "?v=" + Date.now() : "");
        el.onload = function() {
          // 触发 spa:load 让脚本有机会初始化
          document.dispatchEvent(new Event("spa:load"));
        };
        document.body.appendChild(el);
      });
    },
  };

  // 导出到全局
  global.SpaRouter = SpaRouter;
})(window);
