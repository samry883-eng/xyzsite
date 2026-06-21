import {
  verifySession,
  verifyNdaSession,
  sessionSecret,
  getCookieName,
  getNdaCookieName,
  ndaRecordGet,
} from '../../lib/capabilities-auth.mjs';

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

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const ndaOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_NDA_DISABLED || '').toLowerCase()
  );
  const secret = sessionSecret();
  const cookies = parseCookies(req.headers.cookie || '');
  const email = verifySession(cookies[getCookieName()], secret);
  if (!email) {
    sendJson(res, 401, { ok: false, error: 'Login required' });
    return;
  }

  if (ndaOff) {
    sendJson(res, 200, { ok: true, ndaAccepted: true, ndaName: null, ndaSignedAt: null });
    return;
  }

  const record = await ndaRecordGet(email);
  const cookieNda = verifyNdaSession(cookies[getNdaCookieName()], secret, email);
  const accepted = !!record || !!cookieNda;

  sendJson(res, 200, {
    ok: true,
    ndaAccepted: accepted,
    ndaName: record ? record.signedName : cookieNda ? cookieNda.name : null,
    ndaSignedAt: record ? record.signedAt : null,
  });
}
