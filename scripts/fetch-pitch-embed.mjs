/**
 * Opens a Pitch embed in headless Chrome, captures slide media from network responses,
 * writes files under Capabilities/assets/pitch-embed/<slug>/ and manifest.json.
 *
 * Usage: node scripts/fetch-pitch-embed.mjs [embed-slug]
 * Env: CHROME_PATH (optional, defaults to Windows Chrome)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const slug = process.argv[2] || 'iyby7f';
const embedUrl = `https://pitch.com/embed-link/${slug}`;

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const OUT = path.join(ROOT, 'Capabilities', 'assets', 'pitch-embed', slug);

const MEDIA_RE = /\.(png|jpe?g|gif|webp|avif|mp4|webm|m4v|mov|woff2?)(\?|$)/i;
const HOST_ALLOW =
  /pitch\.com|services\.pitch|imgix|imgproxy|amazonaws|cloudinary|supabase|vidzflow|r2\.|website-files|storage\.googleapis|akamaized|cloudfront/i;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function safeNameFromUrl(u) {
  try {
    const { pathname, hostname } = new URL(u);
    const base = path.basename(pathname) || 'asset';
    const clean = base.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const short = clean.length > 120 ? clean.slice(-120) : clean;
    return `${hostname.split('.')[0]}_${short}`;
  } catch {
    return `asset_${Date.now()}`;
  }
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.error('Chrome not found at', CHROME, '— set CHROME_PATH');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const recorded = new Map();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('response', async (response) => {
    const url = response.url();
    if (recorded.has(url)) return;
    const ct = (response.headers()['content-type'] || '').split(';')[0].trim();
    const reqType = response.request().resourceType();
    const looksMedia =
      reqType === 'image' ||
      reqType === 'media' ||
      reqType === 'font' ||
      reqType === 'other' ||
      /image\/|video\/|font\//.test(ct);
    if (!looksMedia) return;
    if (!HOST_ALLOW.test(url)) return;
    const videoLikely = /video\//.test(ct) || /\.(mp4|webm|m3u8)(\?|$)/i.test(url);
    if (!videoLikely && !MEDIA_RE.test(url) && !/image\/|video\/|font\//.test(ct)) return;

    recorded.set(url, { status: 'pending' });
    try {
      const buf = await response.buffer();
      if (!buf || buf.length < 64) return;
      recorded.set(url, { status: 'ok', buf, contentType: ct });
    } catch {
      recorded.set(url, { status: 'err' });
    }
  });

  await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 120000 });
  await delay(8000);

  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('ArrowDown');
    await delay(500);
  }

  const manifest = { embedUrl, slug, fetchedAt: new Date().toISOString(), assets: [] };
  let idx = 0;

  for (const [url, meta] of recorded) {
    if (meta.status !== 'ok' || !meta.buf) continue;
    const extGuess = (() => {
      try {
        const p = new URL(url).pathname;
        const m = p.match(/\.([a-z0-9]+)$/i);
        return m ? '.' + m[1].toLowerCase() : '';
      } catch {
        return '';
      }
    })();
    const name = `${String(++idx).padStart(3, '0')}_${safeNameFromUrl(url)}${extGuess || ''}`;
    const dest = path.join(OUT, name);
    fs.writeFileSync(dest, meta.buf);
    manifest.assets.push({
      url,
      local: `pitch-embed/${slug}/${name}`,
      bytes: meta.buf.length,
      contentType: meta.contentType || null,
    });
    console.log('saved', name, meta.buf.length);
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  await browser.close();
  console.log('Done.', OUT, 'files:', manifest.assets.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
