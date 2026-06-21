import { handleCapabilitiesApi } from '../../../lib/capabilities-api-vercel.mjs';

function adminApiPath(req) {
  const parts = req.query?.path;
  if (Array.isArray(parts) && parts.length) {
    return `/api/capabilities/admin/${parts.map(decodeURIComponent).join('/')}`;
  }
  if (typeof parts === 'string' && parts) {
    return `/api/capabilities/admin/${parts}`;
  }
  const raw = req.url || '';
  const m = raw.match(/^\/api\/capabilities\/admin(?:\/([^?]*))?/);
  if (m && m[1]) return `/api/capabilities/admin/${decodeURIComponent(m[1])}`;
  return '/api/capabilities/admin';
}

export default function handler(req, res) {
  return handleCapabilitiesApi(req, res, adminApiPath(req));
}
