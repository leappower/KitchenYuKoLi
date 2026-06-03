# Changelog

## v1.0.5 (2026-06-03)

### 🐛 修复
- **产品列表白屏**: injectSequential 脚本顺序加载、autoRender 重试优化
- **产品数据保护**: PRODUCT_DATA_TABLE 添加 Object.freeze 防止运行时污染
- **custom-select i18n**: span.cs-trigger-text 添加 data-i18n 属性，class引号闭合修复
- **getProductField lang检测**: 优先使用 translationManager.currentLanguage
- **search-engine lang回退**: 默认 "en" 而非 "zh-CN"
- **quote-select-i18n**: 添加 productTranslationsLoaded 监听 + data-placeholder 同步
- **CTA按钮布局**: 6个产品分类移动版间距 + 居中 + py-10
- **home移动端按钮**: hcp-load-more-mobile 添加 data-i18n 属性
- **breadcrumb**: 添加 languageChanged 监听实现多语言切换
- **serve.js**: 注入 __spaNavigating 抑制 SSG 设备重定向

## v1.0.4 (2026-06-03)

### 🎉 新功能
- **25语言搜索适配**: 搜索索引支持泰文、越南文、印尼文、高棉文、老挝文、缅甸文、阿拉伯文、希伯来文、印地文等25种语言
- **多语言产品名显示**: getProductField 优先查 ui.json 翻译（tr()回退），非英文语言不再只显示英文名

### 🐛 修复
- **全局i18n不一致**: breadcrumb、cross-sell、scenario-products 添加 languageChanged 监听
- **contact/quote表单select**: custom-select DOM重建健壮化，语言切换后placeholder正确翻译
- **serve.js设备重定向**: 注入 __spaNavigating 抑制SSG设备重定向，本地开发URL保持 /home/
- **generate-search-index.js**: 重写支持25语言索引生成, 修正 small_restaurant_hero_title key
- **翻译数据同步**: 24种语言 ui.json 从 product.json 同步14,360条 product_* 翻译（产品名、规格、用途）

### 📝 文档
- CHANGELOG.md 创建

## v1.0.3 (2026-05-29)

- 搜索面板翻译同步
- 多语言产品规格翻译修复
- 性能优化和Bug修复
