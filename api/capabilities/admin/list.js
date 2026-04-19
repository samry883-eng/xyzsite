import { grantList } from '../../../lib/capabilities-auth.mjs';

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  const adm = process.env.CAPABILITIES_ADMIN_SECRET || '';
  if (!adm) {
    sendJson(res, 503, { ok: false, error: 'CAPABILITIES_ADMIN_SECRET is not set' });
    return;
  }
  const h = req.headers['x-capabilities-admin-secret'];
  if (h !== adm) {
    sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }
  sendJson(res, 200, { ok: true, grants: grantList() });
}
