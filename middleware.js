import { next } from '@vercel/edge';
import {
  verifySessionEdge,
  verifyAdminSessionEdge,
  getCookieValue,
} from './lib/session-edge.mjs';

const COOKIE = 'xyz_capabilities';
const ADMIN_COOKIE = 'xyz_capabilities_admin';

export const config = {
  matcher: ['/capabilities', '/capabilities/:path*'],
};

export default async function middleware(request) {
  const authOff = ['1', 'true', 'yes'].includes(
    String(process.env.CAPABILITIES_AUTH_DISABLED || '').toLowerCase()
  );
  if (authOff) return next();

  const url = new URL(request.url);
  const p = url.pathname.toLowerCase();
  if (
    p === '/capabilities/login' ||
    p === '/capabilities/login/' ||
    p === '/capabilities/login.html' ||
    p === '/capabilities/admin' ||
    p === '/capabilities/admin/' ||
    p === '/capabilities/admin.html'
  ) {
    return next();
  }

  const secret =
    process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
  const cookieHeader = request.headers.get('cookie') || '';
  const token = getCookieValue(cookieHeader, COOKIE);
  const email = await verifySessionEdge(token, secret);
  if (email) return next();

  const adminTok = getCookieValue(cookieHeader, ADMIN_COOKIE);
  if (await verifyAdminSessionEdge(adminTok, secret)) return next();

  const login = new URL('/capabilities/login', request.url);
  login.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(login, 302);
}
