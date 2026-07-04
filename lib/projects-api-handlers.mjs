import {
  getProjectsCatalogRaw,
  saveProjectsCatalog,
  normalizeCatalog,
  normalizeProject,
  sortProjects,
  projectHref,
} from './projects-store.mjs';
import {
  getProjectPosterBuffer,
  saveProjectPosterBase64,
} from './projects-poster-store.mjs';
import { redisHealthCheck } from './upstash-redis.mjs';
import { buildDefaultCatalog, mergeDefaultCatalogMissing, repairCatalogFromDefaults } from './projects-default-catalog.mjs';
import { triggerProductionRedeploy } from './vercel-redeploy.mjs';
import { isAdminAuthorized } from './capabilities-admin-guard.mjs';
import { readJsonBody } from './vercel-node-api.mjs';

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function adminSecret() {
  return process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
}

function requireAdmin(req, res) {
  if (!isAdminAuthorized(req, null, adminSecret())) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

async function loadCatalog({ applyDefaults = false, repair = false } = {}) {
  let raw = await getProjectsCatalogRaw();
  if (!raw?.projects?.length) {
    raw = buildDefaultCatalog();
  } else if (repair) {
    raw = repairCatalogFromDefaults(raw).catalog;
  }
  const normalized = normalizeCatalog(raw, { applyDefaults });
  if (normalized) return normalized;
  return normalizeCatalog(buildDefaultCatalog(), { applyDefaults }) || buildDefaultCatalog();
}

const BODY_LIMIT = 512000;
const POSTER_BODY_LIMIT = 400000;

async function saveCatalog(catalog, redeploy = false) {
  const saved = await saveProjectsCatalog(catalog);
  if (!saved.ok) {
    return {
      ok: false,
      redeployed: false,
      phase: 'save',
      error: saved.error || 'Save failed',
    };
  }
  if (!redeploy) {
    return { ok: true, redeployed: false, storage: saved.storage };
  }
  const rd = await triggerProductionRedeploy();
  const sizeKb = Math.round(JSON.stringify(catalog).length / 1024);
  if (rd.deployed) {
    return { ok: true, redeployed: true, storage: saved.storage };
  }
  if (rd.skipped || rd.quotaExceeded) {
    return {
      ok: true,
      redeployed: false,
      redeploySkipped: true,
      skipReason: rd.skipReason || (rd.quotaExceeded ? 'quota' : undefined),
      phase: 'redeploy',
      storage: saved.storage,
      warning: rd.warning || rd.error,
    };
  }
  return {
    ok: true,
    redeployed: false,
    phase: 'redeploy',
    storage: saved.storage,
    warning: `Saved to ${saved.storage || 'catalog'} (${sizeKb}KB), but redeploy failed: ${rd.error}`,
  };
}

export async function handleProjectsCollection(req, res) {
  if (req.method === 'GET') {
    const catalog = await loadCatalog({ repair: true });
    json(res, 200, { ok: true, catalog: { version: catalog.version, projects: sortProjects(catalog.projects) } });
    return;
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJsonBody(req, BODY_LIMIT); } catch (e) {
      json(res, 413, { ok: false, error: e.message === 'body too large' ? 'Request body too large' : 'Invalid JSON' });
      return;
    }
    const catalog = await loadCatalog({ repair: true });
    const project = normalizeProject(body.project || body);
    if (!project || !project.title || !project.client) {
      json(res, 400, { ok: false, error: 'title and client required' });
      return;
    }
    if (catalog.projects.some((p) => p.id === project.id)) {
      json(res, 409, { ok: false, error: 'Project id already exists' });
      return;
    }
    if (!project.slug) project.slug = project.id.split('|')[0].replace(/\s+/g, '-');
    project.href = projectHref(project.category, project.slug);
    project.sortOrder = catalog.projects.length;
    catalog.projects.push(project);
    const { ok, redeployed, error, warning } = await saveCatalog(catalog, body.redeploy === true);
    json(res, ok ? 200 : 503, { ok, redeployed, catalog: ok ? catalog : undefined, error: ok ? undefined : error, warning });
    return;
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJsonBody(req, BODY_LIMIT); } catch (e) {
      json(res, 413, { ok: false, error: e.message === 'body too large' ? 'Request body too large' : 'Invalid JSON' });
      return;
    }
    const incoming = normalizeCatalog(body.catalog || body);
    if (!incoming) { json(res, 400, { ok: false, error: 'Invalid catalog' }); return; }
    incoming.projects = incoming.projects.map((p, i) => ({ ...p, sortOrder: i }));
    const { ok, redeployed, redeploySkipped, skipReason, error, storage, warning } = await saveCatalog(incoming, body.redeploy === true);
    json(res, ok ? 200 : 503, {
      ok,
      redeployed,
      redeploySkipped: redeploySkipped || undefined,
      skipReason: skipReason || undefined,
      storage,
      catalog: ok ? incoming : undefined,
      error: ok ? undefined : error,
      warning,
    });
    return;
  }

  json(res, 405, { ok: false, error: 'Method not allowed' });
}

export async function handleProjectById(req, res, id) {
  const catalog = await loadCatalog({ repair: true });
  const idx = catalog.projects.findIndex((p) => p.id === id);

  if (req.method === 'GET') {
    if (idx < 0) { json(res, 404, { ok: false, error: 'Not found' }); return; }
    json(res, 200, { ok: true, project: catalog.projects[idx] });
    return;
  }

  if (!requireAdmin(req, res)) return;

  if (req.method === 'PUT') {
    if (idx < 0) { json(res, 404, { ok: false, error: 'Not found' }); return; }
    let body;
    try { body = await readJsonBody(req, BODY_LIMIT); } catch (e) {
      json(res, 413, { ok: false, error: e.message === 'body too large' ? 'Request body too large' : 'Invalid JSON' });
      return;
    }
    const merged = normalizeProject({ ...catalog.projects[idx], ...(body.project || body), id });
    if (!merged) { json(res, 400, { ok: false, error: 'Invalid project' }); return; }
    catalog.projects[idx] = merged;
    const { ok, redeployed, error, warning } = await saveCatalog(catalog, body.redeploy === true);
    json(res, ok ? 200 : 503, { ok, redeployed, project: ok ? merged : undefined, error: ok ? undefined : error, warning });
    return;
  }

  if (req.method === 'DELETE') {
    if (idx < 0) { json(res, 404, { ok: false, error: 'Not found' }); return; }
    let body = {};
    try { body = await readJsonBody(req); } catch { body = {}; }
    catalog.projects.splice(idx, 1);
    catalog.projects.forEach((p, i) => { p.sortOrder = i; });
    const { ok, redeployed, error, warning } = await saveCatalog(catalog, body.redeploy === true);
    json(res, ok ? 200 : 503, { ok, redeployed, error: ok ? undefined : error, warning });
    return;
  }

  json(res, 405, { ok: false, error: 'Method not allowed' });
}

export async function handleProjectsSeed(req, res) {
  if (req.method !== 'POST') { json(res, 405, { ok: false, error: 'Method not allowed' }); return; }
  if (!requireAdmin(req, res)) return;
  let body = {};
  try { body = await readJsonBody(req); } catch { body = {}; }
  const catalog = buildDefaultCatalog();
  const { ok, redeployed, error, warning } = await saveCatalog(catalog, body.redeploy === true);
  json(res, ok ? 200 : 503, {
    ok,
    redeployed,
    count: catalog.projects.length,
    error: ok ? undefined : (error || 'Seed failed'),
    warning,
  });
}

export async function handleProjectsSyncDefault(req, res) {
  if (req.method !== 'POST') { json(res, 405, { ok: false, error: 'Method not allowed' }); return; }
  if (!requireAdmin(req, res)) return;
  let body = {};
  try { body = await readJsonBody(req); } catch { body = {}; }
  const current = (await getProjectsCatalogRaw()) || { version: 1, projects: [] };
  const { catalog, added, repaired } = mergeDefaultCatalogMissing(current);
  if (!added && !repaired) {
    json(res, 200, { ok: true, added: 0, repaired: 0, count: catalog.projects.length, redeployed: false });
    return;
  }
  const { ok, redeployed, error, warning } = await saveCatalog(catalog, body.redeploy === true);
  json(res, ok ? 200 : 503, {
    ok,
    added,
    repaired,
    count: catalog.projects.length,
    redeployed,
    error: ok ? undefined : (error || 'Sync failed'),
    warning,
  });
}

export async function handleProjectPoster(req, res, id) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    const buf = await getProjectPosterBuffer(id);
    if (!buf) {
      json(res, 404, { ok: false, error: 'Poster not found' });
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', String(buf.length));
      res.end();
      return;
    }
    res.end(buf);
    return;
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJsonBody(req, POSTER_BODY_LIMIT); } catch (e) {
      json(res, 413, { ok: false, error: e.message === 'body too large' ? 'Poster image too large' : 'Invalid JSON' });
      return;
    }
    const imageBase64 = body.imageBase64 || body.image || body.data;
    const saved = await saveProjectPosterBase64(id, imageBase64);
    if (!saved.ok) {
      json(res, 400, { ok: false, error: saved.error || 'Save failed' });
      return;
    }

    let catalog = await getProjectsCatalogRaw();
    if (!catalog || !Array.isArray(catalog.projects)) {
      catalog = normalizeCatalog(buildDefaultCatalog()) || buildDefaultCatalog();
    }
    const idx = catalog.projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      catalog.projects[idx].poster = saved.poster;
      catalog.projects[idx].href = projectHref(
        catalog.projects[idx].category,
        catalog.projects[idx].slug,
      );
      const catalogSaved = await saveProjectsCatalog(catalog);
      if (!catalogSaved.ok) {
        json(res, 503, {
          ok: false,
          error: `Poster stored but catalog update failed: ${catalogSaved.error}`,
          poster: saved.poster,
        });
        return;
      }
    }

    json(res, 200, {
      ok: true,
      poster: saved.poster,
      bytes: saved.bytes,
      catalogUpdated: idx >= 0,
    });
    return;
  }

  json(res, 405, { ok: false, error: 'Method not allowed' });
}

export async function handleProjectsRedisHealth(req, res) {
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;
  try {
    const result = await redisHealthCheck();
    json(res, result.ok ? 200 : 503, result);
  } catch (e) {
    json(res, 500, {
      ok: false,
      error: e && e.message ? e.message : 'Redis health check crashed',
    });
  }
}

export async function handleProjectsApi(req, res, urlPath) {
  if (urlPath === '/api/projects/seed') return handleProjectsSeed(req, res);
  if (urlPath === '/api/projects/sync-default') return handleProjectsSyncDefault(req, res);
  if (urlPath === '/api/projects/redis-health') return handleProjectsRedisHealth(req, res);
  if (urlPath === '/api/projects') return handleProjectsCollection(req, res);
  const posterMatch = urlPath.match(/^\/api\/project-poster\/([^/]+)$/);
  if (posterMatch) return handleProjectPoster(req, res, decodeURIComponent(posterMatch[1]));
  const legacyPosterMatch = urlPath.match(/^\/api\/projects\/poster\/([^/]+)$/);
  if (legacyPosterMatch) return handleProjectPoster(req, res, decodeURIComponent(legacyPosterMatch[1]));
  const m = urlPath.match(/^\/api\/projects\/([^/]+)$/);
  if (m) return handleProjectById(req, res, decodeURIComponent(m[1]));
  return false;
}
