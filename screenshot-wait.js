const puppeteer = require('C:/Users/Admin/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const CHROME = 'C:/Users/Admin/.cache/puppeteer/chrome/win64-146.0.7680.76/chrome-win64/chrome.exe';

(async () => {
  const url = process.argv[2] || 'http://localhost:2001';
  const label = process.argv[3] || 'shot';
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  // Wait for loading overlay to disappear
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: `temporary screenshots/screenshot-wait-${label}.png` });
  console.log('Saved:', label);
  await browser.close();
})().catch(console.error);
