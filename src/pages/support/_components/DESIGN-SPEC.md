# Support Sub-Pages Design Specification

## Overview
5 independent sub-pages under `/support/`, each with 4 HTML files (index/pc/tablet/mobile).
Consistent with existing YuKoLi design system (Tailwind CSS, Material Symbols, Public Sans).

## Design Tokens
```
Primary:    #ec5b13 (brand orange)
Success:    #10b981 (emerald-500)
Warning:    #f59e0b (amber-500)
Info:       #3b82f6 (blue-500)
Bg Light:   #f8f6f6 | Bg Dark: #221610
Text Light: #0f172a (slate-900) | Text Dark: #f1f5f9 (slate-100)
Muted:      #64748b (slate-500)
Border:     #e2e8f0 (slate-200) | #1e293b (slate-800)
Font:       Public Sans
Icon:       Material Symbols Outlined
```

## Unified Page Structure (8 Sections)

### Section 1: Hero
```
┌─────────────────────────────────────┐
│ Badge: tag + icon                   │
│ H1: 主题 headline + primary 高亮    │
│ Description: text-lg, muted         │
│ [CTA Primary] [CTA Secondary]      │
│         ┌─────────────┐            │
│         │  Hero Image  │            │
│         │  ( engineer.jpg or         │
│         │    generic relevant)       │
│         └─────────────┘            │
└─────────────────────────────────────┘
```
- Badge: `inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest`
- H1: `text-4xl xl:text-6xl font-black leading-[1.1] tracking-tight`
- Desc: `text-lg xl:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed`
- Layout: `lg:flex-row items-center gap-12` (image right on PC, stacked on mobile)
- Image: `w-full h-[600px] bg-slate-200 rounded-3xl overflow-hidden shadow-2xl border border-white/10`
- Hero image float card overlay: `absolute bottom-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-xl`

### Section 2: Core Values (Icon Cards)
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Icon │ │ Icon │ │ Icon │ │ Icon │
│Title │ │Title │ │Title │ │Title │
│ Desc │ │ Desc │ │ Desc │ │ Desc │
└──────┘ └──────┘ └──────┘ └──────┘
```
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Card: `bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all`
- Icon: `w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary`
- Title: `text-lg font-bold mt-4`
- Desc: `text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed`

### Section 3: Process/Steps (Numbered Flow)
```
┌─────────┐  →  ┌─────────┐  →  ┌─────────┐  →  ┌─────────┐
│  01     │     │  02     │     │  03     │     │  04     │
│ Title   │     │ Title   │     │ Title   │     │ Title   │
│ Detail  │     │ Detail  │     │ Detail  │     │ Detail  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```
- Layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` (or flex with connectors)
- Step number: `text-4xl font-black text-primary/20`
- Title: `text-lg font-bold`
- Detail: `text-sm text-slate-500`
- Connector arrow (desktop): `hidden lg:flex items-center` with material icon `arrow_forward`

### Section 4: Detailed Content Area
Each page has unique content here (see per-page specs below).

### Section 5: Stats/KPI Row
```
┌──────┐ ┌──────┐ ┌──────┐
│ 99.8%│ │ 14   │ │ 48h  │
│设备率 │ │服务点 │ │响应  │
└──────┘ └──────┘ └──────┘
```
- Background: `bg-slate-900 py-12`
- Grid: `grid grid-cols-1 md:grid-cols-3 gap-8`
- Metric: `text-white text-3xl font-black`
- Label: `text-slate-400 text-sm font-semibold uppercase`
- Left border: `border-l-2 border-primary/40 pl-6`

### Section 6: Contact Channels (Shared Component)
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ WhatsApp │ │  Email   │ │  Phone   │
│ icon     │ │  icon    │ │  icon    │
│ desc     │ │  desc    │ │  desc    │
└──────────┘ └──────────┘ └──────────┘
```
- WhatsApp: `bg-[#06C755]/5 border-[#06C755]/20`
- Email: `bg-primary/5 border-primary/20`
- Phone: `bg-blue-500/5 border-blue-500/20`
- Mobile: vertical stack instead of grid

### Section 7: FAQ (Accordion)
- Container: `bg-slate-50 dark:bg-slate-900/30 py-12`
- Item: `<details>` with `<summary>`
- Style: `bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden`
- Summary: `flex items-center justify-between p-5 cursor-pointer font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50`
- Content: `px-5 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed`
- Chevron icon: `material-symbols-outlined text-slate-400 transition-transform`

### Section 8: CTA
```
┌─────────────────────────────────────┐
│     Heading (white, centered)       │
│     Description (slate-400)         │
│     [Primary CTA] [Secondary CTA]   │
│  bg-slate-900 rounded-[3rem]         │
│  decorative blur circles             │
└─────────────────────────────────────┘
```
- Container: `bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center flex flex-col items-center gap-8 relative overflow-hidden`
- Blur decorations: `absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full`
- Heading: `text-4xl md:text-5xl font-black text-white leading-tight`
- Primary CTA: `bg-primary text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-primary/40 hover:scale-105 transition-transform`
- Secondary CTA: `bg-white/10 text-white border border-white/20 backdrop-blur-sm px-10 py-5 rounded-2xl font-black text-lg hover:bg-white/20 transition-colors`

## Responsive Rules

### PC (≥1280px)
- Hero: flex-row, image on right
- Grids: 3-4 columns
- Section padding: `py-12` to `py-16`
- Container: `px-6 md:px-8 xl:px-10`

### Tablet (768px-1279px)
- Hero: flex-row, image on right (slightly smaller)
- Grids: 2 columns
- Navigator variant: `data-variant="tablet"`
- Main: `pt-[56px]` (tablet header height)

### Mobile (<768px)
- Hero: stacked, image below text, height reduced
- Grids: 1 column
- Navigator variant: `data-variant="mobile"`
- Main: no extra padding-top (navigator handles via placeholder)
- Images: `h-[300px]` instead of `h-[600px]`
- CTA buttons: full-width `w-full`
- Touch targets: min 44px

## HTML Template

### Head (PC)
```html
<!DOCTYPE html>
<html class="light" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="description" content="[SEO description]"/>
<meta property="og:type" content="website">
<meta property="og:title" content="YuKoLi 智能厨具 | [Page Title]">
<meta property="og:description" content="[SEO desc]">
<meta property="og:url" content="https://www.kitchen.yukoli.com/support/[page]/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>YuKoLi 智能厨具 | [Page Title]</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimizations.css"/>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
```

### Body wrapper
```html
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
<div class="relative flex h-auto min-h-screen w-full flex-col">
<navigator data-component="navigator" data-variant="pc" data-active="support" data-cta-text-key="nav_get_quote" data-cta-href="/quote"></navigator>
<main id="spa-content" class="pt-[110px]">
<!-- sections here -->
</main>
</div>
<!-- scripts -->
</body>
```

### Script block (standard)
```html
<script src="/assets/js/ui/dropdown-styles.js"></script>
<script defer src="/assets/js/ui/products-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/solutions-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/applications-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/support-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/about-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/contact-dropdown.js?v=20260322-v3"></script>
<script defer src="/assets/js/nav-config.js?v=20260415"></script>
<script defer src="/assets/js/ui/navigator.js?v=20260322-v3"></script>
<script defer src="/assets/js/ui/search-engine.js"></script>
<script defer src="/assets/js/ui/footer.js?v=20260322-v3"></script>
<script defer src="/assets/js/lang-registry.js"></script>
<script defer src="/assets/js/translations.js"></script>
<script defer src="/assets/js/translations-dropdown-template.js"></script>
<script defer src="/assets/js/contacts.js"></script>
<script defer src="/assets/js/ui/smart-popup.js"></script>
<script defer src="/assets/js/router.js"></script>
<script defer src="/assets/js/page-interactions.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
    if (window.translationManager) window.translationManager.initialize();
});
</script>
<script src="/assets/js/utils/device-utils.js"></script>
<script src="/assets/js/spa-router.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    if (window.SpaRouter && typeof window.SpaRouter.init === 'function') {
        window.SpaRouter.init();
    }
});
</script>
```

### index.html redirect
```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=index-pc.html"></head><body></body></html>
```

## Per-Page Specifications

### 1. Installation (安装与调试)
- Hero badge: `construction` | "专业安装"
- Hero headline: "专业安装调试" / "快速投产运营"
- Hero image: `support-service-engineer.jpg`
- Core Values: 现场勘测 / 设备安装 / 调试校准 / 验收培训
- Process: 需求沟通 → 现场勘测 → 方案确认 → 安装施工 → 调试校准 → 验收交付 (6 steps)
- Detail Section: 安装环境要求清单 (电力/水路/排烟/空间)
- Stats: 48h 响应 / 200+ 安装案例 / 98% 一次验收率 / 10 国覆盖
- FAQ: 安装需要什么条件? / 安装需要多久? / 谁负责安装? / 安装后如何验收?

### 2. Warranty (质保与维护)
- Hero badge: `verified` | "质保证书"
- Hero headline: "全周期质保" / "安心运营无忧"
- Hero image: `support-hero-engineer.jpg`
- Core Values: 1年标准质保 / 延保方案 / 预防性维护 / 72h 备机保障
- Process: 保修登记 → 定期巡检 → 故障报修 → 维修跟踪 → 满意回访 (5 steps)
- Detail Section: 保修条款明细卡片 + 延保套餐对比表
- Stats: 1年 保修 / 72h 备机 / 0 隐形收费 / 99.8% 设备正常运行率
- FAQ: 保修期多长? / 保修范围? / 保修期外费用? / 如何续保?

### 3. Spare Parts (配件支持)
- Hero badge: `build_circle` | "原厂配件"
- Hero headline: "原厂配件直供" / "品质始终如一"
- Hero image: `support-hero-engineer.jpg`
- Core Values: 100%原厂 / 48h发货 / 本地备件仓 / 易损件推荐
- Process: 需求确认 → 型号匹配 → 库存查询 → 发货追踪 → 到货安装 (5 steps)
- Detail Section: 配件分类目录 (刀片/滤网/密封件/控制板/加热管/传感器)
- Stats: 500+ 配件SKU / 48h 发货 / 10国 备件仓 / 100% 原厂保证
- FAQ: 如何确认配件型号? / 第三方配件可以用吗? / 发货要多久? / 常用易损件有哪些?

### 4. Training (培训与手册下载)
- Hero badge: `school` | "赋能培训"
- Hero headline: "系统培训体系" / "团队快速上手"
- Hero image: `support-hero-engineer.jpg`
- Core Values: 现场培训 / 在线课程 / 操作手册 / 考核认证
- Process: 需求评估 → 制定计划 → 培训实施 → 考核认证 → 持续支持 (5 steps)
- Detail Section: 分级课程列表 (初级/中级/高级) + PDF手册下载区 (模拟链接)
- Stats: 100+ 培训场次 / 500+ 学员 / 4级 培训体系 / 多语言教材
- FAQ: 培训是免费的吗? / 可以在线学习吗? / 培训多长时间? / 如何获取操作手册?

### 5. FAQ (技术问答与人工服务)
- Hero badge: `contact_support` | "智能客服"
- Hero headline: "智能问答" / "工程师随时待命"
- Hero image: `support-hero-engineer.jpg`
- Core Values: 智能匹配 / 人工转接 / 工单跟踪 / 远程诊断
- Process: 提交问题 → 智能匹配 → 方案推送 → 满意确认 (4 steps, no arrow connectors)
- Detail Section: 分类问答库 (设备故障/操作使用/安装环境/配件更换/保养维护/订购流程)
  - Each category as an expandable group with 2-3 Q&A pairs
- Stats: 80% 线上解决 / 2h 响应 / 7×24 在线 / 多国语言
- FAQ: 联系工程师最快方式? / 紧急故障怎么办? / 如何提交工单? / 售后工作时间?

## i18n Keys
All text must use `data-i18n` attributes with keys following the pattern:
- `support_{page}_{section}_{element}` e.g. `support_install_hero_title`
- Default text in Chinese between tags (fallback)
- DO NOT put `data-i18n` on elements with child `<span>` elements — put it on the `<span>` instead
