#!/usr/bin/env node
/**
 * 清理 navigator.js 中关于 about/contact dropdown 的引用
 * 更新注释说明
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

function cleanupNavigator() {
  const navigatorPath = path.join(SRC_DIR, 'assets', 'js', 'ui', 'navigator.js');
  let content = fs.readFileSync(navigatorPath, 'utf8');

  // 更新文件头部的注释
  const oldHeaderComment = `/**
 * navigator.js — Yukoli Top Navigation Component
 *
 * Renders the sticky top header into a placeholder element, replacing it
 * with the full header HTML. The placeholder drives configuration via
 * data-* attributes — no inline HTML needed in each page.
 *
 * Usage in HTML (PC variant):
 *   <navigator data-component="navigator"
 *        data-variant="pc"
 *        data-active="catalog"
 *        data-search="true"
 *        data-search-i18n="search_placeholder"
 *        data-cta-text-key="nav_get_quote"
 *        data-cta-href="/quote/">
 *   </navigator>
 *
 * Usage in HTML (Tablet variant):
 *   <navigator data-component="navigator"
 *        data-variant="tablet"
 *        data-active="home"
 *        data-cta-text-key="nav_get_quote"
 *        data-cta-href="/quote/">
 *   </navigator>
 *
 * Configuration attributes:
 *   data-variant       {string}  Layout variant: "pc" | "tablet" (default: "pc")
 *   data-active        {string}  Nav item to highlight: "home" | "catalog" |
 *                                "case-studies" | "pdp" | "support" | "esg" |
 *                                "thank-you" | "landing" | "quote" | "roi" |
 *                                "" (none — page not in main nav)
 *   data-search        {string}  Show search box: "true" | "false" (default: "false")
 *   data-search-i18n   {string}  i18n key for search placeholder
 *                                (default: "search_placeholder")
 *   data-search-bp     {string}  Tailwind breakpoint for search box visibility
 *                                "xl" → "hidden xl:flex" (default) | "lg" → "hidden lg:flex"
 *   data-lang          {string}  Show language switcher: "true" | "false" (default: "true")
 *   data-cta           {string}  Show CTA button: "true" | "false" (default: "true")
 *   data-cta-text-key  {string}  i18n key for CTA button label (default: "nav_get_quote")
 *   data-cta-href      {string}  CTA button href (default: auto-resolved by variant)
 */`;

  const newHeaderComment = `/**
 * navigator.js — Yukoli Top Navigation Component
 *
 * Renders the sticky top header into a placeholder element, replacing it
 * with the full header HTML. The placeholder drives configuration via
 * data-* attributes — no inline HTML needed in each page.
 *
 * Usage in HTML (PC variant):
 *   <navigator data-component="navigator"
 *        data-variant="pc"
 *        data-active="catalog"
 *        data-search="true"
 *        data-search-i18n="search_placeholder"
 *        data-cta-text-key="nav_get_quote"
 *        data-cta-href="/quote/">
 *   </navigator>
 *
 * Usage in HTML (Tablet variant):
 *   <navigator data-component="navigator"
 *        data-variant="tablet"
 *        data-active="home"
 *        data-cta-text-key="nav_get_quote"
 *        data-cta-href="/quote/">
 *   </navigator>
 *
 * Configuration attributes:
 *   data-variant       {string}  Layout variant: "pc" | "tablet" (default: "pc")
 *   data-active        {string}  Nav item to highlight: "home" | "catalog" |
 *                                "applications" | "solutions" | "support" |
 *                                "case-studies" | "roi" | "pdp" | "esg" |
 *                                "thank-you" | "landing" | "quote" |
 *                                "" (none — page not in main nav)
 *   data-search        {string}  Show search box: "true" | "false" (default: "false")
 *   data-search-i18n   {string}  i18n key for search placeholder
 *                                (default: "search_placeholder")
 *   data-search-bp     {string}  Tailwind breakpoint for search box visibility
 *                                "xl" → "hidden xl:flex" (default) | "lg" → "hidden lg:flex"
 *   data-lang          {string}  Show language switcher: "true" | "false" (default: "true")
 *   data-cta           {string}  Show CTA button: "true" | "false" (default: "true")
 *   data-cta-text-key  {string}  i18n key for CTA button label (default: "nav_get_quote")
 *   data-cta-href      {string}  CTA button href (default: auto-resolved by variant)
 *
 * L1 Navigation (4 items):
 *   Products → /catalog/
 *   Applications → /applications/
 *   Solutions → /solutions/
 *   Service → /support/
 */`;

  content = content.replace(oldHeaderComment, newHeaderComment);

  // 更新 NAV_ITEMS 注释
  content = content.replace(
    '// L1 菜单 — 5 项架构\n  // Products / Solutions / Support / About / Contact',
    '// L1 菜单 — 4 项架构\n  // Products / Applications / Solutions / Service'
  );

  // 移除 AboutDropdown 和 ContactDropdown 的引用
  const aboutDropdownPattern = /\/\/ Delegate to AboutDropdown component[\s\S]*?\}\s*\}\s*\}\s*\}/;
  const contactDropdownPattern = /\/\/ Delegate to ContactDropdown component[\s\S]*?\}\s*\}\s*\}\s*\}/;

  content = content.replace(aboutDropdownPattern, '');
  content = content.replace(contactDropdownPattern, '');

  fs.writeFileSync(navigatorPath, content, 'utf8');
  console.log('✅ Cleaned up navigator.js');
  console.log('   - Updated header comment');
  console.log('   - Updated NAV_ITEMS comment');
  console.log('   - Removed AboutDropdown and ContactDropdown references');
}

cleanupNavigator();
