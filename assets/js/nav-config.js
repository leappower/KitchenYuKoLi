/**
 * nav-config.js — 单一菜单数据源
 *
 * 所有导航组件（navigator, slide-menu, products-dropdown,
 * applications-dropdown, support-dropdown, about-dropdown, breadcrumb）
 * 共享此数据。
 */
(function (_global) {
  "use strict";

  var NAV_CONFIG = {
    /** 一级导航项 */
    items: [
      { key: "nav_products", id: "products", path: "/products/", hasDropdown: true },
      { key: "nav_applications", id: "applications", path: "/applications/", hasDropdown: true },
      { key: "nav_cases", id: "cases", path: "/cases/", hasDropdown: false },
      { key: "nav_roi", id: "profit-calculator", path: "/profit-calculator/", hasDropdown: false },
      { key: "nav_support", id: "support", path: "/support/", hasDropdown: true },
      { key: "nav_about", id: "about", path: "/about/", hasDropdown: true },
      { key: "nav_contact", id: "contact", path: "/contact/", hasDropdown: false },
    ],

    /** Products 子分类 */
    products: [
      { key: "nav_products_overview", icon: "apps", href: "/products/" },
      { key: "nav_products_cutting", icon: "content_cut", href: "/products/cutting/" },
      { key: "nav_products_stirfry", icon: "local_fire_department", href: "/products/stirfry/" },
      { key: "nav_products_frying", icon: "outdoor_grill", href: "/products/frying/" },
      { key: "nav_products_stewing", icon: "soup_kitchen", href: "/products/stewing/" },
      { key: "nav_products_steaming", icon: "cloud", href: "/products/steaming/" },
      { key: "nav_products_other", icon: "more_horiz", href: "/products/other/" },
    ],

    /** Applications 子分类 */
    applications: [
      { key: "nav_applications_overview", icon: "apps", href: "/applications/" },
      { key: "nav_applications_small_restaurant", icon: "storefront", href: "/applications/small-restaurant/" },
      { key: "nav_applications_central_kitchen", icon: "apartment", href: "/applications/central-kitchen/" },
      { key: "nav_applications_chain_restaurant", icon: "ramen_dining", href: "/applications/chain-restaurant/" },
      { key: "nav_applications_canteen", icon: "restaurant", href: "/applications/canteen/" },
      { key: "nav_applications_cloud_kitchen", icon: "delivery_dining", href: "/applications/cloud-kitchen/" },
      { key: "nav_applications_food_factory", icon: "factory", href: "/applications/food-factory/" },
      { key: "nav_applications_menu_lab", icon: "science", href: "/applications/menu-lab/" },
    ],

    /** Support 子分类 */
    support: [
      { key: "nav_support_overview", icon: "apps", href: "/support/" },
      { _separator: true },
      { key: "nav_support_services", icon: "grid_view", href: "/support/services/" },
      { key: "nav_support_installation", icon: "construction", href: "/support/installation/" },
      { key: "nav_support_warranty", icon: "verified", href: "/support/warranty/" },
      { key: "nav_support_spare_parts", icon: "build_circle", href: "/support/spare-parts/" },
      { key: "nav_support_training", icon: "school", href: "/support/training/" },
      { key: "nav_support_faq", icon: "contact_support", href: "/support/faq/" },
    ],

    /** About 子分类 */
    about: [
      { key: "nav_about_profile", icon: "apartment", href: "/about/#profile" },
      { key: "nav_about_factory", icon: "factory", href: "/about/#factory" },
      { key: "nav_about_cert", icon: "verified", href: "/about/#cert" },
    ],

    /** Contact 子分类 */
    contact: [],

    /** 导航名 → 图标映射 */
    l1IconMap: {
      products: "kitchen",
      applications: "apps",
      cases: "cases",
      "profit-calculator": "calculate",
      support: "support_agent",
      about: "info",
      contact: "mail",
    },

    /** path → active id 映射 */
    pathToActiveMap: {
      "case-studies": "applications",
      roi: "profit-calculator",
      news: "contact",
      quote: "contact",
      "thank-you": "contact",
    },

    /** id 别名 */
    idAliases: {
      "profit-calculator": ["profit", "profit-calculator"],
      profit: ["profit", "profit-calculator"],
    },
  };

  window.NAV_CONFIG = NAV_CONFIG;
})(window);
