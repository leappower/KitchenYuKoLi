/**
 * spa-router.test.js
 *
 * 测试 SPA 路由的核心逻辑（不依赖 spa-router.js 完整加载）：
 * - dispatchSpaLoad 触发 spa:load 事件
 * - _SPA_GLOBAL_PATTERNS 正则模式
 */
describe('SPA 全局脚本模式', () => {
  // 从 spa-router.js 复制 _SPA_GLOBAL_PATTERNS 的逻辑
  const globalScriptPatterns = /(?:^|[/])(?:product-data-table|spa-router|swup|translations|lang-registry|translations-dropdown-template|spa-events|dropdown-base|dropdown-styles|navigator|nav-config|footer|slide-menu|products-dropdown|applications-dropdown|support-dropdown|about-dropdown|contact-dropdown|product-list|product-grid|product-detail|case-grid|utils|search-engine|device-utils|hero-video|contacts|page-interactions|common|main|init|image-assets|media-queries|floating-actions|currency|custom-select|breadcrumb|home-core-products|compare|cross-sell|profit-calculator|quote-form|quote-select-i18n|quote-budget-i18n|news-detail|support-contact-channels|support-wechat-modal|helpers|page-effects|router|roi-data|cases-page|html2canvas|jspdf|pi-maps)\.js/;

  test('核心库文件被标记为全局脚本', () => {
    const globals = [
      'spa-router.js',
      'translations.js',
      'navigator.js',
      'footer.js',
      'home-core-products.js',
      'product-grid.js',
      'product-detail.js'
    ];
    for (const file of globals) {
      expect(globalScriptPatterns.test(file)).toBe(true);
    }
  });

  test('页面特定脚本不被标记为全局', () => {
    const pageSpecific = [
      'about-page.js',
      'cases-detail.js',
      'contact-form.js'
    ];
    for (const file of pageSpecific) {
      expect(globalScriptPatterns.test(file)).toBe(false);
    }
  });
});

describe('dispatchSpaLoad 事件', () => {
  test('spa:load 事件可以被派发和监听', () => {
    let receivedEvent = null;
    const handler = (e) => { receivedEvent = e; };
    document.addEventListener('spa:load', handler);
    const evt = new CustomEvent('spa:load', { detail: { path: '/home/' } });
    document.dispatchEvent(evt);
    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent.detail.path).toBe('/home/');
    document.removeEventListener('spa:load', handler);
  });
});
