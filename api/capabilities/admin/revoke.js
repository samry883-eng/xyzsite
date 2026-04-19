import { grantRevoke } from '../../../lib/capabilities-auth.mjs';
import { readJsonBody } from '../../../lib/vercel-node-api.mjs';

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  const adm = process.env.CAPABILITIES_ADMIN_SECRET || '';
  if (!adm) {
    sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    return;
  }
  const h = req.headers['x-capabilities-admin-secret'];
  if (h !== adm) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }
  if (process.env.VERCEL) {
    sendJson(res, 501, {
      ok: false,
      error:
        'Cannot revoke on Vercel from this API. Edit CAPABILITIES_GRANTS_JSON in the Vercel project (remove the email) and redeploy.',
    });
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    return;
  }
  if (!body.email) {
    sendJson(res, 400, { ok: false, error: 'email required' });
    return;
  }
  grantRevoke(body.email);
  sendJson(res, 200, { ok: true });
}
