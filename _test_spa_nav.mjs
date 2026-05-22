import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('http://localhost:3099/home/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Record navigator state before SPA
let before = await page.evaluate(() => {
  const header = document.querySelector('header.fixed');
  return {
    stage: 'HOME',
    headerHTML: header ? header.innerHTML.substring(0, 800) : 'no header',
  };
});
console.log('=== HOME BEFORE SPA ===');
console.log(before.headerHTML);

// Click first case detail card/link
// Look for a link like /cases/manila/
const caseLinks = page.locator('a[href^="/cases/"]:not([href="/cases/"])');
const count = await caseLinks.count();
console.log('Case detail links found:', count);

if (count > 0) {
  await caseLinks.first().click();
  await page.waitForTimeout(4000);
  
  let after = await page.evaluate(() => {
    const header = document.querySelector('header.fixed');
    const headers = document.querySelectorAll('header.fixed');
    return {
      stage: 'CASE_DETAIL_SPA',
      url: location.href,
      fixedHeaders: headers.length,
      headerHTML: header ? header.innerHTML.substring(0, 800) : 'no fixed header',
      langBtn: !!document.getElementById('lang-toggle-btn'),
      langBtnHTML: (() => {
        const btn = document.getElementById('lang-toggle-btn');
        return btn ? btn.outerHTML : 'no btn';
      })(),
      langBtnCount: document.querySelectorAll('#lang-toggle-btn').length,
      ctaBtns: document.querySelectorAll('[href="/quote"]').length,
    };
  });
  console.log('\n=== CASE DETAIL AFTER SPA ===');
  console.log(JSON.stringify(after, null, 2));
}

await browser.close();
