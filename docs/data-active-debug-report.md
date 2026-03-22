# data-active 属性不生效问题分析报告

**日期**: 2026-03-19  
**问题**: Navigator 和 Footer 的 data-active 属性不生效,导航项无法正确高亮

---

## 🔍 问题定位

### 问题现象
1. **首次加载页面时**: data-active 属性正确,导航高亮正确
2. **SPA 导航后**: data-active 属性被更新,但导航项样式没有变化
3. **PC 端**: Navigator 的激活状态不更新
4. **Mobile/Tablet 端**: Footer 的激活状态不更新

---

## 🐛 根本原因

### 问题 1: SPA 路由器更新逻辑错误

**位置**: `src/assets/js/spa-router.js` 第 288-318 行 (mountHeader 函数)

**问题代码**:
```javascript
mountHeader: function(html) {
  if (this.headerMounted) return;
  
  var headerContainer = document.querySelector('navigator[data-component="navigator"]');
  if (!headerContainer) return;

  var headerMatch = html.match(/<navigator[^>]*data-component="navigator"[^>]*>[\s\S]*?<\/navigator>/i);
  if (headerMatch) {
    // 提取 data-active 属性
    var activeMatch = html.match(/<navigator[^>]*data-component="navigator"[^>]*>/i);
    if (activeMatch) {
      var activeValue = activeMatch[0].match(/data-active="([^"]*)"/i);
      if (activeValue) {
        headerContainer.setAttribute('data-active', activeValue[1]);  // ❌ 错误
      }
    }
    
    // 注入内容
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = headerMatch[0];
    headerContainer.innerHTML = tempDiv.firstChild.innerHTML;  // ❌ 错误
    
    // 挂载组件
    if (window.Navigator && window.Navigator.mount) {
      window.Navigator.mount();  // ❌ 错误
    }
    
    this.headerMounted = true;
    this.log('Header mounted (persistent)');
  }
}
```

**错误分析**:

1. **错误 1**: `headerContainer.setAttribute('data-active', activeValue[1])`
   - 问题: 设置了 `data-active` 属性,但这是**无效操作**
   - 原因: `navigator.js` 的 `mount()` 函数会完全替换整个 `<navigator>` 元素,之前的属性设置会被覆盖
   - 正确做法: 应该在 `Navigator.mount()` 之前设置,或者传递给 `mount()` 函数

2. **错误 2**: `headerContainer.innerHTML = tempDiv.firstChild.innerHTML`
   - 问题: 只提取了 HTML 内容,丢失了 `<navigator>` 标签本身及其属性
   - 原因: `tempDiv.firstChild` 是 `<navigator>`,但 `innerHTML` 只获取其内部内容
   - 正确做法: 应该保留整个 `<navigator>` 标签及其属性

3. **错误 3**: `window.Navigator.mount()`
   - 问题: `Navigator.mount()` 会重新挂载整个 Header,使用默认配置
   - 原因: `mount()` 函数读取的是 `<navigator>` 占位符的 `data-*` 属性,而不是从 HTML 中提取的属性
   - 正确做法: 应该传递配置给 `Navigator.mount()` 或者直接生成 Header HTML

---

### 问题 2: updateHeaderActiveNav 和 updateFooterActiveNav 依赖错误的路径匹配

**位置**: `src/assets/js/spa-router.js` 第 354-377 行

**问题代码**:
```javascript
updateHeaderActiveNav: function(html) {
  var basePagePath = this.getBasePagePathFromHtml(html);
  var activeNav = this.pageToActiveNav[basePagePath];
  if (!activeNav) return;

  if (window.Navigator && typeof window.Navigator.updateActive === 'function') {
    window.Navigator.updateActive(activeNav);
    this.log('Header active updated:', activeNav);
  }
}
```

**问题分析**:

1. **getBasePagePathFromHtml 返回路径格式错误**
   - 当前返回: `/catalog/index.html`
   - Navigator.updateActive 期望的格式: `catalog` (导航项 id)
   - 需要额外的转换

2. **pageToActiveNav 映射不完整**
   - 缺少一些页面的映射
   - 需要添加所有可能的路径

---

### 问题 3: Navigator.updateActive() 逻辑可能有问题

**位置**: `src/assets/js/ui/navigator.js` 第 516-534 行

**问题代码**:
```javascript
function updateActive(activeId) {
  activeId = activeId || '';
  var navLinks = document.querySelectorAll('header nav a[data-i18n]');
  for (var i = 0; i < navLinks.length; i++) {
    var link = navLinks[i];
    var isActive = false;
    for (var j = 0; j < NAV_ITEMS.length; j++) {
      if (NAV_ITEMS[j].id === activeId && link.getAttribute('data-i18n') === NAV_ITEMS[j].key) {
        isActive = true;
        break;
      }
    }
    if (isActive) {
      link.className = 'text-sm font-semibold text-primary';
    } else {
      link.className = 'text-sm font-semibold hover:text-primary transition-colors';
    }
  }
}
```

**问题分析**:

1. **选择器错误**: `document.querySelectorAll('header nav a[data-i18n]')`
   - 问题: PC 端有导航链接,但 Mobile/Tablet 端没有
   - 原因: Mobile/Tablet 的 Navigator 只有 Logo + 语言切换器,没有导航链接
   - 正确做法: 应该检查是否存在导航链接再执行

---

## 🛠️ 解决方案

### 方案 1: 修复 mountHeader 和 mountFooter (推荐)

#### 修改 spa-router.js 的 mountHeader 函数

```javascript
mountHeader: function(html) {
  if (this.headerMounted) return;
  
  var headerContainer = document.querySelector('navigator[data-component="navigator"]');
  if (!headerContainer) return;

  // 提取整个 <navigator> 标签及其属性
  var headerMatch = html.match(/<navigator[^>]*data-component="navigator"[^>]*>[\s\S]*?<\/navigator>/i);
  if (!headerMatch) {
    this.log('Navigator not found in HTML');
    return;
  }

  // 解析 data-active 属性
  var activeValue = null;
  var activeMatch = headerMatch[0].match(/data-active="([^"]*)"/i);
  if (activeMatch) {
    activeValue = activeMatch[1];
  }

  // 创建临时容器解析 HTML
  var tempDiv = document.createElement('div');
  tempDiv.innerHTML = headerMatch[0];
  var navigatorEl = tempDiv.firstChild;

  // 替换占位符
  headerContainer.parentNode.replaceChild(navigatorEl, headerContainer);
  
  // 挂载组件 - 使用正确的 active 状态
  if (window.Navigator && window.Navigator.mount) {
    window.Navigator.mount();
    
    // 如果有 active 状态,立即更新
    if (activeValue) {
      window.Navigator.updateActive(activeValue);
    }
  }
  
  this.headerMounted = true;
  this.log('Header mounted (persistent) with active:', activeValue);
}
```

#### 修改 spa-router.js 的 mountFooter 函数

```javascript
mountFooter: function(html) {
  if (this.footerMounted) return;
  
  var footerContainer = document.querySelector('footer[data-component="footer"]');
  if (!footerContainer) return;

  // 提取整个 <footer> 标签及其属性
  var footerMatch = html.match(/<footer[^>]*data-component="footer"[^>]*>[\s\S]*?<\/footer>/i);
  if (!footerMatch) {
    this.log('Footer not found in HTML');
    return;
  }

  // 解析 data-active 属性
  var activeValue = null;
  var activeMatch = footerMatch[0].match(/data-active="([^"]*)"/i);
  if (activeMatch) {
    activeValue = activeMatch[1];
  }

  // 创建临时容器解析 HTML
  var tempDiv = document.createElement('div');
  tempDiv.innerHTML = footerMatch[0];
  var footerEl = tempDiv.firstChild;

  // 替换占位符
  footerContainer.parentNode.replaceChild(footerEl, footerContainer);
  
  // 挂载组件 - 使用正确的 active 状态
  if (window.Footer && window.Footer.mount) {
    window.Footer.mount();
    
    // 如果有 active 状态,立即更新
    if (activeValue) {
      window.Footer.updateActive(activeValue);
    }
  }
  
  this.footerMounted = true;
  this.log('Footer mounted (persistent) with active:', activeValue);
}
```

---

### 方案 2: 增强 updateHeaderActiveNav 和 updateFooterActiveNav

#### 修改 spa-router.js 的 updateHeaderActiveNav 函数

```javascript
updateHeaderActiveNav: function(html) {
  // 直接从 HTML 中提取 data-active 属性
  var activeMatch = html.match(/<navigator[^>]*data-component="navigator"[^>]*data-active="([^"]*)"/i);
  if (!activeMatch) {
    this.log('No data-active found in navigator HTML');
    return;
  }

  var activeId = activeMatch[1];
  this.log('Updating header active to:', activeId);

  if (window.Navigator && typeof window.Navigator.updateActive === 'function') {
    window.Navigator.updateActive(activeId);
    this.log('Header active updated:', activeId);
  }
}
```

#### 修改 spa-router.js 的 updateFooterActiveNav 函数

```javascript
updateFooterActiveNav: function(html) {
  // 直接从 HTML 中提取 data-active 属性
  var activeMatch = html.match(/<footer[^>]*data-component="footer"[^>]*data-active="([^"]*)"/i);
  if (!activeMatch) {
    this.log('No data-active found in footer HTML');
    return;
  }

  var activeId = activeMatch[1];
  this.log('Updating footer active to:', activeId);

  if (window.Footer && typeof window.Footer.updateActive === 'function') {
    window.Footer.updateActive(activeId);
    this.log('Footer active updated:', activeId);
  }
}
```

---

### 方案 3: 修复 Navigator.updateActive() 的容错性

#### 修改 navigator.js 的 updateActive 函数

```javascript
function updateActive(activeId) {
  activeId = activeId || '';
  
  var navLinks = document.querySelectorAll('header nav a[data-i18n]');
  
  // 如果没有导航链接,直接返回 (Mobile/Tablet 端)
  if (navLinks.length === 0) {
    console.log('[Navigator] No nav links found, skipping update');
    return;
  }
  
  for (var i = 0; i < navLinks.length; i++) {
    var link = navLinks[i];
    var isActive = false;
    for (var j = 0; j < NAV_ITEMS.length; j++) {
      if (NAV_ITEMS[j].id === activeId && link.getAttribute('data-i18n') === NAV_ITEMS[j].key) {
        isActive = true;
        break;
      }
    }
    if (isActive) {
      link.className = 'text-sm font-semibold text-primary';
    } else {
      link.className = 'text-sm font-semibold hover:text-primary transition-colors';
    }
  }
  
  console.log('[Navigator] Active updated to:', activeId);
}
```

---

## 📋 测试清单

修复后需要测试以下场景:

### PC 端
- [ ] 首次加载首页,Home 导航高亮
- [ ] 首次加载 Catalog 页面,Equipment 导航高亮
- [ ] SPA 导航到 Case Studies,Case Studies 导航高亮
- [ ] SPA 导航到 Support,Support 导航高亮
- [ ] 浏览器返回/前进,导航高亮正确

### Mobile 端
- [ ] 首次加载首页,Home 图标高亮
- [ ] 首次加载 Catalog 页面,Equipment 图标高亮
- [ ] SPA 导航到 Case Studies,Case Studies 图标高亮
- [ ] SPA 导航到 Support,Support 图标高亮
- [ ] 浏览器返回/前进,图标高亮正确

### Tablet 端
- [ ] 首次加载首页,Home 图标高亮
- [ ] 首次加载 Catalog 页面,Equipment 图标高亮
- [ ] SPA 导航到 Case Studies,Case Studies 图标高亮
- [ ] SPA 导航到 Support,Support 图标高亮
- [ ] 浏览器返回/前进,图标高亮正确

---

## 🎯 推荐执行顺序

1. **立即执行**: 方案 1 (修复 mountHeader 和 mountFooter)
2. **增强执行**: 方案 2 (增强 updateHeaderActiveNav 和 updateFooterActiveNav)
3. **防御性执行**: 方案 3 (修复 Navigator.updateActive() 容错性)

这样可以确保:
- 首次挂载时 active 状态正确
- SPA 导航时 active 状态正确更新
- 组件有足够的容错性处理边界情况

---

## 📝 总结

**根本原因**: SPA 路由器在挂载和更新 Header/Footer 时,没有正确处理 `data-active` 属性的传递和更新。

**关键问题**:
1. `mountHeader` 和 `mountFooter` 使用了错误的 DOM 操作方式
2. `updateHeaderActiveNav` 和 `updateFooterActiveNav` 依赖了不必要的路径转换
3. `Navigator.updateActive()` 缺少对 Mobile/Tablet 端的容错处理

**推荐方案**: 同时实施方案 1、2、3,确保全面修复问题。

---

**文档维护**: WorkBuddy Development Team  
**最后更新**: 2026-03-19
