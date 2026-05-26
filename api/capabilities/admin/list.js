import { grantList, getAdminSecretFromEnv, canPersistGrants } from '../../../lib/capabilities-auth.mjs';
import { getAllowlistSnapshot } from '../../../lib/capabilities-allowlist.mjs';
import { isAdminAuthorized } from '../../../lib/capabilities-admin-guard.mjs';

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
  const grants = await grantList();
  const allowlist = getAllowlistSnapshot();
  const persist = await canPersistGrants();
  sendJson(res, 200, {
    ok: true,
    grants,
    allowlist,
    canPersistGrants: persist,
    help: persist
      ? 'Adds save instantly (Redis or local).'
      : 'Use CAPABILITIES_ALLOWED_EMAILS in Vercel or edit data/deck-allowlist.txt and push.',
  });
}
