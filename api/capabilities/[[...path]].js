import { handleCapabilitiesApi } from '../../lib/capabilities-api-vercel.mjs';

function apiPath(req) {
  const parts = req.query?.path;
  if (Array.isArray(parts) && parts.length) return `/api/capabilities/${parts.map(decodeURIComponent).join('/')}`;
  if (typeof parts === 'string' && parts) return `/api/capabilities/${parts}`;
  const raw = req.url || '';
  const m = raw.match(/^\/api\/capabilities(?:\/([^?]*))?/);
  if (!m || !m[1]) return '/api/capabilities';
  return `/api/capabilities/${decodeURIComponent(m[1])}`;
}

export default function handler(req, res) {
  return handleCapabilitiesApi(req, res, apiPath(req));
}
