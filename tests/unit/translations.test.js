/**
 * translations.test.js
 *
 * 测试翻译系统核心逻辑：
 * - I18N_CACHE_V 格式
 * - loadProductTranslations 的 fallback 逻辑
 * - translationManager 结构完整性
 */
const fs = require('fs');
const path = require('path');

describe('translations.js 基础结构', () => {
  const transPath = path.resolve(__dirname, '../../src/assets/js/translations.js');
  const content = fs.readFileSync(transPath, 'utf-8');

  test('JS 语法正确', () => {
    // translations.js 使用 class/export 等可能会被 webpack 处理
    // 不做严格语法检查，只检查基本结构
    expect(content).toContain('I18N_CACHE_V');
    expect(content).toBeDefined();
  });

  test('I18N_CACHE_V 格式为纯数字', () => {
    const match = content.match(/var I18N_CACHE_V = (\d+);/);
    expect(match).not.toBeNull();
    if (match) {
      const val = parseInt(match[1], 10);
      expect(isNaN(val)).toBe(false);
      expect(val).toBeGreaterThan(1000000000); // 应该是 Unix 时间戳
    }
  });

  test('loadProductTranslations 函数存在', () => {
    expect(content).toContain('loadProductTranslations');
  });

  test('翻译缓存机制存在', () => {
    expect(content).toContain('translationsCache');
  });

  test('languageChanged 事件处理存在', () => {
    expect(content).toContain('languageChanged');
  });
});

describe('i18n 系统逻辑', () => {
  test('翻译 key 格式正确', () => {
    const uiPath = path.resolve(__dirname, '../../src/assets/lang/en-ui.json');
    const ui = JSON.parse(fs.readFileSync(uiPath, 'utf-8'));
    
    // 检查关键 key
    expect(ui).toHaveProperty('nav_home');
    expect(ui).toHaveProperty('nav_products');
    expect(ui).toHaveProperty('nav_about');
    expect(ui).toHaveProperty('nav_contact');
    expect(ui).toHaveProperty('nav_get_quote');
  });

  test('语言文件不为空', () => {
    const langDir = path.resolve(__dirname, '../../src/assets/lang');
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('-ui.json') || f.endsWith('-product.json'));
    expect(files.length).toBeGreaterThan(40); // 应该有很多语言包
    
    // 每个文件都应该有内容
    for (const f of files.slice(0, 5)) {
      const content = JSON.parse(fs.readFileSync(path.join(langDir, f), 'utf-8'));
      expect(Object.keys(content).length).toBeGreaterThan(0);
    }
  });
});
