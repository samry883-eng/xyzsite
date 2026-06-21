import { next } from '@vercel/edge';
import { verifySessionEdge, verifyNdaSessionEdge, getCookieValue } from './lib/session-edge.mjs';

const COOKIE = 'xyz_capabilities';
const NDA_COOKIE = 'xyz_capabilities_nda';

export const config = {
  matcher: [
    '/capabilities',
    '/capabilities/:path*',
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

export default async function middleware(request) {
  const url = new URL(request.url);
  const p = url.pathname.toLowerCase();

  if (!p.startsWith('/capabilities')) return next();

  const authOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_AUTH_DISABLED || '').toLowerCase()
  );
  const ndaOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_NDA_DISABLED || '').toLowerCase()
  );
  if (authOff) return pass(p);

  if (p === '/capabilities') {
    const dest = new URL('/capabilities/', request.url);
    dest.search = url.search;
    return Response.redirect(dest, 308);
  }
  if (isAuthExemptPath(p)) return pass(p);

  const secret =
    process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
  const cookieHeader = request.headers.get('cookie') || '';
  const token = getCookieValue(cookieHeader, COOKIE);
  const email = await verifySessionEdge(token, secret);
  if (!email) {
    const login = new URL('/capabilities/login', request.url);
    const nextPath = p === '/capabilities' ? '/capabilities/' : url.pathname;
    login.searchParams.set('next', nextPath + url.search);
    return Response.redirect(login, 302);
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
