# Quote 页面三屏差异分析

> 路由: `/quote/`  
> 文件: `index-mobile.html` | `index-tablet.html` | `index-pc.html`  
> 分析日期: 2026-05-05

---

## 1. 页面骨架结构对比

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| `<main>` class | `flex-1 p-4 pb-28 max-w-md mx-auto w-full overflow-x-hidden` | `flex-1 max-w-[1024px] mx-auto w-full py-8 pb-24 md:py-12` | `pt-[110px]` (无 max-width，由外层 grid 控制) |
| 外层包裹 | 无 (body flex col) | `<div class="layout-container flex h-full grow flex-col">` | `<div class="relative flex min-h-screen flex-col">` |
| Navigator variant | `mobile` | `tablet` | `pc` |
| Navigator extra | 无 | `data-search="true" data-cta-text-key="nav_get_quote" data-cta-href="/quote"` | `data-cta-text-key="nav_get_quote" data-cta-href="/quote"` |
| Footer | `data-variant="mobile" data-active=""` | `data-variant="tablet" data-search="true" data-active="quote"` | 无 `<footer>` 组件 |
| 表单提交方式 | 独立 sticky 按钮 + inline JS | form 内 submit button + `quote-form.js` | form 内 submit button + `quote-form.js` |

### ⚠️ 问题

1. **Mobile footer `data-active=""`** — 应为 `"quote"` 与 tablet/pc 保持一致
2. **PC 缺少 `<footer>` 组件** — tablet 和 mobile 都有，PC 没有
3. **Mobile 缺少 `quote-form.js`** — 使用 inline script 处理表单，而 tablet/pc 引用 `quote-form.js?v=20260423`
4. **Mobile 缺少 `data-search` / `data-cta-*`** — navigator 无 CTA 按钮

---

## 2. Hero 区域

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 标签 | `<h1>` | `<h1>` | `<h1>` |
| 字号 | `text-3xl font-black` | `text-4xl md:text-5xl font-black tracking-[-0.033em]` | `text-4xl md:text-5xl font-black tracking-tight` |
| 对齐 | 左对齐 | 居中→左对齐 `text-center md:text-left` | 左对齐 |
| 描述字号 | `text-sm` | `text-lg max-w-2xl` | `text-lg max-w-2xl` |
| data-i18n key | `quote_get_quote` | `quote_get_quote` | `quote_get_quote` |
| 描述 key | `quote_hero_desc` | `quote_hero_desc` | `quote_hero_desc` |

### ⚠️ 问题

5. **PC 的 tracking 值不同于 tablet** — PC 用 `tracking-tight`，tablet 用 `tracking-[-0.033em]`（实际接近但不同 token）

---

## 3. 表单区域

### 3.1 表单容器

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| Form ID | `quote-form-mobile` | `quote-form` | `quote-form` |
| 外层卡片 | ✅ 白色卡片 `bg-white rounded-xl p-4 shadow-sm` | ✅ 白色卡片 `bg-white rounded-xl p-6 md:p-10 shadow-sm` | ❌ 无卡片包裹，直接在 `<div class="lg:col-span-8">` 内 |
| novalidate | ✅ | ✅ | ✅ |

### ⚠️ 问题

6. **PC 表单无卡片容器** — tablet/mobile 有白色圆角卡片，PC 没有，视觉风格不统一
7. **Form ID 不一致** — mobile 用 `quote-form-mobile`，tablet/pc 用 `quote-form`（已知约束）

### 3.2 表单字段布局

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 布局方式 | 全部单列 | `md:grid-cols-2` 双列 | `md:grid-cols-2` 双列 |
| 国家/地区 | 单列 | 单列 | `md:col-span-2` 横跨双列 |
| 详细需求 | 单列 | 单列 | `md:col-span-2` 横跨双列 |
| Label 样式 | `<label>` + `<span>` 独立 | `<label>` 包裹 flex-col | `<label>` block + `<div>` 包裹 |

### 3.3 输入框样式差异

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| height | `h-14` | `h-14` | `p-3`（无固定高度） |
| border | `border-primary/20` | `border-slate-300 dark:border-slate-700` | `border-slate-200 dark:border-slate-800` |
| radius | `rounded-xl` | `rounded-xl` | `rounded-lg` |
| focus | `focus:ring-2 focus:ring-primary focus:border-primary` | `focus:border-primary focus:ring-primary` | `focus:ring-primary focus:border-primary` |
| bg | `bg-white dark:bg-slate-800` | `bg-white dark:bg-slate-800` | `bg-white dark:bg-slate-900` |

### ⚠️ 问题

8. **PC 输入框 radius 与 mobile/tablet 不同** — PC `rounded-lg` vs `rounded-xl`
9. **PC 输入框无固定 height** — 用 `p-3` 替代 `h-14`，高度不一致
10. **三屏 border 颜色各不相同** — mobile `border-primary/20`，tablet `border-slate-300`，PC `border-slate-200`

### 3.4 Consent 复选框

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| Input ID | `q-consent-m` | `q-consent` | `q-consent` |
| Label 样式 | `text-xs text-slate-500` | `text-sm text-slate-600 dark:text-slate-400` | `text-base text-slate-500` |
| Icon 大小 | `size-5 accent-primary` | `size-5 rounded border-slate-300 text-primary` | `accent-primary`（无 size 限制） |

### ⚠️ 问题

11. **Consent ID: mobile 用 `q-consent-m`，其他用 `q-consent`** — 已知约束，但需注意 quote-form.js 可能引用错误 ID
12. **Consent label 字号不统一** — mobile `text-xs`，tablet `text-sm`，PC `text-base`

---

## 4. 提交按钮

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 位置 | sticky 底部固定 | 表单内 inline | 表单内 inline |
| ID | `quote-submit-mobile` (inline JS click) | form submit button | `quote-submit-btn` + form submit |
| 样式 | `h-14 rounded-xl font-bold text-lg` | `py-4 rounded-xl font-black text-xl uppercase tracking-widest shadow-xl` | `py-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-xl` |
| Icon | `send` | `arrow_forward` | `arrow_forward` |
| 触发方式 | `click` → inline validation + WhatsApp | `form submit` → `quote-form.js` | `form submit` → `quote-form.js` |

### ⚠️ 问题

13. **Mobile 表单提交逻辑完全不同** — inline JS 做 validation + Google Sheets + WhatsApp 跳转，而 tablet/pc 用 `quote-form.js` 统一处理。功能一致但维护困难
14. **Mobile 提交 icon 是 `send`**，tablet/pc 是 `arrow_forward` — 应统一
15. **Mobile 按钮字号 `font-bold`**，tablet `font-black text-xl`，PC `font-black text-lg` — 不一致

---

## 5. Trust 信号区域

### 5.1 Trust Cards（114 款设备 / 50+ 国家 / 国际认证）

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 位置 | 表单下方，独立 grid | ❌ 不存在 | sidebar `<aside>` |
| 样式 | `p-3 rounded-xl border border-primary/20` 小卡片 | — | `<li>` 列表项 + icon 背景 |
| Icon 大小 | `text-2xl` | — | `size-10 bg-primary/10 rounded-lg` |
| 布局 | `grid grid-cols-1 gap-3` | — | `<ul class="space-y-6">` |

### ⚠️ 问题

16. **Tablet 缺少独立的 Trust Cards** — mobile 有 3 张小卡片在表单下方，PC 在 sidebar 展示 4 项，tablet 两处都没有
17. **Mobile 的 Trust Cards 与 PC sidebar 内容重叠** — mobile 的 3 卡片 + details 内 4 项 = 重复展示

### 5.2 "为什么选择 YuKoLi？"

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 存在 | ✅ `<details>` 手风琴 | ❌ 不存在 | ✅ sidebar `<aside>` |
| 展示方式 | 折叠式，需点击展开 | — | 始终展开 |
| 条目数 | 4 项 | — | 4 项 |

### ⚠️ 问题

18. **Tablet 完全缺少 "为什么选择 YuKoLi？" 区域** — mobile 和 PC 都有
19. **PC 的 "为什么选择" 描述文本 data-i18n 为空** — `data-i18n=""` 缺少 key（`quote_114_products_desc` 等）

---

## 6. Trust Badges（CE / UL / ISO）

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 存在 | ✅ | ✅ | ✅ |
| 位置 | main 底部 `border-t` 分隔 | 表单下方 | sidebar `<aside>` |
| 样式 | 基本一致 | 基本一致 | 基本一致 |
| data-i18n | ✅ `quote_certifications`, `quote_ce_standard` 等 | ✅ | ✅ |

**无问题** — 三屏一致 ✅

---

## 7. Quick Contact（WhatsApp + 邮件）

| 维度 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| 存在 | ✅ | ✅ | ✅ |
| 位置 | main 底部 | 表单右侧列 | sidebar `<aside>` |
| Icon 大小 | `text-base` | `text-lg` | `text-3xl`（标题）+ `text-lg`（按钮） |
| padding | `p-5 rounded-xl` | `p-8 rounded-2xl` | `p-8 rounded-2xl` |
| 描述文本 i18n | ❌ 硬编码中文 | ❌ 硬编码中文 | ❌ 硬编码中文 |

### ⚠️ 问题

20. **Quick Contact 描述文本三屏都未加 data-i18n** — `"我们的销售团队在线为您解答疑问..."` 硬编码

---

## 8. PC 独有元素

| 元素 | 说明 |
|------|------|
| `<script type="application/ld+json">` | 结构化数据 (Schema.org) |
| max-width 审计脚本 | `setTimeout` 检查 `max-width >= 1920` |
| `<meta name="description">` | 出现两次（重复） |
| `data-cta-text-key` / `data-cta-href` | Navigator CTA 配置 |
| "必填项" 提示 | `<p class="text-xs text-slate-400 mb-2">` 表单顶部 |
| `pt-[110px]` | 为固定 header 预留空间 |

### ⚠️ 问题

21. **PC `<meta name="description">` 重复** — 出现两次，且第一个描述内容与其他两屏不同
22. **PC 独有 Schema.org JSON-LD** — mobile/tablet 缺少 SEO 结构化数据

---

## 9. Mobile 独有元素

| 元素 | 说明 |
|------|------|
| 内联表单 JS | 完整的表单验证 + Google Sheets 提交 + WhatsApp 跳转逻辑 |
| Sticky 底部按钮 | `<section>` + `sticky bottom-0` CTA |
| `<style>` nav-item hover/active | 底部导航内联样式 |
| 内联 nav-item 激活脚本 | DOMContentLoaded 设置 active class |
| `slide-menu.js` | 移动端侧滑菜单 |
| `thumb-zone-bottom` | 安全区域适配 |
| `overflow-x-hidden` | 防止横向滚动 |

---

## 10. data-i18n 键一致性检查

### 三屏共有的键 ✅

| Key | Mobile | Tablet | PC |
|-----|--------|--------|-----|
| `quote_get_quote` | ✅ | ✅ | ✅ |
| `quote_hero_desc` | ✅ | ✅ | ✅ |
| `quote_company_info` | ✅ | ✅ | ✅ |
| `quote_company_name` | ✅ | ✅ | ✅ |
| `quote_contact_person` | ✅ | ✅ | ✅ |
| `quote_phone` | ✅ | ✅ | ✅ |
| `quote_email_address` | ✅ | ✅ | ✅ |
| `quote_country_region` | ✅ | ✅ | ✅ |
| `quote_select_country` | ✅ | ✅ | ✅ |
| `quote_other_countries` | ✅ | ✅ | ✅ |
| `quote_equipment_needs` | ✅ | ✅ | ✅ |
| `quote_equipment_type` | ✅ | ✅ | ✅ |
| `quote_select_equipment_type` | ✅ | ✅ | ✅ |
| `quote_type_auto_wok` | ✅ | ✅ | ✅ |
| `quote_type_semi_auto_wok` | ✅ | ✅ | ✅ |
| `quote_type_combi_oven` | ✅ | ✅ | ✅ |
| `quote_type_soup_machine` | ✅ | ✅ | ✅ |
| `quote_type_rice_machine` | ✅ | ✅ | ✅ |
| `quote_type_full_set` | ✅ | ✅ | ✅ |
| `quote_other` | ✅ | ✅ | ✅ |
| `quote_quantity` | ✅ | ✅ | ✅ |
| `quote_kitchen_capacity` | ✅ | ✅ | ✅ |
| `quote_select_capacity` | ✅ | ✅ | ✅ |
| `quote_capacity_small` | ✅ | ✅ | ✅ |
| `quote_capacity_medium` | ✅ | ✅ | ✅ |
| `quote_capacity_large` | ✅ | ✅ | ✅ |
| `quote_capacity_enterprise` | ✅ | ✅ | ✅ |
| `quote_budget_range` | ✅ | ✅ | ✅ |
| `quote_select_budget` | ✅ | ✅ | ✅ |
| `quote_budget_consult` | ✅ | ✅ | ✅ |
| `quote_budget_5w_10w` | ✅ | ✅ | ✅ |
| `quote_budget_10w_30w` | ✅ | ✅ | ✅ |
| `quote_budget_30w_50w` | ✅ | ✅ | ✅ |
| `quote_budget_50w_plus` | ✅ | ✅ | ✅ |
| `quote_detailed_requirements` | ✅ | ✅ | ✅ |
| `quote_consent_text` | ✅ | ✅ | ✅ |
| `quote_btn_submit_inquiry` | ✅ | ✅ | ✅ |
| `quote_why_yukoli` | ✅ | ✅ | ✅ |
| `quote_114_products` | ✅ | ✅ | ✅ |
| `quote_50_countries` | ✅ | ✅ | ✅ |
| `quote_certified` | ✅ | ✅ | ✅ |
| `quote_after_sales` | ✅ | ✅ | ✅ |
| `quote_certifications` | ✅ | ✅ | ✅ |
| `quote_ce_standard` | ✅ | ✅ | ✅ |
| `quote_ul_safety` | ✅ | ✅ | ✅ |
| `quote_iso_quality` | ✅ | ✅ | ✅ |
| `quote_prefer_chat` | ✅ | ✅ | ✅ |
| `quote_send_email` | ✅ | ✅ | ✅ |

### Mobile 独有的描述键 ⚠️

| Key | Mobile | Tablet | PC |
|-----|--------|--------|-----|
| `quote_114_products_desc` | ✅ | ❌（不存在该区块） | ⚠️ `data-i18n=""` 空值 |
| `quote_50_countries_desc` | ✅ | ❌ | ⚠️ `data-i18n=""` 空值 |
| `quote_certified_desc` | ✅ | ❌ | ⚠️ `data-i18n=""` 空值 |
| `quote_after_sales_desc` | ✅ | ❌ | ⚠️ `data-i18n=""` 空值 |

### 缺失 data-i18n 的硬编码文本

| 文本 | 位置 | Mobile | Tablet | PC |
|------|------|--------|--------|-----|
| "我们的销售团队在线为您解答疑问，帮您快速找到合适的设备方案。" | Quick Contact | ❌ 硬编码 | ❌ 硬编码 | ❌ 硬编码 |
| "覆盖炒菜、蒸烤、熬汤、煮饭等全套商用厨房场景。" | Why Yukoli desc | ✅ | ❌ 无此区块 | ⚠️ 硬编码无 i18n |
| "深耕东南亚市场..." | Why Yukoli desc | ✅ | ❌ | ⚠️ 硬编码无 i18n |
| "通过 CE、UL、ISO 9001 认证..." | Why Yukoli desc | ✅ | ❌ | ⚠️ 硬编码无 i18n |
| "提供安装指导..." | Why Yukoli desc | ✅ | ❌ | ⚠️ 硬编码无 i18n |

---

## 11. JS 脚本差异

| 脚本 | Mobile | Tablet | PC |
|------|--------|--------|-----|
| `quote-form.js` | ❌ 未引入 | ✅ `v=20260423` | ✅ `v=20260423` |
| `slide-menu.js` | ✅ | ❌ | ❌ |
| `mobile-bottom-bar.js` | ✅ | ✅ | ✅ |
| 内联表单 JS | ✅ 完整验证+提交逻辑 | ❌ | ❌ |
| `floating-actions.js` | ✅ | ✅ | ✅ |
| Schema.org JSON-LD | ❌ | ❌ | ✅ |

### ⚠️ 问题

23. **Mobile 不引用 `quote-form.js`** — 使用 inline script 替代，维护成本高
24. **Mobile `quote-form.js` 中引用的 form ID 是 `quote-form`**，而 mobile 的 form ID 是 `quote-form-mobile` — 如果引入 `quote-form.js` 会找不到元素

---

## 12. 问题汇总与优先级

### 🔴 高优先级（功能缺陷）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| 1 | Mobile footer `data-active=""` | Footer 高亮状态错误 | ✅ 已修复 |
| 11 | Consent ID 不一致 | JS 引用可能失败 | ⏭ 已知约束 |
| 13 | Mobile 表单提交逻辑独立维护 | 行为可能不一致 | ⏭ 已知约束 |
| 18 | Tablet 缺少 "为什么选择 YuKoLi？" | 内容缺失 | ⚠️ 误报，已存在 |

### 🟡 中优先级（体验不一致）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| 6 | PC 表单无卡片容器 | 视觉风格不统一 | ✅ 已修复 |
| 8-10 | 输入框样式差异 (radius/height/border) | 三屏体验割裂 | ✅ 已修复 |
| 14 | 提交按钮 icon 不统一 | send vs arrow_forward | ✅ 已修复 |
| 16 | Tablet 缺少 Trust Cards | 信息展示不足 | ⚠️ 误报，已存在 |
| 19 | PC "为什么选择" 描述文本 data-i18n 为空 | 多语言缺失 | ✅ 已修复 |

### 🟢 低优先级（优化建议）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| 2 | PC 缺少 `<footer>` 组件 | 导航不完整 | ✅ 已修复 |
| 5 | PC tracking 值不同 | 微观排版差异 | ⏭ 无影响 |
| 12 | Consent label 字号不统一 | 视觉差异 | ✅ 已修复 |
| 15 | 提交按钮字号差异 | 视觉差异 | ✅ 已修复 |
| 20 | Quick Contact 描述未 i18n | 多语言缺失 | ✅ 已修复 |
| 21 | PC meta description 重复 | SEO 冗余 | ⚠️ 已不存在 |
| 22 | Mobile/tablet 缺少 JSON-LD | SEO 不完整 | ✅ 已修复 |
| 23-24 | Mobile 不用 quote-form.js | 维护成本 | ⏭ 已知约束 |

---

## 13. 修复记录 (2026-05-05)

| Fix | 说明 |
|-----|------|
| #1 | Mobile footer `data-active="quote"` |
| #2 | PC 添加 `<footer>` 组件 |
| #6 | PC 表单添加白色卡片容器 `bg-white rounded-xl p-6 md:p-10 shadow-sm` |
| #8-10 | PC 输入框样式统一：`h-14 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base px-4` |
| #12 | PC consent label `text-base` → `text-sm` |
| #14 | Mobile 提交按钮 icon `send` → `arrow_forward` |
| #15 | Mobile 提交按钮 `font-bold` → `font-black uppercase tracking-widest` |
| #19 | PC sidebar "为什么选择" 描述 `data-i18n=""` → `quote_114_products_desc` 等 |
| #20 | 三屏 Quick Contact 描述加 `data-i18n="quote_prefer_chat_desc"` |
| #22 | Mobile/tablet 补充 Schema.org JSON-LD |

### 跳过（已知约束）
| Fix | 原因 |
|-----|------|
| #11 | Mobile consent ID `q-consent-m` 为已知约束 |
| #13 | Mobile inline JS 表单提交为已知约束 |
| #23-24 | Mobile 不引用 `quote-form.js` 为已知约束 |
