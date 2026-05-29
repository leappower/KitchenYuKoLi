/**
 * build-sh-assets.test.js
 *
 * 验证 build.sh 构建时引用的所有静态资源文件是否存在。
 * 使用标准 jest API，不用 .withContext。
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../src');
const rootDir = path.resolve(__dirname, '../..');

describe('静态资源完整性', () => {
  test('所有 JS 入口文件存在', () => {
    const jsFiles = [
      'assets/js/translations.js',
      'assets/js/spa-router.js',
      'assets/js/nav-config.js',
      'assets/js/lang-registry.js',
      'assets/js/home-core-products.js',
      'assets/js/product-data-table.js',
      'assets/js/product-grid.js',
      'assets/js/product-detail.js',
      'assets/js/breadcrumb.js',
      'assets/js/cross-sell.js',
    ];
    for (const f of jsFiles) {
      const exists = fs.existsSync(path.join(srcDir, f));
      expect(exists).toBe(true);
    }
  });

  test('所有 UI JS 文件存在', () => {
    const uiFiles = [
      'assets/js/ui/navigator.js',
      'assets/js/ui/footer.js',
      'assets/js/ui/slide-menu.js',
      'assets/js/ui/dropdown-base.js',
      'assets/js/ui/dropdown-styles.js',
      'assets/js/ui/products-dropdown.js',
      'assets/js/ui/support-dropdown.js',
      'assets/js/ui/about-dropdown.js',
      'assets/js/ui/floating-actions.js',
      'assets/js/ui/search-engine.js',
    ];
    for (const f of uiFiles) {
      const exists = fs.existsSync(path.join(srcDir, f));
      expect(exists).toBe(true);
    }
  });

  test('CSS 文件存在', () => {
    const cssFiles = [
      'assets/css/styles.css',
      'assets/css/tailwind.css',
      'assets/css/tailwind-entry.css',
      'assets/css/z-index-system.css',
      'assets/css/performance-optimizations.css',
      'assets/css/skeleton.css',
      'assets/css/components.css',
    ];
    for (const f of cssFiles) {
      const exists = fs.existsSync(path.join(srcDir, f));
      expect(exists).toBe(true);
    }
  });

  test('字体文件存在', () => {
    const fontFiles = [
      'assets/fonts/local-fonts.css',
      'assets/fonts/public-sans-latin-400-normal.woff2',
      'assets/fonts/public-sans-latin-700-normal.woff2',
    ];
    for (const f of fontFiles) {
      const exists = fs.existsSync(path.join(srcDir, f));
      expect(exists).toBe(true);
    }
  });

  test('语言文件至少包含常用语言', () => {
    const langDir = path.join(srcDir, 'assets/lang');
    const required = ['en-ui.json', 'zh-CN-ui.json'];
    for (const f of required) {
      const exists = fs.existsSync(path.join(langDir, f));
      expect(exists).toBe(true);
    }
  });

  test('根文件存在', () => {
    expect(fs.existsSync(path.join(rootDir, 'CNAME'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'sw.js'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, '404.html'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, 'robots.txt'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, 'manifest.json'))).toBe(true);
  });

  test('产品图片目录存在且有内容', () => {
    const imgDir = path.join(srcDir, 'assets/images/products');
    expect(fs.existsSync(imgDir)).toBe(true);
    const files = fs.readdirSync(imgDir);
    expect(files.length).toBeGreaterThan(10);
  });

  test('应用场景子目录存在', () => {
    const appImgDir = path.join(srcDir, 'assets/images/applications');
    expect(fs.existsSync(appImgDir)).toBe(true);
    const dirs = fs.readdirSync(appImgDir, { withFileTypes: true }).filter(d => d.isDirectory());
    const expected = ['canteen', 'central-kitchen', 'chain-restaurant', 'cloud-kitchen',
      'food-factory', 'menu-lab', 'small-restaurant'];
    for (const dir of expected) {
      const exists = fs.existsSync(path.join(appImgDir, dir));
      expect(exists).toBe(true);
    }
  });
});
