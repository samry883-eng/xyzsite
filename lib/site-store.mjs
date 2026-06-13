const TOKEN = process.env.VERCEL_API_TOKEN;
const EC = process.env.EDGE_CONFIG_ID;
const READ_TOKEN = process.env.EDGE_CONFIG_READ_TOKEN;
const TEAM = process.env.VERCEL_TEAM_ID;
const KEY = 'workOrder';
function teamQ(sep) { return TEAM ? (sep + 'teamId=' + TEAM) : ''; }

export async function getWorkOrder() {
  if (!EC || !READ_TOKEN) return null;
  try {
    const r = await fetch('https://edge-config.vercel.com/' + EC + '/item/' + KEY + '?token=' + READ_TOKEN);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { console.error('[site-store] read failed', e && e.message); return null; }
}

export async function setWorkOrder(order) {
  if (!TOKEN || !EC) return false;
  try {
    const r = await fetch('https://api.vercel.com/v1/edge-config/' + EC + '/items' + teamQ('?'), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key: KEY, value: order }] }),
    });
    if (!r.ok) { console.error('[site-store] write failed', r.status, await r.text().catch(()=>'')); return false; }
    return true;
  } catch (e) { console.error('[site-store] write error', e && e.message); return false; }
}
