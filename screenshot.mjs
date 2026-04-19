import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Admin/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url   = process.argv[2] || 'http://localhost:2001';
const label = process.argv[3] || '';

const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

// Find next N
const existing = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
let maxN = 0;
existing.forEach(f => { const m = f.match(/^screenshot-(\d+)/); if (m) maxN = Math.max(maxN, +m[1]); });
const n = maxN + 1;
const fname = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const outPath = path.join(screenshotDir, fname);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();
console.log(`Saved: ${outPath}`);
