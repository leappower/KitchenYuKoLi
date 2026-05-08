# Small Restaurant Page — Implementation Brief

## Task
Rewrite `/applications/small-restaurant/index-pc.html` with the new 9-module architecture based on the content document.

## File to Write
`/Users/chee/Projects/KitchenYuKoLi/src/pages/applications/small-restaurant/index-pc.html`

## Architecture: 9 Modules (Top to Bottom)

1. **M1: Hero** — H1 with dual-line hook, subtitle, 2 CTAs (Quote + WhatsApp), right-side image area with overlay tags
2. **M2: Pain Points** — 6 cards in 3x2 grid (not 4 cards), each with icon, title, description
3. **M3: WhatsApp Chat Bubbles** — Simulated WhatsApp conversation UI with 4-6 chat pairs (green customer / white YuKoLi)
4. **M4: Volume Tabs** — 3 tabs (50-150 / 150-300 / 300+ orders/day), each with description, recommended equipment, and CTA. Pure CSS/JS tabs, no external library.
5. **M5: Hotpot Sub-module** — Dedicated section for hotpot/soup restaurants
6. **M6: Real Cases** — 2 case cards with customer story, problem, equipment, results (using "[待确认]" placeholders for unverified data)
7. **M7: ROI Teaser** — Text + CTA to /profit-calculator/
8. **M8: Trust/Warranty** — Warranty info, shipping, SKU count
9. **M9: Bottom CTA** — Final CTA with 2 buttons only (WhatsApp + Quote form)

## Technical Requirements

### HTML Structure
- Same `<head>` as current page (responsive redirect, meta tags, fonts, styles)
- Keep the same script includes at the bottom
- Use `<navigator data-component="navigator" data-variant="pc" data-active="applications" data-cta-text-key="nav_get_quote" data-cta-href="/quote">`
- Use `<footer data-component="footer" data-variant="pc" data-cta="true"></footer>`

### CSS/Design System
- **Tailwind CSS only** — no custom CSS
- Use `fullwidth-bg` class for full-width section backgrounds
- Use `section-content` class for content containers
- Color scheme: primary (blue), white/slate backgrounds, accent colors for variety
- Professional, clean, white-background-heavy design (NOT dark themes)
- Consistent section spacing: `py-12` or `py-16`
- Card style: `bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow`
- Use Material Symbols icons (already loaded)

### i18n
- ALL visible text MUST have `data-i18n="key_name"` attribute
- Use snake_case keys with `sr_` prefix: `sr_hero_title`, `sr_pain_1_title`, etc.
- Text should be in Chinese (default language)
- English translations will be added via i18n system later

### Available Product Images
Use these real product images (NOT Unsplash):
- `/assets/images/products/esl-xc60.webp` — compact stir-fry
- `/assets/images/products/esl-xc120.webp` — medium stir-fry
- `/assets/images/products/esl-bxc800.webp` — large capacity
- `/assets/images/products/esl-gb80.webp` — small cooking equipment
- `/assets/images/products/m-series.webp` — M series
- `/assets/images/products/y40-fryer.webp` — fryer
- `/assets/images/products/y50-fryer.webp` — fryer large

For Hero image, use a placeholder comment: `<!-- TODO: 替换为东南亚小餐厅真实场景图 -->` with a gradient overlay div as placeholder.

### WhatsApp
- WhatsApp number: read from `window.Contacts.whatsapp` (already in floating-actions.js)
- Use `data-wa-message-key="wa_msg_sr"` attribute on WhatsApp links
- WhatsApp URL: `https://wa.me/8613163756465`

### Content — Use EXACTLY This Copy (from content document)

#### M1 Hero
- Badge: "小型餐饮 / 云厨房解决方案" (icon: store)
- H1 line 1: "小店面，高出餐？" 
- H1 line 2: "YuKoLi 帮你用更少的人工，搞定每天的爆单时段。" (text-primary)
- Subtitle: "专为东南亚小餐厅定制的商用智能厨房设备。15㎡ 也能高效出餐，减少对大厨的依赖，稳住你的菜品利润。适合快餐店、社区小馆、云厨房、外卖专营店。从炒饭、炒面、小炒到炖煮、蒸烤，一套更适合小后厨的出餐方式。"
- CTA primary: "获取我的专属设备方案与报价" → /quote/
- CTA secondary: "WhatsApp 直接聊" → WhatsApp link
- Overlay tags on image: "15㎡ 也能跑起来" / "减少大厨依赖" / "适合东南亚本地菜系"

#### M2 Pain Points (6 cards, 3x2 grid)
1. "请人太贵，留下的又难管？" — icon: payments — "现在东南亚很多地方，熟手厨师越来越贵。好不容易请来的人，一旦临时走人、请假，店里的出餐就直接乱掉。"
2. "厨房只有十几平米，转身都困难？" — icon: square_foot — "铺面租金贵，后厨空间更贵。你想提高出餐速度，却发现传统设备太大、太热、太占地方。"
3. "换个厨师，老客人就说味道变了？" — icon: sync_problem — "很多店不是没有客人，而是味道不稳定。今天这个师傅炒得好，明天另一个人做，客人就开始怀疑你到底是不是同一家店。"
4. "一到饭点就手忙脚乱，催单连连？" — icon: schedule — "平台订单、堂食、打包一起涌进来，后厨却只有两口锅。出餐慢，顾客等烦了，差评就来了。"
5. "厨房像火炉，月底电费煤气费吓人？" — icon: local_fire_department — "传统明火后厨又热又累，员工不愿久待。更现实的是，燃气费、电费、损耗加在一起，利润被一点点吃掉。"
6. "机器坏了没人修，一停工就是亏钱？" — icon: build — "生意最怕的不是忙，而是设备一坏就断单。配件、维修、响应速度，往往比买的时候更重要。"

#### M3 WhatsApp Bubbles
Create a WhatsApp-like chat UI with green/white bubbles. Show 4 conversations:
1. PH customer: "Hi, how much for this machine?" / YuKoLi: "Tell us your menu and daily orders first."
2. ID customer: "Halo, apakah mesin ini cocok untuk nasi goreng?" / YuKoLi: "Bisa. We'll match to your menu."
3. TH customer: "Can it handle rush hour?" / YuKoLi: "Yes — recommend based on your daily volume."
4. VN customer: "Bếp tôi nhỏ lắm." / YuKoLi: "We have compact solutions."

Each conversation should show country tag (PH/ID/TH/VN).

#### M4 Volume Tabs
Build tabs with vanilla JS (no library). 3 tabs:

**Tab A: 50-150 单/天 — 起步稳**
- Description: "适合夫妻店、社区小馆、刚起步的快餐店。这个阶段最重要的是先把最吃人的炒制、备料或高温工位稳下来。"
- Recommended: 紧凑型智能炒制设备, 基础切配设备, 小型炖煮设备
- Show 2-3 product image cards with model names
- CTA: "看适合小店起步的方案"

**Tab B: 150-300 单/天 — 提速期**
- Description: "适合已经进入高峰期明显拥堵的快餐店。核心不是单台机器更强，而是让炒、炸、蒸、炖至少两条线并行。"
- Recommended: 主力智能炒制设备, 蒸烤或炖煮设备, 基础切配设备
- Show 2-3 product image cards
- CTA: "查看中型后厨组合方案"

**Tab C: 300+ 单/天 — 规模化**
- Description: "适合高单量云厨房、强外卖门店、连锁快餐。要解决的不是一个人忙不忙，而是出餐流程、稳定性、复制效率。"
- Recommended: 2台以上主力炒制设备, 完整蒸烤/炖煮/煎炸分线, 系统化切配
- Show 2-3 product image cards
- CTA: "定制我的高产能厨房方案"

#### M5 Hotpot Sub-module
- Title: "如果你做的是火锅、小锅、汤底类门店，后厨逻辑又不一样。"
- Description about hotpot workflow (stock, prep, holding, timing)
- Recommended: 炖煮设备, 切配设备, 蒸烤/保温设备
- CTA: "获取火锅门店配置建议"

#### M6 Real Cases (2 case cards side by side)
**Case 1: 菲律宾快餐店**
- Title: "告别'厨师一请假，整家店就乱'"
- Background: 马尼拉小型快餐店，炒饭、炸物、炖肉饭类
- Problems: 熟手厨师贵、高峰期堵在炒制、口味依赖一个人
- Equipment: [待老板确认具体型号]
- Results: [待确认具体数据]
- Quote: "以前最怕的就是饭点前有人请假。现在后厨没有那么容易乱。"

**Case 2: 印尼云厨房**
- Title: "15㎡ 的云厨房，也能把出餐节奏跑顺"
- Background: 雅加达小型云厨房，炒饭、炒面、咖喱类
- Problems: 厨房空间太小、平台订单一多员工就乱、出餐靠人工切换效率低
- Equipment: [待老板确认具体型号]
- Results: [待确认具体数据]
- Quote: "在云厨房，空间就是成本，节奏就是评分。"

#### M7 ROI Teaser
- Text: "买设备是一笔投入，但每天省下来的人工、出餐更稳带来的复购、减少的损耗，才是你真正该算的账。想知道你的店更适合什么配置？也想知道按你的单量，大概多久能看到回报？"
- CTA: "算算我的厨房更适合什么方案" → /profit-calculator/

#### M8 Trust/Warranty
- Title: "别让后厨问题，拖了你赚钱的后腿。"
- 5 items with icons:
  1. "整机 1 年质保" (icon: verified)
  2. "核心配件 3 年质保（IGBT / 电磁线圈 / 锅体）" (icon: workspace_premium)
  3. "最快 8 小时发货" (icon: local_shipping)
  4. "快递 3-7 天到达" (icon: schedule)
  5. "500+ SKU，可按菜单和厨房条件匹配" (icon: inventory_2)
- Closing text: "你可以先带着菜单、日单量、厨房尺寸来问。不急着下单，先把方案看明白。"

#### M9 Bottom CTA
- Background: primary color (blue gradient)
- Title: "把你的菜单、厨房尺寸、日单量发过来。我们先帮你判断适合哪种出餐方式，再谈设备和报价。"
- 2 buttons only:
  1. "WhatsApp 直接问" → WhatsApp
  2. "填写需求表" → /quote/

## Design Principles
- **Information-rich**: Every section should have enough text to feel substantial and professional
- **Clean & white**: Primary background is white, sections alternate with light gray (slate-50)
- **Professional typography**: Use font-black for headings, font-bold for sub-headings, normal weight for body text
- **Consistent spacing**: py-12 between sections, gap-6 to gap-8 within grids
- **Subtle shadows**: shadow-lg on cards, shadow-2xl on hero image
- **Smooth transitions**: hover effects on cards and buttons
- **NO dark mode-specific styles** in this page (let the global dark class handle it)

## Tab Implementation (M4)
Use pure vanilla JavaScript for tab switching:
```javascript
// Tab switching logic at bottom of page
document.querySelectorAll('[data-tab-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active from all tabs and panels
    // Add active to clicked tab and corresponding panel
  });
});
```

Tab visual states:
- Active tab: `bg-primary text-white rounded-t-lg`
- Inactive tab: `bg-slate-100 text-slate-600 rounded-t-lg hover:bg-slate-200`
- Tab content: `border border-slate-200 rounded-b-xl rounded-tr-xl p-8`

## i18n Key Naming Convention
Use `sr_` prefix for all keys:
- `sr_hero_badge`, `sr_hero_title_1`, `sr_hero_title_2`, `sr_hero_subtitle`
- `sr_pain_1_title`, `sr_pain_1_desc`, `sr_pain_2_title`, `sr_pain_2_desc`, ...
- `sr_wa_title`, `sr_wa_ph_1`, `sr_wa_yk_1`, ...
- `sr_vol_tab_a`, `sr_vol_tab_b`, `sr_vol_tab_c`
- `sr_vol_a_title`, `sr_vol_a_desc`, `sr_vol_a_cta`, ...
- `sr_hotpot_title`, `sr_hotpot_desc`, `sr_hotpot_cta`
- `sr_case_1_title`, `sr_case_1_bg`, `sr_case_1_quote`, ...
- `sr_roi_text`, `sr_roi_cta`
- `sr_trust_title`, `sr_trust_1`, `sr_trust_2`, ...
- `sr_cta_title`, `sr_cta_btn_wa`, `sr_cta_btn_form`

## IMPORTANT RULES
1. Do NOT use any Unsplash images — only use product images from /assets/images/products/
2. Do NOT include any unverified numbers (no "99%", no "3-6月回本", no exact ROI figures)
3. Do NOT include fake products (no dishwasher, no shelving units)
4. ALL text content must have data-i18n attributes
5. Keep the same `<head>` and `<script>` includes as the current page
6. Use Tailwind utility classes only, no custom CSS
7. The page should feel PROFESSIONAL and INFORMATION-RICH — this represents the company
8. WhatsApp bubble UI should look like real WhatsApp chat (green/white bubbles, rounded corners, timestamps)
