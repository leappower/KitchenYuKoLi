import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 1. Home page
await page.goto('http://localhost:3099/home/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

let home = await page.evaluate(() => {
  const doc = document.documentElement;
  const main = document.getElementById('spa-content');
  return {
    stage: 'HOME',
    url: location.href,
    hasHScroll: doc.scrollWidth > doc.clientWidth,
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
    navigator: {
      headers: document.querySelectorAll('header').length,
      langBtn: !!document.getElementById('lang-toggle-btn'),
      ctaLinks: document.querySelectorAll('[href="/quote"]').length,
    },
  };
});
console.log(JSON.stringify(home));

// 2. Navigate directly to slug URL (simulates user opening slug URL in browser)
await page.goto('http://localhost:3099/cases/manila-lunchbox-studio-2025/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

let direct = await page.evaluate(() => {
  const doc = document.documentElement;
  const main = document.getElementById('spa-content');
  return {
    stage: 'SLUG_DIRECT',
    url: location.href,
    hasHScroll: doc.scrollWidth > doc.clientWidth,
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
    mainContent: main ? main.innerHTML.substring(0, 100) : null,
    navigator: {
      placeholders: document.querySelectorAll('[data-component="navigator"]').length,
      headers: document.querySelectorAll('header').length,
      langBtn: !!document.getElementById('lang-toggle-btn'),
      ctaLinks: document.querySelectorAll('[href="/quote"]').length,
    },
  };
});
console.log(JSON.stringify(direct));

// 3. SPA navigate from slug detail to home then to another slug
await page.goto('http://localhost:3099/home/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Click cases link in navigator
const navCases = page.locator('header a[href="/cases/"], nav a[href="/cases/"]');
const navCasesCount = await navCases.count();
if (navCasesCount > 0) {
  await navCases.first().click();
  await page.waitForTimeout(3000);

  let spaL1 = await page.evaluate(() => {
    return {
      stage: 'SPA_CASES_LIST',
      url: location.href,
      navigator: {
        headers: document.querySelectorAll('header').length,
        langBtn: !!document.getElementById('lang-toggle-btn'),
      },
    };
  });
  console.log(JSON.stringify(spaL1));
}

await browser.close();
