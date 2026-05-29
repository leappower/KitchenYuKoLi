# 2026-05-29 全量修复报告

## 三端同步状态

```
publish: 3e2f14f7f  fix: product-detail.js ES Lint 0 errors
    ↙
dev:     75048e238  merge(publish): 同步product-detail修复到dev
    ↙
main:    ca8fb34b4  merge(dev): 同步全部修复到main
```

---

## 问题清单与修复策略

### [P0] 404.html 正则转义错误

**根因**：`build-ssg.js` 中 `generate404()` 用 JS 字符串模板拼接正则表达式。
`'\/'` 在 JS 字符串中输出为 `/`（`\/` 不是标准转义序列）。
导致生成的 404.html 中正则变成 `if (/^/products/(...`，被浏览器解析为 SyntaxError。

**修复**：将所有 `\/` 改为 `\\/`（共 4 处）。

**验证**：
- pre-commit: `build-ssg-regex` hook（vm.Script 编译验证）
- pre-push: `build-smoke` 中的 `lint-build-ssg-regex.js`
- deploy-verify: 404.html JS 语法检查

**状态**：✅ 已修复

---

### [P0] 404.html 重复 body/html 标签

**根因**：合并冲突残留。`src/404.html` 中有两组 `<body>``</body>``<html>``</html>` 标签，
中间卡着多余的 CSS 和 script 内容。浏览器解析到 304 行遇到裸露的 `<script>` 报 SyntaxError。

**修复**：删除 219-286 行重复内容。

**验证**：
- pre-push: `check_html_structure()` 扫描所有 HTML 文件的 `</body>`/`<html>` 标签数
- pre-push: 全量 `htmlhint`（所有 129 个 HTML 文件）

**状态**：✅ 已修复

---

### [P0] PDP 页面跳转 index-mobile.html 404

**根因**：`inject-device-redirect.js` 的 `needsRedirect()` 只跳过了
`/products/detail/index.html` 路径，但没有覆盖 SSG 生成的
`/products/{category}/{model}/index.html`（三级路径）产品详情页。
设备重定向脚本在这些页面上试图跳转到 `index-mobile.html` 404。

**修复**：`needsRedirect()` 中检测路径层级，三级以上的 `/products/` 路径跳过注入。

**验证**：
- pre-commit: `inject-device-redirect.test.js`（7 个路径判断测试）
- deploy-verify: 抽样检查 PDP 路由是否包含设备重定向脚本

**状态**：✅ 已修复

---

### [P0] SPA 回到首页核心产品不显示

**根因**：两层原因叠加：

1. `product-detail.js` 监听 `product-data-ready` 事件，该事件在产品列表页
   加载产品数据后被触发。SPA 从产品页回到首页时，`product-grid.js` 被
   `reloadPageScripts` 重新注入，触发 `product-data-ready`，导致
   `product-detail.js` 的 `renderPDP()` 在首页执行，渲染"产品未找到"内容，
   覆盖了 `#spa-content`。

2. `home-core-products.js` 的 `_spaOn` 使用 `AbortController` 绑定
   `document` 上的 `spa:load`，如果 AbortController 被意外触发
   （SPA content:replace 的 DOM 操作），监听器失效。

**修复**：
- `product-detail.js`：`renderPDP()` 和 `product-data-ready` 回调检查当前路径，
  只在 `/products/{category}/{model}/` 格式下执行。
- `home-core-products.js`：`window` + `document` 双监听 `spa:load`，
  移除 `_spaOn` 的 AbortController 机制。
- 新增 ES Lint `/* global */` 声明，消除 `CATEGORY_SLUG_MAP` 等报错。
- 修复变量重复声明（`path` → `_pdpPath`）。

**验证**：
- pre-push: `home-core-products.test.js`（8 个路径/设备测试）
- lint: ES Lint 0 errors

**状态**：✅ 已修复

---

### [P1] i18n "no embedded translations for en" 警告

**根因**：`translations.js` 中 `loadProductTranslations` 找不到英文版的内嵌翻译数据，
因为新版改为 JSON 文件加载方式。这是一个 `console.warn`，不影响功能。

**状态**：⚠️ 非阻塞性问题，待 E2E 测试覆盖

---

### [P1] SPA 回首页核心产品不显示（辅助修复）

**根因**：`home-core-products.js` 的 `_autoInit` 调用 `loadCoreProducts`，
`loadCoreProducts` 依赖 `sessionStorage` 缓存或 `window.PRODUCT_DATA_TABLE`。
如果 SPA 切换时 `PRODUCT_DATA_TABLE` 未就绪或缓存失效，`renderHomeCorePC`
拿到空数组渲染"暂无核心产品数据"。

**修复**：
- `spa:load` 监听使用 `requestAnimationFrame` 确保下一帧执行
- 容器不存在时 `console.warn` 而不是静默失败
- 移除 `_spaOn` 的 AbortController（改用原生 addEventListener）

**状态**：✅ 已修复

---

### [P1] CATEGORY_SLUG_MAP 找不到粗分类映射

**根因**：`utils.js` 中 `CATEGORY_SLUG_MAP` 的 key 只有细分品类名
（"中小型智能炒菜机"），而 `product-data-table.js` 中 `category` 是粗分类
（"翻炒系列"、"切配系列"）。`product-detail.js` 中 `CATEGORY_SLUG_MAP[product.category]`
返回 `undefined` 导致面包屑渲染错误。

**修复**：`CATEGORY_SLUG_MAP` 增加粗分类 slug 映射（翻炒系列→stirfry 等）。

**状态**：✅ 已修复

---

### [P1] 产品图片 fallback 路径错误

**根因**：`product-detail.js` 中 fallback 图片路径使用 `modelToSnake() + "_1.webp"`
生成 `dlb_bq40t_1.webp`，但实际文件命名是 `DLB-BQ40T-1.webp`（原 model + 连字符 + 序号）。

**修复**：改为直接用 `product.model + "-1.webp"`。

**状态**：✅ 已修复

---

### [P1] chain-restaurant HTML section 未闭合

**根因**：`src/pages/applications/chain-restaurant/index-pc.html` 中
4 个 `<section>` 只有 3 个 `</section>`，缺少 Equipment Recommendation 的闭合标签。

**修复**：补上漏掉的 `</section>`。

**验证**：pre-push 全量 htmlhint 无错误。

**状态**：✅ 已修复

---

### [P2] 构建与部署相关问题

| 问题 | 根因 | 修复状态 |
|---|---|---|
| 版本号被环境变量覆盖 | deploy.yml 的 `export VERSION` 覆盖 build.sh | ✅ build.sh 全权管理版本号 |
| CNAME/sw.js 文件缺失 | build.sh 从 `src/` 目录找，实际在根目录 | ✅ 改为从根目录找 |
| CF_TOKEN 语法错误 | `*** secrets.CF_TOKEN }}` 少 `$` | ✅ 修复语法 |
| gh-pages 不同步 | `force_orphan: true` 导致孤儿 commit | ✅ 改为 `keep_history` |
| environment secrets 读不到 | workflow 没声明 `environment:` | ✅ 加 `environment: cloudflare` |
| CF purge 失败 | CF_TOKEN Authentication error | ⚠️ token 权限待确认 |
| deploy-verify set -e 兼容 | GHA bash 2.54 + set -euo pipefail | ✅ 移除 set -e，warning 不阻断 |

---

### [P2] 验证链缺失

| 缺失项 | 补充 | 验证层 |
|---|---|---|
| build-ssg 正则转义 | `lint-build-ssg-regex.js` (vm.Script) | pre-commit |
| needsRedirect 路径判断 | `inject-device-redirect.test.js` (7 tests) | pre-commit |
| home-core-products 逻辑 | `home-core-products.test.js` (8 tests) | pre-push |
| sw.js 版本管理 | `sw-version.test.js` (6 tests) | pre-push |
| spa-router 全局脚本模式 | `spa-router.test.js` (3 tests) | pre-push |
| 构建产物完整性 | `build-output-verification.test.js` (6 tests) | GHA deploy-verify |
| 静态资源存在性 | `build-sh-assets.test.js` (7 tests) | pre-push |
| CI 配置语法 | `ci-config.test.js` (15 tests) | pre-push |
| 全量 htmlhint | 129 个 HTML 文件 | pre-push |
| HTML 结构（body/html 标签数）| 所有页面文件 | pre-push |
| deploy.yml 结构 | `ci-config.test.js`（7 项检查）| pre-push |
| pre-push 包含 jest | `npx jest tests/unit/` | pre-push |
| lefthook 管理 | `manage-lefthook.js`（替代 sed） | 工具 |

---

## 当前验证链（发版前）

```
dev commit → pre-commit
  lint-js, lint-css, lint-html
  build-ssg-regex (vm.Script)
  no-debug, no-debug-markers
  prettier, empty-script
  i18n-keys, no-git-conflict

dev push → pre-push (~36s)
  jest (58 tests, 8 files)
  JS syntax check (src/scripts 所有 JS)
  DOCTYPE check (所有 HTML)
  Empty script check (所有 HTML)
  全量 htmlhint (129 文件)
  Duplicate events check
  i18n keys check (6924 keys)
  build-ssg generate404 regex
  HTML 结构检查 (body/html 标签数)
  CSS build (tailwind)

publish push → GHA (~5min)
  build.sh (完整构建)
  deploy-verify (6 项产物验证)
  gh-pages deploy (keep_history)
  CF purge (如有有效 token)
```
