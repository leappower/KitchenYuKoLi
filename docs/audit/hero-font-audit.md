# Hero & Font Size Audit Report

**Date:** 2026-05-21  
**Scope:** products/ and applications/ sub-pages, all 3 screens (pc, tablet, mobile)  
**Audit Focus:** Hero H1, description paragraph, CTA button, section H2 sizes + body text anomalies

---

## Summary of Issues Found

| Issue | Severity | Affected Pages |
|-------|----------|----------------|
| Mobile CTA buttons with `px-8 py-4` but **no explicit `text-sm`** — inherits `text-base` (16px), looks oversized on mobile | 🔴 HIGH | 6 applications sub-pages (mobile) |
| Mobile applications sub-pages: H2 still uses `text-3xl`/`text-4xl` (same as PC) | 🔴 HIGH | 5 applications sub-pages (mobile) |
| Mobile body paragraphs using `text-lg` (18px) instead of `text-sm`/`text-base` | 🟡 MEDIUM | 6 applications sub-pages (mobile) |
| Tablet CTA buttons with no explicit text size (inherits `text-base`) | 🟡 MEDIUM | 4 applications sub-pages (tablet) |
| Tablet H2 uses `text-4xl` on some pages (same as PC) | 🟡 MEDIUM | 5 applications sub-pages (tablet) |
| Tablet H2 uses `text-3xl` on some product pages (inconsistent) | 🟢 LOW | 4 products sub-pages (tablet) |
| products/all tablet H1 is `text-5xl` — larger than other tablet pages (`text-4xl`) | 🟢 LOW | products/all (tablet) |
| PC H2 varies between `text-3xl`, `text-4xl`, `text-5xl` within same page | 🟢 LOW | All products sub-pages (PC) |
| products/detail has no H1 on any screen | 🟢 INFO | products/detail (all screens) |
| products/cutting mobile CTA uses `text-xs` (too small) | 🟢 LOW | products/cutting (mobile) |

---

## Products Pages

### products/index (Main Products Listing)

| Element | PC | Tablet | Mobile | Notes |
|---------|-----|--------|--------|-------|
| Hero H1 | `text-4xl` | `text-4xl` | `text-2xl` | ✅ Good scaling |
| Hero Desc | `text-lg` | `text-base` | `text-sm` | ✅ Good scaling |
| Hero CTA | No CTA (card grid layout) | No CTA | `text-sm` | ✅ OK — different layout |
| Section H2 | `text-3xl`, `text-4xl` | `text-2xl` | — | ✅ |

### products/cutting, frying, steaming, stewing, stirfry, other (Product Sub-Pages)

These 6 pages share the same template structure.

| Element | PC | Tablet | Mobile | Expected Mobile | Status |
|---------|-----|--------|--------|-----------------|--------|
| Hero H1 | `text-6xl` | `text-4xl` | `text-3xl` | `text-2xl`~`text-3xl` | ⚠️ `text-3xl` on mobile is 30px — consider `text-2xl` |
| Hero Desc | `text-lg` | _(none)_ | `text-sm` | `text-sm` | ⚠️ Tablet missing desc size |
| Hero CTA | `text-lg` | `text-sm` | `text-xs` | `text-sm` | 🔴 Mobile CTA `text-xs` too small |
| Section H2 | `text-3xl`~`text-5xl` | `text-2xl` (some `text-3xl`) | `text-lg` | `text-lg`~`text-xl` | ⚠️ PC has inconsistent H2 sizes |
| Body Text | `text-lg` (PC) | — | — | — | ⚠️ Multiple `text-lg` paragraphs on PC |

**Key Issues:**
- 🔴 **Mobile CTA `text-xs`** on cutting, frying, steaming, stewing, stirfry — should be `text-sm`
- ⚠️ PC CTA `text-lg` is fine, but inconsistent with applications pages
- ⚠️ Tablet hero description has no explicit text-size class on most pages

### products/all (All Products)

| Element | PC | Tablet | Mobile | Notes |
|---------|-----|--------|--------|-------|
| Hero H1 | `text-6xl` | `text-5xl` | `text-3xl` | ⚠️ Tablet `text-5xl` is larger than other tablet pages |
| Hero Desc | _(none)_ | _(none)_ | `text-sm` | |
| Hero CTA | `text-lg` | `text-base` | `text-sm` | ✅ Good scaling |
| Section H2 | — | `text-3xl` | `text-lg` | |
| Body Text | `text-lg` (1 occurrence) | `text-lg` (2 occurrences) | — | ⚠️ |

### products/detail

| Element | PC | Tablet | Mobile | Notes |
|---------|-----|--------|--------|-------|
| Hero H1 | ❌ No H1 | ❌ No H1 | ❌ No H1 | ℹ️ Detail page uses different layout |
| Hero CTA | `text-sm` | `text-sm` | `text-sm` | ✅ Consistent |
| Section H2 | — | — | — | |

---

## Applications Pages

### applications/index (Main Applications Listing)

| Element | PC | Tablet | Mobile | Notes |
|---------|-----|--------|--------|-------|
| Hero H1 | `text-4xl` | `text-3xl` | `text-2xl` | ✅ Good scaling |
| Hero Desc | _(none)_ | `text-base` | `text-sm` | ⚠️ PC missing desc size |
| Hero CTA | No CTA (card grid) | No CTA | No CTA | ✅ OK — different layout |
| Section H2 | `text-3xl`, `text-4xl` | `text-2xl`, `text-3xl` | — | ✅ |
| Body Text | `text-lg` (1 occurrence) | — | — | ⚠️ |

### applications/canteen, chain-restaurant, cloud-kitchen, food-factory, small-restaurant (Application Sub-Pages)

These 5 pages share similar template structure.

| Element | PC | Tablet | Mobile | Expected | Status |
|---------|-----|--------|--------|----------|--------|
| Hero H1 | `text-4xl` | `text-4xl` | `text-3xl` | Mobile: `text-2xl`~`text-3xl` | ⚠️ Tablet same as PC |
| Hero Desc | `text-xl` | `text-lg` | `text-xl` | Mobile: `text-sm`~`text-base` | 🔴 **Mobile `text-xl` (20px) is oversized** |
| Hero CTA | `text-base` (inherited) | `text-base` (inherited) | `text-base` (inherited) | Mobile: `text-sm` | 🔴 **No `text-sm` on mobile CTA** |
| Section H2 | `text-3xl`, `text-4xl` | `text-2xl`~`text-4xl` | `text-3xl`, `text-4xl` | Mobile: `text-xl`~`text-2xl` | 🔴 **Mobile H2 same as PC** |
| Body Text | `text-lg` | `text-lg` | `text-lg` | Mobile: `text-sm`~`text-base` | 🔴 **Mobile body `text-lg` is oversized** |

**🔴 Critical: Applications Sub-Pages Mobile Issues**

The application sub-pages have the most severe "字体过大" (oversized font) problems:

1. **Hero description** uses `text-xl` (20px) on mobile — should be `text-sm` or `text-base`
2. **CTA buttons** have no explicit `text-sm`, inheriting `text-base` (16px) — combined with `px-8 py-4` padding, buttons look huge on mobile
3. **Section H2** uses `text-3xl`/`text-4xl` on mobile — same sizes as PC desktop
4. **Body paragraphs** use `text-lg` (18px) throughout — should be `text-sm` or `text-base` on mobile

### applications/central-kitchen

| Element | PC | Tablet | Mobile | Notes |
|---------|-----|--------|--------|-------|
| Hero H1 | `text-4xl` | `text-4xl` | `text-3xl` | |
| Hero Desc | _(none)_ | _(none)_ | `text-base` | ⚠️ PC/Tablet missing |
| Hero CTA | `text-base` (inherited) | `text-sm` | `text-base` (inherited) | ⚠️ Mobile CTA no explicit size |
| Section H2 | `text-3xl`, `text-4xl` | `text-2xl` | `text-lg` | ✅ Good scaling |
| Body Text | `text-lg` | — | — | |

### applications/menu-lab

| Element | PC | Tablet | Mobile | Notes |
|---------|-----|--------|--------|-------|
| Hero H1 | `text-4xl` | `text-4xl` | `text-3xl` | |
| Hero Desc | _(none)_ | _(none)_ | `text-base` | |
| Hero CTA | `text-base` (inherited) | `text-sm` | `text-base` (inherited) | ⚠️ Mobile CTA no explicit size |
| Section H2 | `text-3xl`, `text-4xl` | `text-2xl` | — | |
| Body Text | `text-lg` | — | — | |

---

## Detailed Issue Breakdown

### 🔴 Issue 1: Applications Sub-Pages — Mobile Hero Description Too Large

**Affected files:**
- `applications/canteen/index-mobile.html` — `<p class="text-xl ...">`
- `applications/chain-restaurant/index-mobile.html` — `<p class="text-xl ...">` (inferred from tablet `text-lg` being close)
- `applications/cloud-kitchen/index-mobile.html` — `<p class="text-xl ...">`
- `applications/food-factory/index-mobile.html` — `<p class="text-xl ...">`
- `applications/small-restaurant/index-mobile.html` — `<p class="text-xl ...">`

**Current:** `text-xl` (20px)  
**Recommended:** `text-sm` (14px) or `text-base` (16px)

### 🔴 Issue 2: Applications Sub-Pages — Mobile CTA Button Missing `text-sm`

**Affected files (no explicit `text-sm` on hero CTA `bg-primary text-white`):**
- `applications/canteen/index-mobile.html` — `px-8 py-4` with no text-size
- `applications/central-kitchen/index-mobile.html` — `px-6 py-3.5` with no text-size
- `applications/chain-restaurant/index-mobile.html` — `px-6 py-3.5` with no text-size
- `applications/cloud-kitchen/index-mobile.html` — `px-8 py-4` with no text-size
- `applications/menu-lab/index-mobile.html` — `px-6 py-3.5` with no text-size
- `applications/small-restaurant/index-mobile.html` — `px-6 py-3.5` with no text-size

**Current:** Inherits `text-base` (16px)  
**Recommended:** Add `text-sm` (14px) explicitly

### 🔴 Issue 3: Applications Sub-Pages — Mobile Section H2 Same as PC

**Affected files and their oversized mobile H2s:**

| File | Mobile H2 Sizes |
|------|----------------|
| `applications/canteen/index-mobile.html` | `text-3xl`, `text-4xl` |
| `applications/chain-restaurant/index-mobile.html` | `text-3xl`, `text-4xl` |
| `applications/cloud-kitchen/index-mobile.html` | `text-3xl`, `text-4xl` |
| `applications/food-factory/index-mobile.html` | `text-3xl`, `text-4xl`, `text-lg` |
| `applications/small-restaurant/index-mobile.html` | `text-3xl`, `text-4xl` |

**Recommended:** Use responsive classes like `text-2xl lg:text-3xl` or explicit mobile: `text-xl`~`text-2xl`

### 🔴 Issue 4: Applications Sub-Pages — Mobile Body Text `text-lg`

**Affected files:**

| File | Occurrences of `text-lg` body paragraphs |
|------|------------------------------------------|
| `applications/canteen/index-mobile.html` | 4 occurrences |
| `applications/chain-restaurant/index-mobile.html` | 1 occurrence |
| `applications/cloud-kitchen/index-mobile.html` | 4 occurrences |
| `applications/food-factory/index-mobile.html` | 3 occurrences |
| `applications/small-restaurant/index-mobile.html` | 1 occurrence |

**Recommended:** Change to `text-sm` or `text-base` on mobile

### 🔴 Issue 5: Products Sub-Pages — Mobile CTA `text-xs` Too Small

**Affected files:** products/cutting, frying, steaming, stewing, stirfry (5 pages)  
**Current:** `text-xs` (12px)  
**Recommended:** `text-sm` (14px)

### 🟡 Issue 6: Applications Sub-Pages — Tablet H2 Uses PC Sizes

**Affected files:**

| File | Tablet H2 with PC size |
|------|----------------------|
| `applications/canteen/index-tablet.html` | `text-4xl` (1 occurrence) |
| `applications/chain-restaurant/index-tablet.html` | `text-4xl` (1 occurrence) |
| `applications/cloud-kitchen/index-tablet.html` | `text-4xl` (1 occurrence) |
| `applications/food-factory/index-tablet.html` | `text-4xl` (2 occurrences) |
| `applications/small-restaurant/index-tablet.html` | `text-4xl` (1 occurrence) |

**Recommended:** Use `text-2xl lg:text-3xl` responsive pattern

---

## Recommended Font Size Standards

Based on the audit, here are the recommended standards:

### Hero Section

| Element | PC | Tablet | Mobile |
|---------|-----|--------|--------|
| H1 | `text-5xl` ~ `text-6xl` | `text-4xl` | `text-2xl` ~ `text-3xl` |
| Description | `text-lg` ~ `text-xl` | `text-base` ~ `text-lg` | `text-sm` ~ `text-base` |
| CTA Button | `text-base` ~ `text-lg` | `text-sm` ~ `text-base` | `text-sm` |

### Content Sections

| Element | PC | Tablet | Mobile |
|---------|-----|--------|--------|
| Section H2 | `text-3xl` ~ `text-4xl` | `text-2xl` ~ `text-3xl` | `text-xl` ~ `text-2xl` |
| Body Paragraph | `text-base` ~ `text-lg` | `text-base` | `text-sm` ~ `text-base` |

### Button Sizes

| Screen | Primary CTA | Secondary CTA |
|--------|-------------|---------------|
| PC | `text-base` / `text-lg` | `text-base` |
| Tablet | `text-sm` / `text-base` | `text-sm` |
| Mobile | `text-sm` | `text-sm` |

---

## Priority Fix List

1. **[HIGH]** Add `text-sm` to all 6 applications sub-page mobile CTA buttons
2. **[HIGH]** Change mobile H2 from `text-3xl`/`text-4xl` to `text-xl`/`text-2xl` on 5 applications sub-pages
3. **[HIGH]** Change mobile body `text-lg` to `text-sm`/`text-base` on applications sub-pages
4. **[HIGH]** Change mobile hero description from `text-xl` to `text-sm`/`text-base` on applications sub-pages
5. **[MEDIUM]** Change products sub-page mobile CTA from `text-xs` to `text-sm` (5 pages)
6. **[MEDIUM]** Normalize tablet H2 sizes on applications sub-pages (remove `text-4xl`)
7. **[LOW]** Normalize PC H2 sizes within individual pages (products sub-pages have 3 different sizes)
8. **[LOW]** Add explicit text-size to tablet CTA buttons on 4 applications sub-pages
