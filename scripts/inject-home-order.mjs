/**
 * Bake homeList (+ preview paths + mkey) into Home/index.html for local dev.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMkeyMap, slimHomeRow, fetchWorkOrderForBuild } from './home-order-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const homeHtml = path.join(root, 'Home', 'index.html');
const previewDir = path.join(root, 'Home', 'assets', 'home-previews');
const mkeyMap = loadMkeyMap(root);

async function fetchOrder() {
  return fetchWorkOrderForBuild();
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
