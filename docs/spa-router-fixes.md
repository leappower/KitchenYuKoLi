# SPA 路由问题修复清单

**最后更新**: 2026-03-18
**状态**: 修复进行中

---

## 🔴 P0 - 严重问题 (需要立即修复)

### 问题 1: Header logo 点击无反馈

**问题描述**: 点击 Header 中的 logo 没有跳转到首页

**原因分析**:
- Logo 链接 `<a href="/">` 应该被 SPA 路由拦截
- 可能事件被阻止或 z-index 问题导致点击无效

**修复方案**:
- 确保 SPA 路由正确拦截所有内部链接
- 检查 z-index 层级，确保链接可点击

**文件位置**:
- `src/assets/js/ui/navigator.js:210-213` (logo HTML)
- `src/assets/js/spa-router.js` (路由拦截逻辑)

**测试方法**:
1. 打开浏览器控制台
2. 点击 Header logo
3. 检查是否触发 `[SpaRouter] Navigating to: /`
4. 检查 URL 是否变为 `/home`
- `src/assets/js/ui/navigator.js:198-202` (按钮渲染)
- `src/assets/js/ui/navigator.js:buildLangDropdown()` (语言下拉)
- `src/assets/js/ui/navigator.js:buildCtaButton()` (CTA 按钮)
### 问题 2: z-index 层级问题

Tablet 应该使用 `navigator` (variant: tablet)
Mobile 应该使用 `navigator` (mobile variant)

**问题位置**:
```html
<div class="bg-white/80 dark:bg-background-dark/80 backdrop-blur p-6 rounded-2xl border border-white/20 shadow-xl text-center">
  <p class="text-3xl font-black text-primary">24/7</p>
  <p class="text-xs font-bold uppercase text-slate-500" data-i18n="home_stat_expert_support">Expert Support</p>
</div>
```
```html
<!-- Tablet -->
<header data-component="navigator" data-variant="tablet">

<!-- Mobile -->
<div data-component="navigator" data-variant="mobile"></div>
```

-- 按钮在 `footer.js` 中实现
- 添加 `z-[var(--z-content)]` 或 `z-[var(--z-sticky)]`
- 参考 `src/assets/css/z-index-system.css`

**建议层级**:
├── fab-buttons.js          # FAB 按钮组件
├── navigator.js            # PC/Tablet/Mobile Header (统一组件)
├── min-display-footer.js   # Footer (底部导航) - legacy name
└── back-to-top.js          # 返回顶部 (可合并到 FAB)
---

### 问题 3: Header 按钮无法点击
### 立即修复 (P0)
1. [ ] 修复 Header logo 点击
**问题描述**: 语言选择按钮和获取报价按钮点击无效

**可能原因**:
1. z-index 问题导致按钮被遮挡
2. 事件监听器未正确绑定
3. SPA 路由未拦截链接

**检查清单**:
- [ ] 检查按钮 z-index 层级
- [ ] 检查是否有透明元素遮挡
- [ ] 验证事件监听器是否绑定成功
- [ ] 检查 SPA 路由拦截逻辑

**相关文件**:
**相关文件**:
- `src/assets/js/ui/navigator.js:198-202` (按钮渲染)
- `src/assets/js/ui/navigator.js:buildLangDropdown()` (语言下拉)
- `src/assets/js/ui/navigator.js:buildCtaButton()` (CTA 按钮)

---

## 🟡 P1 - 重要问题

### 问题 4: Footer 显示逻辑错误

**问题描述**: Footer 当前在 PC 上显示，应该在 mobile/tablet 显示

**预期行为**:
- PC: 不显示 Footer (使用 PC 导航)
- Tablet: 显示 Footer (底部导航)
- Mobile: 显示 Footer (底部导航)

**修复方案**:
修改 `src/assets/js/spa-router.js:mountFooter()`:
```javascript
mountFooter: function(html) {
  var width = window.innerWidth;
  var isPC = width >= 1280;
  
  if (isPC) {
    this.log('PC device, skipping footer mount');
    return;
  }
  
  // 原有的挂载逻辑
}
```

---

### 问题 5: Header 显示逻辑问题

**问题描述**: Tablet/mobile Header 应该显示完整导航

**当前实现**:
- PC: 显示完整 Header (logo + 导航链接 + 搜索 + 语言 + CTA)
- Tablet: 显示简化 Header (可能只显示 logo + 语言)
- Mobile: 显示简化 Header

**预期行为**:
- PC: 完整 Header
- Tablet: 完整 Header (但布局适配)
- Mobile: 简化 Header (navigator mobile variant)

**修复方案**:
- Tablet 应该使用 `navigator` (variant: tablet)
- Mobile 应该使用 `navigator` (variant: mobile)

**配置示例**:
```html
<!-- Tablet -->
<header data-component="navigator" data-variant="tablet">

<!-- Mobile -->
<div data-component="navigator" data-variant="mobile"></div>
```

---

### 问题 6: WhatsApp/Line 按钮组件化

**问题描述**: WhatsApp 和 Line 按钮只在 tablet/mobile 显示，需要抽成独立组件

**当前实现**:
- 按钮在 `min-display-footer.js` 中实现
- 通过 `data-fab="true"`` 控制显示

**重构方案**:
1. 创建新组件 `fab-buttons.js` (Floating Action Buttons)
2. 支持 WhatsApp、Line、Back-to-top 按钮
3. 配置选项:
   ```javascript
   {
     whatsapp: true/false,
     line: true/false,
     backToTop: true/false,
     position: 'right' // left, right, bottom
   }
   ```

**文件结构**:
```
src/assets/js/ui/
├── fab-buttons.js          # FAB 按钮组件
├── navigator.js            # PC/Tablet/Mobile Header (统一组件)
├── min-display-header.js   # Mobile Header (legacy)
├── min-display-footer.js   # Footer (底部导航)
└── back-to-top.js         # 返回顶部 (可合并到 FAB)
```

---

## 修复优先级

### 立即修复 (P0)
1. [ ] 修复 Header logo 点击
2. [ ] 修复 z-index 层级
3. [ ] 修复 Header 按钮点击

### 高优先级 (P1)
4. [ ] 修复 Footer 显示逻辑
5. [ ] 修复 Header 显示逻辑
6. [ ] 抽取 FAB 组件

### 中优先级 (P2)
7. [ ] Smart Popup 重构
8. [ ] 性能优化 (虚拟滚动、懒加载)
9. [ ] SEO 优化

---

## 测试清单

### 功能测试
- [ ] Header logo 点击跳转到首页
- [ ] 语言选择按钮正常工作
- [ ] 获取报价按钮跳转到报价页面
- [ ] 24/7 卡片等元素的 z-index 正确
- [ ] Footer 在 PC 隐藏，在 mobile/tablet 显示
- [ ] Header 在 tablet/mobile 显示正确
- [ ] WhatsApp/Line 按钮显示正确
- [ ] 浏览器返回/前进按钮正常
- [ ] 直接访问 URL 正常
- [ ] 刷新页面正常

### 设备测试
- [ ] PC (1920x1080)
- [ ] PC (1366x768)
- [ ] Tablet (768x1024)
- [ ] Tablet (1024x768)
- [ ] Mobile (375x667)
- [ ] Mobile (414x896)

### 浏览器测试
- [ ] Chrome (PC)
- [ ] Firefox (PC)
- [ ] Safari (PC)
- [ ] Chrome (Mobile)
- [ ] Safari (Mobile)
- [ ] Samsung Internet (Mobile)

---

## 相关文件

### SPA 核心
- `src/index.html` - SPA 入口
- `src/_redirects` - GitHub Pages 配置
- `src/assets/js/spa-router.js` - 路由客户端
- `src/assets/js/spa-app.js` - 旧 SPA 实现 (待移除)

### UI 组件
### UI 组件
- `src/assets/js/ui/navigator.js` - PC/Tablet/Mobile Header (统一组件)
- `src/assets/js/ui/min-display-header.js` - Mobile Header (legacy)
- `src/assets/js/ui/min-display-footer.js` - Footer
- `src/assets/js/ui/smart-popup.js` - 弹窗组件

### 配置
- `server.js` - 开发服务器
- `webpack.config.js` - 构建配置
- `package.json` - 项目配置

---

## 技术债务

### 需要清理的文件
- [ ] 删除旧响应式入口文件
  - `src/pages/home/index.html`
  - `src/pages/home/index-mobile.html`
  - `src/pages/home/index-tablet.html`
  - `src/pages/home/index-pc.html`
- [ ] 移除 `src/assets/js/spa-app.js`
- [ ] 移除 `src/assets/js/spa-router.js.bak`

### 需要重构的组件
- [ ] Smart Popup (抽取为独立组件)
- [ ] FAB 按钮 (抽取为独立组件)
- [ ] Back-to-top (合并到 FAB)

---

## 参考资料

### Z-Index 系统
- `src/assets/css/z-index-system.css`
- 变量映射:
  - `--z-base: 0`
  - `--z-content: 1`
  - `--z-header: 10`
  - `--z-fab: 50`
  - `--z-dropdown: 200`
  - `--z-modal: 310`

### 路由配置
- 路由表: `src/assets/js/spa-router.js:16-30`
- 设备检测: `src/assets/js/spa-router.js:35-45`
- 路由拦截: `src/assets/js/spa-router.js:265-286`

---

**文档维护者**: Yukoli Development Team
**最后更新**: 2026-03-18
