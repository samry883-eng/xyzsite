import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, '..', 'data', 'capabilities-grants.json');

const scryptAsync = promisify(crypto.scrypt);

const COOKIE_NAME = 'xyz_capabilities';
const ADMIN_COOKIE_NAME = 'xyz_capabilities_admin';
const SESSION_DAYS = 7;
const ADMIN_SESSION_DAYS = 2;

const REDIS_KEY = 'capabilities_grants_json';

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function timingSafeEqualPassword(plain, expected) {
  const a = Buffer.from(String(plain), 'utf8');
  const b = Buffer.from(String(expected), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return { salt: salt.toString('hex'), hash: Buffer.from(hash).toString('hex') };
}

async function verifyPassword(password, saltHex, hashHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scryptAsync(password, salt, 64);
  const d = Buffer.from(derived);
  if (d.length !== expected.length) return false;
  return crypto.timingSafeEqual(d, expected);
}

function parseStoreJson(raw) {
  const data = JSON.parse(raw);
  if (!data.grants || typeof data.grants !== 'object') return { grants: {} };
  return { grants: data.grants };
}

/** Sync read: env JSON, then local file (no Redis). Used by CLI print script. */
export function readStore() {
  const envJson = process.env.CAPABILITIES_GRANTS_JSON;
  if (envJson && String(envJson).trim()) {
    try {
      return parseStoreJson(String(envJson));
    } catch (e) {
      console.error('[capabilities] Invalid CAPABILITIES_GRANTS_JSON:', e.message);
      return { grants: {} };
    }
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return parseStoreJson(raw);
  } catch {
    return { grants: {} };
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

let redisSingleton;
async function getRedis() {
  if (redisSingleton !== undefined) return redisSingleton;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisSingleton = null;
    return null;
  }
  try {
    const { Redis } = await import('@upstash/redis');
    redisSingleton = Redis.fromEnv();
    return redisSingleton;
  } catch (e) {
    console.error('[capabilities] Upstash Redis init failed:', e.message);
    redisSingleton = null;
    return null;
  }
}

/**
 * Authoritative store: Upstash Redis when configured, else env + file (readStore).
 */
export async function loadStore() {
  const r = await getRedis();
  if (r) {
    const raw = await r.get(REDIS_KEY);
    if (raw != null) {
      const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
      try {
        return parseStoreJson(s);
      } catch {
        // If Redis data is corrupted, fall back to env/file to keep login alive.
        return readStore();
      }
    }
    // Redis configured but no key yet: fall back to CAPABILITIES_GRANTS_JSON/local file.
    return readStore();
  }
  return readStore();
}

export async function saveStore(store) {
  const r = await getRedis();
  if (r) {
    await r.set(REDIS_KEY, JSON.stringify(store));
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      'Production writes require Upstash Redis. In Vercel: Marketplace → Redis → connect, then add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Or use CAPABILITIES_GRANTS_JSON manually.'
    );
  }
  writeStore(store);
}

export async function grantList() {
  const store = await loadStore();
  return Object.entries(store.grants).map(([email, g]) => ({
    email,
    createdAt: g.createdAt || null,
  }));
}

/**
 * Grant access by email. Optional password (8+ chars) adds a legacy passworded grant;
 * omit password for email-only allowlist access.
 */
export async function grantUpsert(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes('@')) throw new Error('Invalid email');

  const store = await loadStore();
  const createdAt = new Date().toISOString();
  if (password && String(password).length >= 8) {
    const { salt, hash } = await hashPassword(password);
    store.grants[email] = { salt, hash, createdAt };
  } else if (password) {
    throw new Error('Password must be at least 8 characters, or omit for email-only access');
  } else {
    store.grants[email] = { createdAt };
  }
  await saveStore(store);
}

export async function grantRevoke(emailRaw) {
  const email = normalizeEmail(emailRaw);
  const store = await loadStore();
  delete store.grants[email];
  await saveStore(store);
}

/**
 * Email-only grants: no `hash` on record — any invited email may enter.
 * Legacy grants with `hash` still require the correct password.
 */
export async function verifyLogin(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  const store = await loadStore();
  const g = store.grants[email];
  if (!g) return false;
  if (g.hash && g.salt) {
    if (!password) return false;
    return verifyPassword(password, g.salt, g.hash);
  }
  return true;
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  let pad = s.length % 4;
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  if (pad) t += '='.repeat(4 - pad);
  return Buffer.from(t, 'base64');
}

export function createSession(emailRaw, secret) {
  const email = normalizeEmail(emailRaw);
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = JSON.stringify({ email, exp });
  const payloadB = b64url(Buffer.from(payload, 'utf8'));
  const sig = crypto.createHmac('sha256', secret).update(payloadB).digest('base64url');
  return `${payloadB}.${sig}`;
}

export function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payloadB = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payloadB).digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;
  let data;
  try {
    data = JSON.parse(b64urlDecode(payloadB).toString('utf8'));
  } catch {
    return null;
  }
  if (!data.email || typeof data.exp !== 'number') return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return normalizeEmail(data.email);
}

export function createAdminSession(secret) {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_DAYS * 24 * 60 * 60;
  const payload = JSON.stringify({ typ: 'admin', exp });
  const payloadB = b64url(Buffer.from(payload, 'utf8'));
  const sig = crypto.createHmac('sha256', secret).update(payloadB).digest('base64url');
  return `${payloadB}.${sig}`;
}

export function verifyAdminSession(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payloadB = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payloadB).digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return false;
  let data;
  try {
    data = JSON.parse(b64urlDecode(payloadB).toString('utf8'));
  } catch {
    return false;
  }
  if (data.typ !== 'admin' || typeof data.exp !== 'number') return false;
  if (data.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

/**
 * Admin UI: single shared password from CAPABILITIES_ADMIN_SECRET.
 * Trims env + input so dashboard/CLI pastes with stray newlines/spaces still match.
 */
export function validateAdminPassword(password) {
  const secret = String(process.env.CAPABILITIES_ADMIN_SECRET || '').trim();
  if (!secret || password == null) return false;
  const plain = String(password).trim();
  return timingSafeEqualPassword(plain, secret);
}

export function sessionCookieHeader(token, secure) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader(secure) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function adminSessionCookieHeader(token, secure) {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${ADMIN_SESSION_DAYS * 24 * 60 * 60}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearAdminSessionCookieHeader(secure) {
  const parts = [`${ADMIN_COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export { STORE_PATH };
