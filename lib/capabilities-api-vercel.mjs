import {
  verifySession,
  createSession,
  verifyLogin,
  grantUpsert,
  grantUpsertMany,
  grantRevoke,
  grantList,
  canPersistGrants,
  buildSuggestedAllowedEmails,
  sessionCookieHeader,
  clearSessionCookieHeader,
  getCookieName,
  normalizeEmail,
  createAdminSession,
  adminSessionCookieHeader,
  clearAdminSessionCookieHeader,
  validateAdminPassword,
  getAdminSecretFromEnv,
  verifyNdaSession,
  createNdaSession,
  ndaSessionCookieHeader,
  getNdaCookieName,
  clearNdaSessionCookieHeader,
  ndaRecordGet,
  ndaRecordUpsert,
  ndaRecordRevoke,
  ndaRecordList,
  sessionSecret as capSessionSecret,
} from './capabilities-auth.mjs';
import { isAdminAuthorized } from './capabilities-admin-guard.mjs';
import { getAllowlistSnapshot } from './capabilities-allowlist.mjs';
import { readJsonBody } from './vercel-node-api.mjs';

const COOKIE = getCookieName();
const NDA_COOKIE = getNdaCookieName();

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function ndaDisabled() {
  return ['1', 'true', 'yes'].includes(String(process.env.CAPABILITIES_NDA_DISABLED || '').toLowerCase());
}

function secureCookies() {
  return process.env.CAPABILITIES_SECURE_COOKIES === '1' || process.env.NODE_ENV === 'production';
}

function sessionSecret() {
  return capSessionSecret();
}

function sendJson(res, code, obj, extraHeaders = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(extraHeaders)) {
    if (v !== undefined) res.setHeader(k, v);
  }
  res.end(JSON.stringify(obj));
}

export async function handleCapabilitiesApi(req, res, urlPath) {
  const sec = sessionSecret();
  const adm = getAdminSecretFromEnv();
  const sc = secureCookies();

  if (urlPath === '/api/capabilities/login' && req.method === 'POST') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const email = body.email;
    const password = body.password;
    if (!email) return sendJson(res, 400, { ok: false, error: 'Email required' });
    const ok = await verifyLogin(email, password);
    if (!ok) return sendJson(res, 401, { ok: false, error: 'Unable to open the deck with that email.' });
    const token = createSession(normalizeEmail(email), sec);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookieHeader(token, sc) });
  }

  if (urlPath === '/api/capabilities/logout' && req.method === 'POST') {
    return sendJson(
      res,
      200,
      { ok: true },
      { 'Set-Cookie': [clearSessionCookieHeader(sc), clearNdaSessionCookieHeader(sc)] }
    );
  }

  if (urlPath === '/api/capabilities/session' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const email = verifySession(cookies[COOKIE], sec);
    if (!email) return sendJson(res, 401, { ok: false, error: 'Login required' });
    if (ndaDisabled()) {
      return sendJson(res, 200, { ok: true, ndaAccepted: true, ndaName: null, ndaSignedAt: null });
    }
    const record = await ndaRecordGet(email);
    const cookieNda = verifyNdaSession(cookies[NDA_COOKIE], sec, email);
    const accepted = !!record || !!cookieNda;
    return sendJson(res, 200, {
      ok: true,
      ndaAccepted: accepted,
      ndaName: record ? record.signedName : cookieNda ? cookieNda.name : null,
      ndaSignedAt: record ? record.signedAt : null,
    });
  }

  if (urlPath === '/api/capabilities/nda-accept' && req.method === 'POST') {
    const cookies = parseCookies(req.headers.cookie);
    const email = verifySession(cookies[COOKIE], sec);
    if (!email) return sendJson(res, 401, { ok: false, error: 'Login required' });
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const name = String(body.name || '').trim();
    const accepted = body.accepted === true || body.accepted === 'true';
    if (!accepted) return sendJson(res, 400, { ok: false, error: 'You must accept the NDA to continue.' });
    if (!name) return sendJson(res, 400, { ok: false, error: 'Full name required' });
    let record;
    try {
      record = await ndaRecordUpsert(email, name);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message || 'Unable to save acceptance' });
    }
    let token;
    try {
      token = createNdaSession(email, name, sec);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message || 'Invalid name' });
    }
    return sendJson(
      res,
      200,
      { ok: true, signedName: record.signedName, signedAt: record.signedAt },
      { 'Set-Cookie': ndaSessionCookieHeader(token, sc) }
    );
  }

  if (urlPath === '/api/capabilities/admin/login' && req.method === 'POST') {
    if (!adm) return sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    if (!validateAdminPassword(body.password)) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    }
    const token = createAdminSession(sec);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': adminSessionCookieHeader(token, sc) });
  }

  if (urlPath === '/api/capabilities/admin/logout' && req.method === 'POST') {
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearAdminSessionCookieHeader(sc) });
  }

  if (urlPath === '/api/capabilities/admin/list' && req.method === 'GET') {
    if (!adm) return sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    if (!isAdminAuthorized(req, null, sec)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    const grants = await grantList();
    const ndaRecords = await ndaRecordList();
    const allowlist = getAllowlistSnapshot();
    const persist = await canPersistGrants();
    return sendJson(res, 200, {
      ok: true,
      grants,
      ndaRecords,
      allowlist,
      canPersistGrants: persist,
      help: persist
        ? 'Adds save instantly (Redis or local).'
        : 'Use CAPABILITIES_ALLOWED_EMAILS in Vercel or edit data/deck-allowlist.txt and push.',
    });
  }

  if (urlPath === '/api/capabilities/admin/grant-bulk' && req.method === 'POST') {
    if (!adm) return sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    if (!isAdminAuthorized(req, null, sec)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const raw = body.emails ?? body.email ?? '';
    try {
      if (!(await canPersistGrants())) {
        return sendJson(res, 200, {
          ok: true,
          mode: 'copy_env',
          suggestedAllowedEmails: buildSuggestedAllowedEmails(raw),
        });
      }
      const added = await grantUpsertMany(raw);
      return sendJson(res, 200, { ok: true, mode: 'saved', added });
    } catch (e) {
      const msg = e.message || 'Grant failed';
      if (String(msg).includes('Production writes need Redis')) {
        return sendJson(res, 200, {
          ok: true,
          mode: 'copy_env',
          suggestedAllowedEmails: buildSuggestedAllowedEmails(raw),
          message: msg,
        });
      }
      return sendJson(res, 400, { ok: false, error: msg });
    }
  }

  if (urlPath === '/api/capabilities/admin/grant' && req.method === 'POST') {
    if (!adm) return sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    if (!isAdminAuthorized(req, null, sec)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    try {
      if (!(await canPersistGrants())) {
        return sendJson(res, 200, {
          ok: true,
          mode: 'copy_env',
          suggestedAllowedEmails: buildSuggestedAllowedEmails(body.email),
        });
      }
      await grantUpsert(body.email, body.password);
      return sendJson(res, 200, { ok: true, mode: 'saved' });
    } catch (e) {
      const msg = e.message || 'Grant failed';
      if (String(msg).includes('Production writes need Redis')) {
        return sendJson(res, 200, {
          ok: true,
          mode: 'copy_env',
          suggestedAllowedEmails: buildSuggestedAllowedEmails(body.email),
          message: msg,
        });
      }
      return sendJson(res, 400, { ok: false, error: msg });
    }
  }

  if (urlPath === '/api/capabilities/admin/revoke' && req.method === 'POST') {
    if (!adm) return sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    if (!isAdminAuthorized(req, null, sec)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    if (!body.email) return sendJson(res, 400, { ok: false, error: 'email required' });
    try {
      await grantRevoke(body.email);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message || 'Revoke failed' });
    }
  }

  if (urlPath === '/api/capabilities/admin/nda-revoke' && req.method === 'POST') {
    if (!adm) return sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    if (!isAdminAuthorized(req, null, sec)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    if (!body.email) return sendJson(res, 400, { ok: false, error: 'email required' });
    try {
      await ndaRecordRevoke(body.email);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message || 'Revoke failed' });
    }
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}
