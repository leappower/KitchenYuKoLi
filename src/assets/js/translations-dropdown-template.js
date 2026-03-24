/**
 * 语言下拉框 HTML 模板
 * 这个下拉框会被动态插入到 body 中，使用 fixed 定位
 */

window.LanguageDropdownTemplate = {
  // 按地区分组的语言配置（仅 zh-CN + en）
  LANG_GROUPS: {
    common: {
      titleKey: 'lang_group_common',
      langs: ['zh-CN', 'en']
    }
  },

  // 语言代码到显示名称的映射
  LANGUAGE_NAMES: {
    'zh-CN': '中文（简体）',
    'en': 'English'
  },

  // 创建单个语言选项按钮
  createLangOption: function(code, currentLang, name) {
    var isActive = code === currentLang ? 'active' : '';
    return (
      '<button class="lang-option w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ' + isActive + '" data-code="' + code + '">' +
        '<span>' + name + '</span>' +
        '<span class="text-[10px] opacity-50">' + code.toUpperCase() + '</span>' +
      '</button>'
    );
  },

  // 创建分组标题
  createGroupTitle: function(titleKey) {
    return (
      '<div class="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest" data-i18n="' + titleKey + '">' + titleKey + '</div>'
    );
  },

  // 创建下拉框 HTML
  createDropdownHTML: function(languages, currentLang) {
    var self = this;
    var langMap = {};

    // 将 languages 数组转换为 code -> name 的映射
    if (Array.isArray(languages)) {
      languages.forEach(function(l) {
        langMap[l.code] = l.name;
      });
    }

    // 使用 LANG_GROUPS 中的配置，如果没有则使用 LANGUAGE_NAMES
    var getLangName = function(code) {
      return langMap[code] || self.LANGUAGE_NAMES[code] || code;
    };

    var groupHtml = '';

    // Common 组
    groupHtml += '<div class="lang-group mt-1 border-t border-slate-100 dark:border-slate-800 pt-1">';
    groupHtml += this.createGroupTitle(this.LANG_GROUPS.common.titleKey);
    this.LANG_GROUPS.common.langs.forEach(function(code) {
      groupHtml += self.createLangOption(code, currentLang, getLangName(code));
    });
    groupHtml += '</div>';

    return (
      '<div id="language-dropdown" class="fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] overflow-hidden" style="display:none;width:280px;">' +
        '<div class="p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-primary/5">' +
          '<div class="relative">' +
            '<span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>' +
            '<input class="w-full text-xs pl-7 pr-2 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" ' +
                   ' data-i18n-placeholder="lang_search_placeholder" placeholder="Search language..." ' +
                   ' type="text" id="lang-search-input"/>' +
          '</div>' +
        '</div>' +
        '<div class="overflow-y-auto max-h-80 p-2">' +
          groupHtml +
        '</div>' +
      '</div>'
    );
  }
};
