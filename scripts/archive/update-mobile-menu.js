#!/usr/bin/env node
/**
 * 更新 mobile-menu.js 的 MENU_ITEMS 以匹配新的导航结构
 * 顺序: Products -> Applications -> Solutions -> Service
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

function updateMobileMenu() {
  const menuPath = path.join(SRC_DIR, 'assets', 'js', 'ui', 'mobile-menu.js');
  let content = fs.readFileSync(menuPath, 'utf8');

  // 新的 MENU_ITEMS - 正确顺序: Products -> Applications -> Solutions -> Service
  const newMenuItems = `var MENU_ITEMS = [
    {
      key: 'nav_products',  href: '/catalog/',  id: 'catalog',
      icon: 'kitchen',
      children: [
        { key: 'nav_products_cutting',  icon: 'content_cut',           href: '/catalog/' },
        { key: 'nav_products_stirfry',  icon: 'local_fire_department', href: '/catalog/' },
        { key: 'nav_products_frying',   icon: 'outdoor_grill',         href: '/catalog/' },
        { key: 'nav_products_stewing',  icon: 'soup_kitchen',          href: '/catalog/' },
        { key: 'nav_products_steaming', icon: 'cloud',                 href: '/catalog/' },
        { key: 'nav_products_other',    icon: 'more_horiz',            href: '/catalog/' },
      ],
    },
    {
      key: 'nav_applications', href: '/applications/', id: 'applications',
      icon: 'apps',
      children: [
        { key: 'nav_applications_fastfood',      icon: 'ramen_dining',          href: '/solutions/fast-food/' },
        { key: 'nav_applications_hotpot',        icon: 'local_fire_department', href: '/solutions/hotpot/' },
        { key: 'nav_applications_cloud_kitchen', icon: 'delivery_dining',       href: '/solutions/cloud-kitchen/' },
        { key: 'nav_applications_canteen',       icon: 'restaurant',            href: '/solutions/canteen/' },
        { key: 'nav_applications_thai',          icon: 'public',                href: '/solutions/southeast-asian/' },
      ],
    },
    {
      key: 'nav_solutions', href: '/solutions/', id: 'solutions',
      icon: 'build',
      children: [
        { key: 'nav_automation', icon: 'trending_up', href: '/solutions/automation/' },
      ],
    },
    {
      key: 'nav_service', href: '/support/', id: 'support',
      icon: 'support_agent',
      children: [
        { key: 'nav_support_installation',  icon: 'construction',    href: '/support/' },
        { key: 'nav_support_warranty',      icon: 'verified',         href: '/support/' },
        { key: 'nav_support_spare_parts',   icon: 'build_circle',     href: '/support/' },
        { key: 'nav_support_training',      icon: 'school',           href: '/support/' },
        { key: 'nav_support_faq',           icon: 'contact_support',  href: '/support/' },
      ],
    },
  ];`;

  // 尝试查找并替换
  const menuItemsMatch = content.match(/var MENU_ITEMS = \[[\s\S]*?\];\s*\/\* ───────────────────────── HELPERS ───────────────────────── \*\//);
  if (menuItemsMatch) {
    content = content.replace(menuItemsMatch[0], newMenuItems + '\n\n  /* ───────────────────────── HELPERS ───────────────────────── */');
    fs.writeFileSync(menuPath, content, 'utf8');
    console.log('✅ Updated MENU_ITEMS in mobile-menu.js');
    console.log('   New order: Products → Applications → Solutions → Service');
  } else {
    console.log('❌ Failed to update MENU_ITEMS');
  }
}

updateMobileMenu();
