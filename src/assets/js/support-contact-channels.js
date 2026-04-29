/**
 * support-contact-channels.js - 联系我们公共组件
 *
 * 用法：在页面放 <div id="support-contact-channels" data-page="faq"></div>
 * data-page 值：faq | installation | spare-parts | training | warranty | support
 * JS 自动替换为完整的联系卡片区域，微信卡片点击弹出 modal
 */
(function () {
  'use strict';

  // 各页面描述文案配置
  var CONFIG = {
    support: {
      titleKey: 'support_contact_channels_title',
      title: '联系我们',
      wechat: '扫码添加，在线咨询',
      wa: '多国语言支持，工作日2小时回复',
      email: '',
      phone: '紧急故障 随时待命 极速响应',
      maxW: 'max-w-4xl'
    },
    faq: {
      titleKey: 'support_faq_contact_title',
      title: '联系我们',
      wechat: '扫码添加，在线咨询',
      wa: '联系工程师',
      email: '提交工单',
      phone: '紧急故障',
      phoneKey: 'support_faq_contact_phone_label',
      phoneDescKey: 'support_faq_contact_phone_desc',
      maxW: 'max-w-4xl'
    },
    installation: {
      titleKey: 'support_install_contact_title',
      title: '联系我们',
      wechat: '扫码添加，在线咨询',
      wa: '预约安装咨询',
      email: '获取安装方案',
      emailKey: 'support_install_contact_email_desc',
      phone: '紧急安装需求',
      phoneKey: 'support_install_contact_phone_label',
      phoneDescKey: 'support_install_contact_phone_desc',
      maxW: 'max-w-5xl'
    },
    'spare-parts': {
      titleKey: 'support_spare_contact_title',
      title: '联系我们',
      wechat: '扫码添加，在线咨询',
      wa: '配件咨询',
      email: '配件订购',
      phone: '紧急配件需求',
      phoneKey: 'support_spare_contact_phone_label',
      phoneDescKey: 'support_spare_contact_phone_desc',
      maxW: 'max-w-4xl'
    },
    training: {
      titleKey: 'support_contact_channels_title',
      title: '联系我们',
      wechat: '扫码添加，在线咨询',
      wa: '预约培训',
      email: '获取培训资料',
      phone: '培训咨询',
      phoneKey: 'support_contact_phone_label',
      phoneDescKey: 'training_contact_phone_desc',
      maxW: 'max-w-4xl'
    },
    warranty: {
      titleKey: 'support_warranty_contact_title',
      title: '联系我们',
      wechat: '扫码添加，在线咨询',
      wa: '质保政策咨询',
      email: '保修登记',
      phone: '故障报修',
      phoneKey: 'support_warranty_contact_phone_label',
      phoneDescKey: 'support_warranty_contact_phone_desc',
      maxW: 'max-w-4xl'
    }
  };

  // WeChat SVG icon
  var WECHAT_ICON = '<svg viewBox="0 0 24 24" class="w-6 h-6 fill-white"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.108.24-.245 0-.06-.024-.12-.04-.178l-.326-1.233a.492.492 0 0 1 .177-.554C23.028 18.55 24 16.803 24 14.86c0-3.255-2.907-5.952-7.062-6.002zm-2.18 2.859c.534 0 .967.44.967.982a.975.975 0 0 1-.967.983.975.975 0 0 1-.966-.983c0-.542.432-.982.966-.982zm4.832 0c.535 0 .967.44.967.982a.975.975 0 0 1-.967.983.975.975 0 0 1-.966-.983c0-.542.432-.982.966-.982z"/></svg>';

  function i18nAttr(key, prefix) {
    if (!key) return '';
    return prefix + '="' + key + '"';
  }

  function render(cfg) {
    var phoneKey = cfg.phoneKey || 'support_contact_phone_label';
    var phoneDescKey = cfg.phoneDescKey || 'support_contact_phone_desc';
    var waDescKey = cfg.waKey || '';
    var emailDescKey = cfg.emailKey || '';

    return '<section class="py-12 bg-white dark:bg-slate-900/50">' +
      '<div class="px-6 md:px-8 xl:px-10">' +
        '<h2 class="text-3xl font-black tracking-tight mb-10 text-center" ' + i18nAttr(cfg.titleKey, 'data-i18n') + '>' + cfg.title + '</h2>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-6 ' + cfg.maxW + ' mx-auto">' +
          // WeChat card - click to open modal
          '<div class="flex flex-col items-center gap-3 p-8 rounded-2xl bg-[#07C160]/5 border border-[#07C160]/20 hover:bg-[#07C160]/10 hover:shadow-lg hover:border-[#07C160]/40 transition-all duration-300 group relative cursor-pointer" data-action="show-wechat-qr">' +
            '<div class="w-14 h-14 rounded-full bg-[#07C160] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">' +
              WECHAT_ICON +
            '</div>' +
            '<h3 class="font-bold text-lg">微信</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 text-center">' + cfg.wechat + '</p>' +
          '</div>' +
          // WhatsApp
          '<a href="https://wa.me/8613163756465" data-wa-source="contact-card" target="_blank" class="flex flex-col items-center gap-3 p-8 rounded-2xl bg-[#06C755]/5 border border-[#06C755]/20 hover:bg-[#06C755]/10 hover:shadow-lg hover:border-[#06C755]/40 transition-all duration-300 group">' +
            '<div class="w-14 h-14 rounded-full bg-[#06C755] flex items-center justify-center group-hover:scale-110 transition-transform">' +
              '<span class="material-symbols-outlined text-white text-2xl">chat</span>' +
            '</div>' +
            '<h3 class="font-bold text-lg">WhatsApp</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 text-center" ' + i18nAttr(waDescKey, 'data-i18n') + '>' + cfg.wa + '</p>' +
          '</a>' +
          // Email
          '<a href="mailto:support.kitchen@yukoli.com" class="flex flex-col items-center gap-3 p-8 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:shadow-lg hover:border-primary/40 transition-all duration-300 group">' +
            '<div class="w-14 h-14 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">' +
              '<span class="material-symbols-outlined text-white text-2xl">email</span>' +
            '</div>' +
            '<h3 class="font-bold text-lg">Email</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 text-center">' + (cfg.email || 'support.kitchen@yukoli.com') + '</p>' +
          '</a>' +
          // Phone
          '<a href="tel:+8613163756465" class="flex flex-col items-center gap-3 p-8 rounded-2xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 hover:shadow-lg hover:border-blue-500/40 transition-all duration-300 group">' +
            '<div class="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">' +
              '<span class="material-symbols-outlined text-white text-2xl">call</span>' +
            '</div>' +
            '<h3 class="font-bold text-lg" ' + i18nAttr(phoneKey, 'data-i18n') + '>电话</h3>' +
            '<p class="text-sm text-slate-500 dark:text-slate-400 text-center" ' + i18nAttr(phoneDescKey, 'data-i18n') + '>' + cfg.phone + '</p>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function mount() {
    var el = document.getElementById('support-contact-channels');
    if (!el) return;
    var page = el.dataset.page || 'support';
    var cfg = CONFIG[page] || CONFIG['support'];
    el.outerHTML = render(cfg);
  }

  // Run on DOM ready and SPA navigation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  document.addEventListener('spa:load', mount);
})();
