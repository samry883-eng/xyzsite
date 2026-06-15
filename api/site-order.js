import { getWorkOrder, setWorkOrder } from '../lib/site-store.mjs';
import { isAdminAuthorized } from '../lib/capabilities-admin-guard.mjs';
import { readJsonBody } from '../lib/vercel-node-api.mjs';
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const order = await getWorkOrder();
    json(res, 200, { ok: true, order: order || null });
    return;
  }
  if (req.method === 'POST') {
    const sec = process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
    if (!isAdminAuthorized(req, null, sec)) { json(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    let body;
    try { body = await readJsonBody(req); } catch { json(res, 400, { ok: false, error: 'Invalid JSON' }); return; }
    const ok = await setWorkOrder(body.order || {});
    let redeployed = false;
    if (ok) {
      // Auto-redeploy so the baked home order refreshes (page ships static-correct; no runtime fetch).
      try {
        const tok = process.env.VERCEL_API_TOKEN;
        const team = process.env.VERCEL_TEAM_ID;
        if (tok) {
          const url = 'https://api.vercel.com/v13/deployments' + (team ? ('?teamId=' + team) : '');
          const dr = await fetch(url, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'xyzsite-omega', project: 'prj_VJcvkk6j0pDBjgtmsS5OP2ZPcgpf', target: 'production', gitSource: { type: 'github', repoId: '1214633005', ref: 'main' } }),
          });
          redeployed = dr.ok;
          if (!dr.ok) console.error('[site-order] auto-redeploy failed', dr.status, await dr.text().catch(() => ''));
        }
      } catch (e) { console.error('[site-order] auto-redeploy error', e && e.message); }
    }
    json(res, ok ? 200 : 503, { ok, redeployed, error: ok ? undefined : 'Save failed (Edge Config not configured?)' });
    return;
  }
  json(res, 405, { ok: false, error: 'Method not allowed' });
}
