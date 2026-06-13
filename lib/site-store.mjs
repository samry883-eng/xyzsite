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
