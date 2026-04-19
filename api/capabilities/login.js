import {
  verifyLogin,
  createSession,
  normalizeEmail,
  sessionCookieHeader,
} from '../../lib/capabilities-auth.mjs';
import { readJsonBody } from '../../lib/vercel-node-api.mjs';

function secureCookies() {
  return (
    process.env.CAPABILITIES_SECURE_COOKIES === '1' ||
    process.env.NODE_ENV === 'production'
  );
}

function sessionSecret() {
  return process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
}

function sendJson(res, code, obj, extraHeaders = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(extraHeaders)) {
    if (v !== undefined) res.setHeader(k, v);
  }
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid body' });
    return;
  }
  const { email, password } = body;
  if (!email) {
    sendJson(res, 400, { ok: false, error: 'Email required' });
    return;
  }
  const ok = await verifyLogin(email, password);
  if (!ok) {
    sendJson(res, 401, { ok: false, error: 'Unable to open the deck with that email.' });
    return;
  }
  const token = createSession(normalizeEmail(email), sessionSecret());
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookieHeader(token, secureCookies()) });
}
