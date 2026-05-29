/**
 * sw-version.test.js
 *
 * 测试 sw.js 版本号注入逻辑：
 * - build.sh 中 sed 替换 SW_VERSION 是否正确
 * - sw.js 本身代码语法正确
 */
const fs = require('fs');
const path = require('path');

describe('sw.js', () => {
  const swPath = path.resolve(__dirname, '../../sw.js');
  const swContent = fs.readFileSync(swPath, 'utf-8');

  test('sw.js 语法正确', () => {
    expect(() => {
      new Function(swContent);
    }).not.toThrow();
  });

  test('SW_VERSION 变量存在且格式正确', () => {
    const match = swContent.match(/var SW_VERSION = "(v[\w.-]+)";/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/^v[\w.-]+$/);
  });

  test('install 事件有 skipWaiting', () => {
    expect(swContent).toContain('self.skipWaiting()');
  });

  test('activate 事件会清理旧缓存', () => {
    expect(swContent).toContain('caches.delete');
    expect(swContent).toContain('yukoli-');
    expect(swContent).toContain('CURRENT_CACHE_PREFIX');
  });

  test('message 事件处理 SKIP_WAITING', () => {
    expect(swContent).toContain('SKIP_WAITING');
  });

  test('版本号可被 sed 替换', () => {
    // 模拟 build.sh 的 sed 替换
    const version = 'v' + Date.now();
    const replaced = swContent.replace(/var SW_VERSION = "v[\w.-]+";/, `var SW_VERSION = "${version}";`);
    expect(replaced).toContain(`var SW_VERSION = "${version}";`);
    // 替换后语法仍然正确
    expect(() => {
      new Function(replaced);
    }).not.toThrow();
  });
});
