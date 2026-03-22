# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed — 2026-03-16 · router.js 路径全面修正 + 导航链接绑定修复

**根本原因**：`router.js` 的 `PAGES` 常量使用的是旧版 root-level 路径（`/catalog/`、`/quote/` 等），与实际文件位置（`src/pages/catalog/index-pc.html` → devServer `/pages/catalog/index-pc.html`）不匹配，导致所有按钮/链接跳转都 404。

- **`src/assets/js/router.js`** — 全面路径修正：
  - `PAGES` 常量重写：所有 7 条路径更新为 `/pages/xxx/index-pc.html` 格式，新增 `pdp`、`support`、`esg`、`roiCalculator` 四条路径
  - `navMap` 修正：`ROI Calculator` → `/internal/strategy/roi-calculator-pc.html`（原错误指向 `/quote/`）；`IoT OS` / `Support` → `/pages/support/iot-index-pc.html`（原错误指向 `/quote/` 或 `/catalog/`）；`Solutions` → `/pages/pdp/index-pc.html`；新增 `ESG Report`、`Global Benchmarks` 映射
  - `wireQuoteButtons()` — 当 `page-interactions.js` 已加载（`showSmartPopupManual` 可用）时，让弹窗逻辑优先，避免 router 重复绑定导致冲突
  - `wireHomeLogo()` — 扩展为识别品牌名/餐厅图标的 logo 链接，不只是 `href="/"`
  - `init()` 页面检测 — 所有 `path.indexOf('/catalog')` 等更新为同时兼容 `/pages/xxx` 新路径和旧路径
  - `wireBottomNav()` — home 检测新增 `path.indexOf('home')` 条件
  - `initHome()` 中 "ROI Calculator" 按钮从 `PAGES.quote` 改为 `PAGES.roiCalculator`
  - `initCaseStudies()` 中 "Launch ROI Calculator" 同上修正

### Fixed + Added — 2026-03-16 · F1-F8 交互功能全量实现 + 404 路由修复

Per `yukoli_2026_comprehensive_guide.html` spec F1-F8:

- **`webpack.config.js`** — devServer 404 修复:
  - 新增 `src/pages/` → `/pages` 静态服务挂载，解决 `/pages/support/iot-index-pc.html` 等所有页面在开发服务器 404 的根本问题
  - 新增 `src/internal/` → `/internal` 静态服务挂载
  - 新增 `src/assets/` → `/assets` 挂载（补充 ui-i18n-merged.json 访问）

- **`src/assets/js/page-interactions.js`** — F1-F8 全量新增:
  - **F1 `initScrollAnimation()`** — IntersectionObserver 滚动进入动画；`threshold: 0.12`；自动注入 `.animate-hidden/.animate-visible` CSS 类；交错延迟（3档）；降级兼容不支持 IO 的浏览器
  - **F2 `initStickyCTA()`** — 粘性底部 CTA 栏；滚动 200 px 后显示；感谢页/报价页/邮件页自动跳过；用户关闭后不再复现；CSS 动画上滑入场
  - **F3 `initProgressiveDisclosure()`** — `[data-expand]` 属性及 "show more / read more" 文本自动识别；展开/收起动画（max-height transition）；aria-expanded 无障碍属性
  - **F4 `initLazyLoad()`** — `<img data-src>` IntersectionObserver 懒加载；`rootMargin: 50px` 预加载；不支持 IO 时立即 fallback 全量加载
  - **F5 `initBackToTop()`** — 固定右下角返回顶部按钮；滚动 400 px 后出现；Material Symbols 箭头图标；品牌橙色阴影
  - **F6 `initToastSystem()`** — 轻量 Toast 通知系统；覆盖 `window.showNotification`；success/error/info 三种类型；3 秒自动消失；最多同时展示 3 条；aria-live 无障碍
  - **F7/F8 `initPageTransition()`** — 页面离开 fade-out 动画（0.2 s）；页面进入 fade-in 动画（0.25 s）；仅拦截同源 `.html` 链接，不影响外链/锚点/mailto

---

### Added — 2026-03-16 · Yukoli 2026 ROI Chart.js Integration + Google Maps Architecture (§2.3 / §1.2)

Per `yukoli_2026_comprehensive_guide.html` spec:

- **`src/internal/strategy/roi-calculator-pc.html`** — §2.3 ROI 动态图表:
  - 引入 Chart.js 4.4.3 CDN（固定版本，生产稳定）
  - 主图表区域：静态 div 柱状图 → `<canvas id="roi-cumulative-chart">` (Chart.js Bar)
  - 新增 Manual vs Automated 劳动力曲线对比图：`<canvas id="roi-labor-compare-chart">` (Chart.js Line)

- **`src/assets/js/page-interactions.js`** — §2.3 + §1.2 双重扩展:
  - `initROICalculator()` 新增 `initCharts()`: 初始化 5-Year Cumulative 柱状图和 Manual vs Automated 折线图；Chart.js 未加载时安全降级
  - `initROICalculator()` 新增 `updateCharts()`: 每次 `runCalculation()` 触发时实时更新两张图表数据（500ms 动画）
  - 新增 `initServiceCenterMap()`: Google Maps 服务中心地图完整架子（8个全球 Hub 坐标、橙色品牌 marker、InfoWindow）
  - 新增 `serviceCenterSearch()`: Geocoder Places API 文字搜索，定位后自动高亮最近 Yukoli Hub
  - `initIoTSupportPage()`: 地图 zoom 按钮从 TODO 升级为委托 `_yukolicServiceMap` 实例；搜索按钮区分 API 已加载/未加载两条路径
  - 暴露 `window.initGoogleMapsCallback`: Google Maps `async defer callback` 触发点，API 加载完成后自动初始化地图
  - 新增 N1–N3 详细 TODO 注释块：PDP 3D 旋转（需 three.js + GLTF）、PDP Hotspot（需 HTML 坐标标记）、IoT 实时遥测（需 WebSocket 后端）

- **`src/pages/support/iot-index-pc.html`** — §1.2 地图容器:
  - 地图容器添加 `id="yukoli-service-map"` 供 Maps API 挂载
  - 新增 `id="yukoli-service-map-fallback"` 静态背景图（Maps 未加载时显示）
  - 添加 Google Maps JS API script 占位注释，含详细启用步骤和 API Key 申请地址

### Added — 2026-03-16 · Yukoli 2026 Interaction & Animation Enhancement

Per `yukoli_2026.html` spec §1–§5:

- **`src/assets/css/styles.css`** — New animation & interaction utility classes:
  - `.btn-cta` / `.btn-primary` hover: `#d4521a` bg + `translateY(-4px)` lift + drop-shadow (§3.2)
  - `.field-error` + `.shake` keyframe (0.2 s): red border + shake on invalid input blur (§4)
  - `.field-error-msg`: inline error message helper
  - `.skeleton` + `@keyframes shimmer` (1.2 s loop): shimmer loading placeholder for KPI cards (§3.2)
  - `.iot-pulse` + `@keyframes iot-breathe` (2 s cycle): green↔orange breathing-light on sensor nodes (§3.1)
  - `.form-collapsing` + `@keyframes form-collapse` (0.4 s): form collapse on successful submit (§4)
  - `.form-success-overlay` + `@keyframes checkmark-draw`: animated SVG checkmark reveal (§4)
  - `.stylelintrc.json`: disabled conflicting `color-function-notation` override (kept `alpha-value-notation: number`)

- **`src/assets/js/page-interactions.js`** — Enhanced interactions:
  - `openWhatsAppWithPreset()`: WhatsApp deep-link with context-aware preset message (§4)
  - `addCTAHoverClass()`: auto-tags orange CTA buttons with `.btn-cta` on init
  - `bindInlineValidation()`: on-blur real-time field validation (email / phone / required) (§4)
  - `showFormSuccess()`: form collapse + green checkmark overlay + 1.5 s auto-scroll to calendar (§4)
  - `animateNumber()`: RAF-based number counter (ease-out cubic, configurable duration + suffix) (§3.2)
  - ROI calculator `runCalculation()`: KPI values now animate via `animateNumber()` over 500 ms
  - ROI "Recalculate" button: 0.8 s skeleton screen on KPI cards before result reveal (§3.2)
  - `bindForms()`: calls `submitContactForm` immediately (sync) then shows visual success overlay; inline validation gates submit (§4)

- **`src/assets/js/init.js`** — New DOMContentLoaded hooks:
  - `initIoTPulse()`: auto-applies `.iot-pulse` to elements with `[data-iot-node]`, `[data-sensor]`, `.iot-node`, `.sensor-dot`, `.node-indicator` selectors (§3.1)
  - `initGeoHero()`: injects locale-based hero badge — SEA locales → "8-Month Payback · WhatsApp Direct Support" (orange); others → "ESG Compliant · Energy Star Certified" (green) (§2.2)

### Changed

- **目录结构重组（方案 B）**：以"受众"为唯一分类维度，彻底消除 `marketing/` 目录

  - `src/marketing/emails/` (7 files) → `src/pages/emails/`（面向终端用户，归入 pages/）
  - `src/marketing/linkedin/` (5 files) → `src/pages/linkedin/`（面向终端用户，归入 pages/）
  - `src/marketing/ab-test/` (6 files) → `src/internal/ab-test/`（内部工具）
  - `src/marketing/crm/` (6 files) → `src/internal/crm/`（内部工具）
  - `src/marketing/strategy/` (3 files) → `src/internal/strategy/`（内部工具）
  - `src/pages/strategy/` (2 files) → `src/internal/strategy/`（合并，内部工具）
  - `src/marketing/` 目录已删除
- **新增** `src/internal/README.md` 说明内部工具目录用途、访问权限与命名约定

### Updated
- `src/router-test.html`：重构为 "User-Facing Pages"（含 emails/linkedin）和 "Internal Tools" 两个 section，更新所有路径引用
- `scripts/patch-responsive-redirect.py`：`marketing/emails/*` 和 `marketing/linkedin/*` 路径更新为 `pages/emails/*` 和 `pages/linkedin/*`
- `src/assets/js/page-interactions.js`：`/pages/strategy/roi-calculator-pc.html` 更新为 `/internal/strategy/roi-calculator-pc.html`
- `docs/ARCHITECTURE.md`：同步目录树、文件数量统计

---

## [0.0.3] — 2026-03-15

### Fixed
- 修复全站按钮点击无响应：服务端 CSP `script-src-attr 'none'` 阻断了所有内联事件属性（`onclick`、`onsubmit` 等），导致页面所有交互静默失效

### Changed
- **`src/index.html`**：移除全部 **54 处**内联事件属性（onclick × 52、onsubmit × 2、onkeyup × 1），改为零内联事件；给三个静态弹窗触发按钮（`jump-btn-1`、`hero-btn-primary`、`custom-cta-btn`）补加 `data-action="show-popup"` 属性
- **`src/assets/utils.js`**：
  - 新增 `bindAllEvents()` 函数，`DOMContentLoaded` 时统一用 `addEventListener` 绑定所有静态 HTML 元素事件（语言切换、弹窗开关、移动菜单、联系按钮、表单提交等）
  - `renderProductFilters()`：移除 filter 按钮模板中的 `onclick`，改用 `data-filter` 委托，渲染后重新绑定
  - `renderMobileProductSideControls()`：移除轮播按钮 `onclick`，innerHTML 设置后立即按 id 绑定
  - `renderProducts()` / meta 区域：移除分页上下页按钮 `onclick`，改用 `data-page` 属性委托绑定；产品卡片弹窗按钮改用 `data-action="show-popup"` 委托绑定
  - `renderPagination()`：移除所有分页按钮 `onclick`，改用 `data-page` 属性委托，渲染后重新绑定
  - 用户意图检测 `closest()` 选择器：将 `[onclick="showSmartPopupManual()"]` 改为 `[data-action="show-popup"]`
  - 恢复 `clearCache()` 的统计日志输出（测试套件依赖该输出）

### Docs
- `ARCHITECTURE.md`：更新 utils.js 模块描述，补充 CSP 兼容事件绑定机制、数据属性约定；更新服务端 CSP 配置表，加入 `script-src-attr 'none'` 说明
- `SECURITY.md`：新增"内联事件处理器消除"章节，详述合规方案和维护注意事项

---

## [0.0.2] — 2026-03-15

### Fixed
- 修复产品图片无法显示的 bug：`imageRecognitionKey` 来自飞书 i18n 数据时为原始型号格式（如 `ESL-GB60_1`），未经 `modelToImageKey()` 转换直接使用，导致 `IMAGE_ASSETS` 查找失败、图片 404。现统一经 `modelToImageKey()` 转为 `snake_case` 小写格式
- 修复 Service Worker 更新通知防重逻辑漏洞（原 `Date.now()` 比较永不匹配）

### Changed
- 清理源码无效代码、重复逻辑和旧遗留（净减 166 行）：
  - 删除 `MobileMenuModule`（函数体为空的死代码）
  - 删除 `BackToTopModule`（与 `utils.js` 中 `setupBackToTopButton` 功能重复）
  - 删除 `detectRuntimeEnv()`（从未调用的废弃函数）
  - 删除 `image-assets.js` 中两个 `@deprecated` 且无调用的函数
  - 删除 `product-list.js` 中 `assembleProductSeries` 无用的 `options` 参数
  - 删除 `utils.js` 中 `submitViaMailto` 重复的字段
  - 清理全部调试日志

### Added
- 所有分支推送前强制执行 `lint:all` + `test:ci` 检查（`.githooks/pre-push`）
- GitHub Actions `CI Gate` job，对所有分支推送/PR 自动触发 lint → test → build → docker
- 重组 `docs/` 文档目录，删除 28 个过时文档，新增 7 个规范化文档

---

## [0.0.1] — 2026-03-01

### Added
- 多语言支持：25 种语言，分离式文件格式（`{lang}-ui.json` + `{lang}-product.json`）
- 飞书多维表格数据同步（`scripts/generate-products-data-table.js`）
- Gemini API 批量翻译引擎（`scripts/unified-translator.js`），支持增量翻译
- 品牌词保护机制（`scripts/product-translation-handler.js`）
- 图片资产管理：WebP 转换 + 增量压缩缓存（`scripts/optimize-images.js`）
- 产品懒加载（`IntersectionObserver` + `MutationObserver`）
- Service Worker（PWA 支持，版本更新提示）
- 一键发布脚本（`scripts/release.js`）：版本管理 → 飞书 → 翻译 → 打包 → 孤立分支推送
- Express 服务端：Helmet 安全头、rate limiting、compression
- Docker 容器化支持
- webpack 5 构建：contenthash 缓存破坏、PostCSS/Tailwind CSS
- ESLint + Stylelint 代码质量检查
- Jest 单元测试框架
