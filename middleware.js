import { next } from '@vercel/edge';
import {
  verifySessionEdge,
  verifyNdaSessionEdge,
  getCookieValue,
  verifyShareToken,
  createSoundDeckShareCookies,
  soundDeckShareSetCookieHeaders,
} from './lib/session-edge.mjs';

const COOKIE = 'xyz_capabilities';
const NDA_COOKIE = 'xyz_capabilities_nda';
const SOUND_DECK_DEST = '/capabilities/sound/';

export const config = {
  matcher: [
    '/capabilities',
    '/capabilities/:path*',
    '/sound-deck',
    '/sound-deck/:path*',
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

function isAuthExemptPath(p) {
  return (
    p === '/capabilities/login' ||
    p === '/capabilities/login/' ||
    p === '/capabilities/login.html' ||
    p === '/capabilities/admin' ||
    p === '/capabilities/admin/' ||
    p === '/capabilities/admin.html'
  );
}

function isNdaExemptPath(p) {
  return (
    isAuthExemptPath(p) ||
    p === '/capabilities/nda' ||
    p === '/capabilities/nda/' ||
    p === '/capabilities/nda.html'
  );
}

/** Deck pages load behind the NDA modal; assets must load for the deck to render. */
function isNdaDeferredPath(p) {
  return (
    p === '/capabilities/' ||
    p === '/capabilities/index.html' ||
    p.startsWith('/capabilities/sound') ||
    p.startsWith('/capabilities/vfx') ||
    p.startsWith('/capabilities/assets/')
  );
}

function isSoundDeckEntryPath(p) {
  return p === '/sound-deck' || p === '/sound-deck/';
}

function isSoundDeckPagePath(p) {
  return (
    p === '/capabilities/sound' ||
    p === '/capabilities/sound/' ||
    p === '/capabilities/sound/index.html'
  );
}

function secureCookies(url) {
  return url.protocol === 'https:';
}

function loginRedirect(request, nextPath) {
  const login = new URL('/capabilities/login', request.url);
  login.searchParams.set('next', nextPath);
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

export default async function middleware(request) {
  const url = new URL(request.url);
  const p = url.pathname.toLowerCase();

  if (!p.startsWith('/capabilities') && !p.startsWith('/sound-deck')) return next();

  const authOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_AUTH_DISABLED || '').toLowerCase()
  );
  const ndaOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_NDA_DISABLED || '').toLowerCase()
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

  if (p === '/capabilities') {
    const dest = new URL('/capabilities/', request.url);
    dest.search = url.search;
    return Response.redirect(dest, 308);
  }
  if (isAuthExemptPath(p)) return pass(p);

  if (isSoundDeckPagePath(p)) {
    const exchanged = await tryExchangeSoundShareToken(request, url, secret);
    if (exchanged) return exchanged;
  }

  const token = getCookieValue(cookieHeader, COOKIE);
  const email = await verifySessionEdge(token, secret);
  if (!email) {
    const nextPath = p === '/capabilities' ? '/capabilities/' : url.pathname;
    return loginRedirect(request, nextPath + url.search);
  }

  if (!ndaOff && !isNdaExemptPath(p) && !isNdaDeferredPath(p)) {
    const ndaToken = getCookieValue(cookieHeader, NDA_COOKIE);
    const nda = await verifyNdaSessionEdge(ndaToken, secret, email);
    if (!nda) {
      const ndaUrl = new URL('/capabilities/nda', request.url);
      const nextPath = p === '/capabilities' ? '/capabilities/' : url.pathname;
      ndaUrl.searchParams.set('next', nextPath + url.search);
      return Response.redirect(ndaUrl, 302);
    }
  }

  return pass(p);
}
