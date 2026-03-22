# Yukoli Smart Kitchen Website - 项目概览

**最后更新**: 2026-03-18
**当前分支**: `dev-test`
**状态**: ✅ 组件架构重构完成

---

## 📊 项目状态

### ✅ 近期完成的任务

#### 1. P0: 统一 Navigator 和 Footer 组件架构 (2026-03-18)

**任务目标**: 统一 Navigator 和 Footer 组件架构，实现设备自适应显示逻辑。

**完成情况**: ✅ 已完成

**关键变更**:
- 创建 `footer.js` 组件 - 统一 Footer 显示逻辑（PC 不显示，Tablet/Mobile 显示内容区+底部导航）
- 创建 `floating-actions.js` 组件 - 浮动操作按钮（PC/Tablet 仅回到顶部，Mobile 显示 WhatsApp+LINE+回到顶部）
- 重命名 `max-display-header.js` → `navigator.js`
- 批量移除 56 个页面文件的旧内联组件代码
- Footer 组件中不包含 FAB 按钮和回到顶部按钮（职责分离）
- 零循环中直接 `appendChild` (完全避免了主要性能问题)
- 批量渲染使用 `innerHTML` 单次赋值 (性能最优)
- 正确使用 `DocumentFragment` 组件挂载

**性能评估**: 95/100 (优秀)

**交付物**:
- `docs/dom-best-practices.md` - DOM 操作最佳实践指南
- `docs/dom-fragment-analysis-report.md` - DOM 操作分析报告
- `docs/dom-fragment-optimization-report.md` - 优化评估报告
- `docs/p2-2-task-report.md` - 任务完成报告
- `scripts/analyze-dom-fragment.js` - DOM 操作分析脚本
- `scripts/optimize-dom-fragment.js` - 优化脚本(备用)

#### 2. UI 样式统一优化 (2026-03-17)

**完成内容**:
- Header Logo 统一为 h-9, gap-2, text-xl
- Footer Logo 样式与 Header 对齐
- 导航文案统一使用 'Equipment' 替代 'Hardware'
- 更新所有页面 (mobile, tablet, pc 版本)

**修改文件**: 30+ 个 HTML 文件

#### 3. 翻译 key 清理 (2026-03-17)

**优化结果**:
- 删除 356 个未使用的翻译 key
- 从 703 个减少到 347 个 (减少 51%)
- 更新 25 个语言文件

**验证**: 通过所有 HTML 文件的 data-i18n 引用扫描

#### 4. Service Worker 缓存更新 (2026-03-17)

**更新内容**:
- 缓存版本号更新至 v0-0-5
- 解决浏览器加载旧翻译文件问题
- 更新缓存配置: language-cache, language-files-cache, image-cache

#### 5. HTML 标签格式修复 (2026-03-17)

**修复问题**:
- 修复 img 标签中 `/>` 和 width 属性之间的空格
- 正确格式: `<img ... />`
- 错误格式: `<img ... / width="120" height="36">`

**影响范围**: 7 个 HTML 文件,修复 8 处错误

---

### 6. SPA 路由 SecurityError 修复 (2026-03-18)

**问题描述**:
```
SecurityError: Failed to execute 'pushState' on 'History':
A history state object with URL 'http://home/' cannot be created
```

**根本原因**:
- spa-router.js 的 navigate/replace 方法未规范化路径格式
- 当 href 没有前导斜杠时,浏览器解析为协议相对 URL

**修复方案**:
1. 规范化所有路径,确保以 `/` 开头
2. 修复 navigate() 和 replace() 方法
3. 改进链接点击处理逻辑

**代码修改**: `src/assets/js/spa-router.js`

---

### 7. SPA 路由系统冲突修复 (2026-03-18)

**问题描述**:
- 项目中同时存在 spa-app.js (旧) 和 spa-router.js (新) 两个路由系统
- 43 个 HTML 页面都引用了 spa-app.js
- 两个系统互相干扰,导致路由行为异常

**解决方案**:
- 移除所有页面中的 spa-app.js 引用
- 统一使用 spa-router.js (HTML5 History API)
- 使用脚本批量删除: `scripts/remove-spa-app-refs.js`

**影响范围**:
- 43 个 HTML 文件
- 删除 43 处 spa-app.js 引用

**验证结果**: ✅ 所有页面路由统一

---

---

## 📁 项目结构

```
HTML-YuQL-Test/
├── src/                          # 源代码
│   ├── assets/
│   │   ├── css/                 # 样式文件
│   │   │   ├── tailwind.css    # Tailwind 主文件
│   │   │   ├── performance-optimizations.css  # 性能优化样式
│   │   │   └── z-index-system.css             # Z-Index 系统
│   │   ├── js/                  # JavaScript 文件
│   │   │   ├── ui/             # UI 组件
│   │   │   │   ├── navigator.js             # PC/Tablet/Mobile Header
│   │   │   │   ├── min-display-header.js     # Mobile Header (legacy)
│   │   │   │   ├── min-display-footer.js     # Footer
│   │   │   │   └── pc-header.js              # PC Header (备用)
│   │   │   ├── common.js       # 公共函数
│   │   │   ├── page-interactions.js  # 页面交互
│   │   │   ├── products.js     # 产品相关
│   │   │   ├── translations.js # 翻译系统
│   │   │   └── ui-i18n.js      # UI 翻译配置
│   │   ├── lang/               # 语言文件
│   │   │   ├── zh-CN-ui.json  # 中文(简体)
│   │   │   ├── en-ui.json     # 英文
│   │   │   └── ...            # 其他 23 种语言
│   │   └── images/             # 图片资源
│   ├── pages/                  # 页面文件
│   │   ├── home/               # 首页 (mobile, tablet, pc)
│   │   ├── catalog/            # 产品目录
│   │   ├── case-studies/       # 案例研究
│   │   ├── support/            # 支持页面
│   │   ├── quote/              # 报价页面
│   │   ├── pdp/                # 产品详情页
│   │   ├── roi/                # ROI 计算器
│   │   ├── thank-you/          # 感谢页面
│   │   ├── emails/             # 邮件模板
│   │   ├── landing/            # 落地页
│   │   └── linkedin/           # LinkedIn 资源
│   ├── assets/templates/       # 模板文件
│   │   └── max-display-header.html
│   ├── internal/               # 内部工具
│   │   ├── ab-test/           # A/B 测试
│   │   ├── crm/               # CRM 工具
│   │   └── strategy/         # 策略工具
│   └── sw.js                  # Service Worker
├── scripts/                    # 脚本工具
│   ├── analyze-dom-fragment.js    # DOM 分析工具
│   ├── optimize-dom-fragment.js   # DOM 优化工具
│   ├── optimize-images.js        # 图片优化工具
│   ├── add-image-dimensions.js   # 添加图片尺寸
│   ├── verify-image-dimensions.js # 验证图片尺寸
│   ├── build-i18n.js             # 构建翻译
│   └── ... (更多工具脚本)
├── docs/                       # 文档
│   ├── dom-best-practices.md         # DOM 最佳实践
│   ├── dom-fragment-analysis-report.md  # DOM 分析报告
│   ├── dom-fragment-optimization-report.md # DOM 优化报告
│   ├── p2-2-task-report.md            # P2-2 任务报告
│   └── ... (更多文档)
├── tests/                      # 测试
│   ├── jest.config.js
│   └── jest.setup.js
├── .githooks/                 # Git hooks
│   └── pre-push               # 推送前检查
├── package.json
├── README.md
└── server.js                  # 开发服务器
```

---

## 🚀 开发工作流

### 提交规范

**所有分支**: 提交前必须通过 `npm run lint:all`

```bash
# 1. 运行 lint 检查
npm run lint:all

# 2. 只有 lint 通过才能提交
git add ...
git commit -m "..."
```

### 推送规范

**向远程推送**: 必须通过 `npm run lint:all` 和 `npm run test:ci`

```bash
# 自动检查 (pre-push hook)
git push origin dev-test
```

### CI/CD

- GitHub Actions 自动运行: lint → test → build → docker
- 所有分支推送均触发 CI
- 可在仓库设置中配置 Branch Protection Rules

---

## 🎨 设计规范

### Header 样式统一

- **Logo 高度**: `h-9`
- **Logo 与文字间距**: `gap-2`
- **文字大小**: `text-xl`
- **文字样式**: `font-black tracking-tighter uppercase`
- **文字颜色**: `dark:text-slate-100`

### Footer 样式统一

- **Logo 高度**: `h-7`
- **Logo 与文字间距**: `gap-2`
- **文字样式**: `tracking-tighter`
- **对齐方式**: 与 Header 样式对齐

### 导航文案

- **设备页面**: 统一使用 'Equipment'
- **图标**: 使用 'kitchen' 图标
- **PC 导航项**: 5 项

---

## 🌍 国际化 (i18n)

### 支持的语言 (25 种)

- 中文(简体) `zh-CN`
- 中文(繁体) `zh-TW`
- 英文 `en`
- 日文 `ja`
- 韩文 `ko`
- 阿拉伯语 `ar`
- 德语 `de`
- 西班牙语 `es`
- 法语 `fr`
- 意大利语 `it`
- 葡萄牙语 `pt`
- 俄语 `ru`
- 泰语 `th`
- 土耳其语 `tr`
- 越南语 `vi`
- 印尼语 `id`
- 马来语 `ms`
- 希伯来语 `he`
- 印地语 `hi`
- 他加禄语 `fil`
- 荷兰语 `nl`
- 波兰语 `pl`

### 翻译 key 统计

- **当前使用**: 347 个 key
- **已清理**: 356 个未使用 key (2026-03-17)
- **优化比例**: 减少 51%

### 翻译文件位置

- 主配置: `src/assets/ui-i18n.json`
- 语言文件: `src/assets/lang/{lang}-ui.json`
- 系统翻译: `src/assets/js/translations.js`

---

## ⚡ 性能优化

### DOM 操作最佳实践

1. **批量渲染**: 使用 `innerHTML` 单次赋值
2. **避免循环 DOM 操作**: 零循环中直接 `appendChild`
3. **组件挂载**: 使用 `DocumentFragment`
4. **单次插入**: 所有组件采用单次 DOM 插入模式

### 性能指标

| 指标 | 数值 | 评估 |
|------|------|------|
| 循环中直接 appendChild | 0 次 | ✅ 完美 |
| 批量 DOM 操作 | 24 次 | ✅ 最优 |
| DocumentFragment 使用 | 1 处 | ✅ 正确 |
| 单次 insertBefore | 22 次 | ✅ 合理 |

### 图片优化

- 添加 `loading="eager"` 关键图片
- 添加 `width` 和 `height` 属性
- 使用 WebP 格式
- 压缩优化脚本: `scripts/optimize-images.js`

### 缓存策略

- Service Worker 版本: `v0-0-5`
- 缓存类型: language-cache, language-files-cache, image-cache
- 自动更新策略

---

## 🛠️ 可用工具

### 分析工具

```bash
# DOM 操作分析
node scripts/analyze-dom-fragment.js

# 图片分析
node scripts/analyze-images.js

# 动画分析
node scripts/analyze-animations.js

# 检查重复脚本
node scripts/check-duplicate-scripts.js
```

### 优化工具

```bash
# 图片优化
node scripts/optimize-images.js

# 添加图片尺寸
node scripts/add-image-dimensions.js

# 验证图片尺寸
node scripts/verify-image-dimensions.js

# 修复 HTML 标签
node scripts/fix-html-tags.js
```

### 构建工具

```bash
# 构建翻译
node scripts/build-i18n.js

# 发布流程
node scripts/release.js

# 初始化开发环境
node scripts/init-dev.js
```

---

## 📝 文档

### 核心文档

- `README.md` - 项目说明
- `docs/dom-best-practices.md` - DOM 操作最佳实践
- `docs/dom-fragment-analysis-report.md` - DOM 分析报告
- `docs/dom-fragment-optimization-report.md` - DOM 优化报告
- `docs/p2-2-task-report.md` - P2-2 任务报告

### 内部文档 (docs/)

- `home-bottom-nav-analysis.md` - 首页底部导航分析
- `static-deployment-analysis.md` - 静态部署分析

---

## 🔄 版本历史

### 近期提交

```
e93c530 - fix: 修复 HTML img 标签格式错误 (2026-03-17)
1f7f522 - feat: 优化 DOM 操作性能并清理未使用翻译 key (2026-03-17)
```

### 分支信息

- **主分支**: `main` (生产)
- **开发分支**: `dev-test` (当前)
- **功能分支**: `feat/*` (新功能)
- **修复分支**: `fix/*` (Bug 修复)

---

## 👥 团队规范

### Code Review

- 所有 PR 必须 Code Review
- 必须通过 CI 检查
- 遵循项目代码风格
- 测试覆盖率要求: > 80%

### 提交信息格式

```
<type>: <subject>

类型:
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 样式调整
- refactor: 重构
- perf: 性能优化
- test: 测试
- chore: 构建/工具
```

---

## 📞 支持

### 问题反馈

- 创建 GitHub Issue
- 联系项目负责人
- 查看 README.md 获取更多信息

### 相关资源

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Jest 文档](https://jestjs.io/docs/getting-started)
- [Web Workers 文档](https://developer.mozilla.org/en-US/docs/Web/API/Worker)

---

## 🔄 SPA 路由实现状态 (2026-03-18)

### 架构设计

**实现方案**: HTML5 History 模式 SPA

**核心组件**:
- `src/index.html` - SPA 入口文件
- `src/assets/js/spa-router.js` - 路由客户端
- `src/_redirects` - GitHub Pages 部署配置

**工作原理**:
```
访问 /home
    ↓
服务器返回 index.html (单一入口)
    ↓
spa-router.js 拦截路由
    ↓
加载 /pages/home/index-{device}.html
    ↓
提取 Header, Content, Footer
    ↓
只替换 Content 区域 (无刷新)
```

### 已完成工作

✅ **基础架构**
- [x] 创建统一入口 `src/index.html`
- [x] 创建路由客户端 `spa-router.js`
- [x] 创建 GitHub Pages 部署配置 `_redirects`
- [x] 修复服务器配置支持 SPA fallback

✅ **核心功能**
- [x] 设备检测 (mobile/tablet/pc)
- [x] 路由拦截和导航
- [x] 内容提取和渲染
- [x] Header/Footer 挂载
- [x] 浏览器历史记录管理
- [x] 浏览器返回/前进按钮支持

### 当前问题 (待修复)

#### 🔴 P0 - 严重问题
- [x] **SecurityError: Failed to execute 'pushState' on 'History'** - ✅ 已修复 (2026-03-18)
  - 原因：spa-router.js 的 navigate/replace 方法未规范化路径格式
  - 解决：确保所有路径以 `/` 开头，避免协议相对URL问题
- [ ] **Header logo 点击无反馈** - 需要绑定点击事件
- [ ] **z-index 问题** - 24/7 卡片等元素层级错误
- [ ] **Header 按钮无法点击** - 语言选择、报价按钮点击无效

#### 🟡 P1 - 重要问题
- [x] **SPA路由系统冲突** - ✅ 已修复 (2026-03-18)
  - 原因：spa-app.js 和 spa-router.js 两个路由系统同时存在
  - 解决：移除所有页面中的 spa-app.js 引用（43个文件）
  - 影响：统一使用 spa-router.js，避免路由冲突
- [ ] **Footer 显示逻辑错误** - 应该在 mobile/tablet 显示，PC 隐藏
- [ ] **Header 显示逻辑** - tablet/mobile 应该显示完整导航
- [ ] **WhatsApp/Line 按钮组件化** - 只在 mobile/tablet 显示

#### 🟢 P2 - 优化建议
- [ ] **Smart Popup 重构** - 抽成可复用组件
- [ ] **性能优化** - 添加虚拟滚动、图片懒加载
- [ ] **SEO 优化** - 添加 meta 标签、结构化数据

### 下一步计划

1. **修复 P0 问题** (当前优先级)
   - 修复 Header 交互问题
   - 修复 z-index 层级
   - 确保所有按钮可点击

2. **修复 P1 问题**
   - 调整 Footer 显示逻辑
   - 优化 Header 显示
   - 组件化浮动按钮

3. **功能增强**
   - 重构 Smart Popup
   - 添加加载动画
   - 优化过渡效果

### 技术债务

- [ ] 移除旧的响应式入口文件 (index-mobile.html, index-tablet.html, index-pc.html)
- [ ] 清理重复的 spa-app.js 代码
- [ ] 统一 UI 组件接口规范

### 测试清单

- [ ] PC 端完整功能测试
- [ ] Tablet 端完整功能测试
- [ ] Mobile 端完整功能测试
- [ ] 浏览器返回/前进按钮测试
- [ ] 直接访问 URL 测试
- [ ] 刷新页面测试
- [ ] SEO 爬虫测试

---

**项目状态**: 🚀 活跃开发中 - SPA 路由实现中  
**最后更新**: 2026-03-18  
**维护团队**: Yukoli Development Team  
**当前重点**: 修复 SPA 路由交互问题
