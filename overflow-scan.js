const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PAGES_DIR = '/Users/chee/Projects/KitchenYuKoLi/src/pages';
const BASE = 'http://localhost:5000';

const VIEWPORTS = [
  { name: 'mobile', width: 375, suffix: 'mobile' },
  { name: 'tablet',  width: 768, suffix: 'tablet' },
  { name: 'pc',      width: 1440, suffix: 'pc' },
];

function scanPages() {
  const files = [];
  function scan(dir, section) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        scan(full, section ? `${section}/${e.name}` : e.name);
      } else if (e.name.startsWith('index-') && e.name.endsWith('.html')) {
        files.push({
          section,
          variant: e.name.replace('index-', '').replace('.html', ''),
          file: full,
          relative: path.relative(PAGES_DIR, full),
        });
      }
    }
  }
  scan(PAGES_DIR, '');
  return files;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox'],
  });

  const allFiles = scanPages();
  const results = [];
  let total = 0;

  console.log('Scanning...\n');
  process.stdout.write('Progress: ');

  for (const f of allFiles) {
    for (const vp of VIEWPORTS) {
      if (f.variant !== vp.suffix) continue;
      total++;

      const url = `${BASE}/${f.relative}`;
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: 812 });
      
      let metrics;
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1500));
        
        metrics = await page.evaluate((vpw) => {
          const doc = document.documentElement;
          const body = document.body;
          const overflowPx = doc.scrollWidth - vpw;
          
          let worstRight = 0, worstTag = '';
          if (overflowPx > 0) {
            const all = document.querySelectorAll('body *');
            for (const el of all) {
              if (['SCRIPT','STYLE'].includes(el.tagName)) continue;
              try {
                const r = el.getBoundingClientRect();
                if (r.right > worstRight) {
                  worstRight = r.right;
                  worstTag = `<${el.tagName}${el.className ? '.'+(el.className||'').slice(0,30) : ''}>`;
                }
              } catch(e) {}
            }
          }
          
          return {
            overflow: overflowPx,
            hOV: getComputedStyle(doc).overflowX,
            bOV: getComputedStyle(body).overflowX,
            sW: doc.scrollWidth,
            worst: worstTag ? `${worstTag} right=${worstRight.toFixed(0)}` : '',
          };
        }, vp.width);
      } catch (err) {
        metrics = { overflow: -1, error: err.message.slice(0, 80) };
      }
      
      results.push({
        section: f.section,
        variant: vp.name,
        file: f.relative,
        ...metrics,
      });
      
      if (metrics.overflow > 0) {
        process.stdout.write(`\n❌ [${vp.name}] ${f.section}: overflow=${metrics.overflow}px ${metrics.worst}`);
      } else {
        process.stdout.write('.');
      }
      
      await page.close();
    }
  }

  await browser.close();
  
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE OVERFLOW REPORT');
  console.log('═══════════════════════════════════════════════════════');
  
  const overflows = results.filter(r => r.overflow > 0);
  const errors = results.filter(r => r.overflow === -1);
  const clean = results.filter(r => r.overflow <= 0);
  
  console.log(`\nTotal pages checked: ${clean.length + overflows.length + errors.length}`);
  console.log(`✅ Clean: ${clean.length}`);
  console.log(`❌ Overflow: ${overflows.length}`);
  console.log(`⚠️  Errors: ${errors.length}`);

  if (overflows.length > 0) {
    console.log('\n─── OVERFLOW DETAILS ───');
    overflows.sort((a, b) => b.overflow - a.overflow);
    for (const p of overflows) {
      console.log(`❌ [${p.variant}] ${p.file}`);
      console.log(`   overflow=${p.overflow}px  scrollW=${p.sW}  htmlOV=${p.hOV}  bodyOV=${p.bOV}`);
      if (p.worst) console.log(`   worst: ${p.worst}`);
    }
  }

  if (errors.length > 0) {
    console.log('\n─── ERRORS ───');
    for (const p of errors) {
      console.log(`⚠️  [${p.variant}] ${p.file}: ${p.error}`);
    }
  }
  
  console.log('\nDone.');
})();
