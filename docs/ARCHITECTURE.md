# 系统架构与模块原理

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              浏览器（客户端）                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ src/ (2026 新版 — 主生产目录 + webpack 构建源)                        │    │
│  │   index.js    ── webpack ESM 入口（副作用导入所有 IIFE 模块）          │    │
│  │   pages/                                                            │    │
│  │     <page>/index.html  ── 响应式统一入口（方案C，JS 检测屏宽重定向）   │    │
│  │     <page>/index-pc.html / index-tablet.html / index-mobile.html    │    │
│  │     home / catalog / landing / case-studies / quote / thank-you     │    │
│  │     pdp / support / strategy（2026 新增）                             │    │
│  │   internal/  ── 内部工具（ab-test / crm / strategy，仅团队访问）          │  │
│  │   assets/                                                            │    │
│  │     css/styles.css          独立设计系统（品牌变量 + Tailwind CDN）    │    │
│  │     js/                     IIFE 模块（window.xxx，无构建工具依赖）    │    │
│  │       common.js             window.CommonUtils                       │    │
│  │       media-queries.js      window.MediaQueries                      │    │
│  │       lang-registry.js      window.LANG_REGISTRY                     │    │
│  │       translations.js       window.TranslationManager                │    │
│  │       image-assets.js       window.ImageAssets                       │    │
│  │       contacts.js           window.Contacts                          │    │
│  │       navigation.js         window.Navigation                        │    │
│  │       product-data-table.js window.PRODUCT_DATA_TABLE（自动同步）     │    │
│  │       product-list.js       window.PRODUCT_SERIES                    │    │
│  │       utils.js              window.AppUtils                          │    │
│  │       products.js           window.Products                          │    │
│  │       smart-popup.js        window.smartPopup                        │    │
│  │       sidebar.js            window.Sidebar                           │    │
│  │       main.js               window.app                               │    │
│  │       init.js               window.userActivity（SW 注册 + 追踪）     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  运行时按需 fetch（需配套 assets/lang/ 目录）：                               │
│  └── /assets/lang/{lang}-ui.json      UI 文本（约 16KB/语言）               │
│  └── /assets/lang/{lang}-product.json 产品文本（约 200KB/语言）             │
└──────────────────────────────────────────────────────────────────────────────┘
                             ↑ 静态资产服务
┌──────────────────────────────────────────────────────────────────────────────┐
│              服务端 / 静态托管                                                │
│  开发：Express (server.js)   生产：Nginx / 静态 CDN（零构建直接托管 src/）   │
└──────────────────────────────────────────────────────────────────────────────┘
                             ↑ 数据/翻译写入
┌──────────────────────────────────────────────────────────────────────────────┐
│              构建时数据层                                                     │
│  飞书多维表格 → generate-products-data-table.js                               │
│               → src/assets/js/product-data-table.js（webpack + 静态 HTML）   │
│  Gemini API   → unified-translator.js → {lang}-product.json                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **目录说明（2026-03-16 重组后）**
> - `src/` — **主生产目录 + webpack 构建源**：多页面静态 HTML，`src/index.js` 为 webpack ESM 入口，打包输出到 `dist/`
> - `src-backup/` — 原 Webpack SPA 体系历史备份；测试文件（ESM 可 import）暂时指向此目录，待 `src/assets/js/` 重构为 ESM 后迁移

---

## 前端模块详解

### 1. `init.js` — 立即执行层

**职责：** 页面加载时第一批执行的代码，不等待 DOM ready。

**Service Worker 注册流程：**
```
navigator.serviceWorker.register('./sw.js')
  ├── updatefound 事件 → 新 SW 安装中
  │     └── statechange === 'installed' + controller 存在
  │           → showServiceWorkerUpdateNotification()（弹出"有新版本"提示）
  ├── controllerchange 事件 → 新 SW 已激活 → window.location.reload()
  └── registration.waiting 存在 → 直接弹出更新提示（页面刷新前已有等待中的 SW）
```

**更新通知机制：**
- 通过 `document.getElementById('sw-update-notification')` 判断是否已弹出，避免重复
- 用户点击"立即更新" → 向 waiting SW 发送 `{ type: 'SKIP_WAITING' }` → 触发 `controllerchange` → 自动刷新
- 用户点击关闭 → 仅移除通知 DOM，不触发更新（下次加载页面时再次提示）

**用户行为追踪（`userActivity` 对象）：**
- 每秒递增 `timeOnPage`、`timeOnProductSection`
- 监听 scroll / mousemove / click 更新 `lastActivityTime` 和 `scrollDepth`
- `inProductSection` 通过 `#produkten` 区域的 IntersectionObserver 维护
- 追踪数据供 `smart-popup.js` 的弹窗系统（Smart Popup）使用，控制弹出时机

---

### 2. `main.js` — App 容器与模块注册

**架构模式：** `App` 类持有所有功能模块，统一初始化，单点管理。

```javascript
// 注册顺序决定初始化顺序
app.registerModule('formValidation', new FormValidationModule());
app.registerModule('lazyLoading',    new LazyLoadingModule());
app.registerModule('errorHandling',  new ErrorHandlingModule());
```

**初始化流程：**
1. DOM ready（`DOMContentLoaded` 或已加载）时调用 `app.initialize()`
2. 遍历所有注册模块，依次调用 `module.init()`
3. 全部无错误 → `<main>` 元素添加 `.loaded` 类（消除 FOUC）
4. 设置 `this.initialized = true`，防止重复初始化

**三个内置模块：**

| 模块 | 类名 | 职责 |
|------|------|------|
| formValidation | `FormValidationModule` | 拦截 `<form>` submit，校验 `required` 字段 |
| lazyLoading | `LazyLoadingModule` | `IntersectionObserver` 管理 `img[data-src]` 懒加载 |
| errorHandling | `ErrorHandlingModule` | 全局 JS 错误、未处理 Promise rejection、网络状态监听 |

**LazyLoadingModule 详细机制：**
- `rootMargin: '100px'`：图片进入视口前 100px 即开始加载
- 使用 `data-lazyObserved='1'` 标记已被 Observer 观察的图片，避免重复注册
- `MutationObserver` 监听 `#product-grid`（或 `#products`），自动处理动态渲染的产品卡片图片
- 加载失败降级：WebP → PNG（同名）→ 内联 SVG 占位图

---

### 3. `utils.js` — 业务函数库

**加载方式：** IIFE（立即执行函数表达式），所有函数挂载到 `window.AppUtils`，供其他模块调用。

```javascript
(function attachAppUtils(global) {
  global.AppUtils = {
    IMAGE_ASSETS, PRODUCT_SERIES,
    resolveImage, applyImageAssets,
    buildProductCatalog, getSeriesFilters, getCategoryI18nKey
  };
})(window);
```

**事件绑定机制（CSP 兼容）：**

服务端 CSP 配置了 `script-src-attr 'none'`，**全站禁止内联事件属性**（`onclick="..."`、`onsubmit="..."` 等）。所有事件通过以下两种方式绑定：

1. **静态 HTML 元素** — 由 `bindAllEvents()` 函数在 `DOMContentLoaded` 时统一用 `addEventListener` 绑定。该函数在 IIFE 末尾定义并自动调用。

2. **动态渲染的 HTML**（`innerHTML` 方式注入）— 每次渲染后立即在容器内用 `querySelectorAll` + `addEventListener` 重新绑定。涉及函数：
   - `renderProductFilters()` — filter 按钮，通过 `data-filter` 属性委托绑定
   - `renderMobileProductSideControls()` — 移动端轮播导航，通过 `id` 直接绑定
   - `renderProducts()` — 产品卡片按钮，通过 `data-action="show-popup"` 委托绑定；同时重新绑定 filter 按钮
   - `renderPagination()` — 分页按钮，通过 `data-page` 属性委托绑定
   - meta 区域分页上/下页按钮，通过 `data-page` 属性委托绑定（随 `renderProducts` 内调用的 meta 渲染一并处理）

**数据属性约定：**

| 属性 | 用途 |
|------|------|
| `data-filter="<key>"` | 产品系列过滤按钮标识 |
| `data-page="<n>"` | 分页按钮目标页码 |
| `data-action="show-popup"` | 触发 Smart Popup 弹窗的按钮（静态 HTML 与动态卡片统一） |
| `data-code="<lang>"` | 语言切换按钮语言代码 |
| `data-i18n="<key>"` | 需要国际化翻译的元素 |

**函数分类：**

| 分类 | 主要函数 |
|------|---------|
| 翻译 | `tr(key, fallback)` — 翻译快捷函数 |
| 产品展示 | `renderProducts()` `renderProductFilters()` `renderPagination()` |
| 分页 | `goToPage(page)` `getItemsPerPage()` |
| 移动端适配 | `isMobileProductCarousel()` `scrollMobileProducts()` |
| 图片 | `resolveImage(key)` `applyImageAssets(root)` |
| 联系方式 | `startWhatsApp()` `startEmail()` `startPhone()` 等 |
| 暗色模式 | `initDarkMode()` |
| 弹窗 | `applyPopupVisibility()` `showSmartPopupManual()` `closeSmartPopup()` |
| 表单 | `submitViaMailto(formData, formType)` |
| 状态追踪 | `loadUserState()` `saveUserState()` `trackScrollDepth()` |
| 事件绑定 | `bindAllEvents()` — DOMContentLoaded 时统一绑定所有静态 HTML 事件 |

---

### 4. `translations.js` — 国际化核心

**TranslationManager 类结构：**

```
currentLanguage      当前语言（localStorage 优先，默认 zh-CN）
translationsCache    Map<lang, mergedTranslations>  已加载缓存
pendingLoads         Map<lang, Promise>             防并发重复加载
keyPathCache         Map<key, path>                 键路径缓存（性能优化）
domObserver          MutationObserver               DOM 变化自动翻译
cachedElements       已缓存的 DOM 元素引用（减少 querySelectorAll 开销）
```

**翻译加载流程：**
```
loadTranslations(lang)
  ├── 命中 translationsCache → 直接返回
  ├── 命中 pendingLoads → 等待已有 Promise（防重复请求）
  └── fetchTranslations(lang)
        ├── loadUITranslations(lang)     → fetch /assets/lang/{lang}-ui.json
        ├── loadProductTranslations(lang) → fetch /assets/lang/{lang}-product.json
        ├── mergeTranslations(ui, product)
        ├── 写入 translationsCache
        └── 失败时 fallback 到 zh-CN
```

**文件分离策略（UI 优先）：**
- `{lang}-ui.json`：约 16KB，页面文本、导航、标签等，首屏必需
- `{lang}-product.json`：约 200KB，产品名称、参数描述等，按需加载

**DOM 自动翻译：**  
通过 `data-i18n="key"` 属性标记需要翻译的元素，`TranslationManager` 在语言切换时批量更新。

---

### 5. `image-assets.js` — 图片路径映射

**src/ 版本（静态 HTML 体系，无构建工具）：**
```javascript
// 静态资源（logo、cert 等）硬编码
// 产品图通过 loadFromManifest() 运行时异步加载
global.ImageAssets = { IMAGE_ASSETS, resolveImage, imgTag, loadFromManifest };
```

**src-backup/ 版本（Webpack 构建体系）：**
```javascript
import manifest from './images/image-manifest.json';
// → IMAGE_ASSETS 在模块加载时同步可用，无运行时 fetch
```

**分类规则：**
- `NON_PRODUCT_KEYS`：logo、背景、证书、工厂图等固定资产（硬编码路径）
- `productImages`：从 manifest 自动展开，过滤 NON_PRODUCT_KEYS 后动态生成

**对外 API：**
```javascript
IMAGE_ASSETS['esl_gb60_1']   // → 'images/esl_gb60_1.webp'
resolveImage('esl_gb60_1')   // → 'images/esl_gb60_1.webp'
imgTag('esl_gb60_1', 'alt')  // → '<img src="images/esl_gb60_1.webp" ...>'
```

---

### 6. `product-list.js` — 产品数据处理

见 [PRODUCT_DATA.md](./PRODUCT_DATA.md) 的详细说明。

---

## 服务端（`server.js`）

**技术栈：** Express + Helmet + express-rate-limit + compression

**安全配置（Helmet）：**

| 策略 | 值 |
|------|-----|
| CSP defaultSrc | `'self'` |
| CSP styleSrc | `'self'` `'unsafe-inline'` `fonts.googleapis.com` |
| CSP scriptSrc | `'self'` `cdn.tailwindcss.com` |
| CSP scriptSrcAttr | `'none'`（禁止所有内联事件属性，如 `onclick="..."`） |
| CSP imgSrc | `'self'` `data:` `https:` `http:` |
| HSTS | maxAge=31536000，includeSubDomains，preload |

> **注意：** `script-src-attr 'none'` 要求全站 HTML（包括 JS 动态生成的 innerHTML）不得使用内联事件属性。所有事件必须通过 `addEventListener` 绑定。详见 [utils.js 事件绑定机制](#3-utilsjs--业务函数库)。

**限流：** 15 分钟窗口，每 IP 最多 100 次请求。

**用途区分：**
- 开发环境：运行 Express 提供 webpack-dev-server 的代理
- 生产环境：推荐使用 Nginx 直接托管 `src/`，Express 仅在需要服务端逻辑（如定时飞书同步）时使用

---

## webpack 构建配置（src-backup 体系）

> **说明：** webpack 现在指向 `src-backup/`，用于维护旧 SPA 构建管线，不影响 `src/` 静态部署。

**入口/出口：**
```
入口：  src-backup/index.js
输出：  dist/bundle.[contenthash:8].js    （生产，带哈希用于缓存破坏）
        dist/bundle.js                    （开发，无哈希）
        dist/styles.[contenthash:8].css   （生产）
publicPath: '/'（固定根路径，避免 Nginx/Docker 子路径误检测）
clean: true（每次重建自动清空 dist/）
```

**CSS 处理链：**
```
开发：  style-loader → css-loader → postcss-loader（热更新）
生产：  MiniCssExtractPlugin → css-loader → postcss-loader（提取为独立 CSS 文件）
```

**生产额外复制（CopyWebpackPlugin）：**
```
src-backup/assets/lang/         → dist/assets/lang/    （仅 *-ui.json、*-product.json、languages.json）
src-backup/assets/images/       → dist/images/
src-backup/sw.js                → dist/sw.js
factory-tour.mp4                → dist/factory-tour.mp4（如存在）
```

**开发服务器（devServer）：**
- 端口 5000
- 静态目录优先级：`dist/assets/lang` > `src-backup/assets/lang`（支持构建后预览）
- 图片目录：`dist/images` > `src-backup/assets/images`
- `Service-Worker-Allowed: /`（允许 SW 在根路径注册）

---

## src/ — 2026 主版 UI（静态多页面）

> **2026-03-16 升格为主生产目录**（原 `src2/`）。纯静态多页面 HTML，**不经过 Webpack 构建，无构建工具依赖，图片通过 ImageAssets IIFE 模块按需加载**，可零配置直接 CDN 托管。

### 目录结构

```
src/
├── index.html                          ← 路由中枢（按屏幕宽度跳转 PC/Tablet/Mobile）
├── assets/
│   ├── css/
│   │   └── styles.css                  ← 独立设计系统（Public Sans + 品牌变量）
│   └── js/                             ← 所有 JS 模块（IIFE + window.xxx）
│       ├── common.js           window.CommonUtils
│       ├── media-queries.js    window.MediaQueries
│       ├── lang-registry.js    window.LANG_REGISTRY
│       ├── translations.js     window.TranslationManager
│       ├── image-assets.js     window.ImageAssets
│       ├── contacts.js         window.Contacts
│       ├── navigation.js       window.Navigation
│       ├── product-data-table.js  window.PRODUCT_DATA_TABLE
│       ├── product-list.js     window.PRODUCT_SERIES
│       ├── utils.js            window.AppUtils
│       ├── products.js         window.Products
│       ├── smart-popup.js      window.smartPopup
│       ├── sidebar.js          window.Sidebar
│       ├── main.js             window.app
│       ├── init.js             window.userActivity
│       └── page-interactions.js  window.PageInteractions（2026新增，全站按钮/表单/弹窗交互层）
│
├── pages/                              ← 面向用户的功能页面（36 个 HTML）
│   ├── home/           (6 files)       PC / Tablet / Laptop / Mobile / Mobile-Unified + index.html 入口
│   ├── catalog/        (4 files)       PC / Tablet / Mobile + index.html 入口
│   ├── landing/        (4 files)       PC / Tablet / Mobile + index.html 入口
│   ├── case-studies/   (8 files)       PC+Tablet+Mobile × 案例列表 + PDF下载 + index.html 入口
│   ├── quote/          (4 files)       PC / Tablet / Mobile + index.html 入口
│   ├── thank-you/      (3 files)       PC / Mobile + index.html 入口
│   ├── pdp/            (4 files)       PC / Tablet / Laptop / Mobile（产品详情页）
│   ├── support/        (3 files)       ESG-PC / IoT-Support-PC / IoT-Support-Mobile
│   ├── emails/         (7 files)       Follow-Up #1~#3 × PC+Mobile + Auto-Responder（面向终端用户）
│   └── linkedin/       (5 files)       Carousel + Single Image + Lead Gen Form × 2 + Video Storyboard（面向终端用户）
│
└── internal/                           ← 内部工具（仅团队访问，无响应式路由，65 个 HTML 总计）
    ├── ab-test/        (6 files)       Email Variants × 3 + Dashboard + Strategy + Logic Analysis
    ├── crm/            (6 files)       Scaling Dashboard + Lead Scoring + Lead Journey × SE Asia/Western + Market Journey + SE Asia Simulation
    └── strategy/       (5 files)       ROI Calculator + Home Specs + Media Buying Plan + Budget Simulator + SE Asia Budget Strategy
```

**合计：1 导航页 + 1 CSS + 16 JS + 65 HTML = 83 个文件**

### JS 模块加载顺序（依赖顺序）

```
1. common.js             → window.CommonUtils
2. media-queries.js      → window.MediaQueries
3. lang-registry.js      → window.LANG_REGISTRY
4. translations.js       → window.TranslationManager（依赖 LANG_REGISTRY）
5. image-assets.js       → window.ImageAssets
6. contacts.js           → window.Contacts
7. navigation.js         → window.Navigation（依赖 MediaQueries + CommonUtils）
8. product-data-table.js → window.PRODUCT_DATA_TABLE（自动同步，332KB 数据）
9. product-list.js       → window.PRODUCT_SERIES（依赖 PRODUCT_DATA_TABLE + ImageAssets）
10. utils.js             → window.AppUtils（依赖 PRODUCT_SERIES + ImageAssets）
11. products.js          → window.Products（依赖 MediaQueries + CommonUtils + AppUtils）
12. smart-popup.js       → window.smartPopup（依赖 MediaQueries + Contacts）
13. sidebar.js           → window.Sidebar（依赖 MediaQueries）
14. main.js              → window.app（懒加载 + 表单验证 + 错误处理）
15. init.js              → window.userActivity（SW 注册 + 用户行为追踪）
16. page-interactions.js → window.PageInteractions（依赖 contacts.js + smart-popup.js，全站按钮/表单/弹窗交互层，DOMContentLoaded 自动初始化）

── 可复用 UI 组件（按需引入，顺序不限，依赖 translations.js）──
17. ui/navigator.js → window.Navigator （PC/Tablet 顶部导航组件，统一版）
18. ui/min-display-footer.js → window.MinDisplayFooter （Mobile/Tablet 底部导航栏 + FAB 组件）
```

---

### 可复用 UI 组件

三个组件统一采用 **占位符替换模式**：在 HTML 中放置一个 `<div data-component="xxx">` 占位，JS 加载后自动读取 `data-*` 属性配置并替换为完整 HTML。

#### `navigator.js` — PC / Tablet 顶部导航（统一版）

> **取代旧版 `pc-header.js`（已废弃）。** 支持 PC 和 Tablet 两种变体，通过 `data-variant` 区分。

```html
<!-- PC variant -->
<div data-component="navigator"
     data-variant="pc"
     data-active="catalog"
     data-search="true"
     data-cta-text-key="nav_get_quote"
     data-cta-href="/pages/quote/index-pc.html">
</div>

<!-- Tablet variant -->
<div data-component="navigator"
  data-variant="tablet"
  data-active="home"
  data-cta-text-key="nav_get_quote"
  data-cta-href="/quote/index-tablet.html">
</div>

<script src="/assets/js/ui/navigator.js"></script>
```

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `data-variant` | `"pc"` | 渲染变体：`pc`（语言下拉右对齐 absolute）/ `tablet`（语言下拉居中 fixed） |
| `data-active` | `""` | 高亮导航项 ID：`home` / `catalog` / `case-studies` / `pdp` / `support` |
| `data-search` | `"false"` | 是否显示搜索框 |
| `data-search-i18n` | `"search_placeholder"` | 搜索框 i18n key |
| `data-search-bp` | `"xl"` | 搜索框显示断点（`xl` / `lg`） |
| `data-lang` | `"true"` | 是否显示语言切换器 |
| `data-cta` | `"true"` | 是否显示 CTA 按钮 |
| `data-cta-text-key` | `"nav_get_quote"` | CTA 按钮文字的 i18n key |
| `data-cta-href` | 按 variant 自动解析 | CTA 按钮链接目标 |



#### `min-display-footer.js` — Mobile / Tablet 底部导航 + FAB

```html
<div data-component="min-display-footer"
     data-variant="mobile"
     data-active="home"
     data-fab="true"
     data-whatsapp="https://wa.me/yournumber"
     data-line="https://line.me/R/ti/p/@yourlineid">
</div>
<script defer src="/assets/js/ui/min-display-footer.js"></script>
```

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `data-variant` | `"mobile"` | 导航项集合：`mobile`（4项）/ `tablet`（5项） |
| `data-active` | `""` | 高亮导航项 ID（见下表） |
| `data-fab` | `"true"` | 是否显示右侧浮动按钮（WhatsApp / LINE / 回到顶部） |
| `data-whatsapp` | `"https://wa.me/yournumber"` | WhatsApp 链接 |
| `data-line` | `"https://line.me/R/ti/p/@yourlineid"` | LINE 链接 |

Mobile 导航项 ID：`home` / `catalog` / `insights` / `support`  
Tablet 导航项 ID：`home` / `catalog` / `solutions` / `iot` / `config`

> **Back-to-top 交互：** 组件挂载后自动绑定 scroll 监听，当 `scrollY > 300` 时显示「回到顶部」按钮，点击平滑滚动至顶部。无需额外 JS。

### 设计系统（`src/assets/css/styles.css`）

| Token | 值 |
|---|---|
| `--color-primary` | `#ec5b13`（Yukoli orange） |
| `--color-bg-light` | `#f8f6f6` |
| `--color-bg-dark` | `#221610` |
| `--font-display` | `'Public Sans', sans-serif` |
| Tailwind | CDN（`cdn.tailwindcss.com`），每个页面内嵌 `tailwind.config` |
| Icons | Material Symbols Outlined（Google Fonts CDN） |

### 响应式路由机制

每个 `index.html` 顶部注入多屏幕跳转逻辑，在 `<head>` 最顶部执行：

```javascript
// 断点：<768px → Mobile，768-1279px → Tablet，≥1280px → PC
(function() {
  var w = screen.width;
  if (w < 768) location.replace('/pages/home/mobile.html');
  else if (w < 1280) location.replace('/pages/home/tablet.html');
  else location.replace('/pages/home/pc.html');
})();
```

`scripts/patch-responsive-redirect.py` 负责批量注入/更新所有 HTML 页面的跳转脚本。

### 与 `src-backup/` 的关键差异

| 维度 | `src-backup/`（v0.0.4 Webpack 体系） | `src/`（2026 主版） |
|---|---|---|
| 打包 | Webpack（单入口 SPA） | 无打包，纯静态多页面 |
| 样式 | Tailwind（本地 PostCSS 构建）| Tailwind CDN（内嵌）|
| i18n | TranslationManager + JSON 语言包 | TranslationManager IIFE（语言包需配套）|
| 图片 | 本地 WebP（`src-backup/assets/images/`）| ImageAssets IIFE + loadFromManifest() |
| 响应式 | 单 HTML + 媒体查询 | 每页面独立 PC/Tablet/Mobile 文件 |
| JS 模块 | ESM（import/export） | IIFE + window.xxx（无构建依赖）|
| 数据 | 飞书 → 动态渲染 | product-data-table.js IIFE（飞书同步写入）|
| 发布 | GitHub Pages / Nginx / Docker（需 webpack build）| 直接托管 `src/` 目录，零构建 |

---

## 前端模块详解

### 1. `init.js` — 立即执行层

**职责：** 页面加载时第一批执行的代码，不等待 DOM ready。

**Service Worker 注册流程：**
```
navigator.serviceWorker.register('./sw.js')
  ├── updatefound 事件 → 新 SW 安装中
  │     └── statechange === 'installed' + controller 存在
  │           → showServiceWorkerUpdateNotification()（弹出"有新版本"提示）
  ├── controllerchange 事件 → 新 SW 已激活 → window.location.reload()
  └── registration.waiting 存在 → 直接弹出更新提示（页面刷新前已有等待中的 SW）
```

**更新通知机制：**
- 通过 `document.getElementById('sw-update-notification')` 判断是否已弹出，避免重复
- 用户点击"立即更新" → 向 waiting SW 发送 `{ type: 'SKIP_WAITING' }` → 触发 `controllerchange` → 自动刷新
- 用户点击关闭 → 仅移除通知 DOM，不触发更新（下次加载页面时再次提示）

**用户行为追踪（`userActivity` 对象）：**
- 每秒递增 `timeOnPage`、`timeOnProductSection`
- 监听 scroll / mousemove / click 更新 `lastActivityTime` 和 `scrollDepth`
- `inProductSection` 通过 `#produkten` 区域的 IntersectionObserver 维护
- 追踪数据供 `utils.js` 的弹窗系统（Smart Popup）使用，控制弹出时机

---

### 2. `main.js` — App 容器与模块注册

**架构模式：** `App` 类持有所有功能模块，统一初始化，单点管理。

```javascript
// 注册顺序决定初始化顺序
app.registerModule('formValidation', new FormValidationModule());
app.registerModule('lazyLoading',    new LazyLoadingModule());
app.registerModule('errorHandling',  new ErrorHandlingModule());
```

**初始化流程：**
1. DOM ready（`DOMContentLoaded` 或已加载）时调用 `app.initialize()`
2. 遍历所有注册模块，依次调用 `module.init()`
3. 全部无错误 → `<main>` 元素添加 `.loaded` 类（消除 FOUC）
4. 设置 `this.initialized = true`，防止重复初始化

**三个内置模块：**

| 模块 | 类名 | 职责 |
|------|------|------|
| formValidation | `FormValidationModule` | 拦截 `<form>` submit，校验 `required` 字段 |
| lazyLoading | `LazyLoadingModule` | `IntersectionObserver` 管理 `img[data-src]` 懒加载 |
| errorHandling | `ErrorHandlingModule` | 全局 JS 错误、未处理 Promise rejection、网络状态监听 |

**LazyLoadingModule 详细机制：**
- `rootMargin: '100px'`：图片进入视口前 100px 即开始加载
- 使用 `data-lazyObserved='1'` 标记已被 Observer 观察的图片，避免重复注册
- `MutationObserver` 监听 `#product-grid`（或 `#products`），自动处理动态渲染的产品卡片图片
- 加载失败降级：WebP → PNG（同名）→ 内联 SVG 占位图

---

### 3. `utils.js` — 业务函数库

**加载方式：** IIFE（立即执行函数表达式），所有函数挂载到 `window` 对象，供其他模块调用。

```javascript
(function attachAppUtils(global) {
  // 所有函数定义在此闭包内
  global.tr = tr;
  global.renderProducts = renderProducts;
  global.goToPage = goToPage;
  // ...
})(window);
```

**事件绑定机制（CSP 兼容）：**

服务端 CSP 配置了 `script-src-attr 'none'`，**全站禁止内联事件属性**（`onclick="..."`、`onsubmit="..."` 等）。所有事件通过以下两种方式绑定：

1. **静态 HTML 元素** — 由 `bindAllEvents()` 函数在 `DOMContentLoaded` 时统一用 `addEventListener` 绑定。该函数在 IIFE 末尾定义并自动调用。

2. **动态渲染的 HTML**（`innerHTML` 方式注入）— 每次渲染后立即在容器内用 `querySelectorAll` + `addEventListener` 重新绑定。涉及函数：
   - `renderProductFilters()` — filter 按钮，通过 `data-filter` 属性委托绑定
   - `renderMobileProductSideControls()` — 移动端轮播导航，通过 `id` 直接绑定
   - `renderProducts()` — 产品卡片按钮，通过 `data-action="show-popup"` 委托绑定；同时重新绑定 filter 按钮
   - `renderPagination()` — 分页按钮，通过 `data-page` 属性委托绑定
   - meta 区域分页上/下页按钮，通过 `data-page` 属性委托绑定（随 `renderProducts` 内调用的 meta 渲染一并处理）

**数据属性约定：**

| 属性 | 用途 |
|------|------|
| `data-filter="<key>"` | 产品系列过滤按钮标识 |
| `data-page="<n>"` | 分页按钮目标页码 |
| `data-action="show-popup"` | 触发 Smart Popup 弹窗的按钮（静态 HTML 与动态卡片统一） |
| `data-code="<lang>"` | 语言切换按钮语言代码 |
| `data-i18n="<key>"` | 需要国际化翻译的元素 |

**函数分类：**

| 分类 | 主要函数 |
|------|---------|
| 翻译 | `tr(key, fallback)` — 翻译快捷函数 |
| 产品展示 | `renderProducts()` `renderProductFilters()` `renderPagination()` |
| 分页 | `goToPage(page)` `getItemsPerPage()` |
| 移动端适配 | `isMobileProductCarousel()` `scrollMobileProducts()` |
| 图片 | `resolveImage(key)` `applyImageAssets(root)` |
| 联系方式 | `startWhatsApp()` `startEmail()` `startPhone()` 等 |
| 暗色模式 | `initDarkMode()` |
| 弹窗 | `applyPopupVisibility()` `showSmartPopupManual()` `closeSmartPopup()` |
| 表单 | `submitViaMailto(formData, formType)` |
| 状态追踪 | `loadUserState()` `saveUserState()` `trackScrollDepth()` |
| 事件绑定 | `bindAllEvents()` — DOMContentLoaded 时统一绑定所有静态 HTML 事件 |

---

### 4. `translations.js` — 国际化核心

**TranslationManager 类结构：**

```
currentLanguage      当前语言（localStorage 优先，默认 zh-CN）
translationsCache    Map<lang, mergedTranslations>  已加载缓存
pendingLoads         Map<lang, Promise>             防并发重复加载
keyPathCache         Map<key, path>                 键路径缓存（性能优化）
domObserver          MutationObserver               DOM 变化自动翻译
cachedElements       已缓存的 DOM 元素引用（减少 querySelectorAll 开销）
```

**翻译加载流程：**
```
loadTranslations(lang)
  ├── 命中 translationsCache → 直接返回
  ├── 命中 pendingLoads → 等待已有 Promise（防重复请求）
  └── fetchTranslations(lang)
        ├── loadUITranslations(lang)     → fetch /assets/lang/{lang}-ui.json
        ├── loadProductTranslations(lang) → fetch /assets/lang/{lang}-product.json
        ├── mergeTranslations(ui, product)
        ├── 写入 translationsCache
        └── 失败时 fallback 到 zh-CN
```

**文件分离策略（UI 优先）：**
- `{lang}-ui.json`：约 16KB，页面文本、导航、标签等，首屏必需
- `{lang}-product.json`：约 200KB，产品名称、参数描述等，按需加载

**DOM 自动翻译：**  
通过 `data-i18n="key"` 属性标记需要翻译的元素，`TranslationManager` 在语言切换时批量更新。

---

### 5. `image-assets.js` — 图片路径映射

**构建时静态 import manifest：**
```javascript
import manifest from './images/image-manifest.json';
// → IMAGE_ASSETS 在模块加载时同步可用，无运行时 fetch
```

**分类规则：**
- `NON_PRODUCT_KEYS`：logo、背景、证书、工厂图等固定资产（硬编码路径）
- `productImages`：从 manifest 自动展开，过滤 NON_PRODUCT_KEYS 后动态生成

**对外 API：**
```javascript
IMAGE_ASSETS['esl_gb60_1']   // → 'images/esl_gb60_1.webp'
resolveImage('esl_gb60_1')   // → 'images/esl_gb60_1.webp'
imgTag('esl_gb60_1', 'alt')  // → '<img src="images/esl_gb60_1.webp" ...>'
```

---

### 6. `product-list.js` — 产品数据处理

见 [PRODUCT_DATA.md](./PRODUCT_DATA.md) 的详细说明。

---

## 服务端（`server.js`）

**技术栈：** Express + Helmet + express-rate-limit + compression

**安全配置（Helmet）：**

| 策略 | 值 |
|------|-----|
| CSP defaultSrc | `'self'` |
| CSP styleSrc | `'self'` `'unsafe-inline'` `fonts.googleapis.com` |
| CSP scriptSrc | `'self'` `cdn.tailwindcss.com` |
| CSP scriptSrcAttr | `'none'`（禁止所有内联事件属性，如 `onclick="..."`） |
| CSP imgSrc | `'self'` `data:` `https:` `http:` |
| HSTS | maxAge=31536000，includeSubDomains，preload |

> **注意：** `script-src-attr 'none'` 要求全站 HTML（包括 JS 动态生成的 innerHTML）不得使用内联事件属性。所有事件必须通过 `addEventListener` 绑定。详见 [utils.js 事件绑定机制](#3-utilsjs--业务函数库)。

**限流：** 15 分钟窗口，每 IP 最多 100 次请求。

**用途区分：**
- 开发环境：运行 Express 提供 webpack-dev-server 的代理
- 生产环境：推荐使用 Nginx 直接托管 `dist/`，Express 仅在需要服务端逻辑（如定时飞书同步）时使用

---

## webpack 构建配置

**入口/出口：**
```
入口：  src/index.js
输出：  dist/bundle.[contenthash:8].js    （生产，带哈希用于缓存破坏）
        dist/bundle.js                    （开发，无哈希）
        dist/styles.[contenthash:8].css   （生产）
publicPath: '/'（固定根路径，避免 Nginx/Docker 子路径误检测）
clean: true（每次重建自动清空 dist/）
```

**CSS 处理链：**
```
开发：  style-loader → css-loader → postcss-loader（热更新）
生产：  MiniCssExtractPlugin → css-loader → postcss-loader（提取为独立 CSS 文件）
```

**生产额外复制（CopyWebpackPlugin）：**
```
src/assets/lang/         → dist/assets/lang/    （仅 *-ui.json、*-product.json、languages.json）
src/assets/images/       → dist/images/
src/sw.js                → dist/sw.js
factory-tour.mp4         → dist/factory-tour.mp4（如存在）
```

**开发服务器（devServer）：**
- 端口 3000
- 静态目录优先级：`dist/assets/lang` > `src/assets/lang`（支持构建后预览）
- 图片目录：`dist/images` > `src/assets/images`
- `Service-Worker-Allowed: /`（允许 SW 在根路径注册）

---


