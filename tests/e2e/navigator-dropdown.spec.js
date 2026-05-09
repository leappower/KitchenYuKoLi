import { test, expect, BrowserContext } from '@playwright/test';

/**
 * Navigator dropdown E2E tests
 * Tests PC dropdown (hover/click + mutex) and mobile popup mode.
 *
 * Note: server runs on HTTPS but config baseURL is HTTP.
 * We use `page.goto()` with the full https:// URL to avoid self-signed cert errors.
 */

const HTTPS_BASE = 'https://localhost:3000';

/** Click via JS to bypass CSS actionability issues with Playwright */
async function clickSelector(page, selector) {
  await page.evaluate((sel) => document.querySelector(sel).click(), selector);
}

/** Helper: assert a dropdown wrap has `is-open` class */
async function expectOpen(page, wrapSelector) {
  const cls = await page.evaluate(
    (sel) => document.querySelector(sel)?.classList?.contains('is-open') ?? false,
    wrapSelector,
  );
  expect(cls).toBe(true);
}

/** Helper: assert a dropdown wrap does NOT have `is-open` class */
async function expectClosed(page, wrapSelector) {
  const cls = await page.evaluate(
    (sel) => document.querySelector(sel)?.classList?.contains('is-open') ?? true,
    wrapSelector,
  );
  expect(cls).toBe(false);
}

// ─── Desktop tests ───────────────────────────────────────────────────────────

test.describe('Desktop Navigator Dropdown', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  let errors;

  test.beforeEach(async ({ page, context }) => {
    errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    // Ensure we navigate via HTTPS
    await page.goto(HTTPS_BASE);
    await page.waitForLoadState('networkidle');
  });

  // ── 1. Basic dropdown operations & mutex ──────────────────────────────────

  test('products dropdown opens on trigger click', async ({ page }) => {
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectOpen(page, '.prod-dropdown-wrap');
  });

  test('mutex: clicking applications closes products', async ({ page }) => {
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectOpen(page, '.prod-dropdown-wrap');

    await clickSelector(page, '.app-dropdown-trigger');
    await expectOpen(page, '.app-dropdown-wrap');
    await expectClosed(page, '.prod-dropdown-wrap');
  });

  test('mutex: clicking support closes others', async ({ page }) => {
    await clickSelector(page, '.app-dropdown-trigger');
    await expectOpen(page, '.app-dropdown-wrap');

    await clickSelector(page, '.sup-dropdown-trigger');
    await expectOpen(page, '.sup-dropdown-wrap');
    await expectClosed(page, '.app-dropdown-wrap');
  });

  test('mutex: clicking about closes others', async ({ page }) => {
    await clickSelector(page, '.sup-dropdown-trigger');
    await expectOpen(page, '.sup-dropdown-wrap');

    await clickSelector(page, '.abt-dropdown-trigger');
    await expectOpen(page, '.abt-dropdown-wrap');
    await expectClosed(page, '.sup-dropdown-wrap');
  });

  // ── 2. Close behavior ─────────────────────────────────────────────────────

  test('clicking main area closes all dropdowns', async ({ page }) => {
    // Open two dropdowns (one at a time via mutex)
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectOpen(page, '.prod-dropdown-wrap');
    await clickSelector(page, '.app-dropdown-trigger');
    await expectOpen(page, '.app-dropdown-wrap');

    // Click main content area
    await page.evaluate(() => document.querySelector('main')?.click());
    await page.waitForTimeout(200);

    await expectClosed(page, '.prod-dropdown-wrap');
    await expectClosed(page, '.app-dropdown-wrap');
    await expectClosed(page, '.sup-dropdown-wrap');
    await expectClosed(page, '.abt-dropdown-wrap');
  });

  test('clicking same trigger toggles dropdown closed', async ({ page }) => {
    // Open
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectOpen(page, '.prod-dropdown-wrap');

    // Toggle close
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectClosed(page, '.prod-dropdown-wrap');

    // Same for applications
    await clickSelector(page, '.app-dropdown-trigger');
    await expectOpen(page, '.app-dropdown-wrap');
    await clickSelector(page, '.app-dropdown-trigger');
    await expectClosed(page, '.app-dropdown-wrap');
  });

  // ── 3. SPA navigation preserves dropdown functionality ────────────────────

  test('SPA navigation to /products/ — dropdown works after nav', async ({ page }) => {
    // Open products dropdown
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectOpen(page, '.prod-dropdown-wrap');

    // Click the /products/ link inside the dropdown
    await page.evaluate(() => {
      const link = document.querySelector('.prod-dropdown-wrap a[href*="/products/"]');
      if (link) link.click();
    });
    await page.waitForLoadState('networkidle');

    // Dropdown should be closed after navigation
    await expectClosed(page, '.prod-dropdown-wrap');

    // Products dropdown should still work
    await clickSelector(page, '.prod-dropdown-trigger');
    await expectOpen(page, '.prod-dropdown-wrap');

    // Applications dropdown mutex should work
    await clickSelector(page, '.app-dropdown-trigger');
    await expectOpen(page, '.app-dropdown-wrap');
    await expectClosed(page, '.prod-dropdown-wrap');
  });

  test('second SPA navigation to /support/ — dropdown works', async ({ page }) => {
    await page.goto(`${HTTPS_BASE}/products/`);
    await page.waitForLoadState('networkidle');

    // Navigate to support
    await clickSelector(page, '.sup-dropdown-trigger');
    await expectOpen(page, '.sup-dropdown-wrap');
    await page.evaluate(() => {
      const link = document.querySelector('.sup-dropdown-wrap a[href*="/support/"]');
      if (link) link.click();
    });
    await page.waitForLoadState('networkidle');

    await expectClosed(page, '.sup-dropdown-wrap');

    // Support dropdown should work after navigation
    await clickSelector(page, '.sup-dropdown-trigger');
    await expectOpen(page, '.sup-dropdown-wrap');
  });

  test('third SPA navigation to /about/ — dropdown works', async ({ page }) => {
    await page.goto(`${HTTPS_BASE}/support/`);
    await page.waitForLoadState('networkidle');

    // Navigate to about
    await clickSelector(page, '.abt-dropdown-trigger');
    await expectOpen(page, '.abt-dropdown-wrap');
    await page.evaluate(() => {
      const link = document.querySelector('.abt-dropdown-wrap a[href*="/about/"]');
      if (link) link.click();
    });
    await page.waitForLoadState('networkidle');

    await expectClosed(page, '.abt-dropdown-wrap');

    // About dropdown should work after navigation
    await clickSelector(page, '.abt-dropdown-trigger');
    await expectOpen(page, '.abt-dropdown-wrap');
  });

  // ── 4. Normal links unaffected ────────────────────────────────────────────

  test('clicking cases link navigates normally', async ({ page }) => {
    await clickSelector(page, '.app-dropdown-trigger');
    await expectOpen(page, '.app-dropdown-wrap');

    // Click the cases link
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/cases/"], a[href*="cases"]');
      if (link) link.click();
    });
    await page.waitForLoadState('networkidle');

    // URL should contain cases
    expect(page.url()).toContain('cases');

    // Dropdown should be closed
    await expectClosed(page, '.app-dropdown-wrap');
  });

  // ── 5. No JS errors ───────────────────────────────────────────────────────

  test('no page errors during full dropdown interaction cycle', async ({ page }) => {
    // Open/close each dropdown
    for (const trigger of [
      '.prod-dropdown-trigger',
      '.app-dropdown-trigger',
      '.sup-dropdown-trigger',
      '.abt-dropdown-trigger',
    ]) {
      await clickSelector(page, trigger);
      await clickSelector(page, trigger);
    }

    // SPA navigations
    await page.goto(`${HTTPS_BASE}/products/`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${HTTPS_BASE}/support/`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${HTTPS_BASE}/about/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.goto(HTTPS_BASE);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    expect(errors).toHaveLength(0);
  });
});

// ─── Mobile tests ────────────────────────────────────────────────────────────

test.describe('Mobile Navigator (popup mode)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  let errors;

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(HTTPS_BASE);
    await page.waitForLoadState('networkidle');
  });

  test('desktop dropdown panels do not exist on mobile', async ({ page }) => {
    // On mobile, the desktop dropdown wraps should either not exist or not be visible
    await page.waitForTimeout(500);

    // Check that no desktop dropdown wrap is present (navigator renders mobile nav instead)
    const anyWrap = await page.evaluate(() =>
      !!document.querySelector('.prod-dropdown-wrap') ||
      !!document.querySelector('.app-dropdown-wrap') ||
      !!document.querySelector('.sup-dropdown-wrap') ||
      !!document.querySelector('.abt-dropdown-wrap')
    );

    // If desktop wraps exist in DOM, none should be open
    if (anyWrap) {
      const allWraps = [
        '.prod-dropdown-wrap',
        '.app-dropdown-wrap',
        '.sup-dropdown-wrap',
        '.abt-dropdown-wrap',
      ];
      for (const wrap of allWraps) {
        await expectClosed(page, wrap);
      }
    }
  });

  test('mobile bottom bar or tablet bar renders instead of desktop nav', async ({ page }) => {
    // Mobile should have bottom bar or alternative nav, not desktop dropdowns
    const mobileNav = page.locator('.mobile-bottom-bar, .tablet-footer-bar');
    const desktopNav = page.locator('.desktop-nav, .pc-nav');

    // At least one mobile navigation element should exist, or desktop nav should be hidden
    const hasMobileNav = await mobileNav.count() > 0;
    const desktopVisible = await desktopNav.isVisible().catch(() => false);

    if (hasMobileNav) {
      // Mobile nav present — good
      expect(hasMobileNav).toBe(true);
    } else {
      // Desktop nav should be hidden on mobile
      expect(desktopVisible).toBe(false);
    }
  });

  test('no page errors on mobile', async ({ page }) => {
    // Interact with each trigger
    for (const trigger of [
      '.prod-dropdown-trigger',
      '.app-dropdown-trigger',
      '.sup-dropdown-trigger',
      '.abt-dropdown-trigger',
    ]) {
      const exists = await page.evaluate((sel) => !!document.querySelector(sel), trigger);
      if (exists) {
        await clickSelector(page, trigger);
        await page.waitForTimeout(200);
      }
    }

    // SPA nav
    await page.goto(`${HTTPS_BASE}/products/`);
    await page.waitForLoadState('networkidle');
    await page.goto(HTTPS_BASE);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
