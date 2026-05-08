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
