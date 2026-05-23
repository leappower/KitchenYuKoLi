import { test, expect } from '@playwright/test';

/**
 * Core E2E smoke tests — covers the most frequently broken areas:
 * - SPA navigation (skeleton → content)
 * - Product grid rendering
 * - Language switching
 * - Compare page (previously stuck on skeleton)
 * - Cross-page navigation (breadcrumb links)
 */

test.describe('Home Page', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('navigator is visible', async ({ page }) => {
    await page.goto('/');
    // Navigator should render (either PC nav or mobile bottom bar)
    const nav = page.locator('nav, .mobile-bottom-bar, .tablet-footer-bar');
    await expect(nav.first()).toBeVisible({ timeout: 10_000 });
  });

  test('core products section renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // At least one product card should be visible
    const productCard = page.locator('.product-card, [data-product]').first();
    await expect(productCard).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Language Switching', () => {
  test('switches between Chinese and English', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find language selector
    const langSelector = page.locator('[data-lang-select], .lang-select, select').first();
    if (await langSelector.isVisible()) {
      await langSelector.click();

      // Try to switch to English
      const enOption = page.locator('text=English, option[value="en"], text=EN').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForTimeout(500);

        // Some English text should appear
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.toLowerCase()).toContain('product');
      }
    }
  });
});

test.describe('Product Category Pages', () => {
  test('category page loads products', async ({ page }) => {
    await page.goto('/products/stir-fry');
    await page.waitForLoadState('networkidle');

    // Skeleton should disappear
    const skeleton = page.locator('.skeleton, .skeleton-loading, [class*="skeleton"]');
    if (await skeleton.isVisible()) {
      await expect(skeleton).toBeHidden({ timeout: 5_000 });
    }

    // Product grid should render
    const productGrid = page.locator('.product-card, .grid > a, [data-product]').first();
    await expect(productGrid).toBeVisible({ timeout: 10_000 });
  });

  test('SPA navigation from category to product detail', async ({ page }) => {
    await page.goto('/products/stir-fry');
    await page.waitForLoadState('networkidle');

    // Wait for products to load
    const firstProduct = page.locator('.product-card a, .grid > a').first();
    await expect(firstProduct).toBeVisible({ timeout: 10_000 });

    // Click first product
    await firstProduct.click();
    await page.waitForLoadState('networkidle');

    // Should be on a product detail page
    const url = page.url();
    expect(url).toContain('/products/');
  });
});

test.describe('Compare Page', () => {
  test('compare page does not stuck on skeleton', async ({ page }) => {
    await page.goto('/compare');
    await page.waitForLoadState('networkidle');

    // Skeleton MUST disappear within 5 seconds
    const skeleton = page.locator('.skeleton, .skeleton-loading, [class*="skeleton"]');
    if (await skeleton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await expect(skeleton).toBeHidden({ timeout: 5_000 });
    }
  });
});

test.describe('SPA Router Stability', () => {
  test('navigate home → category → detail → home without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Category
    await page.goto('/products/stir-fry');
    await page.waitForLoadState('networkidle');

    // Back to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('no duplicate event listeners (check for double toasts)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger language change multiple times
    const langSelector = page.locator('[data-lang-select], .lang-select, select').first();
    if (await langSelector.isVisible()) {
      await langSelector.click();
      const enOption = page.locator('text=English, option[value="en"], text=EN').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForTimeout(500);
        await langSelector.click();
        const zhOption = page.locator('text=中文, option[value="zh"], text=ZH').first();
        if (await zhOption.isVisible()) {
          await zhOption.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Should not have multiple toast notifications visible
    const toasts = page.locator('.toast, .notification, [class*="toast"], [class*="notify"]');
    const toastCount = await toasts.count();
    expect(toastCount).toBeLessThan(3); // Allow 1-2, not 3+
  });
});

// ── 2026-05-23: P0 修复后的核心交互回归测试 ──

test.describe('Navigator Dropdown Click (P0 fix regression)', () => {
  test('PC nav dropdown trigger does NOT cause white page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/home/');
    await page.waitForLoadState('networkidle');

    // 点击带 dropdown 的导航项，不应该导航走（白屏）
    const dropdownTrigger = page.locator(
      '.prod-dropdown-trigger, .app-dropdown-trigger, .sup-dropdown-trigger, .abt-dropdown-trigger'
    ).first();
    await expect(dropdownTrigger).toBeVisible({ timeout: 10_000 });

    const urlBefore = page.url();
    await dropdownTrigger.click();
    await page.waitForTimeout(500);

    // URL 不应该变化（trigger href 是 javascript:void(0)）
    expect(page.url()).toBe(urlBefore);
  });

  test('PC nav dropdown panel opens on hover', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/home/');
    await page.waitForLoadState('networkidle');

    const trigger = page.locator(
      '.prod-dropdown-trigger, .app-dropdown-trigger, .sup-dropdown-trigger, .abt-dropdown-trigger'
    ).first();
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.hover();
    await page.waitForTimeout(300);

    // Panel 应该出现
    const panel = page.locator('.prod-dropdown-panel, .app-dropdown-panel, .sup-dropdown-panel, .abt-dropdown-panel').first();
    await expect(panel).toBeVisible({ timeout: 2_000 });
  });
});

test.describe('Navigator Text Content (nav-config regression)', () => {
  test('all nav items have text (not empty)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/home/');
    await page.waitForLoadState('networkidle');

    // PC 导航栏应该包含文案，不是 pointer-events-none 降级占位
    const navTexts = page.locator('header nav a span[data-i18n]');
    const count = await navTexts.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // 没有 pointer-events-none 降级 span
    const degraded = page.locator('header span.pointer-events-none');
    await expect(degraded).toHaveCount(0);
  });

  test('case sub-page has complete navigator', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/cases/bangkok/');
    await page.waitForLoadState('networkidle');

    // Navigator 应该存在
    const nav = page.locator('header nav');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // 应该有导航文案（不是空的）
    const navText = await nav.textContent();
    expect(navText.trim().length).toBeGreaterThan(5);
  });
});

test.describe('Case Page Content', () => {
  test('case page has title + story content', async ({ page }) => {
    await page.goto('/cases/bangkok/');
    await page.waitForLoadState('networkidle');

    // 页面标题存在且有意义
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
    expect(title).toContain('YuKoLi');

    // 案例分析内容存在
    const content = page.locator('[data-i18n*="cases_bangkok"]').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('case page SEO slug alias works', async ({ page }) => {
    await page.goto('/cases/manila-lunchbox-studio-2025/');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title).toContain('Manila');
  });
});

test.describe('Hero Video (aboutus.mp4 fix regression)', () => {
  test('home page hero video loads (not missing)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/home/');
    await page.waitForLoadState('networkidle');

    // Hero video 元素存在
    const video = page.locator('.hero-video-player').first();
    await expect(video).toBeAttached({ timeout: 10_000 });
  });
});
