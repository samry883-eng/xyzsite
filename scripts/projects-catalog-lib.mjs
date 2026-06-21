import fs from 'fs';
import path from 'path';
import { buildDefaultCatalog, mergeDefaultCatalogMissing } from '../lib/projects-default-catalog.mjs';
import { normalizeCatalog, sortServices } from '../lib/projects-store.mjs';
import { redisConfigured, redisGet } from '../lib/upstash-redis.mjs';

const REDIS_KEY = 'projects_catalog_json';

function parseCatalogPayload(raw) {
  if (raw == null) return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data && Array.isArray(data.projects) && data.projects.length) return data;
  } catch {}
  return null;
}

async function fetchCatalogFromRedis() {
  if (!redisConfigured()) return null;
  try {
    const result = await redisGet(REDIS_KEY);
    if (!result.ok || result.value == null) return null;
    return parseCatalogPayload(result.value);
  } catch {}
  return null;
}

async function fetchCatalogFromApi() {
  try {
    const r = await fetch('https://www.xyzstudios.co/api/projects');
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.catalog;
  } catch {}
  return null;
}

async function fetchCatalogFromEdgeConfig() {
  const EC = process.env.EDGE_CONFIG_ID;
  const RT = process.env.EDGE_CONFIG_READ_TOKEN;
  if (!EC || !RT) return null;
  try {
    const r = await fetch(`https://edge-config.vercel.com/${EC}/item/projectsCatalog?token=${RT}`);
    if (!r.ok) return null;
    return parseCatalogPayload(await r.json());
  } catch {}
  return null;
}

export async function fetchProjectsCatalog(root) {
  let catalog = await fetchCatalogFromRedis();
  let source = catalog ? 'redis' : null;
  if (!catalog) {
    catalog = await fetchCatalogFromApi();
    if (catalog) source = 'api';
  }
  if (!catalog) {
    catalog = await fetchCatalogFromEdgeConfig();
    if (catalog) source = 'edge-config';
  }
  if (!catalog || !catalog.projects?.length) {
    catalog = buildDefaultCatalog();
    source = 'default';
  } else {
    const { catalog: merged, added, repaired } = mergeDefaultCatalogMissing(catalog);
    if (added || repaired) {
      catalog = merged;
      source = `${source || 'unknown'}+default-merge${repaired ? '+repair' : ''}`;
    }
  }
  catalog = normalizeCatalog(catalog, { applyDefaults: true }) || catalog;
  if (source) console.log('[projects-catalog] source:', source, 'count:', catalog.projects.length);
  return catalog;
}

export function injectProjectsCatalog(html, catalog) {
  const payload = JSON.stringify(catalog).replace(/</g, '\\u003c');
  const next = html.replace(
    /window\.__PROJECTS_CATALOG=[\s\S]*?;\/\*XYZ_BUILD_PROJECTS\*\//,
    'window.__PROJECTS_CATALOG=' + payload + ';/*XYZ_BUILD_PROJECTS*/',
  );
  return next === html ? null : next;
}

/** Slim mkey → services[] map for project preview pages. */
export function buildProjectsServicesMap(catalog) {
  const map = {};
  if (!catalog || !Array.isArray(catalog.projects)) return map;
  for (const p of catalog.projects) {
    if (!p.category || !p.slug || !Array.isArray(p.services) || !p.services.length) continue;
    map[`${p.category}/${p.slug}`] = sortServices(p.services);
  }
  return map;
}

export async function writeProjectsServicesMap(root, catalog) {
  const out = path.join(root, 'Work', 'assets', 'projects-services.json');
  const map = buildProjectsServicesMap(catalog);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(map), 'utf8');
  return { path: out, count: Object.keys(map).length };
}

export async function injectProjectsCatalogFile(filePath, root) {
  const catalog = await fetchProjectsCatalog(root);
  let html = fs.readFileSync(filePath, 'utf8');
  const next = injectProjectsCatalog(html, catalog);
  if (!next) return { ok: false, count: 0 };
  fs.writeFileSync(filePath, next);
  return { ok: true, count: catalog.projects.length };
}
