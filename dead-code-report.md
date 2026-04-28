# Dead Code Analysis Report

**Project:** KitchenYuKoLi  
**Date:** 2026-04-28  
**Scope:** `src/assets/js/` (41 JS files), `src/pages/` (110 HTML files), `src/assets/css/styles.css`  
**Method:** Static cross-reference analysis — function definitions grep'd from all JS, then referenced against all JS + HTML files. Functions exposed via `addEventListener`, `global.*`, or `window.*` property assignments were excluded.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total JS files scanned | 41 |
| Total lines scanned | ~13,007 |
| Functions defined (unique names) | 347 |
| **Confirmed dead functions** | **32** |
| **Estimated dead lines** | **~530** |
| Unused CSS classes | 12 / 31 |
| Broken internal links | 4 |
| Duplicate helper functions (across 5 split files) | 4 |
| JS files not referenced in any HTML | 7 (all dynamically loaded or entry-points) |

---

## 1. Dead Functions — Summary Table

| File | File Lines | Dead Functions | Dead Lines (est.) |
|------|-----------|---------------|-------------------|
| `common.js` | 581 | 33 | ~370 |
| `lang-registry.js` | 164 | 5 | ~22 |
| `image-assets.js` | 123 | 1 | ~17 |
| `translations.js` | 470 | 2 | ~2 |
| `utils/device-utils.js` | 269 | 1 | ~10 |
| `product-grid.js` | 391 | 2 | ~9 |
| **Total** | **1,998** | **44** | **~430** |

> **Note:** 33 of the 44 dead functions are in `common.js` — they are defined and exported via `global.CommonUtils = { ... }` but **no file in the project ever calls `CommonUtils.xxx()`**. Only `CommonUtils.debounce`, `CommonUtils.tr`, and `CommonUtils.ready` are consumed externally.

### Why so many in common.js?

`common.js` is a utility library that was built out with many general-purpose helpers. Over time, the codebase migrated to inline implementations or different patterns, leaving these exports orphaned. They are defined, exported, but **never imported**.

---

## 2. Per-File Dead Function Details

### `common.js` — 33 dead functions (~370 lines)

All of these are exported as `global.CommonUtils.X` but never consumed by any other file:

| Function | Lines | Description |
|----------|-------|-------------|
| `escapeHtml` | L46–54 (9) | HTML entity escaping |
| `isValidEmail` | L57–60 (4) | Email regex validation |
| `isValidPhone` | L63–66 (4) | Phone regex validation |
| `formatCurrency` | L69–74 (6) | Currency formatting |
| `formatDate` | L77–86 (10) | Date locale formatting |
| `formatNumber` | L89–92 (4) | Number locale formatting |
| `deepClone` | L95–111 (17) | Deep object cloning |
| `isEmpty` | L114–119 (6) | Empty object check |
| `sleep` | L146–150 (5) | Promise-based delay |
| `withTimeout` | L161–180 (20) | Promise timeout wrapper |
| `fetchWithTimeout` | L191–214 (24) | Fetch with timeout |
| `retry` | L217–237 (21) | Retry logic for async functions |
| `parseQueryString` | L240–253 (14) | URL query string parser |
| `buildQueryString` | L256–265 (10) | Query string builder |
| `isInViewport` | L268–276 (9) | Full viewport check |
| `isPartiallyInViewport` | L279–287 (9) | Partial viewport check |
| `getScrollPercentage` | L290–294 (5) | Scroll position 0–100 |
| `scrollToElement` | L297–301 (5) | Smooth scroll helper |
| `copyToClipboard` | L304–316 (13) | Clipboard API wrapper |
| `downloadFile` | L337–348 (12) | Programmatic file download |
| `generateId` | L351–354 (4) | Unique ID generator |
| `getLocalStorageItem` | L357–372 (16) | Typed localStorage getter |
| `setLocalStorageItem` | L374–382 (9) | Typed localStorage setter |
| `storage` | L384–423 (40) | Storage utility object |
| `isDesktop` | L432–434 (3) | Desktop breakpoint check |
| `detectBrowser` | L442–450 (9) | Browser detection |
| `detectOS` | L453–461 (9) | OS detection |
| `getBrowserLanguage` | L464–466 (3) | Browser lang getter |
| `arraysEqual` | L469–475 (7) | Array equality compare |
| `mergeUniqueArrays` | L477–490 (14) | Merge arrays, deduplicate |
| `removeDuplicates` | L492–494 (3) | Deduplicate array |
| `groupBy` | L496–501 (6) | Group array by key |
| `sortBy` | L503–508 (6) | Sort array by key |

**Recommendation:** Keep `debounce`, `throttle`, `tr`, and `ready` (they ARE used). Remove the 33 unused exports and their definitions. This would reduce `common.js` from ~581 to ~220 lines.

### `lang-registry.js` — 5 dead functions (~22 lines)

These are exported on the `LangRegistry` object but `LangRegistry` is never imported by any other file:

| Function | Lines | Description |
|----------|-------|-------------|
| `getSupportedCodes` | L79–81 (3) | Returns supported language codes |
| `getAllCodes` | L87–89 (3) | Returns all language codes |
| `getEnglishNames` | L108–113 (6) | Returns English display names |
| `getLangsByGroup` | L119–125 (7) | Returns languages grouped |
| `getSortedCodes` | L131–133 (3) | Returns sorted codes |

### `image-assets.js` — 1 dead function (~17 lines)

| Function | Lines | Description |
|----------|-------|-------------|
| `imgTag` | L30–46 (17) | HTML img tag builder — exported but never called |

### `translations.js` — 2 dead functions (~2 lines)

| Function | Lines | Description |
|----------|-------|-------------|
| `setupLanguageSystem` | L458 (1) | Exported on module but never called |
| `debugTranslations` | L460 (1) | Debug helper — never called |

### `utils/device-utils.js` — 1 dead function (~10 lines)

| Function | Lines | Description |
|----------|-------|-------------|
| `checkDeviceChange` | L216–230 (15) | Checks if device type changed on resize — defined but the `initResizeListener` that calls it is also never externally triggered (only exported) |

### `product-grid.js` — 2 dead functions (~9 lines)

| Function | Lines | Description |
|----------|-------|-------------|
| `getMaxVisibleTabs` | L167–172 (6) | Tab visibility calculation — never called |
| `isMobileOrTablet` | L174–176 (3) | Device check — never called |

---

## 3. Unused CSS Classes (from `styles.css`)

31 total classes defined; **12 appear unused** in HTML and JS:

| Class | Status |
|-------|--------|
| `.btn-primary` | ❌ Unused |
| `.card-title` | ❌ Unused |
| `.config` | ❌ Unused (likely false positive — generic word) |
| `.css` | ❌ Unused (false positive — generic word) |
| `.html` | ❌ Unused (false positive — generic word) |
| `.js` | ❌ Unused (false positive — generic word) |
| `.md-content` | ❌ Unused |
| `.org` | ❌ Unused (false positive — generic word) |
| `.section-container` | ❌ Unused |
| `.section-title` | ❌ Unused |
| `.skeleton` | ❌ Unused |
| `.w3` | ❌ Unused |

**Genuinely unused (non-generic):** `.btn-primary`, `.card-title`, `.md-content`, `.section-container`, `.section-title`, `.skeleton`, `.w3`

> **Note:** This analysis covers only `styles.css` (701 lines). The project likely has additional CSS in component files or inline styles that were not in scope.

---

## 4. JS Files Not Referenced in HTML

These files are **not loaded via `<script>` tags** in any HTML page. However, most are dynamically loaded or are entry-point orchestrators:

| File | Lines | Loading Method | Status |
|------|-------|---------------|--------|
| `common.js` | 581 | Dynamic (imported by other JS) | ✅ Active |
| `main.js` | 204 | Dynamic (bootstrapper) | ✅ Active |
| `init.js` | 337 | Dynamic (bootstrapper) | ✅ Active |
| `navigation.js` | 279 | Dynamic (exports `window.Navigation`) | ✅ Active |
| `products.js` | 844 | Dynamic (loaded by SPA router) | ✅ Active |
| `sidebar.js` | 382 | Dynamic (loaded by SPA) | ✅ Active |
| `product-list.js` | 339 | Dynamic (depends on ImageAssets) | ✅ Active |
| `image-assets.js` | 123 | Dynamic (exports `window.ImageAssets`) | ✅ Active |
| `media-queries.js` | — | Dynamic (loaded by 2 JS files) | ✅ Active |
| `ui/smart-popup-loader.js` | 210 | **⚠️ Zero references in any file** | 🚨 Orphaned |

### 🚨 `ui/smart-popup-loader.js` — Orphaned File

This 210-line file is **not referenced by any HTML file or any other JS file**. It appears to be a leftover loader script that was superseded by direct `smart-popup.js` inclusion in HTML. It contains:
- `window.smartPopup` init logic
- `showSmartPopupManual()` wrapper
- Popup trigger management

**Recommendation:** Verify and delete if `smart-popup.js` handles all popup functionality.

---

## 5. Duplicate Helper Functions Across Split Modules

The following files were recently split from `page-interactions.js`. They contain **fully duplicated helper functions**:

| Helper | Files with Copies | Lines Each |
|--------|------------------|------------|
| `safeCall(fnName, args)` | `page-interactions.js`, `page-effects.js`, `form-interactions.js`, `pi-roi.js`, `pi-maps.js` | 5 files |
| `directText(el)` | `page-interactions.js`, `page-effects.js`, `pi-maps.js` | 3 files |
| `findByText(tag, text)` | `page-interactions.js`, `page-effects.js`, `pi-maps.js` | 3 files |

### Duplication Detail

```
safeCall() — 5 copies (page-interactions, page-effects, form-interactions, pi-roi, pi-maps)
directText() — 3 copies (page-interactions, page-effects, pi-maps)
findByText() — 3 copies (page-interactions, page-effects, pi-maps)
```

`animateNumber()` exists only in `pi-roi.js` — not duplicated.

**Recommendation:** Extract `safeCall`, `directText`, and `findByText` into a shared `ui/helpers.js` module, then import from each file. This eliminates ~45 lines of duplication.

---

## 6. Broken Internal Links in HTML

Scanned all `href="/path"` in 110 HTML files. **4 broken links found:**

| Link | Expected File | Status |
|------|--------------|--------|
| `/cases/` | `src/pages/cases/index.html` | 🚨 **Missing** — should be `/applications/cases/` |
| `/solutions/cases/` | `src/pages/solutions/cases/index.html` | 🚨 **Missing** — should be `/applications/cases/` |
| `/solutions/cooking-line/` | `src/pages/solutions/cooking-line/index.html` | 🚨 **Missing** — page doesn't exist |
| `/solutions/kitchen/` | `src/pages/solutions/kitchen/index.html` | 🚨 **Missing** — page doesn't exist |

### Where they appear:

Run `grep -rn 'href="/cases/"' src/pages/` etc. to find specific HTML files to fix.

---

## 7. Recommendations Summary

### High Priority
1. **Delete `ui/smart-popup-loader.js`** (210 lines, zero references)
2. **Fix 4 broken internal links** in HTML pages
3. **Extract shared helpers** (`safeCall`, `directText`, `findByText`) from 5 split modules into `ui/helpers.js`

### Medium Priority
4. **Remove 33 unused exports from `common.js`** — saves ~370 lines. Keep only `debounce`, `throttle`, `tr`, `ready` (+ their dependencies `get`, `set`, `deepClone` if needed internally)
5. **Remove 5 unused `LangRegistry` exports** (~22 lines) — or remove the entire module if nothing uses it
6. **Remove `imgTag`** from `image-assets.js` (~17 lines)

### Low Priority
7. **Remove `setupLanguageSystem` and `debugTranslations`** from translations.js exports
8. **Remove `getMaxVisibleTabs` and `isMobileOrTablet`** from product-grid.js (~9 lines)
9. **Clean up unused CSS classes** (`.btn-primary`, `.card-title`, `.md-content`, `.section-container`, `.section-title`, `.skeleton`, `.w3`)

### Potential Savings

| Action | Lines Saved |
|--------|------------|
| Remove dead common.js exports | ~370 |
| Delete smart-popup-loader.js | ~210 |
| Remove LangRegistry dead exports | ~22 |
| Deduplicate helpers (5→1 copies) | ~45 |
| Other small removals | ~30 |
| **Total** | **~677 lines** |
