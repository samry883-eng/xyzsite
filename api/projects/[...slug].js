import {
  handleProjectById,
  handleProjectsRedisHealth,
  handleProjectsSeed,
} from '../../lib/projects-api-handlers.mjs';

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  const slug = req.query?.slug;
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const path = parts.join('/');

  if (path === 'redis-health') {
    return handleProjectsRedisHealth(req, res);
  }
  if (path === 'seed') {
    return handleProjectsSeed(req, res);
  }
  if (parts.length === 1 && parts[0]) {
    return handleProjectById(req, res, decodeURIComponent(parts[0]));
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}
