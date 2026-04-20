import {
  verifyAdminSession,
  getAdminCookieName,
  getAdminSecretFromEnv,
  validateAdminPassword,
} from './capabilities-auth.mjs';

export function parseCookies(header) {
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

/**
 * Admin API: header X-Capabilities-Admin-Secret (for scripts) or signed admin cookie (browser).
 * Prefer getAdminSecretFromEnv() for the secret so env matches validateAdminPassword().
 */
export function isAdminAuthorized(req, _adminSecret, sessionSecret) {
  const expected = getAdminSecretFromEnv();
  if (!expected) return false;
  const h = req.headers['x-capabilities-admin-secret'];
  if (h != null && validateAdminPassword(String(h))) return true;
  const cookies = parseCookies(req.headers.cookie || '');
  const t = cookies[getAdminCookieName()];
  return verifyAdminSession(t, sessionSecret);
}
