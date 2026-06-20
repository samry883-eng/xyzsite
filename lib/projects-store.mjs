import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getKey, setKey, ecWritable } from './site-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'projects-catalog.json');

export const CATALOG_KEY = 'projectsCatalog';

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
  const fromEc = await getKey(CATALOG_KEY);
  if (fromEc) return fromEc;
  return readLocalCatalog();
}

/** @returns {{ ok: boolean, error?: string, storage?: 'edge-config'|'file' }} */
export async function saveProjectsCatalog(catalog) {
  if (ecWritable()) {
    const ok = await setKey(CATALOG_KEY, catalog);
    if (ok) return { ok: true, storage: 'edge-config' };
    return {
      ok: false,
      error: 'Edge Config write failed — check VERCEL_API_TOKEN and EDGE_CONFIG_ID on Vercel',
    };
  }
  if (!process.env.VERCEL) {
    try {
      writeLocalCatalog(catalog);
      return { ok: true, storage: 'file' };
    } catch (e) {
      return { ok: false, error: e.message || 'Local catalog write failed' };
    }
  }
  return {
    ok: false,
    error:
      'Edge Config write not configured — set VERCEL_API_TOKEN and EDGE_CONFIG_ID (reads use EDGE_CONFIG_READ_TOKEN)',
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
