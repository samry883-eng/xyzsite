import { handleProjectById } from '../../lib/projects-api-handlers.mjs';

export default function handler(req, res) {
  const id = req.query?.id;
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'id required' }));
    return;
  }
  return handleProjectById(req, res, decodeURIComponent(id));
}
