/**
 * Bake homeList (+ preview paths + mkey) into Home/index.html for local dev.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMkeyMap, slimHomeRow } from './home-order-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const homeHtml = path.join(root, 'Home', 'index.html');
const previewDir = path.join(root, 'Home', 'assets', 'home-previews');
const mkeyMap = loadMkeyMap(root);

async function fetchOrder() {
  let order = null;
  const EC = process.env.EDGE_CONFIG_ID;
  const RT = process.env.EDGE_CONFIG_READ_TOKEN;
  if (EC && RT) {
    try {
      const r = await fetch(`https://edge-config.vercel.com/${EC}/item/workOrder?token=${RT}`);
      if (r.ok) order = await r.json();
    } catch {}
  }
  if (!order) {
    try {
      const r = await fetch('https://www.xyzstudios.co/api/site-order');
      if (r.ok) {
        const j = await r.json();
        order = j && j.order;
      }
    } catch {}
  }
  return order;
}

const order = await fetchOrder();
const homeList = order && order.homeList;
if (!homeList || !homeList.length) {
  console.warn('[inject-home-order] no order fetched; leaving Home/index.html unchanged');
  process.exit(0);
}

const slim = homeList.map((x) => slimHomeRow(x, previewDir, mkeyMap));

let s = fs.readFileSync(homeHtml, 'utf8');
const payload = JSON.stringify({ homeList: slim }).replace(/</g, '\\u003c');
const next = s.replace(
  /window\.__HOME_ORDER=[\s\S]*?;\/\*XYZ_BUILD_ORDER\*\//,
  'window.__HOME_ORDER=' + payload + ';/*XYZ_BUILD_ORDER*/',
);
if (next === s) {
  console.warn('[inject-home-order] __HOME_ORDER marker not found');
  process.exit(1);
}
fs.writeFileSync(homeHtml, next);
console.log('[inject-home-order] updated', slim.length, 'slides,', slim.filter((x) => x.preview).length, 'with previews');
