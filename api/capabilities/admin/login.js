import {
  createAdminSession,
  validateAdminCredentials,
  adminSessionCookieHeader,
} from '../../../lib/capabilities-auth.mjs';
import { readJsonBody } from '../../../lib/vercel-node-api.mjs';

function sendJson(res, code, obj, extraHeaders = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(extraHeaders)) {
    if (v !== undefined) res.setHeader(k, v);
  }
  res.end(JSON.stringify(obj));
}

function secureCookies() {
  return (
    process.env.CAPABILITIES_SECURE_COOKIES === '1' ||
    process.env.NODE_ENV === 'production'
  );
}

function sessionSecret() {
  return process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
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
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    return;
  }
  if (!validateAdminCredentials(body.email, body.password)) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }
  const token = createAdminSession(sessionSecret());
  sendJson(
    res,
    200,
    { ok: true },
    { 'Set-Cookie': adminSessionCookieHeader(token, secureCookies()) }
  );
}
