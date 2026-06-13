import { next } from '@vercel/edge';
import { verifySessionEdge, getCookieValue } from './lib/session-edge.mjs';

const COOKIE = 'xyz_capabilities';

export const config = {
  matcher: ['/capabilities', '/capabilities/:path*'],
};

function pass(p) {
  const isAsset =
    /\.(jpe?g|png|webp|avif|gif|svg|css|js|mjs|woff2?|ttf|otf|mp4|webm|ico)$/i.test(p) ||
    p.includes('/media/') ||
    p.includes('/assets/') ||
    p.includes('/scripts/') ||
    p.includes('/deck-media/');
  return isAsset
    ? next()
    : next({ headers: { 'cache-control': 'no-store, must-revalidate' } });
}

export default async function middleware(request) {
  const authOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_AUTH_DISABLED || '').toLowerCase()
  );
  const url = new URL(request.url);
  const p = url.pathname.toLowerCase();
  if (authOff) return pass(p);

  if (p === '/capabilities') {
    const dest = new URL('/capabilities/', request.url);
    dest.search = url.search;
    return Response.redirect(dest, 308);
  }
  if (
    p === '/capabilities/login' ||
    p === '/capabilities/login/' ||
    p === '/capabilities/login.html' ||
    p === '/capabilities/admin' ||
    p === '/capabilities/admin/' ||
    p === '/capabilities/admin.html'
  ) {
    return pass(p);
  }

  const secret =
    process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
  const cookieHeader = request.headers.get('cookie') || '';
  const token = getCookieValue(cookieHeader, COOKIE);
  const email = await verifySessionEdge(token, secret);
  if (email) return pass(p);

  const login = new URL('/capabilities/login', request.url);
  const nextPath = p === '/capabilities' ? '/capabilities/' : url.pathname;
  login.searchParams.set('next', nextPath + url.search);
  return Response.redirect(login, 302);
}
