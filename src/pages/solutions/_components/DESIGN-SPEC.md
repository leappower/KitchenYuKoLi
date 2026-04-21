# Solutions 子页面重写设计规范

## 任务目标
重写 5 个 Solutions 子页面，与 Applications 页面**完全差异化**。
Solutions 以"部署方案"为切入，展示完整的从规划到落地路径。

## 你负责的行业
**{INDUSTRY}** — 目录: `src/pages/solutions/{slug}/`

## 文件清单（你负责全部 4 个文件）
1. `index.html` — 设备检测跳转入口（仅 head + redirect script）
2. `index-pc.html` — PC 端主页面（完整内容）
3. `index-tablet.html` — 平板端（viewport 差异 + 内容与 PC 基本一致）
4. `index-mobile.html` — 移动端（viewport 差异 + 部分布局调整如 grid-cols-1）

## 页面结构（8 个 Section，按顺序）

### Section 1: Hero
- 行业标签 badge: `<span class="material-symbols-outlined">{icon}</span> {行业名}部署方案`
- 大标题: 2 行，第 2 行用 `text-primary`
- 副标题: 描述完整解决路径的价值，包含 2 个关键数据用 `text-primary font-bold` 标注
- CTA: "获取专属方案" (→ /quote/) + "ROI计算" (→ #roi-section 锚点)

### Section 2: 部署架构图 (Deployment Architecture)
- 标题: "从需求到运营，完整解决路径"
- 5 个步骤卡片，横向排列（mobile 纵向），用 CSS 绘制箭头连接
- 每个步骤: icon + 标题 + 描述 + 产出物标签
  1. 需求评估 (search) — 现场调研、运营分析
  2. 方案设计 (architecture) — 设备选型、布局规划、投资预算
  3. 设备部署 (precision_manufacturing) — 安装调试、系统集成
  4. 员工培训 (school) — 操作培训、菜品编程、日常维护
  5. 持续优化 (trending_up) — 数据分析、菜谱更新、远程支持
- **内容按行业差异化**（如快餐强调标准化出餐，火锅强调汤底一致性）

### Section 3: 工作流优化 (Before/After)
- 标题: "{行业名}厨房改造效果"
- 双栏对比布局:
  - **Before**: 红色主题，列出 3-4 个传统流程痛点（用工多、出餐慢、品质不稳）
  - **After**: 绿色主题，列出对应 YuKoLi 方案优势（自动化、标准化、高效）
- 用步骤卡片 + 对比箭头/VS 标识

### Section 4: 推荐设备组合（简化版）
- 标题: "为您推荐的设备方案"
- 2-3 个设备卡片，**聚焦方案角色**而非产品参数
- 每个卡片: 产品图 + 名称 + "方案中的角色" 描述 + 链接到 /products/
- **内容按行业差异化**

### Section 5: ROI 计算器
- **直接内嵌** `_components/roi-calculator.html` 的内容（复制粘贴）
- 保持组件完整性，不修改 JS 逻辑

### Section 6: 实施时间线
- **直接内嵌** `_components/timeline.html` 的内容（复制粘贴）
- 不修改

### Section 7: 售后保障
- **直接内嵌** `_components/after-sales.html` 的内容（复制粘贴）
- 不修改

### Section 8: CTA
```html
<section class="py-20 bg-primary">
  <div class="max-w-4xl mx-auto px-6 lg:px-8 text-center">
    <h2 class="text-3xl lg:text-4xl font-black text-white mb-6" data-i18n="sol_{slug}_cta_title">开启您的智能厨房之旅</h2>
    <p class="text-xl text-white/80 mb-8" data-i18n="sol_{slug}_cta_desc">获取专属{行业名}解决方案，让科技赋能您的餐饮事业</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="/quote/" class="bg-white text-primary px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all">免费咨询 <span class="material-symbols-outlined">arrow_forward</span></a>
      <a href="/contact/" class="px-8 py-4 rounded-xl font-bold flex items-center gap-2 border-2 border-white text-white hover:bg-white/10 transition-all"><span class="material-symbols-outlined">phone</span> 联系销售</a>
    </div>
  </div>
</section>
```

## HTML 模板规范

### index.html（跳转入口）
参考现有: `src/pages/solutions/fast-food/index.html`（当前就是个 redirect）
- canonical href 改为 `/solutions/{slug}/`
- clean-url 改为 `/solutions/{slug}/`
- 不需要 main content

### index-pc.html（主文件）
- `<head>` 部分参考 `src/pages/applications/fast-food/index-pc.html` 的 head 结构
  - 所有 URL 改为 `/solutions/{slug}/` 相关
  - data-active="solutions"
  - meta description/title 按行业定制
  - JSON-LD schema 按行业定制
- `<body>`: navigator + 8 sections + footer + scripts
- Footer: `<footer data-component="footer" data-variant="pc" data-cta="true"></footer>`
- Scripts 保持与现有一致:
  ```
  router.js, translations.js, language-dropdown.js, mobile-menu.js,
  dropdown-styles.js, products-dropdown.js, solutions-dropdown.js,
  support-dropdown.js, about-dropdown.js, contact-dropdown.js,
  nav-config.js, navigator.js, footer.js, floating-actions.js
  ```

### index-tablet.html
- 与 PC 版内容**完全一致**
- 差异仅在 head: viewport、canonical/alternate URL 路径、data-variant="tablet"

### index-mobile.html
- 内容与 PC 基本一致，但:
  - head: `maximum-scale=1.0, user-scalable=no`，data-variant="mobile"
  - 布局: `grid md:grid-cols-3` 改为 `grid grid-cols-1`（确保移动端单列）
  - hero: flex-col 布局（PC 是 flex-row）

## Style 规范
- 使用 Tailwind CSS 类（不写自定义 CSS）
- 颜色: `text-primary`, `bg-primary/10`, `bg-slate-50`, `dark:bg-slate-800` 等
- 圆角: `rounded-2xl` (卡片), `rounded-xl` (按钮/输入框)
- 阴影: `shadow-lg` (卡片), `shadow-xl` (大卡片)
- 间距: section `py-20`, 内部 `mb-16`, 卡片间距 `gap-8`
- 字体: font-display (body class 已有)
- 图标: `<span class="material-symbols-outlined">{name}</span>`

## i18n
- 所有用户可见文本加 `data-i18n="sol_{slug}_{section}_{key}"` 属性
- key 命名规范: `sol_{行业slug}_{section}_{序号或描述}`
- 例: `data-i18n="sol_fastfood_deploy_step1_title"`
- 组件中已有的 data-i18n key 保持不变

## ⚠️ 注意事项
1. 不要修改 `_components/` 目录下的任何文件
2. 不要修改其他行业的文件
3. Section 5/6/7 是内嵌组件，从 `_components/` 复制，保持原样
4. 完成后 git add + commit，但不要 push
