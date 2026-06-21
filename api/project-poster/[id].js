import { handleProjectPoster } from '../../lib/projects-api-handlers.mjs';

export default function handler(req, res) {
  const raw = req.query?.id;
  const id = decodeURIComponent(Array.isArray(raw) ? raw[0] : (raw || ''));
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Missing project id' }));
    return;
  }
  return handleProjectPoster(req, res, id);
}
