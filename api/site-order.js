import { getWorkOrderResolved, setWorkOrder } from '../lib/site-store.mjs';
import { isAdminAuthorized } from '../lib/capabilities-admin-guard.mjs';
import { readJsonBody } from '../lib/vercel-node-api.mjs';
import { triggerProductionRedeploy } from '../lib/vercel-redeploy.mjs';

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const order = await getWorkOrderResolved();
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
    let redeploySkipped = false;
    let skipReason;
    let warning;
    if (ok && body.redeploy === true) {
      const rd = await triggerProductionRedeploy();
      redeployed = !!rd.deployed;
      if (rd.skipped) {
        redeploySkipped = true;
        skipReason = rd.skipReason;
        warning = rd.warning;
      } else if (rd.quotaExceeded) {
        redeploySkipped = true;
        skipReason = 'quota';
        warning = rd.warning;
      } else if (!rd.ok) {
        warning = `Saved to Edge Config, but redeploy failed: ${rd.error}`;
      }
    }
    json(res, ok ? 200 : 503, {
      ok,
      redeployed,
      redeploySkipped: redeploySkipped || undefined,
      skipReason: skipReason || undefined,
      error: ok ? undefined : 'Save failed (Edge Config not configured?)',
      warning,
    });
    return;
  }
  json(res, 405, { ok: false, error: 'Method not allowed' });
}
