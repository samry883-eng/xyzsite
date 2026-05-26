import {
  grantUpsertMany,
  getAdminSecretFromEnv,
  canPersistGrants,
  buildSuggestedAllowedEmails,
} from '../../../lib/capabilities-auth.mjs';
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
  const raw = body.emails ?? body.email ?? '';
  try {
    if (!(await canPersistGrants())) {
      const suggested = buildSuggestedAllowedEmails(raw);
      sendJson(res, 200, {
        ok: true,
        mode: 'copy_env',
        added: [],
        suggestedAllowedEmails: suggested,
        message:
          'Copy suggestedAllowedEmails into Vercel → CAPABILITIES_ALLOWED_EMAILS, then redeploy. Or add lines to data/deck-allowlist.txt and push.',
      });
      return;
    }
    const added = await grantUpsertMany(raw);
    sendJson(res, 200, { ok: true, mode: 'saved', added });
  } catch (e) {
    const msg = e.message || 'Grant failed';
    if (String(msg).includes('Production writes need Redis')) {
      sendJson(res, 200, {
        ok: true,
        mode: 'copy_env',
        added: [],
        suggestedAllowedEmails: buildSuggestedAllowedEmails(raw),
        message: msg,
      });
      return;
    }
    sendJson(res, 400, { ok: false, error: msg });
  }
}
