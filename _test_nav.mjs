import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 1. Home page
await page.goto('http://localhost:3099/home/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

let home = await page.evaluate(() => {
  const main = document.getElementById('spa-content');
  const doc = document.documentElement;
  return {
    url: location.href,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    hasHScroll: doc.scrollWidth > doc.clientWidth,
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : 'no main',
    mainComputedW: main ? window.getComputedStyle(main).width : '',
    mainOverflowX: main ? window.getComputedStyle(main).overflowX : '',
    bodyOverflowX: window.getComputedStyle(document.body).overflowX,
    heroSection: (() => {
      const hero = document.querySelector('.hero-overlap');
      if (!hero) return 'no hero-overlap';
      const r = hero.getBoundingClientRect();
      return 'w=' + Math.round(r.width) + ' left=' + Math.round(r.left) + ' right=' + Math.round(r.right);
    })(),
    fullwidthBg: (() => {
      const fw = document.querySelector('.fullwidth-bg');
      if (!fw) return 'no fullwidth-bg';
      const r = fw.getBoundingClientRect();
      return 'w=' + Math.round(r.width) + ' left=' + Math.round(r.left) + ' right=' + Math.round(r.right);
    })(),
    navigator: (() => {
      const placeholders = document.querySelectorAll('[data-component="navigator"]');
      const headers = document.querySelectorAll('header');
      const langBtn = document.getElementById('lang-toggle-btn');
      return { placeholders: placeholders.length, headers: headers.length, hasLangBtn: !!langBtn };
    })(),
    navInnerHTML: (() => {
      const header = document.querySelector('header');
      return header ? header.innerHTML.substring(0, 500) : 'no header';
    })(),
  };
});
console.log('### HOME ###');
console.log(JSON.stringify(home, null, 2));

// 2. Click case list link
const caseLink = page.locator('a[href="/cases/"]');
if (await caseLink.count() > 0) {
  await caseLink.first().click();
  await page.waitForTimeout(3000);

  let cases = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.getElementById('spa-content');
    return {
      url: location.href,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      hasHScroll: doc.scrollWidth > doc.clientWidth,
      navigator: {
        placeholders: document.querySelectorAll('[data-component="navigator"]').length,
        headers: document.querySelectorAll('header').length,
        langBtn: !!document.getElementById('lang-toggle-btn'),
      },
    };
  });
  console.log('\n### CASES LIST (SPA) ###');
  console.log(JSON.stringify(cases, null, 2));
}

// 3. Click first case detail link
const detailLink = page.locator('a[href^="/cases/"]').first();
const href = await detailLink.getAttribute('href');
if (href && href !== '/cases/') {
  await detailLink.click();
  await page.waitForTimeout(3000);

  let detail = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.getElementById('spa-content');
    return {
      url: location.href,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      hasHScroll: doc.scrollWidth > doc.clientWidth,
      navigator: {
        placeholders: document.querySelectorAll('[data-component="navigator"]').length,
        headers: document.querySelectorAll('header').length,
        langBtn: !!document.getElementById('lang-toggle-btn'),
        ctaLinks: document.querySelectorAll('[href="/quote"]').length,
      },
    };
  });
  console.log('\n### CASE DETAIL (SPA) ###');
  console.log(JSON.stringify(detail, null, 2));
  
  // 4. Direct page load (slug)
  await page.goto('http://localhost:3099/cases/manila-lunchbox-studio-2025/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  let slug = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.getElementById('spa-content');
    return {
      url: location.href,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      hasHScroll: doc.scrollWidth > doc.clientWidth,
      navigator: {
        placeholders: document.querySelectorAll('[data-component="navigator"]').length,
        headers: document.querySelectorAll('header').length,
        langBtn: !!document.getElementById('lang-toggle-btn'),
        ctaLinks: document.querySelectorAll('[href="/quote"]').length,
      },
    };
  });
  console.log('\n### SLUG DIRECT (DIRECT LOAD) ###');
  console.log(JSON.stringify(slug, null, 2));
}

await browser.close();
