import { verifyAdminSession, getAdminCookieName } from './capabilities-auth.mjs';

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
 */
export function isAdminAuthorized(req, adminSecret, sessionSecret) {
  if (!adminSecret) return false;
  const h = req.headers['x-capabilities-admin-secret'];
  if (h === adminSecret) return true;
  const cookies = parseCookies(req.headers.cookie || '');
  const t = cookies[getAdminCookieName()];
  return verifyAdminSession(t, sessionSecret);
}
