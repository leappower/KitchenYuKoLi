/* ─── Suppress third-party DOM errors (frame_start.js etc.) ─────────────
 * Must run early — before any deferred scripts fire their callbacks.
 * Uses capture-phase listener to catch async errors that window.onerror misses. */
(function () {
  window.onerror = function (msg) {
    if (msg && /removeChild.*not a child of/i.test(msg)) return true;
  };
  document.addEventListener(
    "error",
    function (e) {
      if (e.message && /removeChild.*not a child of/i.test(e.message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
})();

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
    //
    // Route resolution: convention over configuration.
    // No hardcoded route table — the server's file-system resolver is
    // the single source of truth.  The SPA router mirrors the same logic:
    //   /foo/          → fetch /foo/index-pc.html   (server resolves to dist/pages/foo/index-pc.html)
    //   /news/detail/  → fetch /news/detail/index-pc.html  (server resolves to dist/pages/news/detail/index-pc.html)
    //   /products/<model>/  → dynamic PDP (see loadRoute)
    //
    // SPA shell paths that use index.html (not index-pc.html) are
    // handled by the getDevicePage() conversion below.
    //
    // NOTE: Only exceptions need listing here — everything else follows convention.
    //
    routes: {
      // Aliases / redirects
      "/": "/home/index.html",
      "/home/": "/home/index.html",
      // Flat-file pattern (no directory, e.g. news/detail-pc.html)
      "/news/detail/": "/news/detail-pc.html",
      // Applications cases alias
      "/applications/cases/": "/cases/index.html",
    },

    // Category slugs used for /products/<slug>/ routing
    // Known categories map to products list; everything else → PDP
    CATEGORY_SLUGS: ["all", "cutting", "stirfry", "frying", "stewing", "steaming", "other"],

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
      // Handle both index.html and index-{device}.html patterns
      return basePath.replace(/index-(?:pc|tablet|mobile)?\.html$/, suffix);
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

      // Same-page navigation: don't increment navVersion or reload
      var currentPath = this.getCurrentPath();
      if (normalizedPath === currentPath || normalizedPath.replace(/\/$/, "") === currentPath.replace(/\/$/, "")) {
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

      // 取消上一次未完成的导航（防止竞态）
      this._navVersion = (this._navVersion || 0) + 1;
      var navVersion = this._navVersion;

      history.pushState({ path: normalizedPath }, "", normalizedPath);

      this.loadRoute(normalizedPath, navVersion);

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

      this._navVersion = (this._navVersion || 0) + 1;
      this.loadRoute(normalizedPath, this._navVersion);

      // 清除标志(延迟以确保导航完成)
      var _self = this;
      setTimeout(function () {
        window.__spaNavigating = false;
      }, 500);
    },

    // 提取主要内容（<main id="spa-content"> 内部内容）
    extractContent: function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var main = doc.getElementById("spa-content");
      return main ? main.innerHTML : null;
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
    // 显示骨架屏：overlay 可见，内容隐藏
    showSkeleton: function () {
      var overlay = document.getElementById("skeleton-overlay");
      var container = document.getElementById("spa-content");
      if (overlay) {
        overlay.removeAttribute("hidden");
      }
      if (container) {
        container.style.display = "none";
      }
      // Debug: if skeleton still visible after 3s, show visible warning
      clearTimeout(this._skeletonDebugTimer);
      if (window.__DEVELOPMENT__) {
        this._skeletonDebugTimer = setTimeout(function () {
          var ov = document.getElementById("skeleton-overlay");
          if (ov && !ov.hasAttribute("hidden")) {
            console.error("[SKELETON-BUG] Skeleton still visible after 3s!");
            var banner = document.createElement("div");
            banner.style.cssText =
              "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:red;color:white;padding:20px 30px;font-size:18px;font-weight:bold;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
            banner.textContent = "⚠️ SKELETON STUCK! hideSkeleton never called. Check console for [SKELETON-BUG].";
            document.body.appendChild(banner);
          }
        }, 3000);
      }
    },

    // 隐藏骨架屏：overlay 隐藏，内容恢复
    hideSkeleton: function () {
      clearTimeout(this._skeletonDebugTimer);
      var overlay = document.getElementById("skeleton-overlay");
      var container = document.getElementById("spa-content");
      if (overlay) {
        overlay.setAttribute("hidden", "");
      }
      if (container) {
        container.style.display = "";
      }
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
        // Footer placeholder exists, mount component into it
        if (window.Footer && window.Footer.mount) {
          window.Footer.mount();
        }
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
        var map = {
          "/home": "home",
          "/products": "products",
          "/support": "support",
          "/about": "about",
          "/contact": "contact",
          "/cases": "cases",
          "/profit-calculator": "profit-calculator",
        };
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
    loadRoute: function (routePath, navVersion) {
      var _self = this;
      var pagePath = this.routes[routePath];

      // Special page: /products/compare/
      if (!pagePath && routePath === "/products/compare/") {
        pagePath = "/products/compare/index-pc.html";
      }

      // Dynamic route: /products/<segment>/ — category or PDP
      if (!pagePath && routePath.match(/^\/products\/[^/]+\/$/)) {
        var segment = routePath.replace(/^\/products\/|\/$/g, "");
        if (this.CATEGORY_SLUGS.indexOf(segment) >= 0) {
          // Category page — convention: /products/<slug>/ → /products/<slug>/index-pc.html
          pagePath = "/products/" + segment + "/index-pc.html";
        } else {
          // PDP — convention: /products/<model>/ → /products/detail/index-pc.html
          pagePath = "/products/detail/index-pc.html";
        }
      }

      // Convention: any path not in routes[] → /<path>/index-pc.html
      // This mirrors server.js resolvePage() step 4.
      if (!pagePath) {
        var clean = routePath.replace(/\/+$/, "");
        pagePath = clean + "/index-pc.html";
      }

      // Never redirect — let the server return SPA shell if file doesn't exist.
      // The server always returns *something* (SPA shell as catch-all),
      // so we'll always get HTML back — worst case it's the SPA shell which
      // product-detail.js or other page scripts will handle.

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
          // 竞态保护：丢弃过期导航的结果
          if (navVersion && navVersion !== _self._navVersion) {
            _self.hideSkeleton(); // 安全恢复：防止 display:none 残留
            return;
          }
          _self.renderContent(devicePath, html);
        })
        .catch(function (error) {
          // 竞态保护：丢弃过期导航的错误
          if (navVersion && navVersion !== _self._navVersion) return;
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

      if (!content) {
        this.log("No content extracted from:", pagePath);
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

      // 隐藏骨架 → 替换内容 → fade in
      this.hideSkeleton();
      // Dispatch spa:beforeunload before replacing content
      container.dispatchEvent(new CustomEvent("spa:beforeunload", { bubbles: true }));
      container.style.opacity = "0";
      container.innerHTML = content;

      // 动态加载页面专属脚本（SPA 移除了 script 标签，需手动补充）
      var scriptsPromise = _self.loadPageScripts(pagePath);

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

      // Fade in 新内容（双 rAF 保险：单次 rAF 在 tab 后台/Chrome 节流时可能跳过）
      function doFadeIn() {
        container.style.transition = "opacity 0.6s ease-out";
        container.style.opacity = "1";
        setTimeout(function () {
          container.style.transition = "";
          container.style.opacity = "";
        }, 240);
      }
      requestAnimationFrame(function () {
        doFadeIn();
      });
      // 安全网：300ms 后若仍不可见，强制显示（防止 rAF 被节流/跳过）
      setTimeout(function () {
        if (container.style.opacity === "0") {
          _self.log("Forced opacity recovery in renderContent");
          doFadeIn();
        }
      }, 300);

      // 记录上一个路径（供 navigator 判断 ROI 来源菜单）
      if (!window._prevSpaPath) window._prevSpaPath = this.currentRoute || "/";
      else window._prevSpaPath = this.currentRoute || window._prevSpaPath;

      // 更新当前路由
      this.currentRoute = window.location.pathname;

      // 等待动态脚本加载完成后，再触发 spa:load（避免重复触发）
      var _self2 = this;
      Promise.resolve(scriptsPromise).then(function () {
        // Re-mount footer for SPA-loaded pages (only if not already mounted)
        if (window.Footer && window.Footer.mount && !_self2.footerMounted) {
          try {
            window.Footer.mount();
            _self2.footerMounted = true;
          } catch (e) {
            /* ignore */
          }
        }
        document.dispatchEvent(new Event("spa:load"));
        _self2.log("Content rendered for:", pagePath);
      });
    },

    // 处理 popstate（浏览器返回）
    onPopState: function (_event) {
      // 设置 SPA 导航标志,禁用响应式重定向
      window.__spaNavigating = true;

      var path = this.getCurrentPath();
      this.log("Popstate to:", path);
      this._navVersion = (this._navVersion || 0) + 1;
      this.loadRoute(path, this._navVersion);

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
        // Dynamic PDP/category route — only load if container is empty
        // (SGS pages already have content in DOM; SPA shell has empty container)
        var container = document.getElementById("spa-content");
        if (!container || !container.innerHTML.trim()) {
          this.log("Dynamic route on init (empty container):", currentPath);
          this.loadRoute(currentPath);
        } else {
          this.log("Dynamic route on init (content exists, skip loadRoute):", currentPath);
        }
      } else {
        // Standalone SSG page — content may already be in DOM (production),
        // or empty if served SPA shell (dev mode / hot reload).
        // Always check container and load if empty.
        var container = document.getElementById("spa-content");
        if (!container || !container.innerHTML.trim()) {
          this.log("Standalone page but container empty — loading:", currentPath);
          this.loadRoute(currentPath);
        } else {
          this.log("Standalone page (content exists, skip load):", currentPath);
        }
      }

      // 解析路径中的 hash 锚点（如 /support/#faq → path=/support/ hash=faq）
      function parseHashHref(href) {
        var match = href.match(/^(\/[^#]*?)#([^#]*)$/);
        return match ? { path: match[1], hash: match[2] } : null;
      }

      // 拦截链接点击 - 只拦截已知路由的链接
      // Use capture phase to run BEFORE page-effects.js bubble handler
      document.addEventListener(
        "click",
        function (event) {
          var link = event.target.closest("a");
          if (!link) return;
          if (event.defaultPrevented) return;

          var href = link.getAttribute("href");
          if (!href) return;
          if (href.startsWith("http")) return; // 外部链接
          if (href.startsWith("#")) return; // 纯 Hash 链接（当前页面滚动）
          if (href.startsWith("mailto:")) return;
          if (href.startsWith("tel:")) return;

          // 检查是否含 hash 锚点（/support/#faq）
          var hashInfo = parseHashHref(href);
          var targetPath,
            scrollAnchor = null;

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

          // Intercept all internal links — loadRoute handles unknown paths via
          // convention (/<path>/index-pc.html). Only skip non-page paths.
          var isPage = targetPath.match(/^\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*\/$/i);
          if (!isPage) {
            _self.log("Skipping SPA for non-page path:", targetPath);
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
        },
        true
      );

      this.log("Initialized successfully");

      // 监控全页面导航
      window.addEventListener("beforeunload", function (e) {});
    },

    // 页面专属脚本映射（SPA 导航时按需加载）
    loadPageScripts: function (pagePath) {
      var scripts = [];
      var path = pagePath.replace(/\/index-(pc|mobile|tablet)\.html$/, "/");

      // Profit calculator needs Chart.js + html2canvas + jsPDF
      if (path.indexOf("/profit-calculator/") !== -1) {
        if (typeof window.Chart === "undefined") {
          scripts.push({ src: "/assets/js/vendor/chart.umd.min.js", id: "spa-chart-js" });
        }
        if (typeof window.html2canvas === "undefined") {
          scripts.push({ src: "/assets/js/vendor/html2canvas.min.js", id: "spa-html2canvas" });
        }
        if (typeof window.jspdf === "undefined" && typeof window.jsPDF === "undefined") {
          scripts.push({ src: "/assets/js/vendor/jspdf.umd.min.js", id: "spa-jspdf" });
        }
        scripts.push({ src: "/assets/js/profit-calculator.js", id: "spa-profit-calculator" });
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

      if (/\/deploy-/.test(path)) {
      }

      // Cases 页面需要 cases-page.js（筛选、modal、CTA）
      if (path.indexOf("/cases/") !== -1 || path.indexOf("/applications/cases/") !== -1) {
        scripts.push({ src: "/assets/js/cases-page.js", id: "spa-cases-page" });
      }

      // Quote / profit-calculator / support / landing 需要 custom-select.js
      if (
        path.indexOf("/quote/") !== -1 ||
        path.indexOf("/profit-calculator/") !== -1 ||
        path.indexOf("/support/") !== -1 ||
        path.indexOf("/landing/") !== -1
      ) {
        if (!window.CustomSelect) {
          scripts.push({ src: "/assets/js/ui/dropdown-styles.js", id: "spa-dropdown-styles" });
          scripts.push({ src: "/assets/js/ui/custom-select.js", id: "spa-custom-select" });
        }
      }

      // Quote 页面需要表单逻辑 + 预算 i18n 脚本
      if (path.indexOf("/quote/") !== -1) {
        scripts.push({ src: "/assets/js/quote-form.js", id: "spa-quote-form" });
        scripts.push({ src: "/assets/js/quote-budget-i18n.js?v=20260507", id: "spa-quote-budget-i18n" });
      }

      // News detail 页面需要 news-detail.js
      if (path.indexOf("/news/detail") !== -1) {
        scripts.push({ src: "/assets/js/news-detail.js", id: "spa-news-detail" });
      }

      // Home 页面需要 home-core-products.js（动态渲染核心产品卡片）
      if (path.indexOf("/home") !== -1) {
        scripts.push({ src: "/assets/js/home-core-products.js", id: "spa-home-core-products" });
      }

      // 产品列表页需要 product-grid.js（含 /products/all/ 和 6 个分类子页）
      if (path.match(/\/products\/(all|cutting|stirfry|frying|stewing|steaming|other)\//)) {
        scripts.push({ src: "/assets/js/product-grid.js", id: "spa-product-grid" });
      }

      // Compare 页面需要 compare.js
      if (path.indexOf("/products/compare/") !== -1) {
        scripts.push({ src: "/assets/js/compare.js", id: "spa-compare" });
      }

      // 产品分类页需要 cross-sell.js（搭配推荐 + 适用场景，/products/all/ 只显示适用场景）
      if (path.match(/\/products\/(all|cutting|stirfry|frying|stewing|steaming|other)\//)) {
        scripts.push({ src: "/assets/js/cross-sell.js", id: "spa-cross-sell" });
      }

      // 产品详情页需要 product-detail.js
      if (path.indexOf("/products/detail/") !== -1) {
        scripts.push({ src: "/assets/js/product-detail.js", id: "spa-product-detail" });
      }

      // Cases 页面需要 case-grid.js
      if (path.indexOf("/cases/") !== -1 && !path.match(/\/applications\/cases\//)) {
        scripts.push({ src: "/assets/js/case-grid.js", id: "spa-case-grid" });
      }

      // Load scripts: vendor scripts in parallel, dependent scripts after
      // Identify vendor (non-dependent) vs dependent scripts
      var vendorScripts = [];
      var dependentScripts = [];
      scripts.forEach(function (s) {
        // Scripts that don't depend on other dynamically loaded scripts
        var isVendor =
          /^\/assets\/js\/vendor\//.test(s.src) ||
          s.id === "spa-dropdown-styles" ||
          s.id === "spa-custom-select" ||
          s.id === "spa-support-contact-channels" ||
          s.id === "spa-support-wechat-modal" ||
          s.id === "spa-pi-maps" ||
          s.id === "spa-quote-budget-i18n" ||
          s.id === "spa-cases-page" ||
          s.id === "spa-case-grid" ||
          s.id === "spa-news-detail" ||
          s.id === "spa-home-core-products";
        if (isVendor) {
          if (!document.getElementById(s.id)) vendorScripts.push(s);
        } else {
          if (!document.getElementById(s.id)) dependentScripts.push(s);
        }
      });

      function loadScript(s) {
        return new Promise(function (resolve) {
          var el = document.createElement("script");
          el.id = s.id;
          el.src = s.src;
          el.onload = function () {
            resolve();
          };
          el.onerror = function () {
            console.warn("[SPA] Failed to load script:", s.src);
            resolve(); // continue chain even on error
          };
          document.body.appendChild(el);
        });
      }

      // Load vendor scripts in parallel, then dependent scripts sequentially
      var vendorPromise = vendorScripts.length > 0 ? Promise.all(vendorScripts.map(loadScript)) : Promise.resolve();

      var chain = vendorPromise.then(function () {
        var depChain = Promise.resolve();
        dependentScripts.forEach(function (s) {
          depChain = depChain.then(function () {
            return loadScript(s);
          });
        });
        return depChain;
      });
      return chain;
    },
  };

  // 导出到全局
  window.SpaRouter = SpaRouter;

  // 自动初始化：只要页面加载了 spa-router.js，SPA 就立即可用
  // 不再需要每个页面手动调用 SpaRouter.init()
  // 在 DOMContentLoaded 后自动注册 click handler
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      try {
        SpaRouter.init();
      } catch (e) {
        /* init 内部会 log */
      }
    });
  } else {
    // DOM 已就绪（script 在 body 末尾或 defer 加载时可能发生）
    try {
      SpaRouter.init();
    } catch (e) {
      /* init 内部会 log */
    }
  }
})(window);
