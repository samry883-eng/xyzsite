const puppeteer = require('C:/Users/Admin/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const CHROME = 'C:/Users/Admin/.cache/puppeteer/chrome/win64-146.0.7680.76/chrome-win64/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:2001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 5000)); // wait for load animation

  // Click the full-screen trigger on the first hero item
  await page.evaluate(() => {
    const trigger = document.querySelector('.hero_trigger_full-screen');
    if (trigger) trigger.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: 'temporary screenshots/screenshot-close-btn.png' });
  console.log('Saved');
  await browser.close();
})().catch(console.error);
