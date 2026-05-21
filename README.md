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

## 多语言

- 30+ 语言翻译文件在 `src/assets/lang/`
- 客户端 i18n 系统，`?lang=zh-CN` URL 参数切换
- 构建时注入 `lang-registry.js` + `translations.js` 到所有页面

## 部署

构建产物 `dist/` 可直接部署到任何静态服务器（GitHub Pages、Nginx、Cloudflare Pages 等）。