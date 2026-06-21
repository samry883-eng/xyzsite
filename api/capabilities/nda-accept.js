import {
  verifySession,
  createNdaSession,
  sessionSecret,
  ndaSessionCookieHeader,
  getCookieName,
  ndaRecordUpsert,
} from '../../lib/capabilities-auth.mjs';
import { readJsonBody } from '../../lib/vercel-node-api.mjs';

function secureCookies() {
  return (
    process.env.CAPABILITIES_SECURE_COOKIES === '1' ||
    process.env.NODE_ENV === 'production'
  );
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    let v = part.slice(i + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch {
      /* keep raw */
    }
    out[k] = v;
  }
  return out;
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

  const secret = sessionSecret();
  const cookies = parseCookies(req.headers.cookie || '');
  const email = verifySession(cookies[getCookieName()], secret);
  if (!email) {
    sendJson(res, 401, { ok: false, error: 'Login required' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid body' });
    return;
  }

  const name = String(body.name || '').trim();
  const accepted = body.accepted === true || body.accepted === 'true';
  if (!accepted) {
    sendJson(res, 400, { ok: false, error: 'You must accept the NDA to continue.' });
    return;
  }
  if (!name) {
    sendJson(res, 400, { ok: false, error: 'Full name required' });
    return;
  }

  let record;
  try {
    record = await ndaRecordUpsert(email, name);
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || 'Unable to save acceptance' });
    return;
  }

  let token;
  try {
    token = createNdaSession(email, name, secret);
  } catch (e) {
    sendJson(res, 400, { ok: false, error: e.message || 'Invalid name' });
    return;
  }

  sendJson(
    res,
    200,
    { ok: true, signedName: record.signedName, signedAt: record.signedAt },
    { 'Set-Cookie': ndaSessionCookieHeader(token, secureCookies()) }
  );
}
