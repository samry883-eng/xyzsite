import fs from 'fs';
import path from 'path';
import { buildDefaultCatalog } from '../lib/projects-default-catalog.mjs';
import { redisConfigured, redisGet } from '../lib/upstash-redis.mjs';

const REDIS_KEY = 'projects_catalog_json';

async function fetchCatalogFromRedis() {
  if (!redisConfigured()) return null;
  try {
    const raw = await redisGet(REDIS_KEY);
    if (!raw) return null;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data && Array.isArray(data.projects) && data.projects.length) return data;
  } catch {}
  return null;
}

export async function fetchProjectsCatalog(root) {
  let catalog = await fetchCatalogFromRedis();
  const EC = process.env.EDGE_CONFIG_ID;
  const RT = process.env.EDGE_CONFIG_READ_TOKEN;
  if (!catalog && EC && RT) {
    try {
      const r = await fetch(`https://edge-config.vercel.com/${EC}/item/projectsCatalog?token=${RT}`);
      if (r.ok) {
        const data = await r.json();
        if (data && Array.isArray(data.projects) && data.projects.length) catalog = data;
      }
    } catch {}
  }
  if (!catalog) {
    try {
      const r = await fetch('https://www.xyzstudios.co/api/projects');
      if (r.ok) {
        const j = await r.json();
        catalog = j && j.catalog;
      }
    } catch {}
  }
  if (!catalog || !catalog.projects?.length) catalog = buildDefaultCatalog();
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

export async function injectProjectsCatalogFile(filePath, root) {
  const catalog = await fetchProjectsCatalog(root);
  let html = fs.readFileSync(filePath, 'utf8');
  const next = injectProjectsCatalog(html, catalog);
  if (!next) return { ok: false, count: 0 };
  fs.writeFileSync(filePath, next);
  return { ok: true, count: catalog.projects.length };
}
