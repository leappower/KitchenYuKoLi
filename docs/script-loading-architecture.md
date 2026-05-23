# KitchenYuKoLi 脚本加载架构诊断

## 架构问题：SSR + SPA 混合的同一份 HTML

### 当前模式

同一份 HTML 文件被用于两种完全不同的场景：

| 场景 | 路径 | 行为 |
|------|------|------|
| SSR 直出 | 首次访问 `/cases/bangkok/` | 浏览器加载完整 HTML，执行所有脚本 |
| SPA 加载 | 从 home 点击链接 | Swup fetch 同一份 HTML，只取 `#spa-content`，脚本由 `reloadPageScripts()` 管理 |

### 根本矛盾

SSR 直出需要所有脚本（navigator/footer/页面逻辑/SPA路由），
SPA 加载只需要页面特定脚本（header/footer 已在 SPA shell 中执行）。

但两者使用的是**同一份 HTML 文件**，没有区分。

### 为什么反复出问题

每次改动涉及三个层面的连锁反应：

```
┌─────────────────────────────────────────────────────┐
│ 第1层：源页面模板（src/pages/*/index-*.html）       │
│   126 个文件，各自手动维护 script 标签              │
│   各页面脚本集合不一致（如 home 有 42 个，case 有 12 个）│
│   新增页面时脚本容易遗漏                             │
├─────────────────────────────────────────────────────┤
│ 第2层：build-ssg.js 注入                            │
│   generateRouteIndex / generateResponsiveEntry /     │
│   copyDeviceFiles / generateRootIndex               │
│   4 个生成点，每个调用最多 7 个 inject 函数          │
│   每个 inject 函数独立维护一组脚本路径              │
│   新增 JS → 需要新 inject 函数 + 4 处调用点          │
│   ← nav-config.js 创建后忘了加 inject 函数 → 全站文案消失│
├─────────────────────────────────────────────────────┤
│ 第3层：运行时 SPA 脚本管理（reloadPageScripts）     │
│   _globalScriptPatterns 正则匹配全局脚本            │
│   SPA 导航时：匹配的跳过，不匹配的重新注入          │
│   新增全局脚本 → 必须更新正则 → 否则重复注入或遗漏  │
│   ← swup 脚本曾被重复注入                            │
└─────────────────────────────────────────────────────┘
```

### 根本原因

**三层各自维护脚本列表，没有单一真相源。**

以前加一个新 JS 文件需要：
1. 想清楚它是全局还是页面特定的
2. 在 src/index.html 手动加 `<script>`
3. 在 build-ssg.js 加 inject 函数
4. 在 4 个 SSG 生成点调用它
5. 更新 spa-router.js 的 `_globalScriptPatterns` 正则
6. 在 126 个页面模板里…等等，不需要，因为 build-ssg 会注入

任何一步遗漏 → 部分页面脚本缺失 → bug。

## 已修复的部分

### core-scripts.json（本次重构）
✅ 第2层已经统一 —— 所有 inject 函数合并为一个 `injectCoreScripts(html, routeSlug)`
✅ 单一脚本清单，新增 JS 只需改 JSON

### 仍存在的问题

| 层级 | 问题 | 严重性 |
|------|------|--------|
| 第1层 | 126 个页面模板 script 标签不一致 | 中 —— build-ssg 注入补足了，但页面自带多余脚本 |
| 第3层 | `_globalScriptPatterns` 正则仍需手维护 | 中 —— 新增全局脚本忘记更新正则 → SPA 重复注入 |
| 全局 | SSR/SPA 同一份 HTML 的矛盾 | 低 —— 当前工作正常，但架构不干净 |
| 全局 | defer 脚本执行顺序不可见 | 中 —— navigator.js 依赖 nav-config.js，必须在之前执行，但只靠文件顺序保证 |

## 建议

### 短期（今天可做）
1. `_globalScriptPatterns` 也从 core-scripts.json 的 `core` 数组自动生成
   → 消除第3层的手动维护

### 中期（需要更多测试）
2. SSR 直出的 HTML 可以更轻量 —— 去掉 header/footer 脚本，让它们随 SPA shell 加载
   → 但这会影响非 SPA 环境（无 JS 的爬虫）的显示
