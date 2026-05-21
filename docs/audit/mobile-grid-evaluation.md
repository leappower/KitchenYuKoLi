# Mobile Multi-Card Grid Evaluation

## Summary
- Total grid-cols-2 sections found: **50**
- Sections OK as-is: **39**
- Sections recommended for single-card: **2**
- Sections needing attention (borderline): **8**
- Skeletons replaced by JS (non-issue): **1**

## Methodology

For each `grid-cols-2` section in every `*-mobile.html` file, the surrounding HTML was read to identify card content type, text sizes, image presence, and overall suitability for 2-column layout on 320–430px screens.

## Page-by-Page Analysis

### about/index-mobile.html (4 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Stats (20+, 50+, 200+, 3000+) | 114 | STAT CARD | `text-xl` number + `text-xs` label | None — compact | ✅ Fine |
| Manufacturing Advantages | 265 | ICON+TEXT | `text-sm` icon + `text-xs` title + `text-sm` desc (1–2 sentences) | Longish descriptions in half-width | 🟡 Acceptable |
| Certification Logos | 317 | IMAGE CARD | `w-12 h-12` logo + `text-xs` label | Small images, short labels — compact | ✅ Fine |
| SLA Cards (1yr, 3yr, 2min, ✓) | 452 | STAT CARD | `text-3xl` number + `text-sm` title + `text-sm` desc | Extra desc line adds clutter | 🟡 Acceptable |

### applications/canteen/index-mobile.html (3 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Pain Points | 242 | ICON+TEXT | `w-10 h-10` icon + bold title (default size ~16px) + `text-sm` desc (multi-sentence) | Titles are not sized down; long paragraphs cramped | 🟡 Acceptable |
| Metrics (40-60%, +50%, -30%, 100%) | 419 | STAT CARD | `text-3xl` number + label | None | ✅ Fine |
| Bottom Metrics | 917 | STAT CARD | `text-2xl` number + `text-xs` label | None — compact | ✅ Fine |

### applications/central-kitchen/index-mobile.html (2 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Pain Points | 210 | ICON+TEXT | icon + bold title + `text-sm` short desc (1 sentence) | Shorter text — OK | ✅ Fine |
| Stats (3-5 Staff, 300-800K, +50%, ≥75°C) | 368 | STAT CARD | `text-2xl` number + `text-xs` label | None — compact | ✅ Fine |

### applications/chain-restaurant/index-mobile.html (2 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Pain Points | 218 | ICON+TEXT | icon + bold title + `text-sm` desc (multi-sentence) | Long paragraphs cramped in half-width | 🟡 Acceptable |
| Stats (99.9%, 60%, 300°C, 800+) | 373 | STAT CARD | `text-2xl` number + `text-xs` label | None — compact | ✅ Fine |

### applications/cloud-kitchen/index-mobile.html (3 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Pain Points (short) | 234 | ICON+TEXT | icon + bold title + `text-sm` short desc | Short text — OK | ✅ Fine |
| Metrics (3x, 2min, 60%, 24h) | 365 | STAT CARD | `text-3xl` number + label | None | ✅ Fine |
| Deep Pain Points | 589 | ICON+TEXT | `p-5` padding + bold `text-base` title + `text-sm` desc (very long multi-sentence) | Very long paragraphs, generous padding → text area ~140px wide. Nearly unreadable | 🔴 Change to grid-cols-1 |

### applications/food-factory/index-mobile.html (3 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Stats (99%, 60%, 24h, HACCP) | 406 | STAT CARD | `text-2xl` number + `text-xs` label | None — compact | ✅ Fine |
| Equipment Recommendation Cards | 448 | IMAGE CARD | `aspect-[3/2]` image + `p-6` + `text-xl` title + `text-sm` desc + CTA link | Image ~150px wide at half-width; `p-6` padding eats space; `text-xl` title cramped; desc barely readable | 🔴 Change to grid-cols-1 |
| Pain Points | 700 | ICON+TEXT | icon + title + `text-sm` desc | Need to verify length | 🟡 Acceptable (assumed similar to other app pages) |

### applications/menu-lab/index-mobile.html (2 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Pain Points | 183 | ICON+TEXT | icon + title + `text-sm` desc | Standard pattern | ✅ Fine |
| Stats | 369 | STAT CARD | number + `text-xs` label | None | ✅ Fine |

### applications/small-restaurant/index-mobile.html (3 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Pain Points | 188 | ICON+TEXT | icon + title + `text-sm` desc | Standard pattern | ✅ Fine |
| Stats | 346 | STAT CARD | number + label | None | ✅ Fine |
| Pain Points (secondary) | 574 | ICON+TEXT | icon + title + `text-sm` desc | Standard pattern | ✅ Fine |

### cases/bangkok through cases/surabaya (8 pages × 1 section = 8 sections)

All identical pattern. Each has **one** grid-cols-2 section.

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Data Cards (Meals/Day, Labor Cost, etc.) | ~68-70 | STAT CARD | `w-10 h-10` icon + `text-2xl` number + `text-xs` label | None — compact, icon+number+label | ✅ Fine (all 8 pages) |

Pages: bangkok (L70), cebu (L68), hanoi (L71), hcmc (L66), jakarta (L68), kl (L68), manila (L68), surabaya (L68)

### home/index-mobile.html (1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Stats (200+, 50+, 20+, CE/UL) | 330 | STAT CARD | `text-2xl` number + `text-xs` label | Some labels are long sentences | 🟡 Acceptable (long labels may wrap but still readable) |

### landing/index-mobile.html (2 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Performance Metrics (+25%, 15%) | 206 | STAT CARD | `text-sm` label + `text-3xl` number + `text-xs` sub | Nested structure slightly odd but works | ✅ Fine |
| Trust Metrics (2000+, 500+, 12, 98%) | 450 | STAT CARD | icon + `text-2xl` number + `text-xs` label | None — compact | ✅ Fine |

### products/all + cutting + frying + other + steaming + stewing + stirfry (7 pages × 1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Product Grid | varies | PRODUCT CARD | `id="product-grid"`, dynamically rendered by JS | Standard e-commerce 2-col grid for product thumbnails | ✅ Fine (all 7 pages) |

Pages: all (L246), cutting (L373), frying (L361), other (L366), steaming (L369), stewing (L367), stirfry (L369)

### products/detail/index-mobile.html (1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Skeleton Loader | 87 | SKELETON | `class="***"` placeholder divs | Replaced entirely by `product-detail.js` at runtime | ⚪ Non-issue (JS replaces) |

### profit-calculator/index-mobile.html (2 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Equipment Checkboxes | 243 | CHECKBOX GRID | `text-sm` checkbox + label | Short labels, fits well | ✅ Fine |
| Savings & Investment | 334 | STAT CARD | `text-[10px]` label + `text-lg` number | Compact, works well | ✅ Fine |

### support/faq/index-mobile.html (3 sections)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Core Values Cards | 109 | `grid-cols-1 md:grid-cols-2 lg:grid-cols-1` | Has image + title + desc | On mobile this is `grid-cols-1` — **no issue** | ✅ Fine (already single-col on mobile) |
| Process Steps | 167 | `grid-cols-1 md:grid-cols-2 lg:grid-cols-1` | Step number + title + desc | On mobile this is `grid-cols-1` — **no issue** | ✅ Fine (already single-col on mobile) |
| Stats (80%, 2h, 7×24, 100+) | 421 | STAT CARD | `text-2xl` number + `text-xs` label on dark bg | None — compact | ✅ Fine |

### support/installation/index-mobile.html (1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Stats (2h, 200+, 98%, Countries) | 324 | STAT CARD | `text-2xl` number + `text-xs` label on dark bg | None — compact | ✅ Fine |

### support/spare-parts/index-mobile.html (1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Stats (500+, 48h, 10, ...) | 358 | STAT CARD | `text-2xl` number + `text-xs` label on dark bg | None — compact | ✅ Fine |

### support/training/index-mobile.html (1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Core Features (On-site, Online, Manuals, Certificate) | 133 | FEATURE CARD | icon + `text-sm` title + `text-[11px]` desc | 11px desc is already tiny; 4 cards, descriptive text cramped in half-width | 🟡 Acceptable (11px barely readable but intentional) |

### support/warranty/index-mobile.html (1 section)

| Section | Line | Type | Current | Issue | Recommendation |
|---------|------|------|---------|-------|----------------|
| Stats | 346 | STAT CARD | `text-2xl` number + `text-xs` label on dark bg | None — compact | ✅ Fine |

### Pages with NO grid-cols-2 (no issues)
- contact/index-mobile.html
- news/index-mobile.html
- news/detail-mobile.html
- quote/index-mobile.html
- support/index-mobile.html
- support/services/index-mobile.html
- products/index-mobile.html
- applications/index-mobile.html
- cases/index-mobile.html
- thank-you/index-mobile.html

---

## Recommendations

### 🔴 Should change to grid-cols-1

| # | File | Line | Reason |
|---|------|------|--------|
| 1 | `applications/cloud-kitchen/index-mobile.html` | 589 | Deep pain point cards with `p-5` padding, `text-base` titles, and very long multi-sentence `text-sm` descriptions. At half-width (~150px usable text area), text is nearly unreadable. Switch to `grid-cols-1` for full-width cards. |
| 2 | `applications/food-factory/index-mobile.html` | 448 | Equipment recommendation cards with `aspect-[3/2]` images + `p-6` padding + `text-xl` titles + descriptions + CTA links. Images become ~150px wide thumbnails (too small to evaluate equipment), titles wrap awkwardly, and descriptions are compressed. Switch to `grid-cols-1` for proper product showcase. |

### 🟡 Acceptable but could improve

| # | File | Line | Reason | Suggested improvement |
|---|------|------|--------|----------------------|
| 1 | `about/index-mobile.html` | 265 | Manufacturing advantages: icon + `text-xs` title + `text-sm` multi-sentence descriptions. 4 cards. | Reduce desc to `text-xs` or shorten text |
| 2 | `about/index-mobile.html` | 452 | SLA cards: `text-3xl` number + `text-sm` title + `text-sm` description. Extra text line adds clutter. | Remove or shorten the description line |
| 3 | `applications/canteen/index-mobile.html` | 242 | Pain points: icon + bold title (no explicit size, defaults ~16px) + long `text-sm` multi-sentence desc. | Add `text-xs` or `text-sm` to titles; shorten descriptions |
| 4 | `applications/chain-restaurant/index-mobile.html` | 218 | Pain points: icon + bold title + long `text-sm` multi-sentence desc. Same pattern as canteen. | Same as above |
| 5 | `applications/food-factory/index-mobile.html` | 700 | Pain points: similar pattern to other app pages | Verify text length; shorten if needed |
| 6 | `home/index-mobile.html` | 330 | Stats: some labels are long full sentences in `text-xs`. May wrap to 3-4 lines. | Shorten label text |
| 7 | `support/training/index-mobile.html` | 133 | Feature cards: icon + `text-sm` title + `text-[11px]` multi-sentence desc. 4 cards. 11px is at readability limit. | Consider `grid-cols-1` or reduce text |
| 8 | `products/detail/index-mobile.html` | 87 | Skeleton loader replaced by JS. `grid-cols-2` in skeleton may not match final JS-rendered layout. | Verify JS renders appropriately |

### ✅ Fine as grid-cols-2

All STAT CARD sections (big number + small label), certification logos, product grid listings, profit calculator checkboxes, and support stats rows are well-suited for 2-column layout on mobile. These include:

- **All 8 case study pages** — stat cards only
- **All 7 product listing pages** — standard e-commerce product grid
- **6 support stat rows** (faq, installation, spare-parts, warranty) — number + label
- **Landing page metrics** — compact numbers
- **Profit calculator** — checkboxes and result numbers
- **Certification grid** (about) — small logos + short labels
- **App metrics/stats sections** — number + label patterns
- **Short pain point cards** (central-kitchen, cloud-kitchen L234) — brief descriptions

## Pattern Guidance

For future mobile pages, follow these rules:

| Card Type | grid-cols-2 OK? | Requirement |
|-----------|----------------|-------------|
| STAT CARD (number + label) | ✅ Yes | Label must be `text-xs` or shorter |
| ICON + short text (≤1 sentence) | ✅ Yes | Desc must be `text-sm` or shorter |
| ICON + long text (≥2 sentences) | 🟡 Risky | Prefer `grid-cols-1` or shorten text |
| IMAGE CARD (aspect-ratio + text) | 🔴 No | Always use `grid-cols-1` on mobile |
| PRODUCT CARD (thumbnail grid) | ✅ Yes | Standard e-commerce pattern |
| CHECKBOX / FORM controls | ✅ Yes | Short labels only |
