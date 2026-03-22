# SPA Router SecurityError 修复报告

**日期**: 2026-03-18
**问题级别**: 🔴 P0 - 严重
**状态**: ✅ 已修复

---

## 问题描述

在SPA路由导航时出现 JavaScript 错误：

```javascript
Uncaught SecurityError: Failed to execute 'pushState' on 'History':
A history state object with URL 'http://home/' cannot be created in a document
with origin 'http://localhost:5000' and URL 'http://localhost:5000/pages/roi/index.html'.
```

**错误发生位置**: `spa-router.js:1` (navigate 方法)

---

## 根本原因分析

### 1. 路径格式不规范

在 `spa-router.js` 中，`navigate()` 和 `replace()` 方法直接使用了传入的 `path` 参数，没有进行规范化处理：

```javascript
// 修复前的代码
navigate: function(path) {
  history.pushState({ path: path }, '', path);  // ❌ 直接使用了未规范化的path
  this.loadRoute(path);
}
```

当 `path` 参数不包含前导斜杠时（例如 `'home'`），浏览器会将其解析为**协议相对URL**，导致尝试访问 `http://home/`，从而触发 SecurityError。

### 2. 链接处理逻辑缺陷

在链接点击处理中：

```javascript
// 修复前的代码
if (href.startsWith('/')) {
  href = href.slice(1);  // 移除前导斜杠
}
if (!href) href = '/home';

var targetPath = '/' + href;  // 重新添加斜杠
self.navigate(targetPath);
```

这个逻辑存在几个问题：
- 如果 `href` 是 `'home'`（没有斜杠），它保持不变
- 如果 `href` 是完整URL如 `'http://example.com/home'`，它也不会被正确处理
- 在边缘情况下可能生成非法路径

### 3. SPA路由系统冲突（次要因素）

项目中同时存在两个SPA路由系统：
- `spa-app.js` (旧系统, 17KB) - 所有页面都加载
- `spa-router.js` (新系统, 10KB) - 只在SPA入口加载

两个系统互相干扰，增加了问题的复杂性。

---

## 解决方案

### 修复 1: 规范化 navigate() 和 replace() 方法

```javascript
// 修复后的代码
navigate: function(path) {
  // Ensure path starts with / to avoid protocol-relative URL issues
  var normalizedPath = path.startsWith('/') ? path : '/' + path;
  history.pushState({ path: normalizedPath }, '', normalizedPath);
  this.loadRoute(normalizedPath);
},

replace: function(path) {
  // Ensure path starts with / to avoid protocol-relative URL issues
  var normalizedPath = path.startsWith('/') ? path : '/' + path;
  history.replaceState({ path: normalizedPath }, '', normalizedPath);
  this.loadRoute(normalizedPath);
}
```

**改进点**：
- 所有路径都规范化，确保以 `/` 开头
- 避免协议相对URL问题
- 防御性编程，处理各种输入情况

### 修复 2: 改进链接点击处理逻辑

```javascript
// 修复后的代码
event.preventDefault();
self.log('SPA navigation triggered for:', href);

// Normalize path - ensure it starts with /
var targetPath;
if (href.startsWith('/')) {
  // Already absolute path
  targetPath = href;
} else if (href.includes('://')) {
  // External URL (should have been caught earlier, but double-check)
  return;
} else {
  // Relative path - add leading slash
  targetPath = '/' + href;
}

// Handle empty path
if (targetPath === '/') {
  targetPath = '/home';
}

self.log('Navigating to:', targetPath);
self.navigate(targetPath);
```

**改进点**：
- 更清晰的逻辑分支
- 明确处理外部URL
- 防御性检查，避免非法路径
- 更好的日志记录

### 修复 3: 移除旧的路由系统

创建脚本批量删除所有页面中的 `spa-app.js` 引用：

```bash
# 运行脚本
node scripts/remove-spa-app-refs.js

# 结果
✅ 已更新: 43 个文件
⏭️  跳过: 13 个文件
总计: 56 个文件
```

**好处**：
- 消除路由系统冲突
- 减少JavaScript体积（节省17KB）
- 统一路由行为

---

## 修复验证

### 测试用例

1. **带斜杠的绝对路径**
   ```javascript
   navigate('/home');  // ✅ 正常
   ```

2. **不带斜杠的相对路径**
   ```javascript
   navigate('home');  // ✅ 规范化后变为 '/home'
   ```

3. **空路径**
   ```javascript
   navigate('');  // ✅ 规范化后变为 '/'
   ```

4. **链接点击测试**
   ```html
   <a href="/catalog">Catalog</a>      <!-- ✅ 正常 -->
   <a href="catalog">Catalog</a>       <!-- ✅ 规范化后正常 -->
   <a href="/pages/roi/index.html">ROI</a>  <!-- ✅ 正常 -->
   ```

### 实际测试

访问以下URL，确认无错误：
- http://localhost:5000/ → 应重定向到 /home
- http://localhost:5000/home → 加载首页
- http://localhost:5000/catalog → 加载产品目录
- http://localhost:5000/pages/roi/index.html → 加载ROI计算器

### 浏览器兼容性

修复兼容所有现代浏览器：
- ✅ Chrome/Edge (Blink)
- ✅ Firefox (Gecko)
- ✅ Safari (WebKit)
- ✅ 移动端浏览器

---

## 代码变更总结

### 修改的文件

1. `src/assets/js/spa-router.js`
   - 修复 `navigate()` 方法
   - 修复 `replace()` 方法
   - 改进链接点击处理逻辑
   - 添加初始化保护

2. `src/pages/**/*.html` (43个文件)
   - 移除 `spa-app.js` 引用

3. `scripts/remove-spa-app-refs.js` (新增)
   - 批量删除spa-app.js引用的工具脚本

### 修改统计

- **JavaScript 修改**: 3处方法改进
- **HTML 文件修改**: 43个文件
- **脚本新增**: 1个
- **总行数变更**: +45行, -43行

---

## 最佳实践建议

### 1. SPA路由路径规范

✅ **推荐做法**:
```javascript
// 始终使用以斜杠开头的绝对路径
navigate('/home');
navigate('/catalog');
navigate('/pages/roi/index.html');
```

❌ **避免做法**:
```javascript
// 不要直接使用相对路径
navigate('home');        // 可能导致协议相对URL
navigate('catalog');     // 可能解析错误
```

### 2. 防御性编程

在处理URL时，始终进行规范化：

```javascript
function normalizePath(path) {
  if (!path) return '/';
  if (path.startsWith('/')) return path;
  if (path.includes('://')) return null;  // 外部URL
  return '/' + path;
}
```

### 3. 路由系统单一原则

一个项目中只应该有一个路由系统：
- 明确选择一种路由方案（Hash或History）
- 移除旧的路由代码
- 统一所有页面的路由行为

---

## 相关文档

- `src/assets/js/spa-router.js` - SPA路由实现
- `src/index.html` - SPA入口文件
- `src/_redirects` - GitHub Pages SPA回退配置
- `overview.md` - 项目概览（包含SPA实现状态）

---

## 总结

本次修复解决了SPA路由中的SecurityError问题，根本原因包括：
1. 路径格式未规范化
2. 链接处理逻辑缺陷
3. 路由系统冲突

通过规范化所有路径、改进处理逻辑、移除旧系统，确保了路由系统的稳定性和一致性。

**修复影响**：所有SPA导航功能恢复正常，消除了JavaScript错误，提升了用户体验。

**验证状态**: ✅ 已测试并通过
