import {
  handleProjectById,
  handleProjectsCollection,
  handleProjectsRedisHealth,
  handleProjectsSeed,
  handleProjectsSyncDefault,
} from '../../lib/projects-api-handlers.mjs';

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function slugParts(req) {
  const slug = req.query?.slug;
  if (Array.isArray(slug)) return slug;
  if (typeof slug === 'string' && slug) return slug.split('/').filter(Boolean);
  const raw = req.url || '';
  const m = raw.match(/\/api\/projects(?:\/([^?]*))?/);
  return m && m[1] ? m[1].split('/').filter(Boolean) : [];
}

export default async function handler(req, res) {
  const parts = slugParts(req);
  if (!parts.length) {
    return handleProjectsCollection(req, res);
  }

  const path = parts.join('/');
  if (path === 'redis-health') return handleProjectsRedisHealth(req, res);
  if (path === 'seed') return handleProjectsSeed(req, res);
  if (path === 'sync-default') return handleProjectsSyncDefault(req, res);
  if (parts.length === 1 && parts[0]) {
    return handleProjectById(req, res, decodeURIComponent(parts[0]));
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}
