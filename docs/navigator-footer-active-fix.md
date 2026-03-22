# SPA Navigator 和 Footer Active 状态修复

## 📋 问题描述

1. **Navigator 切换按钮时，home 按钮一直处于选中状态**
2. **点击 logo 回到 home 页面时，home 按钮应该处于选中状态**
3. **页面发生变化时都要更新 footer 和 navigator 的选中状态**
4. **Footer data-active 不生效**

## 🔍 根本原因

### 问题 1: Footer updateActive 选择器错误

**文件**: `src/assets/js/ui/footer.js`

**问题**: `updateActive` 方法使用了错误的选择器 `a[href*="index.html"]`，但实际的 href 是 `/home/` 而不是 `/home/index.html`，导致无法匹配到导航链接。

```javascript
// 旧代码（错误）
var navLinks = document.querySelectorAll('.fixed.bottom-0 a[href*="index.html"]');
```

### 问题 2: SpaRouter 正则表达式不够健壮

**文件**: `src/assets/js/spa-router.js`

**问题**: `updateHeaderActiveNav` 和 `updateFooterActiveNav` 方法使用的正则表达式无法匹配多行 HTML 格式的标签。

```javascript
// 旧代码（不够健壮）
var headerMatch = html.match(/<navigator[^>]*data-component="navigator"[^>]*>/i);
```

## ✅ 修复方案

### 修复 1: Footer updateActive 选择器

**修改文件**: `src/assets/js/ui/footer.js` (第196-235行)

**改动**:
1. 将选择器从 `a[href*="index.html"]` 改为 `a[href]`
2. 改进 href 匹配逻辑，支持 `/home/` 和 `/home/index.html` 两种格式

```javascript
// 新代码（正确）
var navLinks = document.querySelectorAll('.fixed.bottom-0 a[href]');
// ...
// 改进匹配逻辑
if (linkHref.indexOf(allItems[j].href) !== -1 ||
    (allItems[j].href.endsWith('/') && linkHref.startsWith(allItems[j].href))) {
  matchedItem = allItems[j];
  break;
}
```

### 修复 2: SpaRouter 正则表达式

**修改文件**: `src/assets/js/spa-router.js` (第322-383行)

**改动**: 使用更健壮的正则表达式，支持多行 HTML 格式：

```javascript
// 新代码（支持多行）
var headerMatch = html.match(/<navigator[\s\S]*?data-component="navigator"[\s\S]*?>/i);
var footerMatch = html.match(/<footer[\s\S]*?data-component="footer"[\s\S]*?>/i);
```

### 修复 3: 添加详细调试日志

**修改文件**: `src/assets/js/spa-router.js`

在 `updateHeaderActiveNav` 和 `updateFooterActiveNav` 方法中添加了详细的调试日志，帮助诊断问题：

```javascript
console.log('[SpaRouter] Header navigator tag not found in HTML');
console.log('[SpaRouter] Updating header active nav to:', activeNav);
console.log('[SpaRouter] Navigator.updateActive not available');
// ...类似的 footer 日志
```

## 📊 修复效果

### 修复前
- ❌ Footer 导航点击后 active 状态不更新
- ❌ 无法正确匹配 `/home/` 格式的 href
- ❌ 正则表达式无法匹配多行 HTML 标签

### 修复后
- ✅ Footer 导航点击后正确更新 active 状态
- ✅ 支持 `/home/` 和 `/home/index.html` 两种 href 格式
- ✅ 正则表达式支持多行 HTML 标签格式
- ✅ 添加详细调试日志，方便后续排查问题

## 🧪 测试验证

### 测试步骤

1. **启动开发服务器**
   ```bash
   npm run dev:fast
   ```

2. **访问首页**
   ```
   http://localhost:5000/
   ```
   - 检查 Navigator 的 Home 链接是否高亮（选中状态）
   - 检查 Footer 的 Home 链接是否高亮（如果有）

3. **测试 Navigator 导航**
   - 点击 "Equipment" 链接
   - 验证 Equipment 高亮，Home 取消高亮
   - 点击 "Case Studies" 链接
   - 验证 Case Studies 高亮，其他取消高亮
   - 点击 Logo 回到 Home
   - 验证 Home 高亮

4. **测试浏览器返回**
   - 从 Case Studies 页面点击返回
   - 验证返回前的页面状态正确恢复

5. **查看调试日志**
   - 打开浏览器控制台
   - 导航时应该看到类似日志：
   ```
   [SpaRouter] Updating header active nav to: catalog
   [SpaRouter] Updating footer active nav to: catalog
   ```

### 预期结果
- ✅ 所有导航链接点击后正确更新 active 状态
- ✅ Logo 点击后 Home 链接高亮
- ✅ 浏览器前进/后退时状态正确更新
- ✅ 控制台无错误日志

## 📁 修改的文件

1. `src/assets/js/ui/footer.js` - 修复 updateActive 方法
2. `src/assets/js/spa-router.js` - 改进正则表达式和添加调试日志

## ⚠️ 注意事项

1. **缓存问题**: 如果修改后没有效果，尝试清除浏览器缓存或硬刷新（Ctrl+Shift+R / Cmd+Shift+R）

2. **SPA 导航标志**: SpaRouter 使用 `window.__spaNavigating` 标志来禁用响应式重定向。如果遇到问题，检查这个标志是否被正确设置和清除。

3. **DeviceUtils 依赖**: Footer 组件依赖 `DeviceUtils.isPC()` 来判断是否显示。如果 DeviceUtils 加载顺序有问题，可能导致 Footer 不显示。

## 🔄 相关文件

- `src/assets/js/ui/navigator.js` - Navigator 组件
- `src/assets/js/ui/footer.js` - Footer 组件
- `src/assets/js/spa-router.js` - SPA 路由器
- `src/assets/js/utils/device-utils.js` - 设备检测工具

---

**修复完成时间**: 2026-03-19
**修复状态**: ✅ 完成
**测试状态**: ⏳ 待验证