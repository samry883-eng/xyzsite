import { clearSessionCookieHeader } from '../../lib/capabilities-auth.mjs';

function secureCookies() {
  return (
    process.env.CAPABILITIES_SECURE_COOKIES === '1' ||
    process.env.NODE_ENV === 'production'
  );
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
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookieHeader(secureCookies()) });
}
