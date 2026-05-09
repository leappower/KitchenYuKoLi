# AGENTS.md — KitchenYuKoLi Agent 开发规范
# 所有 AI Agent 在此项目工作前必须阅读并遵守

---

## 🚨 提交规则（最高优先级）

### 单一职责
- 每次提交**只解决一个问题**
- ❌ 禁止 "fix: all detected issues" 大杂烩提交
- ❌ 禁止一个提交同时修 CSS 间距 + JS 路由 + HTML 结构

### Debug 代码禁止入库
- ❌ 禁止提交 `console.log()` / `console.debug()` / `console.table()`
- ❌ 禁止提交 debug marker / diagnostic HTML 注释
- ✅ 如需调试输出，用条件包裹: `if (__DEVELOPMENT__) console.log(...)`
- ✅ 调试完毕后，**用单独的提交删除调试代码**，不要混在其他修改里

### 提交前必须验证
```bash
# 最小检查（每次提交前）
npx eslint src/assets/js/<修改的文件>
node --check src/assets/js/<修改的文件>

# 完整检查（push 前）
npm run lint:all
npm run build:css
```

### 提交信息规范
```
<type>(<scope>): <简短描述>

类型:
- feat:     新功能
- fix:      修复 bug
- refactor: 重构（不改行为）
- style:    样式调整
- chore:    构建/工具
- cleanup:  删除死代码

范围（可选）:
- spa:     SPA 路由相关
- css:     样式/Tailwind
- i18n:    多语言
- nav:     导航组件
- pdp:     产品详情页
- grid:    产品列表网格

示例:
- fix(spa): compare page stuck on skeleton after navigation
- feat(i18n): add Thai language support
- cleanup: remove dead pi-roi.js and navigation.js (-800 lines)
```

---

## 🏗️ 项目架构

### 技术栈
- **前端**: 原生 JavaScript（无框架），Tailwind CSS
- **构建**: Webpack（CSS pipeline only，`inject: false`）
- **后端**: Express + better-sqlite3
- **部署**: SSG 多页面 HTML + SPA 路由混合

### 页面架构
```
SSG 页面（独立 HTML，不走 SPA 路由）:
  /about/*, /support/*, /contact/*
  /applications/small-restaurant, /applications/fast-food, ...
  /products/spare-parts

SPA 页面（通过 spa-router.js 动态加载）:
  /products/*（品类页、产品详情页）
  /compare（产品对比页）

三端: PC (index-pc.html) / Mobile (index.html) / Tablet (index-tablet.html)
```

### JS 加载方式
- **JS 不走 Webpack 打包**，每个页面通过 `<script defer src="/assets/js/...">` 手动加载
- `webpack` 仅用于: CSS 编译、HTML 模板、资源复制
- `bundle.js` 是 Webpack 副产物，**没有任何页面引用它**

### 缓存策略
- 生产环境: 通过 `build.sh` 用日期版本号 `?v=YYYYMMDD` 替换
- 版本号在 build 时自动更新，**不需要手动 bump**
- `build.sh` 会同时更新 `src/pages/` 和 `dist/` 中的版本号

---

## ⚠️ 高频踩坑清单（不要再犯）

### 1. Tailwind purge
- 动态拼接的 class **一定会被 purge**
- 新增 class 后运行 `npm run build:css` 并检查输出
- 如果 class 被 purge，加到 `tailwind.config.js` 的 `safelist`
- i18n JSON 中的 class 也会被扫描（content 包含 `src/**/*.json`）

### 2. 事件监听器
- SPA 导航后页面不刷新，**事件监听器会累积**
- 所有 addEventListener 必须考虑 SPA 重复导航场景
- 全局事件（document/window 级别的 spa:load、spa:ready、languageChanged）必须使用 `_spaOn()` helper（AbortController 模式）:
  ```js
  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }
  // 用法: _spaOn(document, "spa:load", handler, "spa:load");
  ```
- `DOMContentLoaded` 不需要此模式（只触发一次）
- querySelector 获取具体元素后绑定的 click/input 不需要（SPA 后是新 DOM）

### 3. SPA 路由
- `spa-router.js` 是核心，修改前**必须测试所有页面类型**
- SSG 页面 vs SPA 页面的路由判断逻辑在服务端
- 修改路由 → 验证: 首页 → 品类页 → 详情页 → 对比页 → about 页面 全链路

### 4. Skeleton 加载
- Skeleton 必须有超时保护（max 3-5s），超时后强制隐藏
- Skeleton 必须在 DOM 内 document flow，**不要用 fixed overlay**
- 检查: 数据加载完成 → skeleton 隐藏 → 真实内容显示，三步缺一不可

### 5. 三端一致性
- 修改一个端的页面，必须检查其他两端是否有对应修改
- 间距系统: `<section class="fullwidth-bg"><div class="section-content">内容</div></section>`
- 不要在 HTML 中用内联 `style=""`，统一用 Tailwind class

### 6. CSS class 拼接
- ❌ `class="pb-${value}"` — 会被 Tailwind purge
- ✅ `class="pb-10"` — 写死完整 class
- ✅ `safelist: [{ pattern: /pb-\d+/ }]` — 如果必须动态拼接

---

## 📁 文件结构速查

```
src/
├── pages/              # SSG HTML 页面（PC/Mobile/Tablet）
│   ├── home/
│   ├── about/
│   ├── products/
│   └── applications/
├── assets/
│   ├── js/             # 运行时 JS（手动 <script> 加载）
│   │   ├── spa-router.js    ← SPA 核心
│   │   ├── product-grid.js  ← 产品列表
│   │   ├── product-detail.js← 产品详情
│   │   ├── compare.js       ← 对比页
│   │   ├── cross-sell.js    ← 交叉推荐
│   │   ├── translations.js  ← 多语言
│   │   ├── breadcrumb.js    ← 面包屑
│   │   └── ui/              ← UI 组件
│   │       ├── navigator.js      ← 导航
│   │       ├── footer.js         ← 底部栏
│   │       └── *-dropdown.js     ← 下拉菜单
│   ├── css/            # 样式（Tailwind 编译输出）
│   ├── lang/           # i18n JSON
│   └── images/         # 本地图片（webp）
├── index.js            # Webpack CSS 入口（JS 部分是死代码）
└── index.html          # SPA shell

build.sh                # 构建脚本（同步 + 版本号 bump）
webpack.config.js       # Webpack 配置（CSS only）
tailwind.config.js      # Tailwind 配置
```

---

## 🎨 前端开发规范

### HTML 规范
- **语义化标签**: 用 `<section>`, `<article>`, `<nav>`, `<main>`, `<aside>`, `<footer>` 代替无脑 `<div>`
- **标签闭合**: `tag-pair` 检查已启用（阻塞），所有标签必须正确闭合
- **DOCTYPE**: 完整 HTML 页面必须有 `<!DOCTYPE html>`；组件片段（template）可省略
- **属性值双引号**: 所有 HTML 属性值必须用双引号（HTMLHint 强制）
- **属性不能重复**: 同一元素禁止重复属性（HTMLHint 强制）
- **id 唯一**: 同一页面内 id 必须唯一（HTMLHint 强制）
- **data 属性**: 交互数据用 `data-*`（如 `data-model`, `data-wa-source`），不要塞进 class 或隐藏 span
- **避免内联样式**: ❌ `style="margin-top: 20px"` → ✅ 用 Tailwind class
- **图片**: 必须有 `alt` 属性（可空字符串装饰图），优先使用 webp 格式

### CSS / Tailwind 规范
- **只用 Tailwind class**: 不写自定义 CSS 除非 Tailwind 无法实现
- **自定义 CSS 放 `styles.css`**: 不要在 HTML `<style>` 标签里写大量样式
- **z-index 必须用 CSS 变量**: `z-[var(--z-header)]` 而非 `z-[2000]`，见 `z-index-system.css`
- **间距系统**: 统一用 `fullwidth-bg` + `section-content` 嵌套，不要自己造间距
  ```html
  <section class="fullwidth-bg"><div class="section-content">内容</div></section>
  ```
- **暗色模式**: 用 `dark:` 前缀，项目使用 `class` 策略（在 `<html>` 上切换 `dark` class）
- **响应式断点**: Tailwind 标准 `sm:` / `md:` / `lg:` / `xl:`，项目三端分别对应 mobile / tablet / pc
- **动态 class 必须完整**: ❌ `pb-${n}` → ✅ 完整 class 或 safelist
- **CSS 变量定义**: 全局变量放 `:root`，组件变量用 BEM 或语义化命名
- **颜色**: 品牌色用 tailwind.config.js 中定义的 token（`primary`, `background-light` 等），不要硬编码 hex

### JavaScript 规范
- **IIFE 封装**: 所有 JS 文件用 `(function() { 'use strict'; ... })();` 包裹，不污染全局
- **全局变量最小化**: 需要跨文件共享时挂 `window.xxx`，并写注释说明
- **DOM 查询缓存**: 同一元素多次使用时缓存引用，不要反复 querySelector
  ```js
  var btn = document.getElementById('myBtn'); // 缓存
  btn.addEventListener('click', handler);
  btn.classList.add('active');
  ```
- **事件委托**: 多个同类元素绑定相同事件时，用父元素事件委托
  ```js
  document.querySelector('.list').addEventListener('click', function(e) {
    var item = e.target.closest('.list-item');
    if (item) handleClick(item);
  });
  ```
- **SPA 全局事件用 `_spaOn()`**: 见踩坑清单第 2 条
- **元素级事件不担心重复**: querySelector 获取的新 DOM 元素每次重新绑定即可
- **XSS 防护**: 插入 HTML 前必须转义用户输入
  ```js
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
  ```
- **错误边界**: fetch/async 操作必须有 .catch() 或 try-catch
- **Magic number**: 数值常量提取为命名变量
  ```js
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  var MAX_RETRIES = 3;
  var DEBOUNCE_MS = 300;
  ```

### 图片 / 资源规范
- **格式**: 优先 webp，提供 fallback 时用 `<picture>` 标签
- **尺寸**: 必须设 width/height 属性（避免 CLS），或用 Tailwind `aspect-ratio`
- **懒加载**: 非首屏图片用 `loading="lazy"`，首屏图片不要懒加载
- **命名**: 小写 + 连字符，如 `yukoli-rice-cooker-1.webp`

### 无障碍 / Accessibility
- **按钮可点击**: `<button>` 而非 `<div onclick>`；如必须用 div，加 `role="button" tabindex="0"`
- **表单 label**: 所有 `<input>` 必须关联 `<label>`（通过 `for` / `id` 或嵌套）
- **焦点可见**: 交互元素必须有 `:focus-visible` 样式
- **键盘导航**: 下拉菜单、弹窗必须支持 Esc 关闭、Tab 遍历
- **aria 属性**: 弹窗加 `role="dialog" aria-modal="true"`，加载态加 `aria-busy`

### 性能规范
- **script 加载**: 统一用 `<script defer>`，不用 `async`（保证执行顺序）
- **CSS 放头部**: 所有 `<link>` 和 `<style>` 在 `<head>` 中
- **JS 放尾部**: `<script>` 标签在 `</body>` 前
- **避免 layout thrash**: 批量读写 DOM，不要交替读写
- **图片压缩**: 使用 tinypng/squoosh 等工具，单张不超过 200KB
- **Font**: 系统字体栈优先，Google Fonts 必须预加载关键字体 `display=swap`

---

---

## 🔧 批量编辑工具（sd）

**优先使用 `sd` 替代 `sed` 进行代码查找与替换。** `sed` 的正则语法（BRE/ERE）、分隔符转义、macOS BSD 与 GNU 行为差异极易出错。

### 安装
```bash
brew install sd
```

### 常用模式
```bash
# 单文件替换（自动 in-place）
sd 'oldPattern' 'newText' file.js

# 预览（不实际修改）
sd -p 'oldPattern' 'newText' file.js

# 纯字符串替换（不解析正则，不用转义特殊字符）
sd -F 'literal text' 'replacement' file.js

# 批量替换（配合 fd）
fd -t f -e js -x sd 'oldPattern' 'newText'

# 跨文件类型批量
fd -t f -e js -e html -x sd 'old' 'new'

# 跨行替换
sd -A 'multi\nline' 'replacement' file.html

# 带捕获组的正则替换（JS/Python 风格语法）
sd '(\w+)\s*=\s*(\d+)' '$1: Number($2)' file.js
```

### sd vs sed 速查
| 操作 | sed | sd |
|------|-----|-----|
| 基本替换 | `sed 's/old/new/g'` | `sd 'old' 'new'` |
| 纯字符串 | 需转义 | `sd -F 'literal' 'new'` |
| 路径含 `/` | `sed 's|/old|/new|g'` | `sd '/old' '/new'`（无分隔符）|
| 预览 | ❌ | `sd -p` |
| 跨行 | 反人类 | `sd -A` |
| 正则风格 | BRE/ERE | JS/Python |
| 复杂正则(lookaround等) | GNU only | 用 perl（见下方）|

### 复杂场景用 perl（macOS 自带，免安装）
```bash
# 高级正则（lookbehind、命名捕获组等 sd 不支持的）
perl -pi -e 's/(?<=fn\()\w+/$1_renamed/g' file.js

# 自定义分隔符（路径含 `/`）
perl -pi -e 's|old/path|new/path|g' file.js

# 跨行替换（-0777 吞整文件）
perl -0777 -pi -e 's/multi\nline/replacement/s' file.html

# 批量（配合 grep 定位文件）
perl -pi -e 's/old/new/g' $(grep -rl 'old' src/)
```

---

## 🧪 测试

```bash
# 单元测试
npm test

# E2E 测试（Playwright）
npx playwright test

# E2E 测试（带 UI）
npx playwright test --ui

# 全量 lint
npm run lint:all
```
