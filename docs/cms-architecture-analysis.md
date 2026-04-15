# KitchenYuKoLi CMS 架构分析与设计方案

> 分析日期：2026-04-15
> 更新日期：2026-04-15 (v2 — 加入页面内容管理、三端完整分析)
> 目标：让业务员通过 CMS 直接管理官网内容，一键发布

---

## 一、网站内容全景图

### 所有页面路由（24 个）

```
首页           /                          (PC 668行 / Tablet 397 / Mobile 382)
产品中心       /products/                  (PC 609行 / Tablet 731 / Mobile 652)
产品目录       /catalog/?cat=cutting       (PC 251行 — 筛选页，JS 动态渲染)
产品详情       /pdp/?model=ESL-GQ90        (PC 280行 — JS 动态渲染，模板页)
场景应用       /applications/              (PC 列表页)
  ├─ 中式快餐  /applications/fast-food/    (PC 580行 / 46个 i18n key / 7张硬编码图)
  ├─ 火锅     /applications/hotpot/       (PC 41个 i18n key)
  ├─ 云厨房   /applications/cloud-kitchen/ (PC 51个 i18n key)
  ├─ 食堂     /applications/canteen/       (PC 45个 i18n key)
  ├─ 东南亚   /applications/southeast-asian/ (PC 51个 i18n key)
  └─ 客户案例 /applications/cases/         (PC 68个 i18n key)
解决方案       /solutions/                  (PC 列表页)
  ├─ 中式快餐  /solutions/fast-food/       (PC 684行 / 46个 i18n key / 7张硬编码图)
  ├─ 火锅     /solutions/hotpot/          (PC 41个 i18n key)
  ├─ 云厨房   /solutions/cloud-kitchen/   (PC 51个 i18n key)
  ├─ 食堂     /solutions/canteen/         (PC 45个 i18n key)
  └─ 东南亚   /solutions/southeast-asian/ (PC 51个 i18n key)
服务支持       /support/                    (PC 49个 i18n key)
关于我们       /about/                      (PC 46个 i18n key)
联系我们       /contact/                    (PC 33个 i18n key)
新闻           /news/                       (PC 15个 i18n key)
ROI 计算器    /roi/                        (PC 31个 i18n key)
报价           /quote/                      (PC 52个 i18n key)
落地页        /landing/                    (PC 50个 i18n key)
感谢页        /thank-you/                  (PC 9个 i18n key)
```

### 页面内容来源分类

| 类型 | 页面 | 内容来源 | CMS 可管？ |
|------|------|---------|-----------|
| **A. 数据驱动** | products, catalog, pdp | product-data-table.js → JS 动态渲染 | ✅ 已实现 |
| **B. 模板 + i18n** | 首页, 方案页, 关于, 支持, 联系, ROI, 新闻, 报价 | HTML 模板 + data-i18n key → translations.js 替换 | 🟡 文案可管（改 JSON），图片/结构不可管 |
| **C. 纯静态** | thank-you, landing | 硬编码 HTML，几乎无动态内容 | ❌ |

---

## 二、当前 CMS 状态

### 已实现 ✅

| 模块 | 前端 | 后端 | 数据库 | 发布通道 | 可用？ |
|------|------|------|--------|---------|--------|
| 登录认证 | ✅ | ✅ | ✅ cms_users | — | ✅ |
| 产品系列 CRUD | ✅ | ✅ | ✅ product_categories | → product-data-table.js | ✅ |
| 产品 CRUD | ✅ | ✅ | ✅ products | → product-data-table.js | ✅ |
| 产品图片/视频 | ✅ 预览+删除+主图 | ✅ multipart上传 | ✅ product_images | → product-data-table.js | ✅ |
| 媒体库 | ✅ 6列卡片+筛选+预览 | ✅ 批量上传+删除 | ✅ media_library | ❌ 无 | ✅ |
| 发布（一键） | ✅ 按钮 | ✅ POST /publish | — | → product-data-table.js | ✅ |
| 审计日志 | ❌ 无页面 | ✅ 自动记录 | ✅ audit_log | — | 🟡 |

### 未实现 ❌

| 模块 | 重要性 | 阻塞发布？ |
|------|--------|-----------|
| 导航管理 | 中 | ❌ 不阻塞 |
| 多语言文案编辑 | 高 | ❌ 不阻塞（JSON 静态文件） |
| 页面内容管理 | 高 | ❌ 不阻塞（HTML 硬编码） |
| 新闻/案例管理 | 高 | ❌ 不阻塞（HTML 硬编码） |

---

## 三、核心问题分析

### 问题1：CMS 发布 ≠ 网站更新

```
CMS 点"发布"
  → 生成 src/assets/js/product-data-table.js
  → ❌ 网站不会自动更新！
  → 需要手动执行：
     1. npm run build (webpack + SSG)
     2. node scripts/release.js --skip-feishu
     3. git push（推到 GitHub Pages）
```

**业务员做不到这3步。**

### 问题2：网站产品页面是硬编码 HTML

```
src/pages/products/index-pc.html
  → 6个 <article> 是静态写死的（ESL-GQ90, Y50 等）
  → product-list.js 会动态渲染，但和静态卡片共存
  → CMS 发布只更新 JS 数据文件，不更新 HTML
```

### 问题3：图片路径不互通

```
CMS 上传 → src/admin/uploads/     ← 网站访问不到
网站引用 → src/assets/images/     ← git 管理，build 后才生效
```

### 问题4：导航数据分散在 6 个 JS 文件，互相不一致

| 文件 | 端 | 数据 |
|------|-----|------|
| `navigator.js` NAV_ITEMS | PC 主导航 | 6 个主菜单 |
| `products-dropdown.js` SUBSERIES | PC 产品下拉 | 6 个子项 |
| `solutions-dropdown.js` AUTOMATION | PC 方案下拉 | 6 个子项 |
| `applications-dropdown.js` SUBSERIES | PC 场景下拉 | 5 个子项 |
| `about/support/contact-dropdown.js` | PC 其他下拉 | 各有子项 |
| `mobile-menu.js` MENU_ITEMS | 手机端 | 独立子项列表，和 PC **完全不同** |

### 问题5：翻译是静态 JSON，CMS 无编辑能力

```
src/assets/lang/zh-CN-ui.json      (1559行, 103KB)
src/assets/lang/en-ui.json         (1559行)
src/assets/lang/zh-CN-product.json (2218行)
src/assets/lang/en-product.json    (2218行)
```

### 问题6：方案页/首页等内容是硬编码 HTML

**以 `/solutions/fast-food/` 为例（684行）：**
- 46 个 i18n key → 文案可通过改 JSON 更新
- 7 张硬编码图片路径 → `src="/assets/images/applications/fast-food-hero.webp"`
- HTML 结构写死 → section 顺序、布局不能通过 CMS 改

---

## 四、设计方案

### 设计原则

1. **发布一键到底** — 业务员点"发布"→ 网站自动更新
2. **渐进式改造** — 不破坏现有飞书同步和 build 流程
3. **CMS 是唯一数据源** — 飞书降级为导入工具
4. **三端同步** — 任何内容修改，PC/Tablet/Mobile 全部生效

---

### Phase 0：Bug 修复（已完成 ✅）

| Bug | 修复 |
|-----|------|
| `zh-CN-ui.json` 返回 HTML 导致翻译失效 | webpack CopyWebpackPlugin 加 lang 目录 |
| SPA 路由返回空白（`1ff5086` 引入） | server.js 加 dist/pages/ 回退 |
| 方案页/应用页 404 | server.js SPA fallback 加 src/ dev 回退 |
| multer 中文文件名乱码 | `defParamCharset: 'utf8'` |
| 新建产品无法上传图片 | 保存前 capture files，关闭 modal 后上传 |
| 媒体库显示太稀疏 | grid 3列 → 6列 + 响应式 |

---

### Phase 1：打通发布链路（P0）

**目标：CMS "发布"按钮 → 网站自动更新**

```
CMS 点"发布"
  → 生成 product-data-table.js（已有）
  → 图片同步到 src/assets/images/products/
  → git commit + push
  → GitHub Actions 自动 build + deploy
```

**改动：**

1. **`scripts/cms-release.sh`**：
   ```bash
   #!/bin/bash
   cd /Users/chee/Projects/KitchenYuKoLi
   # 1. 同步图片
   mkdir -p src/assets/images/products/
   cp -n src/admin/uploads/* src/assets/images/products/ 2>/dev/null
   # 2. Git 提交
   git add src/assets/js/product-data-table.js src/assets/images/products/
   git commit -m "cms: publish $(date +%Y-%m-%d %H:%M)" || true
   git push origin dev
   ```

2. **`.github/workflows/cms-publish.yml`**：
   ```yaml
   on:
     push:
       branches: [dev]
       paths:
         - 'src/assets/js/product-data-table.js'
         - 'src/assets/images/**'
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: npm ci
         - run: npm run build:production -- --skip-feishu --skip-translate
         - run: node scripts/release.js --gh-pages --skip-feishu --skip-translate
   ```

3. **publish API 触发 shell**：
   ```js
   // src/admin/api/publish.js
   const { execSync } = require('child_process');
   router.post('/publish', requireAuth, (req, res) => {
     // 1. 生成 product-data-table.js
     execSync('node scripts/cms-publish.js');
     // 2. 同步图片 + git push
     execSync('bash scripts/cms-release.sh');
     res.json({ ok: true, message: '已发布，预计2分钟内生效' });
   });
   ```

**工作量：** 0.5天

---

### Phase 2：产品页面去硬编码（P1）

**目标：产品页完全由 CMS 数据驱动**

**现状：** `products/index-pc.html` 有 6 个硬编码 `<article>`（ESL-GQ90、Y50 等），与 JS 动态渲染共存。

**改动：**
1. 删除 `index-pc.html` / `index-tablet.html` / `index-mobile.html` 中的硬编码卡片
2. 保留 `<div id="product-grid"></div>` 容器，由 `product-list.js` 动态渲染
3. 首页产品展示同理

**验证：** 删除硬编码后，三端产品页完全由 product-data-table.js 驱动

**工作量：** 0.5天

---

### Phase 3：导航管理 — 统一 6 个数据源（P2）

**目标：CMS 可编辑导航菜单项，三端同步更新**

**严重不一致（当前）：**
- mobile-menu 的 solutions 子项（kitchen/cooking-line/prep/beverage/cooling/cabinet/case）
- solutions-dropdown 的 AUTOMATION（fast-food/hotpot/cloud-kitchen/canteen/thai）
- **完全不同的两套数据！**

**方案：统一为单一数据源 + 三端消费**

1. **数据库表 `nav_items`**：
   ```sql
   CREATE TABLE nav_items (
     id INTEGER PRIMARY KEY,
     parent_id INTEGER,         -- null = 主菜单
     sort_order INTEGER DEFAULT 0,
     is_active INTEGER DEFAULT 1,
     i18n_key TEXT,             -- 翻译键
     default_label TEXT,        -- 默认中文标签
     path TEXT,                 -- /products/, /solutions/fast-food/
     icon TEXT,                 -- material icon name
     badge INTEGER DEFAULT 0,   -- 0=no, 1=HOT badge
     target TEXT DEFAULT ''     -- _blank for external
   );
   ```

2. **发布时生成 `src/assets/js/nav-config.js`**：
   ```js
   window.NAV_CONFIG = {
     mainNav: [ /* 主菜单 */ ],
     dropdowns: {
       products: [ /* 子项 */ ],
       applications: [ /* 子项 */ ],
       solutions: { automation: [ /* 子项 */ ], cases: [ /* 子项 */ ] },
       about: [ /* 子项 */ ],
       support: [ /* 子项 */ ],
       contact: [ /* 子项 */ ]
     }
   };
   ```

3. **改造 6 个消费者文件** — 全部改为读 nav-config.js：
   - `navigator.js` → `NAV_CONFIG.mainNav`
   - `products-dropdown.js` → `NAV_CONFIG.dropdowns.products`
   - `solutions-dropdown.js` → `NAV_CONFIG.dropdowns.solutions`
   - `applications-dropdown.js` → `NAV_CONFIG.dropdowns.applications`
   - `about/support/contact-dropdown.js` → 各自读 `NAV_CONFIG.dropdowns.*`
   - `mobile-menu.js` → `NAV_CONFIG`（三端自动同步！）

**CMS 前端：** 树形编辑器（拖拽排序、增删改、启用/禁用）

**工作量：** 2天（~300行后端 + ~500行前端 + ~200行消费者改造）

---

### Phase 4：多语言文案编辑（P2）

**目标：业务员可编辑所有 `data-i18n` 的翻译文本**

**当前：** 24个页面共 ~900个 i18n key，分布在 4 个 JSON 文件中。

**方案：直接读写 JSON 文件，不需要数据库**

1. **后端** — `src/admin/api/i18n.js`：
   - `GET /i18n/keys?lang=zh-CN&search=快餐&limit=50` — 搜索
   - `PUT /i18n/batch` — 批量更新翻译值
   - `POST /i18n/import` — 导入 JSON
   - `GET /i18n/export?lang=en` — 导出

2. **CMS 前端：** 表格式编辑器
   - 搜索栏（按 key 或内容模糊搜索）
   - 表格列：Key | 中文 | 英文 | 操作
   - 行内编辑 + 批量保存
   - 翻译缺失高亮（标红）

3. **AI 翻译辅助（可选）：** 一键调用翻译 API 补全空缺

**发布时：** JSON 文件已经通过 webpack CopyWebpackPlugin 进入 dist，只需 git push 即可。

**能管理的范围：**
- ✅ 所有页面的标题、段落、按钮文案（~900个 key）
- ✅ 表单标签、提示文字、错误信息
- ❌ 不包括硬编码图片路径（Phase 6 解决）
- ❌ 不包括 HTML 结构（section 增删）

**工作量：** 1-2天（~200行后端 + ~300行前端）

---

### Phase 5：新闻/案例管理（P3）

**目标：CMS 可编辑新闻和案例页面**

**方案：**
1. `posts` 数据库表（title, slug, content_markdown, cover_image, published_at, is_active）
2. 后端 CRUD + Markdown 编辑器 + 图片上传
3. SSG build 时从 DB 生成三端 HTML
4. 发布后自动生成 `/news/{slug}/` 路由

**工作量：** 3-5天（~500行后端 + ~500行前端 + ~200行 SSG）

---

### Phase 6：页面内容管理（P3）— 让 CMS 管所有页面

**目标：业务员可编辑方案页、首页、关于页等的文案和图片**

**当前现状（以 `/solutions/fast-food/` 为例）：**

```
HTML 模板（684行）
├── <h1 data-i18n="fast-food_hero_title">中式快餐连锁智能厨房解决方案</h1>   ← Phase 4 可管
├── <p data-i18n="fast-food_hero_subtitle">...</p>                            ← Phase 4 可管
├── <img src="/assets/images/applications/fast-food-hero.webp">                ← ❌ 硬编码
├── <section> (痛点描述)
│   ├── <h2 data-i18n="fast-food_pain_title">...</h2>                        ← Phase 4 可管
│   └── <p data-i18n="fast-food_pain_desc">...</p>                            ← Phase 4 可管
├── <section> (解决方案)
│   ├── <h2 data-i18n="fast-food_solution_title">...</h2>
│   ├── <img src="/assets/images/products/stir-fry-1.webp">                   ← ❌ 硬编码
│   └── ... (6个设备推荐卡片，每个都有硬编码图片和文案)
└── <section> (客户案例)
    ├── <img src="/assets/images/cases/client-1.webp">                        ← ❌ 硬编码
    └── ...
```

**方案：页面 JSON Schema + SSG 生成**

每个页面一个 JSON 配置，存数据库：

```json
{
  "page_id": "solutions-fast-food",
  "title": "中式快餐连锁智能厨房解决方案",
  "sections": [
    {
      "type": "hero",
      "title_key": "fast-food_hero_title",
      "title_zh": "中式快餐连锁智能厨房解决方案",
      "title_en": "Smart Kitchen Solutions for Fast Food Chains",
      "subtitle_key": "fast-food_hero_subtitle",
      "image": "/assets/images/applications/fast-food-hero.webp",
      "cta_text_key": "fast-food_cta",
      "cta_href": "/quote/"
    },
    {
      "type": "pain-points",
      "title_key": "fast-food_pain_title",
      "items": [
        { "icon": "groups", "title_key": "...", "desc_key": "..." },
        { "icon": "trending_down", "title_key": "...", "desc_key": "..." }
      ]
    },
    {
      "type": "equipment-grid",
      "title_key": "fast-food_equipment_title",
      "items": [
        {
          "image": "/assets/images/products/stir-fry-1.webp",
          "model": "ESL-GQ90",
          "badge": "推荐",
          "desc_key": "..."
        }
      ]
    },
    {
      "type": "cases",
      "title_key": "...",
      "images": [
        "/assets/images/cases/client-1.webp",
        "/assets/images/cases/client-2.webp"
      ]
    }
  ]
}
```

**CMS 前端：** 可视化 Section 编辑器
- 左侧：Section 列表（拖拽排序）
- 右侧：编辑面板
  - Hero Section：标题（中/英）+ 副标题 + 图片（媒体库选择）+ CTA
  - Pain Points：标题 + 多个痛点卡片（icon + 标题 + 描述）
  - Equipment Grid：标题 + 多个设备卡片（图片 + 型号 + 标签 + 描述）
  - Cases：标题 + 多张案例图
- 实时预览（iframe 加载当前页面）

**SSG 构建改造：**
```js
// build-ssg.js 改造
// 1. 从 cms.db 读取页面 JSON
// 2. 按模板 + JSON 数据生成三端 HTML
// 3. 替换 data-i18n → 直接写入对应语言的文本
// 4. 替换硬编码图片路径 → 使用 JSON 中的图片路径
```

**需要改造的页面（按优先级）：**

| 优先级 | 页面 | 当前行数 | section 数量 | 工作量 |
|--------|------|---------|-------------|--------|
| P0 | `/solutions/fast-food/` | 684 | 4-5 | 做一个模板，其他复用 |
| P1 | 其他 4 个方案页 | ~580 | 4-5 | 复用模板 |
| P2 | 5 个场景应用页 | ~580 | 3-4 | 复用模板 |
| P3 | 首页 `/` | 668 | 5-6 | 需要单独模板 |
| P4 | `/about/` `/support/` `/contact/` | ~400 | 2-3 | 简单模板 |
| P5 | `/roi/` `/quote/` | ~300 | 2-3 | 功能页，暂不 CMS 化 |

**工作量：** 5-8天（~800行后端 + ~1000行前端 + ~500行 SSG 改造）
- 第一个页面（solutions/fast-food）3天（设计模板 + 前端编辑器 + SSG）
- 其余页面各 0.5-1天（复用模板 + 迁移数据）

---

## 五、三端 UI 分析

### 现状：三套独立 HTML

每个路由都有 PC / Tablet / Mobile 三个独立 HTML 文件，布局完全不同（不是响应式 CSS）。

```
src/pages/products/index-pc.html      (609行)
src/pages/products/index-tablet.html  (731行)
src/pages/products/index-mobile.html  (652行)
```

### SSG 构建处理三端

`build-ssg.js` 有 variant 机制：
- 按 variant（pc/tablet/mobile）分别生成 HTML
- `<div id="navigator" data-variant="auto">` 让 JS 根据设备加载正确版本
- 公共部分（header/footer/导航）模板复用，main 内容区不同

### 三端内容同步策略

| 内容类型 | 同步方式 | CMS 影响 |
|---------|---------|---------|
| 产品数据 | product-list.js 三端共用 ✅ | CMS publish 一次，三端生效 |
| 翻译文本 | translations.js 三端共用 ✅ | 改 JSON 一次，三端生效 |
| 导航结构 | 6 个独立 JS ❌ | Phase 3 统一为 nav-config.js |
| 页面文案 | HTML 内 data-i18n ✅ | Phase 4 改 JSON 即可 |
| 页面图片 | HTML 硬编码路径 ❌ | Phase 6 页面 JSON 管理 |
| 页面布局 | 三套独立 HTML ⚠️ | **不需要 CMS 管理**（设计师职责） |

### 关键结论

**三端同步的核心是"数据与模板分离"：**

```
数据层（CMS 管理）           模板层（前端维护）
├─ product-data-table.js     ├─ index-pc.html（骨架 + CSS）
├─ nav-config.js             ├─ index-tablet.html
├─ lang/*.json               ├─ index-mobile.html
└─ page-contents.json           └─ UI 组件 JS
         ↓                           ↓
    CMS publish → git push → build → 三端同时生效
```

**CMS 只管数据，不管布局。** 布局和样式是前端/设计师的工作。只要数据层统一，三端天然同步。

---

## 六、实施路线图

```
Phase 0 ✅ Bug 修复（已完成）
  └── 翻译 JSON、SPA 路由、multer 乱码、产品上传等 6 个 bug

Phase 1 (0.5天) ─ 打通发布链路 P0
  ├── cms-release.sh（图片同步 + git push）
  ├── GitHub Actions workflow
  └── publish API 触发 shell

Phase 2 (0.5天) ─ 产品页面去硬编码 P1
  ├── 删除 products 页静态卡片
  ├── 确认 product-list.js 三端动态渲染
  └── 首页产品展示改为动态

Phase 3 (2天) ─ 导航管理 P2
  ├── nav_items 表 + CRUD
  ├── 树形编辑器前端
  └── nav-config.js 生成 + 6个消费者文件改造

Phase 4 (1-2天) ─ 多语言文案编辑 P2
  ├── i18n API（读写 JSON 文件）
  ├── 表格式编辑器 + 搜索 + 批量保存
  └── AI 翻译辅助（可选）

Phase 5 (3-5天) ─ 新闻/案例管理 P3
  ├── posts 表 + CRUD
  ├── Markdown 编辑器
  └── SSG 生成动态页面

Phase 6 (5-8天) ─ 页面内容管理 P3
  ├── 页面 JSON Schema 设计
  ├── CMS 可视化 Section 编辑器
  ├── SSG 改造（从 DB 生成三端 HTML）
  └── 逐页迁移（先方案页，后首页）
```

---

## 七、CMS 能力矩阵

| 操作 | 现在 | Phase 1+2 后 | Phase 3+4 后 | Phase 6 后 |
|------|------|-------------|-------------|-----------|
| 增删改产品 | ✅ | ✅ 一键发布到网站 | ✅ | ✅ |
| 增删改产品系列 | ✅ | ✅ | ✅ | ✅ |
| 上传产品图片/视频 | ✅ | ✅ 同步到网站 | ✅ | ✅ |
| **一键发布到官网** | ❌ | **✅** | ✅ | ✅ |
| **编辑导航菜单** | ❌ | ❌ | **✅** 三端同步 | ✅ |
| **编辑页面文案（中/英）** | ❌ | ❌ | **✅** | ✅ |
| **编辑页面图片** | ❌ | ❌ | ❌ | **✅** |
| **编辑页面结构（section 排序）** | ❌ | ❌ | ❌ | **✅** |
| 管理新闻/案例 | ❌ | ❌ | ❌ | 🟡 Phase 5 |
| 管理翻译 | ❌ | ❌ | **✅** AI 辅助 | ✅ |

**关键里程碑：**
- **Phase 1+2 完成后** → CMS 从"玩具"变成"可用工具"，业务员能管理产品并发布
- **Phase 3+4 完成后** → CMS 覆盖 80% 的日常内容更新需求
- **Phase 6 完成后** → CMS 覆盖所有页面内容，真正的全站 CMS
