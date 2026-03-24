let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  try {
    puppeteer = require('puppeteer-core');
  } catch (err) {
    console.error('puppeteer or puppeteer-core not installed. Run `npm install puppeteer-core` or `npm install puppeteer`.');
    process.exit(1);
  }
}

(async () => {
  // If using puppeteer-core, provide an executablePath (allow overriding with CHROME_PATH env)
  const launchOpts = { args: ['--no-sandbox','--disable-setuid-sandbox'] };
  if (!puppeteer.launch.toString().includes('Product') && process.env.CHROME_PATH) {
    launchOpts.executablePath = process.env.CHROME_PATH;
  }
  // Fallback common macOS Chrome path
  if (!launchOpts.executablePath) {
    const possible = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    const fs = require('fs');
    for (const p of possible) {
      try { if (fs.existsSync(p)) { launchOpts.executablePath = p; break; } } catch(e) { /* ignore */ }
    }
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
  } catch (e) {
    console.error('Failed to launch puppeteer. Provide CHROME_PATH env or install full puppeteer to auto-download Chromium. Error:', e.message);
    process.exit(1);
  }
  const page = await browser.newPage();

  const consoleMsgs = [];
  const pageErrors = [];
  const requestFailures = [];
  const responses = [];

  page.on('console', msg => {
    try { consoleMsgs.push({ type: msg.type(), text: msg.text() }); } catch (_e) { /* ignore */ }
  });
  page.on('pageerror', err => { pageErrors.push(String(err)); });
  page.on('requestfailed', req => {
    const f = req.failure && req.failure();
    requestFailures.push({ url: req.url(), errorText: f ? f.errorText : 'unknown' });
  });
  page.on('response', res => {
    try { responses.push({ url: res.url(), status: res.status() }); } catch (_e) { /* ignore */ }
  });

  await page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto('http://localhost:5001/', { waitUntil: 'networkidle2', timeout: 20000 });
  } catch (e) {
    console.error('GOTO_ERROR:', e.message);
  }

  await page.waitForTimeout(1500);

  const html = await page.content();

  const out = {
    console: consoleMsgs,
    pageErrors: pageErrors,
    requestFailures: requestFailures,
    responses: responses.slice(-200),
    htmlSnippet: html.slice(0, 2000)
  };

  console.log(JSON.stringify(out, null, 2));

  await browser.close();
})();
