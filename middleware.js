import { next, rewrite } from '@vercel/edge';
import {
  verifySessionEdge,
  verifyNdaSessionEdge,
  getCookieValue,
  verifyShareToken,
  createSoundDeckShareCookies,
  soundDeckShareSetCookieHeaders,
  isSoundDeckShareEmail,
} from './lib/session-edge.mjs';
import {
  DECK_HUB,
  DECK_LOGIN,
  DECK_NDA,
  DECK_SOUND,
  isDeckAuthExemptPath,
  isDeckNdaDeferredPath,
  isDeckNdaExemptPath,
  isDeckPath,
  isSoundDeckEntryPath,
  isSoundDeckPagePath,
  isSoundDeckShareAllowedPath,
  safeDeckNext,
} from './lib/site-routes.mjs';
import {
  WORK_CATEGORIES,
  WORK_RESERVED_SEGMENTS,
  WORK_SLUG_TO_CATEGORY,
} from './lib/work-slug-map.mjs';

const COOKIE = 'xyz_capabilities';
const NDA_COOKIE = 'xyz_capabilities_nda';
const SOUND_DECK_DEST = DECK_SOUND;
const WORK_RESERVED = new Set(WORK_RESERVED_SEGMENTS);

export const config = {
  matcher: [
    '/deck',
    '/deck/:path*',
    '/capabilities',
    '/capabilities/:path*',
    '/sound-deck',
    '/sound-deck/:path*',
    '/work/:path*',
  ],
};

const PROTECT_HEADERS = {
  'cache-control': 'no-store, must-revalidate',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'same-origin',
};

function isCapabilitiesAsset(p) {
  return (
    /\.(jpe?g|png|webp|avif|gif|svg|css|js|mjs|woff2?|ttf|otf|mp4|webm|ico)$/i.test(p) ||
    p.includes('/media/') ||
    p.includes('/assets/') ||
    p.includes('/scripts/') ||
    p.includes('/deck-media/')
  );
}

function pass(p, extraHeaders = {}) {
  const headers = isCapabilitiesAsset(p)
    ? { 'cache-control': 'no-store, must-revalidate', ...extraHeaders }
    : { ...PROTECT_HEADERS, ...extraHeaders };
  return next({ headers });
}

function secureCookies(url) {
  return url.protocol === 'https:';
}

function loginRedirect(request, nextPath) {
  const login = new URL(DECK_LOGIN, request.url);
  login.searchParams.set('next', safeDeckNext(nextPath));
  return Response.redirect(login, 302);
}

async function redirectWithShareCookies(request, url, secret) {
  const cookies = await createSoundDeckShareCookies(secret);
  if (!cookies) return null;
  const dest = new URL(SOUND_DECK_DEST, request.url);
  const headers = new Headers({
    location: dest.toString(),
    'cache-control': 'no-store',
  });
  for (const c of soundDeckShareSetCookieHeaders(cookies, secureCookies(url))) {
    headers.append('Set-Cookie', c);
  }
  return new Response(null, { status: 302, headers });
}

async function tryExchangeSoundShareToken(request, url, secret) {
  const shareToken = String(process.env.SOUND_DECK_SHARE_TOKEN || '').trim();
  if (!shareToken) return null;
  const access = url.searchParams.get('access') || '';
  if (!access || !verifyShareToken(access, shareToken)) return null;
  return redirectWithShareCookies(request, url, secret);
}

function handleWorkRoutes(request, url, p) {
  const parts = p.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'work' || parts.length < 2) return null;

  const seg1 = parts[1];
  if (WORK_RESERVED.has(seg1)) return null;

  if (parts.length >= 3 && WORK_CATEGORIES.includes(seg1)) {
    const slug = parts[2];
    const isProjectPage =
      parts.length === 3 || (parts.length === 4 && parts[3] === 'index.html');
    if (!isProjectPage) return null;
    const dest = new URL(`/work/${slug}/`, request.url);
    dest.search = url.search;
    return Response.redirect(dest, 301);
  }

  if (parts.length === 2) {
    const slug = seg1;
    const cat = WORK_SLUG_TO_CATEGORY[slug];
    if (!cat) return null;
    const dest = new URL(`/work/${cat}/${slug}/index.html`, request.url);
    dest.search = url.search;
    return rewrite(dest);
  }

  return null;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const p = url.pathname.toLowerCase();

  const workRoute = handleWorkRoutes(request, url, p);
  if (workRoute) return workRoute;

  if (!isDeckPath(p) && !p.startsWith('/sound-deck')) return next();

  const authOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_AUTH_DISABLED || '').toLowerCase(),
  );
  const ndaOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_NDA_DISABLED || '').toLowerCase(),
  );
  if (authOff) return pass(p);

  const secret =
    process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
  const cookieHeader = request.headers.get('cookie') || '';

  if (p === '/sound-deck') {
    const dest = new URL('/sound-deck/', request.url);
    dest.search = url.search;
    return Response.redirect(dest, 308);
  }

  if (isSoundDeckEntryPath(p)) {
    const exchanged = await tryExchangeSoundShareToken(request, url, secret);
    if (exchanged) return exchanged;

    const token = getCookieValue(cookieHeader, COOKIE);
    const email = await verifySessionEdge(token, secret);
    if (email) {
      return Response.redirect(new URL(SOUND_DECK_DEST, request.url), 302);
    }
    return loginRedirect(request, SOUND_DECK_DEST);
  }

  if (p === '/deck' || p === '/capabilities') {
    const dest = new URL(DECK_HUB, request.url);
    dest.search = url.search;
    return Response.redirect(dest, 308);
  }
  if (isDeckAuthExemptPath(p)) return pass(p);

  if (isSoundDeckPagePath(p)) {
    const exchanged = await tryExchangeSoundShareToken(request, url, secret);
    if (exchanged) return exchanged;
  }

  const token = getCookieValue(cookieHeader, COOKIE);
  const email = await verifySessionEdge(token, secret);
  if (!email) {
    const nextPath = p === '/deck' || p === '/capabilities' ? DECK_HUB : url.pathname;
    return loginRedirect(request, nextPath + url.search);
  }

  if (isSoundDeckShareEmail(email) && !isSoundDeckShareAllowedPath(p)) {
    return loginRedirect(request, url.pathname + url.search);
  }

  if (!ndaOff && !isDeckNdaExemptPath(p) && !isDeckNdaDeferredPath(p)) {
    const ndaToken = getCookieValue(cookieHeader, NDA_COOKIE);
    const nda = await verifyNdaSessionEdge(ndaToken, secret, email);
    if (!nda) {
      const ndaUrl = new URL(DECK_NDA, request.url);
      const nextPath = p === '/deck' || p === '/capabilities' ? DECK_HUB : url.pathname;
      ndaUrl.searchParams.set('next', safeDeckNext(nextPath + url.search));
      return Response.redirect(ndaUrl, 302);
    }
  }

  return pass(p);
}
