import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getKey, setKey, ecWritable } from './site-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'projects-catalog.json');

export const CATALOG_KEY = 'projectsCatalog';
/** Same key as capabilities grants — Upstash on Vercel (catalog is ~22KB; Edge Config Hobby store is 8KB). */
const REDIS_KEY = 'projects_catalog_json';

let redisClient;
let redisDead = false;

function redisEnv() {
  const url = String(
    process.env.CAPABILITIES_UPSTASH_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      ''
  ).trim();
  const token = String(
    process.env.CAPABILITIES_UPSTASH_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      ''
  ).trim();
  return { url, token };
}

async function getRedis() {
  if (redisDead) return null;
  if (redisClient) return redisClient;
  const { url, token } = redisEnv();
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (e) {
    console.error('[projects-store] Redis init failed:', e && e.message);
    return null;
  }
}

function parseCatalog(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data && Array.isArray(data.projects) && data.projects.length) return data;
  } catch (e) {
    console.error('[projects-store] catalog parse failed:', e && e.message);
  }
  return null;
}

export const PROJECT_CATEGORIES = ['visual-effects', 'sound', 'ai', 'making-of'];
export const PROJECT_TYPES = ['Commercial', 'Music Video', 'Brand Film'];
export const SERVICE_OPTIONS = [
  'Creative Direction',
  'Visual Effects',
  'CGI',
  'AI',
  'Compositing',
  'Clean Up & Beauty',
  'Sound Design',
  'Mixing & Mastering',
  'Compose',
];

const CAT_LABEL = {
  'visual-effects': 'Visual Effects',
  sound: 'Sound',
  ai: 'AI',
  'making-of': 'Making Of',
};

export function categoryLabel(slug) {
  return CAT_LABEL[slug] || slug;
}

export function categorySlug(label) {
  const map = {
    'Visual Effects': 'visual-effects',
    Sound: 'sound',
    AI: 'ai',
    'Making Of': 'making-of',
  };
  return map[label] || String(label || '').toLowerCase().replace(/\s+/g, '-');
}

function readLocalCatalog() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeLocalCatalog(catalog) {
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
}

export async function getProjectsCatalog() {
  const r = await getRedis();
  if (r) {
    try {
      const fromRedis = parseCatalog(await r.get(REDIS_KEY));
      if (fromRedis) return fromRedis;
    } catch (e) {
      console.error('[projects-store] Redis read failed:', e && e.message);
      redisDead = true;
      redisClient = undefined;
    }
  }
  const fromEc = parseCatalog(await getKey(CATALOG_KEY));
  if (fromEc) return fromEc;
  return readLocalCatalog();
}

/** @returns {{ ok: boolean, error?: string, storage?: 'redis'|'edge-config'|'file' }} */
export async function saveProjectsCatalog(catalog) {
  const r = await getRedis();
  if (r) {
    try {
      await r.set(REDIS_KEY, JSON.stringify(catalog));
      return { ok: true, storage: 'redis' };
    } catch (e) {
      console.error('[projects-store] Redis write failed:', e && e.message);
      return {
        ok: false,
        error: 'Redis write failed — check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN on Vercel',
      };
    }
  }
  if (!process.env.VERCEL) {
    try {
      writeLocalCatalog(catalog);
      return { ok: true, storage: 'file' };
    } catch (e) {
      return { ok: false, error: e.message || 'Local catalog write failed' };
    }
  }
  // Legacy fallback: tiny catalogs only (workOrder already uses ~7KB of the 8KB Hobby Edge Config store).
  if (ecWritable()) {
    const bytes = JSON.stringify(catalog).length;
    if (bytes > 1500) {
      return {
        ok: false,
        error:
          'Projects catalog is too large for Edge Config on this plan (~8KB store; workOrder uses most of it). UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN must be set on Vercel.',
      };
    }
    const ok = await setKey(CATALOG_KEY, catalog);
    if (ok) return { ok: true, storage: 'edge-config' };
    return {
      ok: false,
      error: 'Edge Config write failed — check VERCEL_API_TOKEN, EDGE_CONFIG_ID, and store size limits',
    };
  }
  return {
    ok: false,
    error:
      'Catalog storage not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on Vercel (or VERCEL_API_TOKEN + EDGE_CONFIG_ID for tiny catalogs only)',
  };
}

export async function setProjectsCatalog(catalog) {
  const r = await saveProjectsCatalog(catalog);
  return r.ok;
}

export function normalizeCatalog(raw) {
  if (!raw || !Array.isArray(raw.projects)) return null;
  return {
    version: raw.version || 1,
    projects: raw.projects.map(normalizeProject).filter(Boolean),
  };
}

export function normalizeProject(p) {
  if (!p || !p.id) return null;
  const category = PROJECT_CATEGORIES.includes(p.category) ? p.category : categorySlug(p.category);
  const projectType = PROJECT_TYPES.includes(p.projectType) ? p.projectType : 'Commercial';
  const services = Array.isArray(p.services)
    ? p.services.filter((s) => SERVICE_OPTIONS.includes(s))
    : [];
  let credits = [];
  if (Array.isArray(p.credits)) {
    credits = p.credits
      .map((c) => ({ label: String(c.label || '').trim(), value: String(c.value || '').trim() }))
      .filter((c) => c.label && c.value);
  } else if (typeof p.credits === 'string' && p.credits.trim()) {
    credits = p.credits
      .split('\n')
      .map((line) => {
        const i = line.indexOf(':');
        if (i < 0) return null;
        return { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
      })
      .filter(Boolean);
  }
  return {
    id: String(p.id),
    slug: String(p.slug || '').trim(),
    category,
    title: String(p.title || '').trim(),
    client: String(p.client || '').trim(),
    href: String(p.href || '').trim(),
    video: String(p.video || '').trim(),
    poster: String(p.poster || '').trim(),
    credits,
    services,
    projectType,
    featured: !!p.featured,
    homeHero: p.homeHero && typeof p.homeHero === 'object'
      ? { start: Number(p.homeHero.start) || 0, enabled: !!p.homeHero.enabled }
      : { start: 0, enabled: false },
    sortOrder: Number.isFinite(Number(p.sortOrder)) ? Number(p.sortOrder) : 0,
    clipStart: p.clipStart != null ? Number(p.clipStart) : undefined,
    clipEnd: p.clipEnd != null ? Number(p.clipEnd) : undefined,
  };
}

export function sortProjects(projects) {
  return projects.slice().sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });
}
