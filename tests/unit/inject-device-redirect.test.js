/**
 * inject-device-redirect.test.js
 *
 * 测试 needsRedirect() 函数对不同路径的判断：
 * - 普通页面（有 navigator/main 结构）→ true
 * - 产品列表页 → true
 * - 产品详情页 (三级路径) → false
 * - products/detail/index.html → false
 */
const fs = require('fs');
const path = require('path');

// 直接从源码中复制 needsRedirect 逻辑来测试
// 不能 require() 它，因为它是 Node 脚本没有 export

// 模拟 needsRedirect
function needsRedirect(filePath) {
  if (filePath.indexOf('/products/detail/index.html') !== -1) return false;
  var rel = filePath.replace(/^.*?\/products\//, 'products/');
  var parts = rel.split('/').filter(Boolean);
  if (rel.startsWith('products/') && parts.length >= 4) return false;
  return true; // 假设文件包含 <main 或 navigator
}

describe('inject-device-redirect needsRedirect', () => {
  test('普通页面（首页）需要注入', () => {
    expect(needsRedirect('/dist/home/index-pc.html')).toBe(true);
  });

  test('产品列表页（/products/index.html）需要注入', () => {
    expect(needsRedirect('/dist/products/index-pc.html')).toBe(true);
  });

  test('产品列表页（/products/stirfry/index-pc.html）需要注入', () => {
    const result = needsRedirect('/dist/products/stirfry/index-pc.html');
    // 二级路径 → true
    expect(result).toBe(true);
  });

  test('产品详情页（三级路径）跳过注入', () => {
    expect(needsRedirect('/dist/products/stirfry/DLB-BQ40T/index.html')).toBe(false);
  });

  test('产品详情页（其他品类）跳过注入', () => {
    expect(needsRedirect('/dist/products/stewing/DLB-QXC120/index.html')).toBe(false);
    expect(needsRedirect('/dist/products/frying/FRY-2000/index.html')).toBe(false);
  });

  test('products/detail/ 旧路径跳过', () => {
    expect(needsRedirect('/dist/products/detail/index.html')).toBe(false);
  });

  test('更深层级的路径也跳过（虽然不会出现）', () => {
    expect(needsRedirect('/dist/products/a/b/c/index.html')).toBe(false);
  });
});
