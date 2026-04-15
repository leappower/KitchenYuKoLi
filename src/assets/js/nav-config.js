/**
 * nav-config.js — 导航配置（由 CMS 自动生成，也可手动编辑）
 * 所有导航消费者文件（navigator.js, *-dropdown.js, mobile-menu.js）读取此文件
 * CMS publish 时会覆盖此文件
 */
(function(global) {
  'use strict';

  var NAV_CONFIG = {
    mainNav: [
      { key: 'nav_products', label: '产品中心', path: '/products/', id: 'products', hasDropdown: true },
      { key: 'nav_applications', label: '场景应用', path: '/applications/', id: 'applications', hasDropdown: true },
      { key: 'nav_solutions', label: '解决方案', path: '/solutions/', id: 'solutions', hasDropdown: true },
      { key: 'nav_service', label: '服务支持', path: '/support/', id: 'support', hasDropdown: true },
      { key: 'nav_about', label: '关于我们', path: '/about/', id: 'about', hasDropdown: true },
      { key: 'nav_contact', label: '联系', path: '/contact/', id: 'contact', hasDropdown: true }
    ],
    dropdowns: {
      products: [
        { key: 'nav_products_cutting', icon: 'content_cut', emoji: '', href: '/catalog/?cat=cutting' },
        { key: 'nav_products_stirfry', icon: 'local_fire_department', emoji: '🔥', href: '/catalog/?cat=stirfry' },
        { key: 'nav_products_frying', icon: 'outdoor_grill', emoji: '', href: '/catalog/?cat=frying' },
        { key: 'nav_products_stewing', icon: 'soup_kitchen', emoji: '', href: '/catalog/?cat=stewing' },
        { key: 'nav_products_steaming', icon: 'cloud', emoji: '', href: '/catalog/?cat=steaming' },
        { key: 'nav_products_other', icon: 'more_horiz', emoji: '', href: '/catalog/?cat=other' }
      ],
      applications: [
        { key: 'nav_applications_fastfood', icon: 'ramen_dining', href: '/applications/fast-food/' },
        { key: 'nav_applications_hotpot', icon: 'local_fire_department', href: '/applications/hotpot/' },
        { key: 'nav_applications_cloud_kitchen', icon: 'delivery_dining', href: '/applications/cloud-kitchen/' },
        { key: 'nav_applications_canteen', icon: 'restaurant', href: '/applications/canteen/' },
        { key: 'nav_applications_thai', icon: 'public', href: '/applications/southeast-asian/' },
        { key: 'nav_applications_cases', icon: 'monitoring', href: '/applications/cases/' }
      ],
      solutions: [
        { key: 'nav_solutions_fastfood', icon: 'ramen_dining', href: '/solutions/fast-food/' },
        { key: 'nav_solutions_hotpot', icon: 'local_fire_department', href: '/solutions/hotpot/' },
        { key: 'nav_solutions_cloud_kitchen', icon: 'delivery_dining', href: '/solutions/cloud-kitchen/' },
        { key: 'nav_solutions_canteen', icon: 'restaurant', href: '/solutions/canteen/' },
        { key: 'nav_solutions_thai', icon: 'public', href: '/solutions/southeast-asian/' },
        { key: 'nav_cases_sol', icon: 'monitoring', href: '/solutions/' },
        { key: 'nav_roi', icon: 'calculate', href: '/roi/', badge: true }
      ],
      about: [
        { key: 'nav_about_company', icon: 'business', href: '/about/' },
        { key: 'nav_about_news', icon: 'newspaper', href: '/news/' }
      ],
      support: [
        { key: 'nav_support_center', icon: 'support_agent', href: '/support/' },
        { key: 'nav_support_contact', icon: 'contact_page', href: '/contact/' },
        { key: 'nav_support_faq', icon: 'help', href: '/support/#faq' }
      ],
      contact: [
        { key: 'nav_contact_form', icon: 'mail', href: '/contact/' },
        { key: 'nav_contact_quote', icon: 'request_quote', href: '/quote/' }
      ]
    }
  };

  global.NAV_CONFIG = NAV_CONFIG;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
