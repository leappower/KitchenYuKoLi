# Bug 修复汇总与修复指南

KitchenYuKoLi v1.0.0 发布前问题修复文档。

## 问题清单

### P0 — 阻塞发布

| # | 问题 | 现象 | 根因 | 修复 |
|---|------|------|------|------|
| 1 | 手机访问显示 PC 样式 | `/home/` 等目录 URL 不触发设备跳转 | `inject-device-redirect.js` 跳过目录 URL（无 .html 后缀） | `doRedirect()` 处理目录 URL |
| 2 | 根路径 / 访问白屏 | SPA Shell 空壳，无内容 | `history.replaceState` 改 URL 不触发导航 | `window.location.replace('/home/')` |
| 3 | `/products/stirfry/` hero video 不显示 | 播放按钮不出现 | `hero-video.js` 只在 home pageSpecific 中，其他页面未加载 | 移入 `core[]`，全局注入 |
| 4 | home 核心产品不展示（mobile） | 产品卡片区域空白 | `product-data-table.js` 加载晚于 `home-core-products.js` | 改为同步 `<script>` 无 defer |
| 5 | 表单提交被 CSP 阻止 | `connect-src` 缺少 GAS 域名 | CSP 未配置 `script.google.com` | 添加 GAS 域名到 CSP |
| 6 | 表单提交 CORS 错误 | GAS 不返回 `Access-Control-Allow-Origin` | 标准 `fetch` 触发 preflight | `no-cors` + JSON body，不设 Content-Type |
| 7 | contact 表单首次提交失败 | 页面刷新 | `quote-form.js` 的 `initContactForm()` 占用 `contactFormBound` 标记 | 独立标记 `contactFormSubmitBound` |

### P1 — 影响体验

| # | 问题 | 现象 | 根因 | 修复 |
|---|------|------|------|------|
| 8 | `home-core-products.js` 重复注入 | 同一 script 标签出现两次 | `build.sh` 的 `sed -i` 污染 `src/pages/` 源文件 | 版本号替换只改 dist |
| 9 | applications 场景推荐产品不显示 | 各 scenario 页面底部推荐区域为空 | `_autoInit` closure 引用旧函数 + 容器 ID 与设备不匹配 | 拆分 `scenario-products.js`，data 属性标识 |
| 10 | sitemap 为空 | 0 个 URL | 构建顺序错误：sitemap 在 SSG 之前生成 | 移动到 SSG 之后 |
| 11 | CNAME 错误 | `www.kitchen.yukoli.com` | 域名配成了带 `www` 的 | 改为 `kitchen.yukoli.com` |
| 12 | navigator/products dropdown 总览重复 | dropdown 中出现两个总览入口 | `getSubseries()` 未过滤 overview 项 | 过滤 `_separator` + overview |
| 13 | 搜索结果产品路径错误 | 跳转 404 | 路径写死 `/products/detail/<model>/`，服务器不识别 | 修正为 `/products/<category>/<model>/` |
| 14 | 表单基础校验缺失 | contact 表单无任何校验 | contact-form.js 无校验逻辑 | submit 时扫描 `[required]` 字段 |
| 15 | 首次加载闪现 footer 再显示内容 | 白屏 1-2 秒后内容出现 | defer 脚本过多，navigator/footer 是 web component 异步渲染 | 待优化 |

### P2 — 代码质量

| # | 问题 | 修复 |
|---|------|------|
| 16 | `form-interactions.js` 死代码 | 删除（62 个页面 + 4 个 JS 清理） |
| 17 | `home-core-products.js` 承载首页 + 场景两套功能 | 拆分为 `scenario-products.js` 独立文件 |
| 18 | `smart-popup.js` 引用残留 | 全部清除 |

### 已修复（追加 round 2）

| # | 问题 | 现象 | 根因 | 修复 |
|---|------|------|------|------|
| 19 | contact-dropdown 未全局注入 | 部分页面缺少联系下拉菜单 | `contact-dropdown.js` 只在部分 SPA 路由页面加载 | 移入 `core[]`，删除 16 个源文件中的硬编码 `<script>` |
| 20 | 首次渲染闪烁 (FOUC) | 页面加载时 body 显现后突然闪白 | web components (navigator/footer) 异步渲染，CSS 无初始隐藏 | `body { opacity:0 }` → `.yukoli-ready { opacity:1 }`，600ms 兜底 |
| 21 | 移动端水平滚动溢出 | 部分页面出现横向滚动条 | 50+ 页面未设 `overflow-x` 约束 | 统一补 `overflow-x-clip` |
| 22 | canteen/central-kitchen tag-pair 预警（5处） | htmlhint 报 tag-pair 错误 | canteen PC/central-kitchen PC 末尾缺 `</section></main></body>`；canteen mobile/tablet 缺 `</head><body>` | 补全缺失闭合标签 |
| 23 | 产品列表页产品网格隐藏（询价按钮不可见） | products/stirfry 等页面产品网格不显示 | `product-detail.js` 的 `ensureContainers()` 在 listing 页面误将 `#product-grid` 设 `display:none`；SSG 直出路径 `index-pc.html` 未被 URL 检查识别 | URL 检查增加 SSG 路径匹配；非 PDP 页面跳过隐藏 |
| 24 | products/detail + applications 等页面缺失全局脚本 | `helpers.js`/`page-effects.js`/`page-interactions.js`/`search-engine.js` 未注入 | 这些脚本不在 `core-scripts.json` 的 `core[]` 中。`copyDeviceFiles` 读 `src/pages/` 而非 webpack 输出的 `dist/pages/`，src 中未硬编码的脚本就不会被注入 | 加入 `core-scripts.json` core[]（按依赖顺序）|
| 25 | canteen mobile/tablet 空壳（仅 head，无 body 内容） | mobile 访问 canteen 页面时空白 | `src/pages/applications/canteen/index-mobile.html` 和 `index-tablet.html` 是空壳 redirect shell | 从 PC 版移植完整 7 个区段（30KB+），三屏适配（mobile 单列/tablet 双列），htmlhint 0 error |

### 已修复（追加 round 3 — 骨架屏）

| # | 问题 | 现象 | 修复 |
|---|------|------|------|
| 26 | SSG 直出页面无骨架屏 | SSG 首页加载时空白闪烁，等待 CSS/JS 解析 | `injectSkeletonOverlay()` 函数，在所有 SSG 页面 `</body>` 前注入骨架屏 HTML + 内联 CSS + 自隐藏 JS（3s 超时），build-ssg.js 三处调用（generateResponsiveEntry / generateRouteIndex / copyDeviceFiles）|

### 待修复

| # | 问题 | 优先级 | 方案 | 状态 |
|---|------|:--:|------|:----:|
| — | 无 | — | 所有已记录问题均已修复 | ✅ |

## 关键文件修改一览

### 新增
- `src/assets/js/scenario-products.js` — 场景推荐产品渲染器
- `doc/BUGFIX.md` — 本文档

### 修改
- `scripts/build-ssg.js` — product-data-table.js 无 defer 注入
- `scripts/inject-device-redirect.js` — 目录 URL 触发设备跳转
- `scripts/core-scripts.json` — hero-video.js 移入 core[]
- `build.sh` — 删除 sitemap 调用 + 版本号替换只改 dist
- `server.js` — CSP connect-src 加 GAS 域名
- `src/index.html` — 根路径 location.replace('/home/')
- `src/assets/js/home-core-products.js` — 移除场景推荐代码，回归首页专用
- `src/assets/js/quote-form.js` — 表单校验、JSON 提交、initContactForm 标记修复
- `src/assets/js/contact-form.js` — 新增校验、独立标记 `contactFormSubmitBound`
- `src/assets/js/ui/search-engine.js` — 产品搜索路径修正
- `src/assets/js/ui/products-dropdown.js` — 过滤 overview 子项
- `src/assets/js/ui/applications-dropdown.js` — 过滤 overview 子项
- `src/pages/applications/*/index-*.html` — 容器加 `data-scenario` / `data-device` 属性

### 删除
- `src/assets/js/ui/form-interactions.js` — 死代码

## Release 检查清单

- [x] CNAME: `kitchen.yukoli.com`
- [x] `.nojekyll` 存在
- [x] `sitemap.xml` 含 47 个 URL
- [x] `robots.txt` 正确
- [x] 12 个路由入口全部 200
- [x] 7 个 applications 场景页 3 端完整（21 个文件）
- [x] `/quote/` + `/contact/` 表单提交正常
- [x] CSP 包含 `script.google.com`
- [x] 根 `/` 跳转 `/home/`
- [x] 目录 URL 设备跳转正常
- [x] Tag: `v1.0.0` @ `0f1ae0c74`
- [x] Branch: `gh-pages` @ `a49dbdf`
- [x] FOUC 修复（anti-fouc CSS + 600ms 兜底）
- [x] 移动端水平溢出修复（50+ 页 overflow-x-clip）
- [x] canteen/central-kitchen tag-pair 预警消除（5处）
- [x] contact-dropdown 全局注入
- [x] 全局脚本注入修复 — helpers/page-effects/page-interactions/search-engine
- [x] product-grid 被误隐藏修复 — ensureContainers URL 保护
- [x] canteen mobile/tablet 空壳修复 — 补齐7区段30KB+
- [x] SSG 直出页面骨架屏注入 — injectSkeletonOverlay
- [x] 旧路径 /products/detail/{model}/ 兼容处理 — 404 路由逻辑修复
- [ ] 待 DNS CNAME 生效后开启 Enforce HTTPS

## 当前状态

所有 27 个已记录问题均已修复。
暂无待修复问题。
