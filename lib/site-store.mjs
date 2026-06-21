import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const TOKEN = process.env.VERCEL_API_TOKEN;
const EC = process.env.EDGE_CONFIG_ID;
const READ_TOKEN = process.env.EDGE_CONFIG_READ_TOKEN;
const TEAM = process.env.VERCEL_TEAM_ID;

export function ecReadable() { return Boolean(EC && READ_TOKEN); }
export function ecWritable() { return Boolean(EC && TOKEN); }
function teamQ() { return TEAM ? ('?teamId=' + TEAM) : ''; }

export async function getKey(key) {
  if (!EC || !READ_TOKEN) return null;
  try {
    const r = await fetch('https://edge-config.vercel.com/' + EC + '/item/' + key + '?token=' + READ_TOKEN);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { console.error('[site-store] read failed', key, e && e.message); return null; }
}

export async function setKey(key, value) {
  if (!TOKEN || !EC) return false;
  try {
    const r = await fetch('https://api.vercel.com/v1/edge-config/' + EC + '/items' + teamQ(), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key, value }] }),
    });
    if (!r.ok) { console.error('[site-store] write failed', key, r.status, await r.text().catch(() => '')); return false; }
    return true;
  } catch (e) { console.error('[site-store] write error', key, e && e.message); return false; }
}

export async function getWorkOrder() { return getKey('workOrder'); }
export async function setWorkOrder(order) { return setKey('workOrder', order); }

/** Fallback when Edge Config is unavailable (local dev). */
export function readBakedWorkOrder(root = ROOT) {
  try {
    const homeHtml = path.join(root, 'Home', 'index.html');
    const s = fs.readFileSync(homeHtml, 'utf8');
    const m = s.match(/window\.__HOME_ORDER=(\{[\s\S]*?\});\/\*XYZ_BUILD_ORDER\*\//);
    if (!m) return null;
    const parsed = JSON.parse(m[1]);
    return parsed && parsed.homeList && parsed.homeList.length ? parsed : null;
  } catch (e) {
    console.error('[site-store] baked workOrder read failed', e && e.message);
    return null;
  }
}

function normalizeWorkOrder(order, root = ROOT) {
  if (!order || !order.homeList || !order.homeList.length) return order;
  try {
    const admin = path.join(root, 'Admin', 'index.html');
    const s = fs.readFileSync(admin, 'utf8');
    const m = s.match(/var DATA = (\{[\s\S]*?\});\s*\nvar HOME/);
    if (!m) return order;
    const data = JSON.parse(m[1]);
    const mkeyMap = {};
    for (const cat of data.categories || []) {
      for (const p of data.projects[cat] || []) {
        if (p.key && p.mkey) mkeyMap[p.key] = p.mkey;
      }
    }
    return {
      ...order,
      homeList: order.homeList.map((x) => {
        const mk = mkeyMap[x.key] || x.mkey || '';
        const row = { ...x, mkey: mk };
        if (mk.startsWith('ai/')) row.cat = 'AI';
        else if (mk.startsWith('sound/')) row.cat = 'Sound';
        else if (mk.startsWith('visual-effects/')) row.cat = 'Visual Effects';
        return row;
      }),
    };
  } catch (e) {
    console.error('[site-store] normalize workOrder failed', e && e.message);
    return order;
  }
}

export async function getWorkOrderResolved(root = ROOT) {
  const remote = await getWorkOrder();
  if (remote && remote.homeList && remote.homeList.length) return normalizeWorkOrder(remote, root);
  return readBakedWorkOrder(root);
}
