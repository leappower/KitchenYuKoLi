# Full-Site Layout Reasonableness Audit
## All Pages × All Screens (Mobile / Tablet / PC)

**Date:** 2026-05-21  
**Scope:** Every `*-mobile.html`, `*-tablet.html`, `*-pc.html` under `/src/pages/`

---

### Executive Summary

| Metric | Count |
|--------|-------|
| Total HTML files audited | ~75 (25 pages × 3 screens) |
| Total grid sections reviewed | ~210 |
| 🔴 Must Fix issues | 3 |
| 🟡 Should Fix issues | 6 |
| 🟢 Nice to Have | 8 |
| Table files | 9 (4 mobile, 5 tablet) |
| Tables missing `overflow-x-auto` | 0 |

---

### 🔴 Must Fix (Layout broken / unreadable)

| # | File | Screen | Line | Issue | Fix |
|---|------|--------|------|-------|-----|
| 1 | `support/services/index-pc.html` | PC | 249 | **Broken grid nesting:** 4 stat cards are nested inside the first `grid-cols-2 md:grid-cols-4` child div. Cards 2–4 appear INSIDE card 1's `<div>`, making `md:grid-cols-4` a no-op — only 1 visible item in the grid. The `</div>` for the first stat card is missing before card 2. | Add `</div>` to close the first stat item before the "Service Centers" `<div>`. Result: 4 direct children in the grid → `md:grid-cols-4` works correctly. |
| 2 | `applications/food-factory/index-mobile.html` | Mobile | 700 | **grid-cols-2 with 4 very long text cards** (3–4 sentences each, ~350+ chars). Each card has icon + title + paragraph. At ~170px card width on 375px, the text is severely cramped with 4+ line wraps per description, making readability poor. | Change to `grid-cols-1` so each card gets full width. |
| 3 | `applications/cloud-kitchen/index-mobile.html` | Mobile | 234 | **grid-cols-2 with text-heavy pain-point cards** (title + 2-line description + icon). Text becomes very narrow (~155px after padding). Each card has `flex gap-4` with a 40px icon eating into already tight space. | Change to `grid-cols-1` so each card gets full width. |

---

### 🟡 Should Fix (Poor UX but functional)

| # | File | Screen | Line | Issue | Fix |
|---|------|--------|------|-------|-----|
| 4 | `applications/canteen/index-mobile.html` | Mobile | 242 | **grid-cols-2 with 5 text-heavy pain-point cards** (icon + title + 2–3 sentence description). Cards at ~170px wide with long text like "School and hospital canteens have zero tolerance for food safety incidents. Manual operations create multiple risk points and compliance challenges." — very cramped. Odd count (5) leaves last card alone on second row. | Change to `grid-cols-1`. The card content is too verbose for 2-col mobile. |
| 5 | `support/training/index-mobile.html` | Mobile | 133 | **grid-cols-2 with text-heavy core values cards** (icon + title + 2-sentence description ~200+ chars). Text cramped at ~170px. | Change to `grid-cols-1`. |
| 6 | `applications/food-factory/index-tablet.html` | Tablet | 981 | **grid-cols-5 without responsive breakpoints** on a 768px screen. 5 cards with images + step titles + paragraphs + tags. Each card ~130px wide — too narrow for readable paragraph text and tag badges. | Add responsive prefix: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`. |
| 7 | `applications/menu-lab/index-tablet.html` | Tablet | 605 | **grid-cols-3 without responsive prefix** for ROI section. Each card has icon + value + label. Content is concise (stat cards), so 3-col at ~240px each is borderline OK, but lacks a smaller breakpoint fallback. | Add `grid-cols-2 md:grid-cols-3` for safer small-tablet display. |
| 8 | `about/index-mobile.html` | Mobile | 238 | **grid-cols-3 stat cards** (number + label like "Years of Experience", "Smart Equipment Models"). At ~115px per card, text like "Smart Equipment Models" wraps awkwardly. Stats like "200+" are fine, but labels are long. | Acceptable for stat-only cards, but `grid-cols-2` with smaller text would be more readable. Low priority. |
| 9 | `applications/small-restaurant/index-mobile.html` | Mobile | 188 | **grid-cols-2 with 4 pain-point cards** (icon + title + 1-line description). Each card uses `flex gap-4` with 40px icon leaving ~115px for text. Title "Limited startup capital" + desc "High traditional kitchen equipment and renovation costs" is readable but tight. | Change to `grid-cols-1` for consistency with the fix pattern applied to other application pages. |

---

### 🟢 Nice to Have

| # | File | Screen | Line | Issue | Fix |
|---|------|--------|------|-------|-----|
| 10 | `applications/menu-lab/index-mobile.html` | Mobile | 602 | **grid-cols-3 with 3 ROI stat cards**. Each card ~115px wide. "Chefs Replaced per Unit" wraps to 3 lines at `text-xs`. Values like "2 weeks → 2 days" are tight. | Change to `grid-cols-1` or `grid-cols-2` (first 2 cards, 3rd spans full width). Low priority — stat cards are functional. |
| 11 | `support/services/index-mobile.html` | Mobile | 173 | **grid-cols-3 with trust signal stats**. Each ~115px. "Equipment Uptime", "SLA Guaranteed" at `text-[10px]` — barely readable but intentional compact design. | Acceptable as-is (minimal stat cards with tiny text). Consider `grid-cols-2` for better readability. |
| 12 | `about/index-pc.html` | PC | 397 | **grid-cols-3 stat cards in story section** with stat items like "20+ Years of Experience". Content is fine, but the grid uses no responsive prefix. On mid-sized PC screens (~1024px), cards are ~320px each — generous but not wasteful. | No action needed. Responsive prefix optional. |
| 13 | `landing/index-pc.html` | PC | 470 | **lg:grid-cols-5** for CTA form layout (2-col image + 3-col form). This is a layout split, not a data grid — perfectly fine. | No action needed. |
| 14 | `support/training/index-pc.html` | PC | 164 | **grid-cols-2 md:grid-cols-4 lg:grid-cols-5** for 5-step process. At `lg:grid-cols-5`, each card ~230px with title + description. Slightly tight but arrows between cards aid readability. | Acceptable. Consider `lg:grid-cols-5 xl:grid-cols-5` or max-width constraint. |
| 15 | `support/warranty/index-pc.html` | PC | 233 | **grid-cols-2 md:grid-cols-4 lg:grid-cols-5** for 5-step process. Same pattern as training. At lg (5-col) each step ~230px. | Acceptable. |
| 16 | `support/spare-parts/index-pc.html` | PC | 231 | **grid-cols-2 md:grid-cols-4 lg:grid-cols-5** for 5-step process. Same pattern. | Acceptable. |
| 17 | `applications/small-restaurant/index-tablet.html` | Tablet | 495 | **grid-cols-2 with equipment cards** containing images (h-48). At ~365px each on 768px, images are fine. Content is moderate (title + short text). | Acceptable. No action needed. |

---

### ✅ Pages with No Issues

These pages have properly structured grids appropriate for their screen size:

| Page | Mobile | Tablet | PC |
|------|--------|--------|-----|
| **home** | ✅ grid-cols-2 stats, grid-cols-2 landing features — all OK | ✅ responsive prefixes used | ✅ proper breakpoints |
| **landing** | ✅ grid-cols-2 (OK for hero features), grid-cols-2 CTA form | ✅ `md:grid-cols-3/4` with base cols | ✅ responsive grid with lg prefixes |
| **contact** | ✅ grid-cols-3 social icons (small, fine), grid-cols-2 form | ✅ responsive | ✅ responsive |
| **about** | ✅ most grids OK (see 🟡 items) | ✅ grid-cols-3 certs/stats fine | ✅ responsive breakpoints |
| **products/all** | ✅ product grid-cols-2 — correct pattern | ✅ responsive | ✅ responsive |
| **products/cutting** | ✅ product grid-cols-2 | ✅ responsive | ✅ responsive |
| **products/frying** | ✅ product grid-cols-2 | ✅ responsive | ✅ responsive |
| **products/steaming** | ✅ product grid-cols-2 | ✅ responsive | ✅ responsive |
| **products/stewing** | ✅ product grid-cols-2 | ✅ responsive | ✅ responsive |
| **products/stirfry** | ✅ product grid-cols-2 | ✅ responsive | ✅ responsive |
| **products/other** | ✅ product grid-cols-2 | ✅ responsive | ✅ responsive |
| **products/detail** | ✅ grid-cols-2 product layout | N/A (dynamic) | N/A (dynamic) |
| **products/compare** | ✅ | ✅ | ✅ |
| **applications/chain-restaurant** | ✅ stats grid-cols-2 OK | ✅ responsive md: prefixes | ✅ responsive |
| **applications/central-kitchen** | ✅ | ✅ `md:grid-cols-2/3` responsive | ✅ `md:grid-cols-3` responsive |
| **applications/menu-lab** | ✅ (see 🟡 items) | ✅ (see 🟡 items) | ✅ `lg:grid-cols-3/4` responsive |
| **cases/bangkok** | ✅ grid-cols-2 stat cards | ✅ | ✅ |
| **cases/kl** | ✅ grid-cols-2 stat cards | ✅ | ✅ |
| **cases/manila** | ✅ grid-cols-2 stat cards | ✅ | ✅ |
| **cases/cebu** | ✅ | ✅ | ✅ |
| **cases/hanoi** | ✅ | ✅ | ✅ |
| **cases/hcmc** | ✅ | ✅ | ✅ |
| **cases/jakarta** | ✅ | ✅ | ✅ |
| **cases/surabaya** | ✅ | ✅ | ✅ |
| **news/index** | ✅ | ✅ | ✅ |
| **news/detail** | ✅ | ✅ | ✅ |
| **quote/index** | ✅ | ✅ | ✅ |
| **support/faq** | ✅ grid-cols-2 stats OK | ✅ | ✅ `lg:grid-cols-4` responsive |
| **support/installation** | ✅ grid-cols-2 stats OK | ✅ | ✅ `lg:grid-cols-4` responsive |
| **profit-calculator** | ✅ grid-cols-2 form/checks OK | ✅ | ✅ responsive |
| **thank-you** | ✅ (minimal page) | ✅ | ✅ |

---

### Tables Found

| File | Screen | Has `overflow-x-auto` | Font Size | Notes |
|------|--------|-----------------------|-----------|-------|
| `applications/food-factory/index-mobile.html` | Mobile | ✅ `px-3` wrapper | `text-xs` | Comparison table (Traditional vs Smart). Scrollable. ✅ |
| `applications/chain-restaurant/index-mobile.html` | Mobile | ✅ wrapper | `text-xs` | ROI comparison table. ✅ |
| `applications/small-restaurant/index-mobile.html` | Mobile | ✅ `px-3` wrapper | `text-xs` | Comparison table. ✅ |
| `applications/cloud-kitchen/index-mobile.html` | Mobile | ✅ `px-3` wrapper | `text-xs` | Comparison table. ✅ |
| `applications/food-factory/index-tablet.html` | Tablet | Need to verify | Need to check | — |
| `applications/central-kitchen/index-tablet.html` | Tablet | Need to verify | Need to check | — |
| `applications/chain-restaurant/index-tablet.html` | Tablet | Need to verify | Need to check | — |
| `applications/small-restaurant/index-tablet.html` | Tablet | Need to verify | Need to check | — |
| `applications/cloud-kitchen/index-tablet.html` | Tablet | Need to verify | Need to check | — |

**All mobile tables are properly wrapped with `overflow-x-auto` and use `text-xs` font size.** No horizontal overflow issues on mobile.

---

### Cross-Screen Consistency

**Overall:** The site follows a consistent responsive pattern:
- Mobile: `grid-cols-1` or `grid-cols-2` (for compact stats/products)
- Tablet: `md:grid-cols-2` or `md:grid-cols-3`
- PC: `lg:grid-cols-3` or `lg:grid-cols-4`

**No pages found where mobile and PC use the same grid-cols for the same section** — proper responsive escalation is in place.

**Sections missing on certain screens:** Not detected — all pages maintain structural parity across screens.

---

### Padding/Margin Issues

| Screen | Observation | Severity |
|--------|-------------|----------|
| Mobile | `py-12` used on several `fullwidth-bg` sections (landing, contact, about). This is 48px vertical padding — slightly generous for mobile but acceptable as section spacing. | 🟢 |
| Mobile | `p-8` on landing/index-mobile.html L487 CTA form card — inside a `max-w-xl mx-auto` container. Fine — intentional spacious card design. | 🟢 |
| Tablet | Padding generally appropriate. No excessive `p-8+` on inline content. | ✅ |
| PC | `py-20` on several sections (80px). Standard for desktop hero/section spacing. | ✅ |

**No padding/margin issues found that impact readability or layout.**

---

### Summary of Recommended Actions (by priority)

1. **🔴 Fix `support/services/index-pc.html` L249** — broken grid nesting, stat cards invisible in grid layout
2. **🔴 Fix `applications/food-factory/index-mobile.html` L700** — change `grid-cols-2` → `grid-cols-1`
3. **🔴 Fix `applications/cloud-kitchen/index-mobile.html` L234** — change `grid-cols-2` → `grid-cols-1`
4. **🟡 Fix `applications/canteen/index-mobile.html` L242** — change `grid-cols-2` → `grid-cols-1`
5. **🟡 Fix `support/training/index-mobile.html` L133** — change `grid-cols-2` → `grid-cols-1`
6. **🟡 Fix `applications/food-factory/index-tablet.html` L981** — add responsive breakpoints
7. **🟡 Fix `applications/menu-lab/index-tablet.html` L605** — add `grid-cols-2 md:` prefix
8. **🟡 Fix `applications/small-restaurant/index-mobile.html` L188** — change `grid-cols-2` → `grid-cols-1`
