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
        { key: 'nav_products_cutting', icon: 'content_cut', emoji: '', href: '/products/cutting/' },
        { key: 'nav_products_stirfry', icon: 'local_fire_department', emoji: '🔥', href: '/products/stirfry/' },
        { key: 'nav_products_frying', icon: 'outdoor_grill', emoji: '', href: '/products/frying/' },
        { key: 'nav_products_stewing', icon: 'soup_kitchen', emoji: '', href: '/products/stewing/' },
        { key: 'nav_products_steaming', icon: 'cloud', emoji: '', href: '/products/steaming/' },
        { key: 'nav_products_other', icon: 'more_horiz', emoji: '', href: '/products/other/' }
      ],
      applications: [
        { key: 'nav_applications_fastfood', icon: 'ramen_dining', href: '/applications/fast-food/' },
        { key: 'nav_applications_hotpot', icon: 'local_fire_department', href: '/applications/hotpot/' },
        { key: 'nav_applications_cloud_kitchen', icon: 'delivery_dining', href: '/applications/cloud-kitchen/' },
        { key: 'nav_applications_canteen', icon: 'restaurant', href: '/applications/canteen/' },
        { key: 'nav_applications_thai', icon: 'public', href: '/applications/southeast-asian/' },
        { key: 'nav_applications_cases', icon: 'monitoring', href: '/applications/cases/' },
        { key: 'nav_roi', icon: 'calculate', href: '/roi/', badge: true }
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
        { key: 'nav_about_profile', icon: 'apartment', href: '/about/#profile' },
        { key: 'nav_about_factory', icon: 'factory', href: '/about/#factory' },
        { key: 'nav_about_cert', icon: 'verified', href: '/about/#cert' }
      ],
      support: [
        { key: 'nav_support_services', icon: 'grid_view', href: '/support/' },
        { key: 'nav_support_installation', icon: 'construction', href: '/support/#installation' },
        { key: 'nav_support_warranty', icon: 'verified', href: '/support/#warranty' },
        { key: 'nav_support_spare_parts', icon: 'build_circle', href: '/support/#spare-parts' },
        { key: 'nav_support_training', icon: 'school', href: '/support/#training' },
        { key: 'nav_support_faq', icon: 'contact_support', href: '/support/#faq' }
      ],
      contact: [
        { key: 'nav_contact_us', icon: 'grid_view', href: '/contact/' },
        { key: 'nav_contact_whatsapp', icon: 'chat', href: 'https://api.whatsapp.com/send/?phone=8613163756465', isWhatsApp: true }
      ]
    }
  };

  global.NAV_CONFIG = NAV_CONFIG;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
