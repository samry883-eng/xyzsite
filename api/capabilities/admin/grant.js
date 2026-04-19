import { grantUpsert, getAdminSecretFromEnv } from '../../../lib/capabilities-auth.mjs';
import { readJsonBody } from '../../../lib/vercel-node-api.mjs';
import { isAdminAuthorized } from '../../../lib/capabilities-admin-guard.mjs';

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
  const sec = process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
  if (!getAdminSecretFromEnv()) {
    sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    return;
  }
  if (!isAdminAuthorized(req, null, sec)) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    return;
  }
  try {
    await grantUpsert(body.email, body.password || undefined);
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || 'Grant failed' });
  }
}
