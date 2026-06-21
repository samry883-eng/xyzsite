import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getKey } from './site-store.mjs';
import { getRedis, clearRedisClient, redisConfigured, redisConfigHelp } from './upstash-redis.mjs';
import { mergeDefaultCatalogMissing } from './projects-default-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'projects-catalog.json');

export const CATALOG_KEY = 'projectsCatalog';
const REDIS_KEY = 'projects_catalog_json';

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

/** Fixed display/storage order for project services (matches Work filter panel). */
export function sortServices(services) {
  if (!Array.isArray(services) || !services.length) return [];
  return services.slice().sort((a, b) => {
    const ia = SERVICE_OPTIONS.indexOf(a);
    const ib = SERVICE_OPTIONS.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}

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

function catalogBytes(catalog) {
  return Buffer.byteLength(JSON.stringify(catalog), 'utf8');
}

/** Same Redis write path as capabilities-auth saveStore(). Retries once on transient fetch errors. */
async function writeCatalogToRedis(catalog) {
  const payload = JSON.stringify(catalog);
  let lastError = 'Redis not configured';
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await getRedis();
    if (!r) return { ok: false, error: 'Redis not configured' };
    try {
      await r.set(REDIS_KEY, payload);
      return { ok: true };
    } catch (e) {
      lastError = e && e.message ? e.message : String(e);
      console.error('[projects-store] Redis write failed:', lastError);
      clearRedisClient();
      if (attempt === 0 && /fetch failed|ECONNRESET|ETIMEDOUT|abort/i.test(lastError)) continue;
      break;
    }
  }
  return { ok: false, error: lastError };
}

function withDefaultProjects(catalog) {
  if (!catalog) return catalog;
  const { catalog: merged } = mergeDefaultCatalogMissing(catalog);
  return merged;
}

function readCatalogFromStores() {
  const rPromise = getRedis().then(async (r) => {
    if (!r) return null;
    try {
      const raw = await r.get(REDIS_KEY);
      if (raw == null) return null;
      return parseCatalog(typeof raw === 'string' ? raw : JSON.stringify(raw));
    } catch (e) {
      console.error('[projects-store] Redis read failed, falling back:', e && e.message);
      return null;
    }
  });
  return rPromise.then(async (fromRedis) => {
    if (fromRedis) return fromRedis;
    const fromEc = parseCatalog(await getKey(CATALOG_KEY));
    if (fromEc) return fromEc;
    return readLocalCatalog();
  });
}

/** Stored catalog only — no default merge/repair (for sync/repair writes). */
export async function getProjectsCatalogRaw() {
  return readCatalogFromStores();
}

export async function getProjectsCatalog() {
  const catalog = await readCatalogFromStores();
  return withDefaultProjects(catalog);
}

/** @returns {{ ok: boolean, error?: string, storage?: 'redis'|'file' }} */
export async function saveProjectsCatalog(catalog) {
  const saved = await writeCatalogToRedis(catalog);
  if (saved.ok) return { ok: true, storage: 'redis' };
  if (process.env.VERCEL) {
    const kb = Math.round(catalogBytes(catalog) / 1024);
    const lead = redisConfigured()
      ? `Redis write failed for Work CMS catalog (~${kb}KB): ${saved.error}`
      : `Work CMS catalog (~${kb}KB) requires Redis on Vercel (too large for Edge Config). ${saved.error}`;
    return { ok: false, error: `${lead}. ${redisConfigHelp()}` };
  }
  try {
    writeLocalCatalog(catalog);
    return { ok: true, storage: 'file' };
  } catch (e) {
    return { ok: false, error: e.message || 'Local catalog write failed' };
  }
}

export async function setProjectsCatalog(catalog) {
  const r = await saveProjectsCatalog(catalog);
  return r.ok;
}

/** Resolve credits from credits[] array, legacy fields, or static-page defaults (matches generate-projects.mjs). */
export function resolveProjectCredits(p, { applyDefaults = false } = {}) {
  if (!p) return [];
  let rows = [];
  if (Array.isArray(p.credits) && p.credits.length) {
    rows = p.credits
      .map((c) => ({ label: String(c.label || '').trim(), value: String(c.value || '').trim() }))
      .filter((c) => c.label && c.value);
  } else if (typeof p.credits === 'string' && p.credits.trim()) {
    rows = p.credits
      .split('\n')
      .map((line) => {
        const i = line.indexOf(':');
        if (i < 0) return null;
        return { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
      })
      .filter(Boolean);
  }
  if (!rows.length) {
    if (p.director) rows.push({ label: 'Directed by', value: String(p.director).trim() });
    if (p.soundDesign) {
      rows.push({
        label: p.soundDesignMix ? 'Sound Design & Mix' : 'Sound Design',
        value: String(p.soundDesign).trim(),
      });
    }
    if (p.soundMixer) rows.push({ label: 'Sound Mixer', value: String(p.soundMixer).trim() });
    if (p.mix) rows.push({ label: 'Mix', value: String(p.mix).trim() });
    if (p.dialogueEdit) rows.push({ label: 'Dialogue Edit', value: String(p.dialogueEdit).trim() });
    if (p.agency) rows.push({ label: 'Agency', value: String(p.agency).trim() });
    if (p.production) {
      rows.push({ label: p.productionLabel || 'Produced by', value: String(p.production).trim() });
    }
  }
  if (!rows.length && applyDefaults) {
    rows.push({ label: 'Directed by', value: 'XYZ Studios' });
    rows.push({ label: 'Produced by', value: 'XYZ Studios' });
  }
  return rows;
}

export function normalizeCatalog(raw, opts = {}) {
  if (!raw || !Array.isArray(raw.projects)) return null;
  return {
    version: raw.version || 1,
    projects: raw.projects.map((p) => normalizeProject(p, opts)).filter(Boolean),
  };
}

function slugFromProject(p) {
  const slug = String(p.slug || '').trim();
  if (slug) return slug;
  const fromId = String(p.id || '').split('|')[0];
  return fromId.toLowerCase().replace(/[''`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function projectHref(category, slug) {
  return '/work/' + category + '/' + slug + '/';
}

export function normalizeProject(p, opts = {}) {
  if (!p || !p.id) return null;
  const category = PROJECT_CATEGORIES.includes(p.category) ? p.category : categorySlug(p.category);
  const slug = slugFromProject(p);
  const projectType = PROJECT_TYPES.includes(p.projectType) ? p.projectType : 'Commercial';
  const services = sortServices(
    Array.isArray(p.services) ? p.services.filter((s) => SERVICE_OPTIONS.includes(s)) : [],
  );
  const credits = resolveProjectCredits(p, opts);
  return {
    id: String(p.id),
    slug,
    category,
    title: String(p.title || '').trim(),
    client: String(p.client || '').trim(),
    href: projectHref(category, slug),
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
