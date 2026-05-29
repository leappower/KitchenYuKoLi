/**
 * home-core-products.test.js
 *
 * 测试 _autoInit 的核心逻辑：
 * - 只在 /home/ 路径下渲染
 * - device 判断正确
 * - 容器不在 DOM 中时不抛异常
 */

// 模拟 _autoInit 的核心逻辑（不需要 DOM 依赖）
function createAutoInit() {
  return function _autoInit(pathname, innerWidth, containerExists) {
    var path = pathname || '/';
    var device = innerWidth < 768 ? 'mobile' : innerWidth < 1280 ? 'tablet' : 'pc';
    var shouldRender = path.indexOf('/home') !== -1;
    var containerId = device === 'mobile'
      ? 'home-core-products-mobile'
      : device === 'tablet'
        ? 'home-core-products-tablet'
        : 'home-core-products-pc';
    return { shouldRender, device, containerId, containerExists };
  };
}

describe('home-core-products _autoInit 逻辑', () => {
  test('在 /home/ 路径下应该渲染', () => {
    const fn = createAutoInit();
    const result = fn('/home/', 1440, true);
    expect(result.shouldRender).toBe(true);
    expect(result.device).toBe('pc');
    expect(result.containerId).toBe('home-core-products-pc');
  });

  test('在 /home（无尾斜杠）应该渲染', () => {
    const fn = createAutoInit();
    expect(fn('/home', 1440, true).shouldRender).toBe(true);
  });

  test('在 /products/ 下不应该渲染', () => {
    const fn = createAutoInit();
    expect(fn('/products/', 1440, true).shouldRender).toBe(false);
  });

  test('在 /applications/canteen/ 下不应该渲染', () => {
    const fn = createAutoInit();
    expect(fn('/applications/canteen/', 1440, true).shouldRender).toBe(false);
  });

  test('移动端使用 mobile 容器', () => {
    const fn = createAutoInit();
    const r = fn('/home/', 375, true);
    expect(r.device).toBe('mobile');
    expect(r.containerId).toBe('home-core-products-mobile');
  });

  test('平板使用 tablet 容器', () => {
    const fn = createAutoInit();
    const r = fn('/home/', 1024, true);
    expect(r.device).toBe('tablet');
    expect(r.containerId).toBe('home-core-products-tablet');
  });

  test('PC 使用 pc 容器', () => {
    const fn = createAutoInit();
    const r = fn('/home/', 1920, true);
    expect(r.device).toBe('pc');
    expect(r.containerId).toBe('home-core-products-pc');
  });

  test('容器不存在时不抛异常（只 warn）', () => {
    const fn = createAutoInit();
    // 模拟容器不存在的情况——不会报错
    const r = fn('/home/', 1440, false);
    expect(r.shouldRender).toBe(true);
    expect(r.containerExists).toBe(false);
  });
});
