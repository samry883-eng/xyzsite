/** Canonical public URL paths (short URLs). Physical files may live under /capabilities/ or /work/{category}/. */

export const WORK_LIST = '/work/';
export const DECK_HUB = '/deck/';
export const DECK_SOUND = '/deck/sound/';
export const DECK_POST = '/deck/postproduction/';
export const DECK_LOGIN = '/deck/login';
export const DECK_NDA = '/deck/nda';

export const WORK_CATEGORIES = ['visual-effects', 'sound', 'ai', 'making-of'];

export const WORK_RESERVED_SEGMENTS = new Set([
  'admin',
  'assets',
  'unified',
  'archive',
  'project',
  'index.html',
]);

/** Public project page URL — slug is globally unique in the catalog. */
export function projectPublicHref(slug) {
  const s = String(slug || '').trim();
  return s ? `/work/${s}/` : WORK_LIST;
}

export function isDeckPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return p === '/deck' || p.startsWith('/deck/') || p.startsWith('/capabilities');
}

export function isDeckAuthExemptPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return (
    p === '/deck/login' ||
    p === '/deck/login/' ||
    p === '/deck/login.html' ||
    p === '/capabilities/login' ||
    p === '/capabilities/login/' ||
    p === '/capabilities/login.html' ||
    p === '/capabilities/admin' ||
    p === '/capabilities/admin/' ||
    p === '/capabilities/admin.html'
  );
}

export function isDeckNdaExemptPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return (
    isDeckAuthExemptPath(p) ||
    p === '/deck/nda' ||
    p === '/deck/nda/' ||
    p === '/deck/nda.html' ||
    p === '/capabilities/nda' ||
    p === '/capabilities/nda/' ||
    p === '/capabilities/nda.html'
  );
}

/** Deck HTML pages load behind the NDA modal; assets must load for the deck to render. */
export function isDeckNdaDeferredPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return (
    p === '/deck/' ||
    p === '/deck/index.html' ||
    p === '/capabilities/' ||
    p === '/capabilities/index.html' ||
    p.startsWith('/deck/sound') ||
    p.startsWith('/capabilities/sound') ||
    p.startsWith('/deck/postproduction') ||
    p.startsWith('/capabilities/vfx') ||
    p.startsWith('/capabilities/assets/') ||
    p.startsWith('/deck/assets/')
  );
}

export function isSoundDeckPagePath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return (
    p === '/deck/sound' ||
    p === '/deck/sound/' ||
    p === '/deck/sound/index.html' ||
    p === '/capabilities/sound' ||
    p === '/capabilities/sound/' ||
    p === '/capabilities/sound/index.html'
  );
}

export function isSoundDeckEntryPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return p === '/sound-deck' || p === '/sound-deck/';
}

export function isDeckHubPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return (
    p === '/deck/' ||
    p === '/deck/index.html' ||
    p === '/capabilities/' ||
    p === '/capabilities/index.html'
  );
}

export function isDeckPostPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return p.startsWith('/deck/postproduction') || p.startsWith('/capabilities/vfx');
}

/** Paths a SOUND_DECK_SHARE_TOKEN session may access (sound deck + its assets only). */
export function isSoundDeckShareAllowedPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  if (isSoundDeckPagePath(p) || isSoundDeckEntryPath(p)) return true;
  if (p.startsWith('/capabilities/sound/') || p.startsWith('/deck/sound/')) return true;
  if (p.startsWith('/capabilities/assets/') || p.startsWith('/deck/assets/')) return true;
  return false;
}

/** Map legacy /capabilities/* next= targets to /deck/* (open redirect). */
export function mapLegacyDeckPath(urlPath) {
  const p = String(urlPath || '');
  if (!p.startsWith('/capabilities')) return p;
  if (p === '/capabilities' || p === '/capabilities/') return DECK_HUB;
  if (p.startsWith('/capabilities/sound')) return '/deck/sound' + p.slice('/capabilities/sound'.length);
  if (p.startsWith('/capabilities/vfx')) return '/deck/postproduction' + p.slice('/capabilities/vfx'.length);
  if (p.startsWith('/capabilities/login')) return '/deck/login' + p.slice('/capabilities/login'.length);
  if (p.startsWith('/capabilities/nda')) return '/deck/nda' + p.slice('/capabilities/nda'.length);
  if (p.startsWith('/capabilities/assets')) return p;
  return DECK_HUB;
}

export function safeDeckNext(nextRaw) {
  if (!nextRaw || typeof nextRaw !== 'string') return DECK_HUB;
  const n = nextRaw.trim();
  if (!n.startsWith('/') || n.includes('//') || n.includes('\\')) return DECK_HUB;
  if (n.startsWith('/deck')) return n === '/deck' ? DECK_HUB : n;
  if (n.startsWith('/capabilities')) return mapLegacyDeckPath(n);
  return DECK_HUB;
}
