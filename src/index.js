/**
 * index.js — LEGACY webpack JS entry (DEPRECATED, bundle unused)
 *
 * ⚠️  Architecture decision (2026-03):
 *     This project uses static multi-page HTML as the sole runtime architecture.
 *     Pages in src/pages/ load JS directly via <script src="/assets/js/..."> tags.
 *     The bundle produced from this entry (dist/bundle.js) is NOT injected into
 *     any page (webpack.config.js uses inject:false) and has ZERO effect at runtime.
 *
 *     webpack is retained ONLY for:
 *       1. CSS pipeline  (styles.css via MiniCssExtractPlugin)
 *       2. Asset copying (lang/, images/, sw.js via CopyWebpackPlugin)
 *       3. HTML templating (HtmlWebpackPlugin, inject:false)
 *
 *     JS modules that ARE active at runtime (loaded directly by pages):
 *       router.js, page-interactions.js, contacts.js, smart-popup.js,
 *       back-to-top.js  — loaded via <script defer src="/assets/js/...">
 *
 *     JS modules pending activation (see fix-plan.md F3):
 *       translations.js, lang-registry.js  — i18n system, not yet wired to pages
 *
 *     JS modules in this file only (no runtime effect, kept for reference):
 *       common.js, utils.js, image-assets.js, media-queries.js,
 *       init.js, main.js, navigation.js, sidebar.js,
 *       product-list.js, product-data-table.js, products.js
 *
 * TODO: Remove JS imports below once webpack entry is converted to CSS-only.
 *       Track: https://github.com/leappower/HTML-YuQL/issues (F1 cleanup)
 */
import './assets/css/styles.css';
// JS imports below produce dead code in bundle — kept for reference only
import './assets/js/media-queries.js';   // window.MediaQueries
import './assets/js/common.js';          // window.CommonUtils
import './assets/js/translations.js';    // window.translationManager / setupLanguageSystem
import './assets/js/lang-registry.js';   // window.LangRegistry
import './assets/js/image-assets.js';    // window.ImageAssets
import './assets/js/init.js';            // Initialization
import './assets/js/utils.js';           // window.AppUtils
import './assets/js/main.js';            // Lazy loading, error handling, app modules
import './assets/js/contacts.js';        // window contact helpers
// navigation.js REMOVED: functions duplicated in floating-actions.js, mobile-menu.js, page-interactions.js
import './assets/js/sidebar.js';         // window sidebar helpers
// import './assets/js/smart-popup.js';     // REMOVED: now in assets/js/ui/smart-popup.js, loaded directly by pages
import './assets/js/product-list.js';    // window.ProductList
import './assets/js/product-data-table.js'; // window product data
import './assets/js/products.js';        // window product rendering helpers
