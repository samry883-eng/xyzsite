import { handleProjectPoster } from '../../../lib/projects-api-handlers.mjs';

function posterId(req) {
  const id = req.query?.id;
  if (typeof id === 'string' && id) return decodeURIComponent(id);
  const raw = req.url || '';
  const m = raw.match(/\/api\/projects\/poster\/([^/?]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : '';
}

export default function handler(req, res) {
  const id = posterId(req);
  if (!id) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    return;
  }
  return handleProjectPoster(req, res, id);
}
