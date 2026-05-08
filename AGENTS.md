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
- 使用命名函数（不要匿名）以便 removeEventListener
- 全局事件（document 级别）用 EventBus 或标记位去重

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
