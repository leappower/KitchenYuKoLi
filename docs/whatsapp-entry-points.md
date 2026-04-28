# YuKoLi 全站 WhatsApp 入口整理

> 更新时间：2026-04-28
> WhatsApp 号码：`+86 13163756465` → `https://wa.me/8613163756465`

---

## 一、全局组件（所有页面生效）

| 组件 | 文件 | 形式 | 说明 |
|------|------|------|------|
| **浮动按钮 (FAB)** | `src/assets/js/ui/floating-actions.js` | 右下角悬浮绿色按钮 | 全局浮动入口，读取 `FLOATING_ACTIONS_CONFIG.whatsapp` 或默认号码 |
| **底部导航栏 (Footer)** | `src/assets/js/ui/footer.js` | 底部 tab 图标 | Mobile Footer 的 WhatsApp 图标 tab，点击跳转 `wa.me` |
| **联系下拉菜单** | `src/assets/js/ui/contact-dropdown.js` | Header 联系我们下拉 | PC 端导航栏"联系我们"下拉中的 WhatsApp 入口，`api.whatsapp.com/send` |
| **导航配置** | `src/assets/js/nav-config.js` | 移动端侧滑菜单 | Slide Menu 中的 WhatsApp 项，标记 `isWhatsApp` 走外部链接 |
| **侧滑菜单** | `src/assets/js/ui/slide-menu.js` | 移动端汉堡菜单 | 识别 `isWhatsApp` 标记，加绿色样式，新窗口打开 |
| **联系人模块** | `src/assets/js/contacts.js` | JS 工具模块 | 统一管理 `window.Contacts.whatsapp` 号码，提供 `contactsWhatsApp(text)` 函数 |
| **路由器** | `src/assets/js/router.js` | SPA 路由 | 暴露 `whatsappHref(msg)` 工具函数，劫持页面内 `wa.me` 链接 |
| **页面交互** | `src/assets/js/page-interactions.js` | 事件绑定 | 通过按钮文本匹配 "whatsapp" 绑定点击跳转 |

---

## 二、各页面 WhatsApp 入口

### 2.1 Support 首页（`/support/`）— ✅ 已修改

| 版本 | 文件 | 位置 | 说明 |
|------|------|------|------|
| PC | `support/index-pc.html` L48 | Hero 按钮 | **"服务支持"按钮 → WhatsApp** ✅ |
| Tablet | `support/index-tablet.html` L56 | Hero 按钮 | **"服务支持"按钮 → WhatsApp** ✅ |
| Mobile | `support/index-mobile.html` L10 | Hero 按钮 | **"服务支持"按钮 → WhatsApp** ✅ |
| PC | `support/index-pc.html` L131 | 联系我们卡片 | WhatsApp 卡片，直链 `wa.me` |
| Tablet | `support/index-tablet.html` | 联系我们卡片 | WhatsApp 卡片，直链 `wa.me` |
| Mobile | `support/index-mobile.html` | 联系我们卡片 | WhatsApp 绿色卡片，直链 `wa.me` |
| PC | `support/index-pc.html` L287 | 底部 CTA | "免费咨询" / "联系销售" 区域，WhatsApp 入口 |

### 2.2 Support - 安装服务（`/support/installation/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `installation/index-pc.html` L233, L331 | 联系工程师卡片 + 底部 CTA "WhatsApp 直接聊" |
| Mobile | `installation/index-mobile.html` L208, L308 | WhatsApp 联系卡片 + 底部 CTA |
| Tablet | `installation/index-tablet.html` L216, L312 | WhatsApp 联系卡片 + 底部 CTA |

### 2.3 Support - 配件服务（`/support/spare-parts/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `spare-parts/index-pc.html` L65, L309, L390 | Hero次按钮 + 联系卡片 + 底部 CTA |
| Mobile | `spare-parts/index-mobile.html` L51, L278, L363 | Hero次按钮 + 联系卡片 + 底部 CTA |
| Tablet | `spare-parts/index-tablet.html` L51, L268, L349 | Hero次按钮 + 联系卡片 + 底部 CTA |

### 2.4 Support - 操作培训（`/support/training/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `training/index-pc.html` L353 | 联系我们卡片，"预约培训" |
| Mobile | `training/index-mobile.html` L287 | WhatsApp 绿色卡片 |
| Tablet | `training/index-tablet.html` L314 | WhatsApp 联系卡片 |

### 2.5 Support - 质保政策（`/support/warranty/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `warranty/index-pc.html` L65, L260, L344 | Hero次按钮 + 联系卡片 + 底部 CTA |
| Mobile | `warranty/index-mobile.html` L65, L262, L353 | Hero次按钮 + 联系卡片 + 底部 CTA |
| Tablet | `warranty/index-tablet.html` L65, L231, L315 | Hero次按钮 + 联系卡片 + 底部 CTA |

### 2.6 Support - FAQ（`/support/faq/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `faq/index-pc.html` L53, L352, L424 | Hero次按钮 + 联系工程师卡片 + 底部 CTA |
| Mobile | `faq/index-mobile.html` L53, L352, L424 | 同上 |
| Tablet | `faq/index-tablet.html` L53, L352, L424 | 同上 |

### 2.7 Contact 联系我们（`/contact/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `contact/index-pc.html` L224 | WhatsApp 号码链接 |
| Mobile | `contact/index-mobile.html` L106 | WhatsApp 号码链接 |

### 2.8 Products 产品页（`/products/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| PC | `products/index-pc.html` L252 | WhatsApp 联系入口，`api.whatsapp.com/send` |
| Tablet | `products/index-tablet.html` L231 | WhatsApp 联系入口 |

### 2.9 Quote 报价页（`/quote/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| Mobile | `quote/index-mobile.html` L453 | 动态生成 WhatsApp 链接，带预填文本 |
| Tablet | `quote/index-tablet.html` L494 | 动态生成 WhatsApp 链接，带预填文本 |

### 2.10 Landing 落地页（`/landing/`）

| 版本 | 文件 | 说明 |
|------|------|------|
| Mobile | `landing/index-mobile.html` L324 | 右下角固定绿色圆形 WhatsApp 按钮 |

### 2.11 产品详情页（动态）

| 文件 | 说明 |
|------|------|
| `src/assets/js/product-detail.js` L172 | 产品详情弹窗中"联系销售"按钮，动态生成 WhatsApp 链接带产品型号 |

---

## 三、号码统一管理

**中心化配置位置：** `src/assets/js/contacts.js`

```js
// contacts.js 导出的全局号码
window.Contacts.whatsapp = "8613163756465";
```

以下模块从 `window.Contacts` 读取号码，无需硬编码：
- `floating-actions.js`
- `router.js`
- `product-detail.js`
- `page-interactions.js`
- `quote/index-mobile.html`
- `quote/index-tablet.html`

> ⚠️ **注意：** HTML 模板中仍有大量硬编码的 `wa.me/8613163756465`。如果号码变更，需要同步修改这些模板文件。建议后续统一改为从 `contacts.js` 动态生成。

---

## 四、本次修改记录

| 日期 | 修改内容 |
|------|----------|
| 2026-04-28 | Support 首页 Hero "服务支持"按钮：PC/Tablet/Mobile 三个版本均从 `/quote/` 改为 `https://wa.me/8613163756465`，新窗口打开 |
