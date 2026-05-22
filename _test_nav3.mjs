import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 1. Direct slug access - the user scenario "页面异常，Navigator按钮变成中英文"
await page.goto('http://localhost:3099/cases/manila-lunchbox-studio-2025/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

let slug = await page.evaluate(() => {
  const doc = document.documentElement;
  const main = document.getElementById('spa-content');
  
  // Find all header-like elements
  const allHeaders = document.querySelectorAll('header');
  const allNavs = document.querySelectorAll('nav');
  
  // Find navigator related
  const placeholders = document.querySelectorAll('[data-component="navigator"]');
  
  return {
    stage: 'SLUG_DIRECT',
    url: location.href,
    hasHScroll: doc.scrollWidth > doc.clientWidth,
    headers: allHeaders.length,
    navs: allNavs.length,
    placeholders: placeholders.length,
    headerTags: Array.from(allHeaders).map(h => h.tagName + ' class=' + h.className.substring(0, 60) + ' children=' + h.children.length),
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
  };
});
console.log(JSON.stringify(slug, null, 2));

await browser.close();
