# YoKuLi Tech - 智能商厨专家

## 架构

**SSG + Swup 混合架构**：SSG（Static Site Generation）产出 SEO 优化的完整 HTML，Swup 在前端接管导航实现 SPA 体验。

```
首次访问 → SSG 完整 HTML（SEO 友好）
后续导航 → Swup 拦截链接 → fetch 新页面 → 替换 #spa-content 内容
```

## 技术栈

- **构建**: Webpack 5 + build-ssg.js（自定义 SSG 生成器）
- **前端导航**: Swup 4（页面过渡）+ @swup/head-plugin + @swup/preload-plugin
- **样式**: Tailwind CSS
- **服务端**: Express（开发模式 + 生产静态服务）
- **多语言**: 客户端 i18n 系统（30+ 语言 JSON 翻译文件）
- **部署**: GitHub Pages（纯静态）

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（热更新服务 + 自动构建）
npm run dev

# 生产构建
npm run build       # 或 npm run build:production

# 生产构建（dev 模式，不注入版本号）
npm run build:dev

# 启动生产服务
node server.js
```

## 构建输出

`npm run build` 输出到 `dist/` 目录，包含：

```
dist/
├── index.html           # SPA shell（Swup 入口）
├── 404.html             # 404 错误页
├── robots.txt
├── home/
│   └── index.html       # SSG 首页（含完整 HTML + Swup 脚本）
├── products/
│   └── index.html       # SSG 产品页
├── cases/
│   ├── index.html
│   ├── bangkok/
│   │   └── index.html
│   └── ...
├── assets/
│   ├── js/
│   │   ├── swup.min.js           # Swup 核心
│   │   ├── swup-head-plugin.min.js
│   │   ├── swup-preload-plugin.min.js
│   │   ├── spa-router.js         # Swup 适配层（旧 SPA API 兼容）
│   │   └── ...（其他 JS 模块）
│   ├── css/
│   ├── images/
│   └── lang/
└── ...（其他路由页面）
```

## 关键文件

| 文件 | 作用 |
|---|---|
| `build.sh` | 统一构建入口：webpack → asset sync → SSG → version bump |
| `scripts/build-ssg.js` | SSG 生成器：为每个路由生成 index.html，注入 lang + swup 脚本 |
| `src/assets/js/spa-router.js` | Swup 适配层：初始化 Swup、触发 spa:load 事件、兼容旧 API |
| `src/index.html` | SPA shell：Swup 入口 + 骨架屏 |
| `server.js` | Express 服务：SSG 优先路由 + 缓存策略 |

## 构建脚本

```bash
npm run build            # 生产构建（完整流程）
npm run build:production # 同上，调用 build.sh production
npm run build:dev        # 开发构建（无版本号注入）
npm run dev              # 开发模式：nodemon + 自动构建
```

### ⚠️ 构建规范：build.sh 是唯一入口

`build.sh` 是唯一合法的构建入口。跳过它直接调用 webpack 等工具会导致构建不完整。

**build.sh 完整流程：**

| 步骤 | 做什么 | 跳过后果 |
|---|---|---|
| 1. 清理 dist | rm -rf | 残留文件污染 |
| 2. Tailwind + Webpack | 编译 CSS/JS | 代码不更新 |
| 3. 同步 assets 到 pages | 复制 lang/images 到页面子目录 | 页面 asset 404 |
| 4. 注入 lang + translations | 全局多语言初始化 | 页面 i18n 不工作 |
| 5. 版本号注入 | `?v=timestamp` 缓存破坏 | 部署后缓存不更新 |
| 6. SSG build-ssg.js | 为每个路由生成 index.html | **路由 404，Swup 无法工作** |
| 6.5 创建 case slug 别名 | 硬链接 SEO slug → 短目录 | **案例详情页 slug URL 404** |
| 7. Sitemap / search index | 搜索引擎爬取 | SEO 降级 |
| 8. 注入 device redirect | 移动端/pc 自适应 | 响应式降级 |
| 9. 验证 slug 目录 | 确认 8 个 case slug 都存在 | 缺失则构建失败 |

**错误做法（会出问题）：**
```bash
# ❌ 缺少 SSG，dist 中没有路由 index.html，案例 slug URL 404
npx webpack

# ❌ 同上，且没有 version bump
npx webpack --mode development

# ❌ 缺少 slug 硬链接，静态部署时案例详情 404
node scripts/build-ssg.js # 单独跑也不行，需要完整流程
```

**正确做法：**
```bash
# ✅ 完整生产构建
bash build.sh

# ✅ 或通过 npm 脚本
npm run build
npm run build:production
npm run build:dev
```

> `npm run dev` 也会在 nodemon 中调用 build.sh 确保 dist 完整，但开发时新增案例 slug 需要手动跑一次 `npm run build` 重建硬链接。

## 多语言

- 30+ 语言翻译文件在 `src/assets/lang/`
- 客户端 i18n 系统，`?lang=zh-CN` URL 参数切换
- 构建时注入 `lang-registry.js` + `translations.js` 到所有页面

## 部署

构建产物 `dist/` 可直接部署到任何静态服务器（GitHub Pages、Nginx、Cloudflare Pages 等）。