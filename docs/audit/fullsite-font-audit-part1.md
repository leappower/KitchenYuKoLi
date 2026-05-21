# Full-Site Font & Button Audit — Part 1
## Cases Pages, Home, About, Contact, News, Quote, Support, Profit Calculator, Thank You, Landing

**Date:** 2026-05-21  
**Files audited:** 78 HTML files (25 page groups × 3 screens)  
**Excluded:** products/, applications/ (audited separately)  
**Method:** Automated grep-based extraction of text-size, heading, and button padding classes

---

## Summary Table

### Key: Legend
- ✅ = Pass (no issues)
- ⚠️ = Minor issue (LOW)
- 🔶 = Notable issue (MEDIUM)
- 🔴 = Significant issue (HIGH)

| # | Page | Mobile H1 | Mobile Desc | Mobile CTA | Tablet H2 | Tablet CTA | Body Text Issues | Overall |
|---|------|-----------|-------------|------------|-----------|------------|------------------|---------|
| 1 | home | `text-2xl` ✅ | — | `px-5 py-3 text-sm` ✅ | `text-2xl`/`text-3xl` ✅ | `px-7 py-3 text-base` ✅ | ✅ | ✅ |
| 2 | landing | `text-2xl` ✅ | — | — | `text-4xl` 🔶 | — | ✅ | ⚠️ |
| 3 | about | `text-2xl` ✅ | `text-sm` ✅ | `px-5/6 py-2.5/3 text-sm` ✅ | `text-2xl` ✅ | `px-6/8 py-3 text-sm` ✅ | ✅ | ✅ |
| 4 | contact | `text-2xl` ✅ | — | `px-5/6 py-2/3 text-sm` ✅ | `text-2xl` ✅ | `px-6 py-3/3.5 text-sm` ✅ | ✅ | ✅ |
| 5 | cases/index | — | — | `px-5 py-3 text-sm` ✅ | `text-2xl`/`text-3xl` ✅ | `px-6 py-3` ✅ | ✅ | ✅ |
| 6 | cases/bangkok | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 7 | cases/cebu | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 8 | cases/hanoi | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 9 | cases/hcmc | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 10 | cases/jakarta | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 11 | cases/kl | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 12 | cases/manila | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 13 | cases/surabaya | `text-3xl` ✅ | `text-lg` 🔶 | `px-8 py-4 text-lg` 🔴 | `text-2xl`/`text-3xl` ✅ | `px-8 py-4 text-lg` 🔶 | ✅ | 🔴 |
| 14 | news/index | — | — | `px-6 py-3` (no text-size) ⚠️ | `text-4xl` 🔶 | `px-6 py-3` ✅ | ✅ | ⚠️ |
| 15 | news/detail | — | — | — | — | — | ✅ | ✅ |
| 16 | quote | — | — | — | — | — | ✅ | ✅ |
| 17 | support/index | — | — | `px-6 py-3 text-sm` ✅ | `text-2xl`/`text-3xl` ✅ | `px-8 py-4` (no text-sm) 🔶 | ✅ | ⚠️ |
| 18 | support/faq | — | — | `px-8 py-4 text-lg` 🔴 | `text-4xl`/`text-5xl` 🔴 | `px-10 py-5 text-lg` 🔴 | ✅ | 🔴 |
| 19 | support/installation | — | — | `px-8 py-4 text-lg` 🔴 | `text-4xl` 🔴 | `px-8 py-4 text-lg` 🔴 | ✅ | 🔴 |
| 20 | support/services | — | — | `px-6 py-3.5 text-base` ⚠️ | `text-2xl` ✅ | `px-8 py-4 text-base` 🔶 | ✅ | ⚠️ |
| 21 | support/spare-parts | — | — | `px-8 py-4 text-lg` 🔴 | `text-4xl`/`text-5xl` 🔴 | `px-8 py-4 text-lg` 🔴 | ✅ | 🔴 |
| 22 | support/training | — | — | `px-5 py-3 text-sm` ✅ | `text-3xl` ✅ | `px-6 py-3 text-sm` ✅ | ✅ | ✅ |
| 23 | support/warranty | — | — | `px-8 py-4 text-lg` 🔴 | `text-4xl`/`text-5xl` 🔴 | `px-8 py-4 text-lg` 🔴 | ✅ | 🔴 |
| 24 | profit-calculator | — | — | `px-6 py-3` (no text-size) ⚠️ | `text-3xl` ✅ | `px-8 py-4` (no text-sm) 🔶 | `text-lg`/`text-xl` on result vals ✅ | ⚠️ |
| 25 | thank-you | — | — | `px-6 py-3` (no text-size) ⚠️ | — | — | ✅ | ⚠️ |

---

## Issues by Category

### 🔴 HIGH Priority Issues

#### H1: Mobile CTA buttons — `px-8 py-4 text-lg` (too large for mobile)
**Affects:** ALL 8 case detail pages + 5 support sub-pages (mobile)

These pages use oversized CTA buttons on mobile screens. `px-8` + `py-4` + `text-lg` makes buttons 32px→64px horizontal padding, 16px→32px vertical, 18px font — resulting in massive touch targets that waste screen space.

| Page | File | Affected Buttons |
|------|------|-----------------|
| cases/bangkok (mobile) | L252, L260 | Primary + Secondary CTA |
| cases/cebu (mobile) | L252, L260 | Primary + Secondary CTA |
| cases/hanoi (mobile) | L245, L253 | Primary + Secondary CTA |
| cases/hcmc (mobile) | L240, L248 | Primary + Secondary CTA |
| cases/jakarta (mobile) | L247, L255 | Primary + Secondary CTA |
| cases/kl (mobile) | L232, L240 | Primary + Secondary CTA |
| cases/manila (mobile) | L251, L259 | Primary + Secondary CTA |
| cases/surabaya (mobile) | L243, L251 | Primary + Secondary CTA |
| support/faq (mobile) | L528 | WhatsApp CTA |
| support/installation (mobile) | L88, L92, L480, L483 | Hero CTAs + Bottom CTAs |
| support/spare-parts (mobile) | L87, L91, L491, L494 | Hero CTAs + Bottom CTAs |
| support/warranty (mobile) | L89, L93, L482, L485 | Hero CTAs + Bottom CTAs |

**Recommended fix:** Change to `px-6 py-3 text-sm` on mobile, or add responsive classes.

---

#### H2: Mobile H2 using `text-3xl` without responsive breakpoint
**Affects:** 4 support pages (mobile)

| Page | File | Line | Current |
|------|------|------|---------|
| support/faq (mobile) | index-mobile.html | L160, L210, L462, L518 | `text-3xl` |
| support/installation (mobile) | index-mobile.html | (H2 sizes OK at text-2xl) | ✅ |
| support/training (mobile) | index-mobile.html | L358 | `text-3xl` |

**Recommended fix:** Change `text-3xl` → `text-xl` or `text-2xl` on mobile screens.

---

#### H3: Tablet H2 using `text-4xl` or larger without responsive breakpoint
**Affects:** 7 pages (tablet)

| Page | File | Line | Current |
|------|------|------|---------|
| landing (tablet) | index-tablet.html | L257 | `text-3xl md:text-4xl` |
| news/index (tablet) | index-tablet.html | L87 | `text-4xl` |
| support/faq (tablet) | index-tablet.html | L161, L211, L463, L519 | `text-4xl` |
| support/installation (tablet) | index-tablet.html | L462 | `text-3xl md:text-4xl` |
| support/spare-parts (tablet) | index-tablet.html | L492 | `text-4xl md:text-5xl` |
| support/warranty (tablet) | index-tablet.html | L472 | `text-4xl md:text-5xl` |

**Recommended fix:** Change `text-4xl` → `text-2xl` or `text-3xl` on tablet. Remove `md:text-5xl` on tablet.

---

### 🟡 MEDIUM Priority Issues

#### M1: Mobile hero description using `text-lg` (18px)
**Affects:** ALL 8 case detail pages (mobile)

The hero subtitle/description paragraph on every case detail mobile page uses `text-lg`, which is 18px. On mobile this takes up significant visual space.

| Page | File | Line | Current |
|------|------|------|---------|
| cases/bangkok (mobile) | L64 | `text-lg text-slate-500` |
| cases/cebu (mobile) | L62 | `text-lg text-slate-500` |
| cases/hanoi (mobile) | L65 | `text-lg text-slate-500` |
| cases/hcmc (mobile) | L60 | `text-lg text-slate-500` |
| cases/jakarta (mobile) | L62 | `text-lg text-slate-500` |
| cases/kl (mobile) | L62 | `text-lg text-slate-500` |
| cases/manila (mobile) | L62 | `text-lg text-slate-500` |
| cases/surabaya (mobile) | L62 | `text-lg text-slate-500` |

**Note:** The CTA section description also uses `text-lg` (e.g., "Calculate your ROI in 45 seconds") — this is a design choice for emphasis but is borderline.

**Recommended fix:** Change hero description to `text-base` or `text-sm` on mobile.

---

#### M2: CTA description `text-lg` on mobile
**Affects:** ALL 8 case detail pages + profit-calculator (mobile)

Bottom CTA section description paragraph uses `text-lg` on all case detail mobile pages and profit-calculator:
- `text-white/80 mb-6 text-lg` — "Calculate your ROI in 45 seconds"
- `text-lg text-white/80 mb-6` — profit-calculator footer CTA

**Recommended fix:** Change to `text-base` or `text-sm` on mobile.

---

#### M3: Tablet CTA buttons `px-8 py-4` with `text-lg` (no `text-sm`)
**Affects:** ALL 8 case detail pages + 5 support sub-pages (tablet)

Same oversized button pattern on tablet. The buttons use `px-8 py-4 text-lg` which is large for the tablet form factor.

| Page | Tablet File |
|------|------------|
| cases/bangkok (tablet) | L252, L260 |
| cases/cebu (tablet) | L252, L260 |
| cases/hanoi (tablet) | L245, L253 |
| cases/hcmc (tablet) | L240, L248 |
| cases/jakarta (tablet) | L247, L255 |
| cases/kl (tablet) | L232, L240 |
| cases/manila (tablet) | L251, L259 |
| cases/surabaya (tablet) | L243, L251 |
| support/index (tablet) | L269, L275, L279 |
| support/installation (tablet) | L88, L92 |
| support/spare-parts (tablet) | L87, L91 |
| support/warranty (tablet) | L89, L93 |
| profit-calculator (tablet) | L449, L457 |
| support/services (tablet) | L173, L180 |

**Recommended fix:** Add `text-sm` or change to `text-base` on tablet.

---

#### M4: support/services mobile uses `text-base` on CTA buttons
**Affects:** support/services (mobile)

Hero CTAs and bottom CTAs use `text-base` (16px) on mobile with `px-6 py-3.5`:
- L124: `bg-primary text-white px-6 py-3.5 rounded-xl font-bold text-base`
- L131: `border-2 px-6 py-3.5 rounded-xl font-bold text-base`
- L511: `px-6 py-3.5 rounded-xl font-bold text-base` (bottom CTA)
- L522: `px-6 py-3.5 rounded-xl font-bold text-base` (bottom CTA)

**Recommended fix:** Change `text-base` → `text-sm` on mobile.

---

### 🟢 LOW Priority Issues

#### L1: CTA buttons with no explicit text-size class (inherits `text-base`)
**Affects:** 5 pages (mobile)

These buttons inherit the default `text-base` (16px) since no explicit text-size class is set. On mobile, `text-sm` (14px) would be more appropriate.

| Page | File | Line |
|------|------|------|
| news/index (mobile) | L161, L165 | Bottom CTA buttons |
| profit-calculator (mobile) | L452, L460 | Bottom CTA buttons |
| thank-you (mobile) | L122, L126 | Navigation buttons |

**Recommended fix:** Add `text-sm` class.

---

#### L2: support/index tablet — no `text-sm` on bottom CTA buttons
**Affects:** support/index (tablet) L269, L275, L279

Buttons use `px-8 py-4` without `text-sm`, inheriting `text-base`.

---

#### L3: H2 size variance within same page (design intent — mostly acceptable)

Most pages show H2 variance because CTA section headings are intentionally larger. This is **by design** and not flagged as a real issue:

- **about** (pc): `text-3xl lg:text-4xl` for body sections, `text-4xl lg:text-5xl` for CTA → **intentional hierarchy**
- **home** (pc): `text-3xl` for body, `text-4xl lg:text-5xl` for CTA → **intentional**
- **support/** pages (pc): `text-3xl lg:text-4xl` for body, `text-4xl lg:text-5xl` for CTA → **intentional**

**Note:** On support/faq (pc), the CTA H2 uses `text-4xl lg:text-5xl` which is large but acceptable for PC.

---

#### L4: H3 variance within pages (mostly by design)

- **about** (tablet): `text-base` (parts section h3) and `text-lg` (SLA section h3) — minor but acceptable
- **cases/** pages: `text-green text-red` are color classes, not size variance — **false positive**
- **support/training** (pc/tablet): Different h3 sizes in different sections — acceptable

---

#### L5: support/training mobile — `text-lg` on a metric counter value
**Affects:** support/training (mobile) L121

```html
<p class="text-white text-lg font-bold">3</p>
```

This is a **data/metric value** — excluded from flagging per rules.

---

#### L6: profit-calculator mobile — `text-lg`/`text-xl` on result values
**Affects:** profit-calculator (mobile) L344, L357, L382

```html
<p id="res-monthly-savings" class="text-lg font-black text-emerald-700">
<p id="res-annual" class="text-xl font-black text-slate-800">
```

These are **data/metric values** (computed savings numbers) — excluded from flagging per rules.

---

## Pages with NO Issues (Clean)

The following pages passed all checks:

| Page | Notes |
|------|-------|
| **about** (all screens) | Well-sized. Mobile uses `text-2xl` H1, `text-sm` body, `text-sm` buttons |
| **contact** (all screens) | Good mobile sizing. Form inputs use `text-sm` on mobile |
| **home** (all screens) | Mobile H1 `text-2xl`, CTAs `px-5 py-3 text-sm` ✅ |
| **quote** (all screens) | Form inputs `text-base` on mobile (acceptable for input fields) |
| **news/detail** (all screens) | Minimal buttons, all small-sized |
| **support/training** (all screens) | Mobile CTAs properly `text-sm` ✅ |
| **support/index** (mobile only) | Good mobile sizing |
| **cases/index** (mobile) | CTAs `px-5 py-3 text-sm` ✅ |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total files audited | 78 |
| Files with HIGH issues | ~20 (across 13 page groups) |
| Files with MEDIUM issues | ~22 |
| Files with LOW issues | ~8 |
| Clean files | ~28 |
| **Pages needing immediate fix** | **13 page groups** |

### Most Critical Fix (systemic — same template)

**ALL 8 case detail pages** share the same template and have identical issues:
1. Mobile CTA: `px-8 py-4 text-lg` → should be `px-6 py-3 text-sm`
2. Mobile hero desc: `text-lg` → should be `text-base` or `text-sm`
3. Tablet CTA: `px-8 py-4 text-lg` → should add `text-sm`
4. Mobile CTA desc: `text-lg` → should be `text-base`

**5 support sub-pages** (faq, installation, spare-parts, warranty, services) also share patterns:
1. Mobile/tablet CTAs too large
2. Tablet H2 heading sizes too large for the breakpoint

### Recommended Priority Order
1. **Cases detail pages** (8 pages, same template fix) — Highest impact, most pages
2. **Support sub-pages** (faq, installation, spare-parts, warranty, services) — 5 pages
3. **News index** (tablet H2) — 1 page
4. **Landing** (tablet H2) — 1 page
5. **Low-priority** (missing text-sm on 3 pages) — 3 pages
