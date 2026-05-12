/**
 * 语言下拉框 HTML 模板
 * 这个下拉框会被动态插入到 body 中，使用 fixed 定位
 */

window.LanguageDropdownTemplate = {
  // 按地区分组的语言配置（从 LANG_REGISTRY 动态读取）
  LANG_GROUPS: [
    { id: "common", titleKey: "lang_group_common" },
    { id: "southeast_asia", titleKey: "lang_group_southeast_asia" },
    { id: "east_asia", titleKey: "lang_group_east_asia" },
    { id: "other", titleKey: "lang_group_other" },
  ],

  // 按分组存放语言列表：{ common: ['zh-CN','en'], southeast_asia: ['th','vi',...], ... }
  _groupedLangs: {},

  // 从 LANG_REGISTRY 初始化语言列表（在 DOMContentLoaded 后调用）
  _initFromRegistry: function () {
    var reg = window.LANG_REGISTRY;
    if (!reg || !reg.LANGUAGES) return;
    this._groupedLangs = {};
    reg.LANGUAGES.forEach(
      function (l) {
        var group = l.uiGroup || "common";
        if (!this._groupedLangs[group]) this._groupedLangs[group] = [];
        this._groupedLangs[group].push(l.code);
      }.bind(this)
    );
  },

  // 创建单个语言选项按钮
  createLangOption: function (code, currentLang, name) {
    var isActive = code === currentLang ? "is-active" : "";
    var checkIcon =
      code === currentLang
        ? '<span class="material-symbols-outlined text-sm" style="color:#ec5b13">check</span>'
        : '<span style="width:20px"></span>';
    return (
      '<button class="lang-option w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ' +
      isActive +
      '" data-code="' +
      code +
      '">' +
      checkIcon +
      "<span>" +
      name +
      "</span>" +
      '<span class="ml-auto text-[10px] opacity-40 font-normal">' +
      code.toUpperCase() +
      "</span>" +
      "</button>"
    );
  },

  // 创建分组标题
  createGroupTitle: function (titleKey) {
    return (
      '<div class="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider" data-i18n="' +
      titleKey +
      '">' +
      titleKey +
      "</div>"
    );
  },

  // Inject styles (idempotent)
  _injectStyles: function () {
    if (document.getElementById("lang-dropdown-styles")) return;
    var s = document.createElement("style");
    s.id = "lang-dropdown-styles";
    s.textContent = [
      ".lang-option.is-active { background: rgba(236,91,19,.08); color: #ec5b13; }",
      ".lang-option.is-active span { color: #ec5b13; }",
      "html.dark .lang-option.is-active { background: rgba(236,91,19,.14); color: #f97316; }",
      "html.dark .lang-option.is-active span { color: #f97316; }",
      "#language-dropdown { animation: langDropIn .2s cubic-bezier(.32,.72,0,1); }",
      "@keyframes langDropIn { from { opacity:0; transform:translateY(-4px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }",
    ].join("\n");
    document.head.appendChild(s);
  },

  // 创建下拉框 HTML
  createDropdownHTML: function (languages, currentLang) {
    var self = this;
    var langMap = {};

    // 将 languages 数组转换为 code -> name 的映射
    if (Array.isArray(languages)) {
      languages.forEach(function (l) {
        langMap[l.code] = l.name;
      });
    }

    // 从 LANG_REGISTRY 获取名称
    var getLangName = function (code) {
      if (langMap[code]) return langMap[code];
      var reg = window.LANG_REGISTRY;
      if (reg && reg.LANGUAGES) {
        var found = reg.LANGUAGES.find(function (l) {
          return l.code === code;
        });
        if (found) return found.nativeName;
      }
      return code;
    };

    this._injectStyles();
    this._initFromRegistry();

    var groupHtml = "";

    // 遍历所有分组，只渲染有语言条目的组
    this.LANG_GROUPS.forEach(function (group) {
      var codes = self._groupedLangs[group.id] || [];
      if (codes.length === 0) return;
      groupHtml += '<div class="lang-group">';
      groupHtml += self.createGroupTitle(group.titleKey);
      codes.forEach(function (code) {
        groupHtml += self.createLangOption(code, currentLang, getLangName(code));
      });
      groupHtml += "</div>";
    });

    return (
      '<div id="language-dropdown" class="fixed bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-[13px] p-1 z-[var(--z-language-dropdown)] overflow-hidden" style="display:none;width:260px;box-shadow:0 0 0 .5px rgba(0,0,0,.04),0 8px 40px rgba(0,0,0,.12),0 2px 12px rgba(0,0,0,.08)">' +
      '<div class="px-2 pt-2 pb-1 border-b border-slate-100 dark:border-slate-700/50">' +
      '<div class="relative">' +
      '<span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>' +
      '<input class="w-full text-sm pl-8 pr-2 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all placeholder:text-slate-400" ' +
      ' data-i18n-placeholder="lang_search_placeholder" placeholder="Search language..." ' +
      ' type="text" id="lang-search-input"/>' +
      "</div>" +
      "</div>" +
      '<div class="overflow-y-auto max-h-72 py-1">' +
      groupHtml +
      "</div>" +
      "</div>"
    );
  },
};
