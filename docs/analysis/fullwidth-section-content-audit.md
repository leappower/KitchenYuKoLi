# 全站三屏 section-content / fullwidth-bg 审查报告

> 分析日期: 2026-05-05  
> 范围: `src/pages/*/index-{mobile,tablet,pc}.html`  
> 检查维度: fullwidth-bg 背景 breakout padding 一致性 + 双层 div wrapper

---

## 🔴 问题 A: fullwidth-bg + 背景色，但无 section-content 且无垂直 padding

**影响：内容贴边且背景区域内无上下间距**

| 文件 | 屏 | 行 | 背景 | section | 说明 |
|------|----|----|------|---------|------|
| about/index-tablet.html | tablet | 337 | `bg-slate-50` | Parts (配件保障) | 缺 section-content + py |
| about/index-tablet.html | tablet | 381 | `bg-slate-50` | SLA (售后承诺) | 缺 section-content + py |
| about/index-pc.html | pc | 336 | `bg-slate-50` | Our Story | ✅ 已修复 |
| about/index-pc.html | pc | 500 | `bg-slate-50` | Parts | ✅ 已修复 |
| about/index-pc.html | pc | 551 | `bg-slate-50` | SLA | ✅ 已修复 |

**待修复：** about/index-tablet.html 的 Parts 和 SLA（2 处）

---

## 🟡 问题 B: fullwidth-bg 无 section-content（无背景色）

**影响：低。无背景色时，fullwidth-bg 仅做负 margin breakout。如果 main 自身有 padding（如 mobile `px-3`），内容由 main padding 控制，不需要 section-content。但如果 main 无 padding（如 PC `pt-[110px]`），内容会贴边。**

| 文件 | 屏 | 行 | main padding | 风险 |
|------|----|----|-------------|------|
| news/index-mobile.html | mobile | 70 | `px-3` ✅ | 无风险 — main 有 padding |
| profit-calculator/index-mobile.html | mobile | 106 | `px-3` ✅ | 无风险 — main 有 padding |
| contact/index-tablet.html | tablet | 91 | `py-8` ⚠️ | 无风险 — 内容在圆角卡片内（自有 padding） |

**结论：** 3 处均为低风险，main 有 padding 或内容在自包含卡片内。无需修复。

---

## 🟠 问题 C: 双层 div wrapper（section-content + 空 `<div class="">`）

**影响：无功能影响，但增加了不必要的 DOM 层级。这是历史遗留的冗余嵌套模式。**

### 统计

| 文件 | 数量 | 屏幕 |
|------|------|------|
| home/index-mobile.html | 5 | mobile |
| landing/index-mobile.html | 5 | mobile |
| products/index-mobile.html | 2 | mobile |
| profit-calculator/index-mobile.html | 2 | mobile |
| home/index-tablet.html | 2 | tablet |
| products/index-tablet.html | 2 | tablet |
| about/index-pc.html | 2 | pc |
| cases/index-pc.html | 1 | pc |
| home/index-pc.html | 4 | pc |
| landing/index-pc.html | 4 | pc |
| support/index-pc.html | 3 | pc |
| **总计** | **32** | — |

### 模式

```html
<!-- 当前（冗余） -->
<section class="fullwidth-bg py-12 bg-xxx">
  <div class="section-content">    ← 有 padding
  <div class="">                    ← 空层，无任何样式
    ...content...
  </div>
  </div>
</section>

<!-- 应该是 -->
<section class="fullwidth-bg py-12 bg-xxx">
  <div class="section-content">
    ...content...
  </div>
</section>
```

### 建议

优先级低（🟠）。不影响功能和视觉效果，仅增加 DOM 层级。可在后续重构中统一清理。

---

## ✅ 已修复（本次会话）

| 文件 | 修复内容 |
|------|---------|
| about/index-mobile.html | Our Story/Parts/SLA 加 `section-content` + `py-4` |
| about/index-tablet.html | Our Story 加 `section-content` + `py-?`，SLA/Parts 改 `fullwidth-bg` |
| about/index-pc.html | Our Story/Parts/SLA 加 `section-content`/`fullwidth-bg` + 背景，清理双层 div，修复闭合标签 |

---

## 📊 各页面健康度

| 页面 | 🔴 需修复 | 🟠 双层 div | 状态 |
|------|-----------|-------------|------|
| about | tablet 2 处 | pc 2 处 | 🔴 需处理 tablet |
| cases | 0 | pc 1 处 | ✅ |
| contact | 0 | 0 | ✅ |
| home | 0 | 12 处 | ✅ (双层 div 待清理) |
| landing | 0 | 9 处 | ✅ |
| news | 0 | 0 | ✅ |
| products | 0 | 4 处 | ✅ |
| profit-calculator | 0 | 2 处 | ✅ |
| quote | 0 | 0 | ✅ |
| support | 0 | 3 处 | ✅ |
| thank-you | 0 | 0 | ✅ |
