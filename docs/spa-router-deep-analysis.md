# SPA Router 导航问题深入分析

## 问题描述
Navigator 页面跳转无法实现 SPA 功能:
- 整个页面重新绘制
- 页面抖动
- 刷新体验差

## 架构分析

### 1. 当前的混合架构
```
SSG 静态页面 + SPA 增强体验
```

**组件**:
- `navigator.js` - 动态生成顶部导航
- `footer.js` - 动态生成底部导航(Mobile/Tablet)
- `spa-router.js` - 拦截链接点击,实现 SPA 导航

### 2. 页面加载流程

#### 正常流程(SG):
1. 用户访问 `/home/`
2. 服务器返回 `home/index.html`
3. 响应式重定向脚本运行 → 跳转到 `home/index-mobile.html`
4. 浏览器重新加载页面
5. 新页面加载完成
6. Navigator/Footer 挂载
7. spa-router.js 初始化

#### SPA 导航流程(当前设计):
1. 用户点击 Navigator 中的 `/catalog/` 链接
2. spa-router.js 的 click 监听器拦截
3. `event.preventDefault()` 阻止默认导航
4. 调用 `navigate('/catalog/')`
5. `history.pushState()` 更新 URL
6. `loadRoute('/catalog/')` 被调用
7. Fetch `/catalog/index-mobile.html`
8. 提取内容,替换 `<main id="spa-content">`

### 3. 问题根源分析

#### 问题 1: 响应式重定向与 SPA 冲突 ⚠️

**响应式重定向脚本**(在每个 HTML 页面中):
```javascript
(function(){
  var w = screen.width;
  if (w < 768) {
    location.href = 'index-mobile.html';
  } else if (w < 1280) {
    location.href = 'index-tablet.html';
  } else {
    location.href = 'index-pc.html';
  }
}());
```

**冲突场景**:
1. 用户在 `/home/index-mobile.html`
2. 点击 Navigator 中的 `/catalog/` 链接
3. spa-router 拦截,调用 `navigate('/catalog/')`
4. `history.pushState()` 更新 URL 为 `/catalog/`
5. **但是**,用户刷新页面或直接访问 `/catalog/`
6. 响应式重定向脚本运行,跳转到 `/catalog/index-mobile.html`
7. **SPA 状态丢失**,回到传统的页面加载

#### 问题 2: 全局链接拦截的副作用 ⚠️

**spa-router.js 的拦截逻辑**:
```javascript
document.addEventListener('click', function(event) {
  var link = event.target.closest('a');
  if (!link) return;

  var href = link.getAttribute('href');
  if (!href) return;
  if (href.startsWith('http')) return;  // 外部链接
  if (href.startsWith('#')) return;     // Hash 链接
  if (href.startsWith('mailto:')) return;
  if (href.startsWith('tel:')) return;

  // 阻止默认行为，使用 SPA 导航
  event.preventDefault();

  // ... 导航逻辑
});
```

**问题**:
- 这是**全局监听器**,拦截所有链接
- 没有检查链接是否在已知的路由中
- 没有检查链接是否是 SPA Router 支持的页面
- 可能错误拦截不应该 SPA 化的链接

#### 问题 3: 脚本加载顺序和初始化时机 ⚠️

**HTML 中的脚本顺序**:
```html
<!-- 组件脚本 (defer) -->
<script defer src="/assets/js/ui/navigator.js"></script>
<script defer src="/assets/js/ui/footer.js"></script>
<script defer src="/assets/js/ui/floating-actions.js"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/contacts.js"></script>
<script defer src="/assets/js/router.js"></script>
<script defer src="/assets/js/page-interactions.js"></script>

<!-- SPA Router (立即执行) -->
<script src="/assets/js/spa-router.js"></script>
```

**问题**:
- `spa-router.js` 使用普通 `<script>` 标签,立即执行
- 其他组件使用 `defer`,在 `DOMContentLoaded` 后执行
- spa-router 的初始化可能在 DOM 准备好之前执行
- 链接拦截监听器可能在组件生成之前就添加了

#### 问题 4: Navigator/Footer 持久化逻辑的问题 ⚠️

**spa-router.js 中的持久化逻辑**:
```javascript
mountHeader: function(html) {
  if (this.headerMounted) return;  // 已挂载,跳过
  // ... 挂载逻辑
  this.headerMounted = true;
},
```

**问题**:
- 这是**首次挂载**的逻辑
- 但是 Navigator 和 Footer 已经通过 `navigator.js` 和 `footer.js` 挂载了
- `spa-router.js` 的持久化逻辑可能与组件自己的初始化冲突

#### 问题 5: 页面内容替换的完整性 ⚠️

**spa-router.js 的内容替换逻辑**:
```javascript
renderContent: function(pagePath, html) {
  var content = this.extractContent(html);

  var container = document.getElementById('spa-content');
  if (!container) {
    console.error('[SpaRouter] Container not found!');
    return;
  }

  // 直接替换内容（无 fade）
  container.innerHTML = content;

  // 隐藏骨架屏
  this.hideSkeleton();
}
```

**问题**:
- `innerHTML` 直接替换,没有过渡动画
- 没有保留现有的事件监听器
- 没有重新初始化组件
- 可能导致页面抖动

## 设计问题 vs 代码问题

### 代码问题 ✅
1. **响应式重定向脚本与 SPA 冲突** - 需要禁用或修改
2. **全局链接拦截太宽泛** - 需要更精确的拦截策略
3. **脚本加载顺序问题** - spa-router 应该使用 `defer`
4. **内容替换缺乏过渡** - 需要添加 fade 动画
5. **组件重新初始化缺失** - 需要在内容替换后重新初始化

### 设计问题 ⚠️
1. **混合架构的复杂性** - SSG + SPA 增加了复杂度
2. **响应式重定向的必要性** - 在 SPA 架构下可能不需要
3. **Navigator/Footer 的挂载责任不清** - 组件自己挂载 vs spa-router 持久化

## 推荐的解决方案

### 方案 1: 纯 SPA 架构(推荐) ⭐

**核心思想**:
- 移除响应式重定向脚本
- 使用 JavaScript 动态加载设备特定内容
- URL 保持简洁(`/catalog/`,不是 `/catalog/index-mobile.html`)

**实现**:
1. 修改 `spa-router.js`,根据设备宽度加载对应的 HTML 文件
2. 移除所有 HTML 页面中的响应式重定向脚本
3. URL 始终是目录形式(`/catalog/`)
4. 浏览器前进/后退由 SPA Router 处理

**优点**:
- URL 简洁,SEO 友好
- 完整的 SPA 体验
- 没有页面重载
- 没有页面抖动

**缺点**:
- 需要修改大量 HTML 文件
- 首次加载需要 JavaScript

### 方案 2: 改进混合架构

**保持 SSG + SPA 混合,但修复冲突**:

1. **禁用响应式重定向**在 SPA 导航时:
   ```javascript
   // 在 navigate() 之前设置标志
   window.__spaNavigating = true;

   // 响应式重定向脚本检查标志
   if (window.__spaNavigating) return;
   ```

2. **精确的链接拦截**:
   ```javascript
   // 只拦截已知路由的链接
   var targetPath = /* ... */;
   if (this.routes[targetPath]) {
     event.preventDefault();
     this.navigate(targetPath);
   }
   ```

3. **添加内容过渡动画**:
   ```javascript
   container.style.opacity = '0';
   setTimeout(function() {
     container.innerHTML = content;
     container.style.opacity = '1';
   }, 100);
   ```

4. **重新初始化组件**:
   ```javascript
   if (window.app && window.app.modules) {
     window.app.modules.forEach(function(module) {
       if (module.init) module.init();
     });
   }
   ```

### 方案 3: 分离 Router 架构

**使用两个 Router**:
1. **SSG Router** - 处理首次加载和直接访问
2. **SPA Router** - 处理后续导航

**优点**:
- 责任分离清晰
- 可以逐步迁移

**缺点**:
- 架构更复杂
- 需要维护两个 Router

## 立即可以尝试的快速修复

### 修复 1: 禁用响应式重定向在 SPA 导航时

在 `spa-router.js` 中:
```javascript
navigate: function(path) {
  var normalizedPath = path.startsWith('/') ? path : '/' + path;
  if (!normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath + '/';
  }

  // 设置 SPA 导航标志
  window.__spaNavigating = true;

  history.pushState({ path: normalizedPath }, '', normalizedPath);
  this.loadRoute(normalizedPath);

  // 清除标志
  setTimeout(function() {
    window.__spaNavigating = false;
  }, 100);
}
```

在响应式重定向脚本中(需要修改 HTML):
```javascript
(function(){
  if (window.__spaNavigating) return;  // SPA 导航时跳过

  var w = screen.width;
  if (w < 768) {
    location.href = 'index-mobile.html';
  } else if (w < 1280) {
    location.href = 'index-tablet.html';
  } else {
    location.href = 'index-pc.html';
  }
}());
```

### 修复 2: 只拦截已知路由的链接

在 `spa-router.js` 中:
```javascript
document.addEventListener('click', function(event) {
  var link = event.target.closest('a');
  if (!link) return;

  var href = link.getAttribute('href');
  if (!href) return;
  if (href.startsWith('http')) return;
  if (href.startsWith('#')) return;
  if (href.startsWith('mailto:')) return;
  if (href.startsWith('tel:')) return;

  // 规范化路径
  var targetPath = href.startsWith('/') ? href : '/' + href;
  if (!targetPath.endsWith('/')) {
    targetPath = targetPath + '/';
  }

  // 只拦截已知路由
  if (!self.routes[targetPath]) {
    return;  // 不拦截,让浏览器默认处理
  }

  event.preventDefault();
  self.log('SPA navigation to:', targetPath);
  self.navigate(targetPath);
});
```

### 修复 3: spa-router 使用 defer

修改 HTML:
```html
<!-- 改为 defer -->
<script defer src="/assets/js/spa-router.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
    window.SpaRouter.init();
  }
});
</script>
```

## 总结

**核心问题**: 响应式重定向与 SPA 导航冲突,导致页面重载。

**根本原因**:
1. 设计问题 - 混合架构的复杂性
2. 代码问题 - 响应式重定向未考虑 SPA 场景

**推荐方案**: 纯 SPA 架构(方案 1),移除响应式重定向,动态加载设备内容。

**快速修复**: 方案 1-3 可以组合使用,快速改善体验。
