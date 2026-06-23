import './load-env-local.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  verifySession,
  createSession,
  verifyLogin,
  grantUpsert,
  grantUpsertMany,
  grantRevoke,
  grantList,
  canPersistGrants,
  buildSuggestedAllowedEmails,
  sessionCookieHeader,
  clearSessionCookieHeader,
  getCookieName,
  normalizeEmail,
  createAdminSession,
  adminSessionCookieHeader,
  clearAdminSessionCookieHeader,
  validateAdminPassword,
  getAdminSecretFromEnv,
  verifyNdaSession,
  createNdaSession,
  ndaSessionCookieHeader,
  getNdaCookieName,
  clearNdaSessionCookieHeader,
  ndaRecordGet,
  ndaRecordUpsert,
  ndaRecordRevoke,
  ndaRecordList,
  sessionSecret as capSessionSecret,
} from './lib/capabilities-auth.mjs';
import { isAdminAuthorized } from './lib/capabilities-admin-guard.mjs';
import { getAllowlistSnapshot } from './lib/capabilities-allowlist.mjs';
import { handleProjectsApi } from './lib/projects-api-handlers.mjs';
import { handleCapabilitiesApi } from './lib/capabilities-api-vercel.mjs';
import { getWorkOrderResolved, setWorkOrder } from './lib/site-store.mjs';
import { triggerProductionRedeploy } from './lib/vercel-redeploy.mjs';
import { fetchProjectsCatalog, injectProjectsCatalog } from './scripts/projects-catalog-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORK_UNIFIED_HTML = path.join(__dirname, 'Work', 'unified', 'index.html');

let devCatalogCache = null;
let devCatalogCacheAt = 0;
const DEV_CATALOG_TTL_MS = 30_000;

async function getDevProjectsCatalog() {
  if (devCatalogCache && Date.now() - devCatalogCacheAt < DEV_CATALOG_TTL_MS) {
    return devCatalogCache;
  }
  devCatalogCache = await fetchProjectsCatalog(__dirname);
  devCatalogCacheAt = Date.now();
  return devCatalogCache;
}

function isWorkUnifiedHtml(filePath) {
  return path.resolve(filePath) === path.resolve(WORK_UNIFIED_HTML);
}
const PORT = Number(process.env.PORT) || 2001;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.json': 'application/json', '.avif': 'image/avif',
  '.pdf': 'application/pdf',
};

const HOME = path.join(__dirname, 'Home');
const WORK = path.join(__dirname, 'Work');
const CONTACT = path.join(__dirname, 'Contact');

const COOKIE = getCookieName();
const NDA_COOKIE = getNdaCookieName();

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function authDisabled() {
  return ['1', 'true', 'yes'].includes(String(process.env.CAPABILITIES_AUTH_DISABLED || '').toLowerCase());
}

function ndaDisabled() {
  return ['1', 'true', 'yes'].includes(String(process.env.CAPABILITIES_NDA_DISABLED || '').toLowerCase());
}

function isNdaExemptPath(urlPath) {
  const p = urlPath.toLowerCase();
  return (
    p === '/capabilities/login' ||
    p === '/capabilities/login/' ||
    p === '/capabilities/login.html' ||
    p === '/capabilities/admin' ||
    p === '/capabilities/admin/' ||
    p === '/capabilities/admin.html' ||
    p === '/capabilities/nda' ||
    p === '/capabilities/nda/' ||
    p === '/capabilities/nda.html'
  );
}

function isNdaDeferredPath(urlPath) {
  const p = urlPath.toLowerCase();
  return (
    p === '/capabilities/' ||
    p === '/capabilities/index.html' ||
    p.startsWith('/capabilities/sound') ||
    p.startsWith('/capabilities/vfx') ||
    p.startsWith('/capabilities/assets/')
  );
}

function capabilitiesProtectHeaders(ext) {
  const h = {
    'Cache-Control': 'no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  };
  if (ext === '.html') {
    h['X-Frame-Options'] = 'DENY';
  }
  return h;
}

function sessionSecret() {
  return capSessionSecret();
}

function secureCookies() {
  return process.env.CAPABILITIES_SECURE_COOKIES === '1' || process.env.NODE_ENV === 'production';
}

function requiresCapabilitiesGate(urlPath) {
  const p = urlPath.toLowerCase();
  if (!p.startsWith('/capabilities')) return false;
  if (p === '/capabilities/login' || p === '/capabilities/login/' || p === '/capabilities/login.html') return false;
  if (p === '/capabilities/admin' || p === '/capabilities/admin/' || p === '/capabilities/admin.html') return false;
  return true;
}

function safeNext(nextRaw) {
  if (!nextRaw || typeof nextRaw !== 'string') return '/capabilities/';
  const n = nextRaw.trim();
  if (!n.startsWith('/capabilities') || n.includes('//') || n.includes('\\')) return '/capabilities/';
  return n;
}

function readBody(req, limit = 65536) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function handleSiteOrderApi(req, res) {
  const sec = sessionSecret();
  if (req.method === 'GET') {
    const order = await getWorkOrderResolved();
    return json(res, 200, { ok: true, order: order || null });
  }
  if (req.method === 'POST') {
    if (!isAdminAuthorized(req, null, sec)) return json(res, 401, { ok: false, error: 'Unauthorized' });
    let body;
    try {
      body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    } catch {
      return json(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const ok = await setWorkOrder(body.order || {});
    const redeployed = ok ? await triggerProductionRedeploy() : false;
    return json(res, ok ? 200 : 503, { ok, redeployed, error: ok ? undefined : 'Save failed' });
  }
  return json(res, 405, { ok: false, error: 'Method not allowed' });
}

function getStaticFilePath(urlPath) {
  let p = urlPath;
  if (p === '/') p = '/index.html';

  let filePath;
  if (p === '/index.html') {
    filePath = path.join(HOME, 'index.html');
  } else if (p.startsWith('/assets/')) {
    filePath = path.join(HOME, p);
  } else if (
    p === '/work' ||
    p === '/work/' ||
    p === '/work/index.html' ||
    p === '/projects-v2' ||
    p === '/projects-v2/' ||
    p === '/projects-v2/index.html'
  ) {
    filePath = path.join(WORK, 'unified', 'index.html');
  } else if (p === '/contact-versions' || p === '/contact-versions/') {
    filePath = path.join(CONTACT, 'versions.html');
  } else if (p === '/contact-versions-2' || p === '/contact-versions-2/') {
    filePath = path.join(CONTACT, 'versions2.html');
  } else if (p === '/contact' || p === '/contact/' || p === '/contact.html') {
    filePath = path.join(CONTACT, 'index.html');
  } else if (p === '/services' || p === '/services/') {
    filePath = path.join(__dirname, 'Services', 'index.html');
  } else if (/^\/capabilities\/assets\//i.test(p)) {
    const sub = p.replace(/^\/capabilities\/assets\//i, '');
    filePath = path.join(__dirname, 'Capabilities', 'assets', sub);
  } else if (
    p === '/capabilities/legacy' ||
    p === '/capabilities/legacy/' ||
    p === '/capabilities/legacy.html'
  ) {
    filePath = path.join(__dirname, 'Capabilities', 'deck-legacy.html');
  } else if (
    p === '/capabilities/pitch' ||
    p === '/capabilities/pitch/' ||
    p === '/capabilities/pitch.html'
  ) {
    filePath = path.join(__dirname, 'Capabilities', 'pitch.html');
  } else if (
    p === '/capabilities/deck' ||
    p === '/capabilities/deck/' ||
    p === '/capabilities/deck.html'
  ) {
    filePath = path.join(__dirname, 'Capabilities', 'deck-legacy.html');
  } else if (p === '/capabilities/vfx' || p === '/capabilities/vfx/') {
    filePath = path.join(__dirname, 'Capabilities', 'vfx', 'index.html');
  } else if (p === '/capabilities/sound' || p === '/capabilities/sound/') {
    filePath = path.join(__dirname, 'Capabilities', 'sound', 'index.html');
  } else if (/^\/capabilities\/sound\/scripts\//i.test(p)) {
    const sub = p.replace(/^\/capabilities\/sound\/scripts\//i, '');
    filePath = path.join(__dirname, 'Capabilities', 'sound', 'scripts', sub);
  } else if (p === '/capabilities/login' || p === '/capabilities/login/' || p === '/capabilities/login.html') {
    filePath = path.join(__dirname, 'Capabilities', 'login.html');
  } else if (p === '/capabilities/nda' || p === '/capabilities/nda/' || p === '/capabilities/nda.html') {
    filePath = path.join(__dirname, 'Capabilities', 'nda.html');
  } else if (p === '/work/admin' || p === '/work/admin/' || p === '/work/admin.html') {
    filePath = path.join(WORK, 'admin.html');
  } else if (p === '/admin' || p === '/admin/' || p === '/admin.html') {
    filePath = path.join(__dirname, 'Admin', 'index.html');
  } else if (p === '/capabilities' || p === '/capabilities/' || p === '/Capabilities' || p === '/Capabilities/') {
    filePath = path.join(__dirname, 'Capabilities', 'index.html');
  } else if (p === '/project' || p === '/project/') {
    filePath = path.join(WORK, 'project', 'index.html');
  } else if (p.startsWith('/work/') && p.length > '/work/'.length) {
    const sub = p.slice('/work/'.length);
    filePath = path.join(WORK, sub);
    if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
  } else {
    filePath = path.join(__dirname, p);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isPitchEmbedAsset = ext === '' && /[/\\]pitch-embed[/\\]/i.test(filePath);
  return { filePath, ext, isPitchEmbedAsset };
}

async function sendFile(res, { filePath, ext, isPitchEmbedAsset }, urlPath = '') {
  let data;
  try {
    data = await fs.promises.readFile(filePath);
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (ext === '.html' && isWorkUnifiedHtml(filePath)) {
    try {
      const catalog = await getDevProjectsCatalog();
      const injected = injectProjectsCatalog(data.toString('utf8'), catalog);
      if (injected) data = Buffer.from(injected, 'utf8');
    } catch (e) {
      console.warn('[projects-catalog] dev inject failed:', e && e.message);
    }
  }

  const type = MIME[ext] || (isPitchEmbedAsset ? 'image/avif' : 'application/octet-stream');
  const headers = { 'Content-Type': type };
  if (urlPath.toLowerCase().startsWith('/capabilities')) {
    Object.assign(headers, capabilitiesProtectHeaders(ext));
  }
  res.writeHead(200, headers);
  res.end(data);
}

http.createServer((req, res) => {
  (async () => {
    try {
      const rawUrl = req.url.split('?')[0];
      const urlPath = decodeURIComponent(rawUrl);

      if (!process.env.CAPABILITIES_SESSION_SECRET) {
        // once per process
        if (!globalThis.__capWarn) {
          globalThis.__capWarn = true;
          console.warn('[capabilities] Set CAPABILITIES_SESSION_SECRET for production sessions');
        }
      }

      if (urlPath.startsWith('/api/capabilities/')) {
        await handleCapabilitiesApi(req, res, urlPath);
        return;
      }

      if (urlPath.startsWith('/api/projects')) {
        await handleProjectsApi(req, res, urlPath);
        return;
      }

      if (urlPath === '/api/site-order') {
        await handleSiteOrderApi(req, res);
        return;
      }

      if (!authDisabled() && requiresCapabilitiesGate(urlPath)) {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[COOKIE];
        const email = verifySession(token, sessionSecret());
        if (!email) {
          if (req.method === 'GET' || req.method === 'HEAD') {
            const next = encodeURIComponent(urlPath);
            res.writeHead(302, { Location: `/capabilities/login?next=${next}` });
            res.end();
            return;
          }
          res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Unauthorized');
          return;
        }
        if (!ndaDisabled() && !isNdaExemptPath(urlPath) && !isNdaDeferredPath(urlPath)) {
          const record = await ndaRecordGet(email);
          const ndaToken = cookies[NDA_COOKIE];
          const nda = record || verifyNdaSession(ndaToken, sessionSecret(), email);
          if (!nda) {
            if (req.method === 'GET' || req.method === 'HEAD') {
              const next = encodeURIComponent(urlPath);
              res.writeHead(302, { Location: `/capabilities/nda?next=${next}` });
              res.end();
              return;
            }
            res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('NDA required');
            return;
          }
        }
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
        return;
      }

      if (urlPath === '/capabilities' || urlPath === '/Capabilities') {
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        res.writeHead(308, { Location: `/capabilities/${qs}` });
        res.end();
        return;
      }

      const legacyWorkRedirects = new Set([
        '/work.html',
        '/projects',
        '/projects/',
        '/projects/index.html',
        '/projects-v2',
        '/projects-v2/',
        '/projects-v2/index.html',
        '/projects-v3',
        '/projects-v3/',
        '/Work',
        '/Work/',
      ]);
      if (legacyWorkRedirects.has(urlPath)) {
        res.writeHead(308, { Location: '/work/' });
        res.end();
        return;
      }
      const adminLegacyRedirects = new Set([
        '/work/adminv2',
        '/work/adminv2/',
        '/work/adminv2.html',
        '/admin',
        '/admin/',
        '/admin.html',
        '/admin/index.html',
      ]);
      if (adminLegacyRedirects.has(urlPath)) {
        res.writeHead(302, { Location: '/work/admin' });
        res.end();
        return;
      }
      const capabilitiesAdminRedirects = new Set([
        '/capabilities/admin',
        '/capabilities/admin/',
        '/capabilities/admin.html',
      ]);
      if (capabilitiesAdminRedirects.has(urlPath)) {
        res.writeHead(302, { Location: '/work/admin?tab=access' });
        res.end();
        return;
      }

      const spec = getStaticFilePath(urlPath);
      if (req.method === 'HEAD') {
        fs.stat(spec.filePath, (err) => {
          if (err) {
            res.writeHead(404);
            res.end();
            return;
          }
          const type = MIME[spec.ext] || (spec.isPitchEmbedAsset ? 'image/avif' : 'application/octet-stream');
          const headers = { 'Content-Type': type };
          if (urlPath.toLowerCase().startsWith('/capabilities')) {
            Object.assign(headers, capabilitiesProtectHeaders(spec.ext));
          }
          res.writeHead(200, headers);
          res.end();
        });
        return;
      }

      await sendFile(res, spec, urlPath);
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
  })();
}).listen(PORT, () => console.log(`Serving http://localhost:${PORT}`));
