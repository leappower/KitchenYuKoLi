# KitchenYuKoLi — Tablet & Mobile Section 间距审查报告

> 生成时间：2026-04-26 | 扫描文件：60 个 | Section 总数：317

---

## 📊 总览

| 设备 | 文件数 | Section 数 |
|------|--------|-----------|
| Tablet | 30 | 155 |
| Mobile | 30 | 162 |

### 间距 Class 使用频率（Top 10）

| Class | px 值 | 使用次数 |
|-------|-------|---------|
| `py-20` | 80px | 106 |
| `py-12` | 48px | 63 |
| `py-8` | 32px | 40 |
| `py-10` | 40px | 32 |
| `py-16` | 64px | 14 |
| `mb-8` | 32px | 11 |
| `mb-12` | 48px | 9 |
| `px-4` | 16px | 21 |
| `px-6` | 24px | 13 |
| `mb-24` | 96px | 6 |

---

## 🎨 CSS 设计规范（styles.css）

项目已有明确的设计规范注释：

```
Section 上下间距: py-20 (标准) / py-24 (大区块)
```

统一容器 `.section-container` 使用 CSS 变量控制左右边距。

---

## 🔴 严重问题（Section 数量不匹配）

| 页面 | Tablet | Mobile | 说明 |
|------|--------|--------|------|
| `home/index` | 6 sections | 7 sections | Mobile 多 1 个 section |
| `landing/index` | 1 section | 5 sections | 差异极大，可能页面结构不同 |
| `quote/index` | 0 sections | 2 sections | Tablet 无 `<section>` 标签 |

### 💡 修复建议
- **home/index**: 检查 Mobile 是否多了/少了某个 section，确保两者结构对齐
- **landing/index**: 两个版本可能对应不同的着陆页变体，确认是否应统一
- **quote/index**: Tablet 版本缺少 `<section>` 标签包裹，建议用 `<section>` 包裹内容

---

## 🟡 Tablet vs Mobile 间距差异详细分析

> 以下按差异模式分类，共涉及 14 个页面、77 处差异

### 模式 A：Tablet `py-12`(48px) → Mobile `py-8`(32px) — 合理缩放 ⚡

这是最常见的差异，属于**合理的响应式设计**：移动端使用较小间距。

| 页面 | 受影响 Section 数 | 说明 |
|------|-------------------|------|
| `applications/canteen/index` | 6 | 所有内容 section |
| `applications/cloud-kitchen/index` | 6 | 同上 |
| `applications/fast-food/index` | 6 | 同上 |
| `applications/hotpot/index` | 6 | 同上 |
| `applications/southeast-asian/index` | 6 | 同上 |
| `contact/index` | 4 | 大部分 section |
| `support/faq/index` | 全部 | FAQ 页面 |
| `support/index` | 全部 | 支持首页 |
| `support/installation/index` | 6 | 安装服务 |
| `support/spare-parts/index` | 7 | 配件页面 |
| `support/training/index` | 6 | 培训页面 |
| `support/warranty/index` | 7 | 质保页面 |

**结论**: ✅ 这些差异是**合理的**，无需修复。

### 模式 B：Tablet `py-16`(64px) → Mobile `py-10`(40px) — 比例不一致 ⚠️

| 页面 | 受影响 Section | Tablet | Mobile | 差异 |
|------|---------------|--------|--------|------|
| `support/spare-parts/index` | #1 hero | `py-16` (64px) | `py-10` (40px) | 24px 差 |
| `support/warranty/index` | #2-4 内容区 | `py-16` (64px) | `py-10` (40px) | 24px 差 |
| `support/warranty/index` | #8 CTA | `py-16` (64px) | `py-10` (40px) | 24px 差 |
| `support/training/index` | 部分内容区 | `py-16` (64px) | `py-10` (40px) | 24px 差 |

**问题**: 其他页面是 `py-12→py-8`（48→32，缩放比 0.67），这些是 `py-16→py-10`（64→40，缩放比 0.625），缩放比例不统一。

**💡 修复建议**: 统一为 `py-16 → py-12`（64→48，缩放比 0.75）或保持 `py-16 → py-10` 但全站统一。

### 模式 C：Tablet `mb-12`(48px) → Mobile `mb-8`(32px) — 合理缩放 ⚡

| 页面 | 受影响 Section |
|------|---------------|
| `about/index` | #1-6 所有 section |

**结论**: ✅ 合理的响应式底部间距缩放。

### 模式 D：Tablet `p-8`(32px) → Mobile `p-6`(24px) — CTA 区域 ⚠️

| 页面 | Section | 说明 |
|------|---------|------|
| `about/index` | #7 CTA | `p-8` vs `p-6`，差异合理但方向与其他 section（用 py）不一致 |
| `applications/canteen/index` | #8 卡片区 | `p-8` vs `p-6` |

**💡 修复建议**: CTA section 建议改用 `py-*` 而非 `p-*`（左右间距由容器控制），统一为 `py-12 → py-8`。

### 模式 E：Tablet `py-20`(80px) → Mobile `py-16`(64px) — Hero 区域 ✅

| 页面 | Section |
|------|---------|
| `thank-you/index` | #1 |

**结论**: ✅ Hero 区域合理缩放。

### 模式 F：真正的不一致 — 需修复 🔴

#### 1. `products/index` — 内部 section 间距冲突

| Section | 问题 |
|---------|------|
| #3 | Tablet 有间距 class，Mobile 缺少间距 |
| #4 | 同上 |

**修复**: 为 Mobile 版本补充对应的 `py-12` class。

#### 2. `about/index` #7 CTA 区域

- Tablet: `p-8` + `mb-12`
- Mobile: `p-6` + `mb-8`

四边 padding 和底部 margin 不一致。

**修复**: 改为 `py-12 mb-12`（Tablet）/ `py-8 mb-8`（Mobile）。

#### 3. `support/spare-parts/index` — hero 与内容区间距跳跃

- Hero: `py-16` / `py-10`
- 内容区: `py-12` / `py-8`

Hero 和紧接的内容区间距差 2 级（16→12），视觉上可能有不自然的跳跃感。

**修复**: hero 保持 `py-16`/`py-10`，内容区改为 `py-12`/`py-8`（当前已如此，可接受）。

---

## ⚠️ 缺少间距定义的 Section

共 6 个 section 未设置任何显式 Tailwind 间距 class：

| 页面 | 设备 | Section | 内容 |
|------|------|---------|------|
| `applications/cases/index` | tablet | #4 | 案例展示卡片区域 |
| `home/index` | tablet | #5 | 首页内容块 |
| `products/index` | mobile | #2 | 产品列表区域 |
| `products/index` | tablet | #3 | 产品详情区域 |
| `products/index` | tablet | #4 | 产品推荐区域 |
| `products/index` | mobile | #3 | 产品详情区域 |

**💡 修复建议**: 为这些 section 添加 `py-12`（Mobile）/ `py-16`（Tablet）间距。

---

## 🟢 间距完全一致的页面（15 个）

✅ 以下页面 Tablet 与 Mobile 所有 section 间距完全一致：

| 页面 | Section 数 |
|------|-----------|
| `applications/cases/index` | 各版本 |
| `applications/index` | 各版本 |
| `news/detail` | 各版本 |
| `news/index` | 各版本 |
| `product-detail/index` | 各版本 |
| `quote/index` | 各版本（均为 0 section） |
| `roi/index` | 各版本 |
| `solutions/deploy-canteen/index` | 各版本 |
| `solutions/deploy-cloud-kitchen/index` | 各版本 |
| `solutions/deploy-fast-food/index` | 各版本 |
| `solutions/deploy-hotpot/index` | 各版本 |
| `solutions/deploy-southeast-asian/index` | 各版本 |
| `solutions/index` | 各版本 |

---

## 🔄 同类页面 Section 间距一致性

| 目录 | 页面数 | 结果 |
|------|--------|------|
| `applications/` | 7 | ✅ 子页面间距模式一致 |
| `solutions/` | 7 | ✅ 子页面间距模式一致 |
| `support/` | 7 | ✅ 子页面间距模式一致 |
| `news/` | 2 | ✅ 一致 |

---

## 💡 修复建议总结

### 优先级排序

| 优先级 | 问题 | 修复动作 |
|--------|------|----------|
| 🔴 P0 | `landing/index` section 数量差异 | 检查两个版本是否应对应同一页面 |
| 🔴 P0 | `home/index` section 数量差异 | 对齐 Mobile 多出的 section |
| 🔴 P1 | 6 个无间距 section | 添加 `py-12`/`py-16` |
| 🟡 P1 | `py-16→py-10` vs `py-12→py-8` 比例不统一 | 选择一种缩放比例全站统一 |
| 🟡 P2 | CTA 区域 `p-*` → `py-*` | 改用 `py-12`/`py-8` |
| 🟢 P3 | `about/index` #7 四边 + margin 混用 | 改为 `py-*` + `mb-*` |

### 推荐的间距体系

基于 CSS 文件已有规范和实际使用统计，建议全站统一：

```
Section 间距标准：
├── Hero / 大区块:  py-20 (80px) Tablet → py-16 (64px) Mobile
├── 标准内容区:     py-12 (48px) Tablet → py-8  (32px) Mobile  
├── 小间距分隔:     py-8  (32px) 两者通用
└── CTA / 底部:     py-16 (64px) Tablet → py-12 (48px) Mobile
```

---

*报告由 spacing_audit.py 自动生成 | 原始数据：60 文件 · 317 sections*
