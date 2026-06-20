import {
  getProjectsCatalog,
  setProjectsCatalog,
  normalizeCatalog,
  normalizeProject,
  sortProjects,
} from './projects-store.mjs';
import { buildDefaultCatalog } from './projects-default-catalog.mjs';
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

async function loadCatalog() {
  const raw = await getProjectsCatalog();
  const normalized = normalizeCatalog(raw);
  if (normalized) return normalized;
  return buildDefaultCatalog();
}

async function saveCatalog(catalog, redeploy = false) {
  const ok = await setProjectsCatalog(catalog);
  let redeployed = false;
  if (ok && redeploy) redeployed = await triggerProductionRedeploy();
  return { ok, redeployed };
}

export async function handleProjectsCollection(req, res) {
  if (req.method === 'GET') {
    const catalog = await loadCatalog();
    json(res, 200, { ok: true, catalog: { version: catalog.version, projects: sortProjects(catalog.projects) } });
    return;
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJsonBody(req); } catch { json(res, 400, { ok: false, error: 'Invalid JSON' }); return; }
    const catalog = await loadCatalog();
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
    if (!project.href) project.href = '/work/' + project.category + '/' + project.slug + '/';
    project.sortOrder = catalog.projects.length;
    catalog.projects.push(project);
    const { ok, redeployed } = await saveCatalog(catalog, body.redeploy !== false);
    json(res, ok ? 200 : 503, { ok, redeployed, catalog: ok ? catalog : undefined, error: ok ? undefined : 'Save failed' });
    return;
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJsonBody(req); } catch { json(res, 400, { ok: false, error: 'Invalid JSON' }); return; }
    const incoming = normalizeCatalog(body.catalog || body);
    if (!incoming) { json(res, 400, { ok: false, error: 'Invalid catalog' }); return; }
    incoming.projects = incoming.projects.map((p, i) => ({ ...p, sortOrder: i }));
    const { ok, redeployed } = await saveCatalog(incoming, body.redeploy !== false);
    json(res, ok ? 200 : 503, { ok, redeployed, catalog: ok ? incoming : undefined, error: ok ? undefined : 'Save failed' });
    return;
  }

  json(res, 405, { ok: false, error: 'Method not allowed' });
}

export async function handleProjectById(req, res, id) {
  const catalog = await loadCatalog();
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
    try { body = await readJsonBody(req); } catch { json(res, 400, { ok: false, error: 'Invalid JSON' }); return; }
    const merged = normalizeProject({ ...catalog.projects[idx], ...(body.project || body), id });
    if (!merged) { json(res, 400, { ok: false, error: 'Invalid project' }); return; }
    catalog.projects[idx] = merged;
    const { ok, redeployed } = await saveCatalog(catalog, body.redeploy !== false);
    json(res, ok ? 200 : 503, { ok, redeployed, project: ok ? merged : undefined, error: ok ? undefined : 'Save failed' });
    return;
  }

  if (req.method === 'DELETE') {
    if (idx < 0) { json(res, 404, { ok: false, error: 'Not found' }); return; }
    let body = {};
    try { body = await readJsonBody(req); } catch { body = {}; }
    catalog.projects.splice(idx, 1);
    catalog.projects.forEach((p, i) => { p.sortOrder = i; });
    const { ok, redeployed } = await saveCatalog(catalog, body.redeploy !== false);
    json(res, ok ? 200 : 503, { ok, redeployed, error: ok ? undefined : 'Save failed' });
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
  const { ok, redeployed } = await saveCatalog(catalog, body.redeploy === true);
  json(res, ok ? 200 : 503, {
    ok,
    redeployed,
    count: catalog.projects.length,
    error: ok ? undefined : 'Seed failed (Edge Config not configured?)',
  });
}

export async function handleProjectsApi(req, res, urlPath) {
  if (urlPath === '/api/projects/seed') return handleProjectsSeed(req, res);
  if (urlPath === '/api/projects') return handleProjectsCollection(req, res);
  const m = urlPath.match(/^\/api\/projects\/([^/]+)$/);
  if (m) return handleProjectById(req, res, decodeURIComponent(m[1]));
  return false;
}
