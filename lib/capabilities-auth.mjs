import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import {
  getAllowlistEmailSet,
  getAllowlistSnapshot,
  formatAllowlistForEnv,
  parseEmailList,
  isAllowlistedEmail,
} from './capabilities-allowlist.mjs';
import { getKey, setKey, ecReadable, ecWritable } from './site-store.mjs';
import { getRedis, redisConfigured } from './upstash-redis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, '..', 'data', 'capabilities-grants.json');

const scryptAsync = promisify(crypto.scrypt);

const COOKIE_NAME = 'xyz_capabilities';
const ADMIN_COOKIE_NAME = 'xyz_capabilities_admin';
const NDA_COOKIE_NAME = 'xyz_capabilities_nda';
const SESSION_DAYS = 7;
const ADMIN_SESSION_DAYS = 2;

const REDIS_KEY = 'capabilities_grants_json';
const EC_GRANTS_KEY = 'capabilitiesGrants';

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

export function getNdaCookieName() {
  return NDA_COOKIE_NAME;
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

function emptyStore() {
  return { grants: {}, ndaRecords: {} };
}

function parseStoreJson(raw) {
  const data = JSON.parse(raw);
  const store = emptyStore();
  if (data.grants && typeof data.grants === 'object') store.grants = data.grants;
  if (data.ndaRecords && typeof data.ndaRecords === 'object') store.ndaRecords = data.ndaRecords;
  return store;
}

/** Sync read: env JSON, then local file (no Redis). Used by CLI print script. */
export function readStore() {
  const envJson = process.env.CAPABILITIES_GRANTS_JSON;
  if (envJson && String(envJson).trim()) {
    try {
      return parseStoreJson(String(envJson));
    } catch (e) {
      console.error('[capabilities] Invalid CAPABILITIES_GRANTS_JSON:', e.message);
      return emptyStore();
    }
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return parseStoreJson(raw);
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

/** Only cache a successful client. Caching `null` broke writes after env was fixed without a new instance. */
// Redis client shared with Work CMS via lib/upstash-redis.mjs

async function getCapabilitiesRedis() {
  return getRedis();
}

/**
 * Authoritative store: Upstash Redis when configured, else env + file (readStore).
 */
export async function loadStore() {
  const r = await getCapabilitiesRedis();
  if (r) {
    try {
      const raw = await r.get(REDIS_KEY);
      if (raw != null) {
        const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
        try {
          return parseStoreJson(s);
        } catch {
          return readStore();
        }
      }
      // Redis reachable but no key yet: fall through to Edge Config / file.
    } catch (e) {
      console.error('[capabilities] Redis read failed, falling back to Edge Config:', e && e.message);
    }
  }
  if (ecReadable()) {
    const v = await getKey(EC_GRANTS_KEY);
    if (v && typeof v === 'object' && v.grants && typeof v.grants === 'object') {
      return {
        grants: v.grants,
        ndaRecords: v.ndaRecords && typeof v.ndaRecords === 'object' ? v.ndaRecords : {},
      };
    }
  }
  return readStore();
}

export async function saveStore(store) {
  const r = await getCapabilitiesRedis();
  if (r) {
    try {
      await r.set(REDIS_KEY, JSON.stringify(store));
      return;
    } catch (e) {
      console.error('[capabilities] Redis write failed, falling back to Edge Config:', e && e.message);
    }
  }
  if (ecWritable()) {
    const ok = await setKey(EC_GRANTS_KEY, {
      grants: store.grants,
      ndaRecords: store.ndaRecords || {},
    });
    if (ok) return;
    throw new Error('Edge Config write failed. Check VERCEL_API_TOKEN / EDGE_CONFIG_ID.');
  }
  if (process.env.VERCEL) {
    throw new Error(
      'Production writes need Redis credentials on this deployment: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (from Upstash REST API), or KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV), or CAPABILITIES_UPSTASH_URL + CAPABILITIES_UPSTASH_TOKEN as copies. Redeploy after saving. Or only use CAPABILITIES_GRANTS_JSON + redeploy (no admin UI writes).'
    );
  }
  writeStore(store);
}

export async function grantList() {
  const store = await loadStore();
  const allow = getAllowlistEmailSet();
  const byEmail = new Map();

  for (const email of allow) {
    byEmail.set(email, { email, createdAt: null, source: 'allowlist' });
  }
  for (const [email, g] of Object.entries(store.grants)) {
    byEmail.set(email, {
      email,
      createdAt: g.createdAt || null,
      source: byEmail.has(email) ? 'allowlist+grant' : 'grant',
    });
  }
  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export async function canPersistGrants() {
  return redisConfigured() || ecWritable() || !process.env.VERCEL;
}

export function buildSuggestedAllowedEmails(extraEmails) {
  const snap = getAllowlistSnapshot();
  const merged = [...snap.all, ...parseEmailList(extraEmails)];
  return formatAllowlistForEnv(merged);
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

export async function ndaRecordGet(emailRaw) {
  const email = normalizeEmail(emailRaw);
  const store = await loadStore();
  const r = store.ndaRecords && store.ndaRecords[email];
  if (!r || !r.signedAt) return null;
  return {
    email,
    signedName: String(r.signedName || ''),
    signedAt: r.signedAt,
  };
}

export async function ndaRecordUpsert(emailRaw, signedName) {
  const email = normalizeEmail(emailRaw);
  const name = String(signedName || '').trim().slice(0, 200);
  if (!email || !email.includes('@')) throw new Error('Invalid email');
  if (!name) throw new Error('Name required');
  const store = await loadStore();
  if (!store.ndaRecords) store.ndaRecords = {};
  const signedAt = new Date().toISOString();
  store.ndaRecords[email] = { signedName: name, signedAt };
  await saveStore(store);
  return { email, signedName: name, signedAt };
}

export async function ndaRecordRevoke(emailRaw) {
  const email = normalizeEmail(emailRaw);
  const store = await loadStore();
  if (!store.ndaRecords || !store.ndaRecords[email]) return;
  delete store.ndaRecords[email];
  await saveStore(store);
}

export async function ndaRecordList() {
  const store = await loadStore();
  const records = store.ndaRecords || {};
  return Object.entries(records)
    .map(([email, r]) => ({
      email,
      signedName: String(r.signedName || ''),
      signedAt: r.signedAt || null,
    }))
    .sort((a, b) => {
      const da = a.signedAt || '';
      const db = b.signedAt || '';
      return db.localeCompare(da) || a.email.localeCompare(b.email);
    });
}

export async function grantRevoke(emailRaw) {
  const email = normalizeEmail(emailRaw);
  const store = await loadStore();
  if (!store.grants[email]) {
    if (isAllowlistedEmail(email)) {
      throw new Error(
        'This email is on the env/file allowlist. Remove it from CAPABILITIES_ALLOWED_EMAILS or data/deck-allowlist.txt.'
      );
    }
    return;
  }
  delete store.grants[email];
  await saveStore(store);
}

export async function grantUpsertMany(emailsRaw) {
  const emails = parseEmailList(emailsRaw);
  if (!emails.length) throw new Error('No valid emails');
  const added = [];
  for (const email of emails) {
    await grantUpsert(email);
    added.push(email);
  }
  return added;
}

/**
 * Email-only grants: no `hash` on record — any invited email may enter.
 * Legacy grants with `hash` still require the correct password.
 */
export async function verifyLogin(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  const store = await loadStore();
  const g = store.grants[email];

  if (g) {
    if (g.hash && g.salt) {
      if (!password) return false;
      return verifyPassword(password, g.salt, g.hash);
    }
    return true;
  }

  if (getAllowlistEmailSet().has(email)) {
    return !password;
  }
  return false;
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

export function sessionSecret() {
  return process.env.CAPABILITIES_SESSION_SECRET || 'dev-capabilities-session-secret';
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

export function createNdaSession(emailRaw, signerName, secret) {
  const email = normalizeEmail(emailRaw);
  const name = String(signerName || '').trim().slice(0, 200);
  if (!name) throw new Error('Name required');
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = JSON.stringify({ typ: 'nda', email, name, exp });
  const payloadB = b64url(Buffer.from(payload, 'utf8'));
  const sig = crypto.createHmac('sha256', secret).update(payloadB).digest('base64url');
  return `${payloadB}.${sig}`;
}

export function verifyNdaSession(token, secret, expectedEmail) {
  if (!token || typeof token !== 'string' || !expectedEmail) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payloadB = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB).digest('base64url');
  if (!timingSafeEqualStr(sig, expectedSig)) return null;
  let data;
  try {
    data = JSON.parse(b64urlDecode(payloadB).toString('utf8'));
  } catch {
    return null;
  }
  if (data.typ !== 'nda' || !data.email || !data.name || typeof data.exp !== 'number') return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  if (normalizeEmail(data.email) !== normalizeEmail(expectedEmail)) return null;
  return { email: normalizeEmail(data.email), name: String(data.name) };
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

/** Normalize env pastes: trim, strip quotes, BOM/CR/zero-width (common in dashboard copy-paste). */
function normalizeEnvSecret(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^\uFEFF/, '').replace(/\u200b/g, '').replace(/\r/g, '');
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Read raw admin secret without normalizing (for diagnostics only). */
function readAdminSecretEnvRaw() {
  const e = typeof process !== 'undefined' && process.env ? process.env : {};
  return (
    e['CAPABILITIES_ADMIN_SECRET'] ||
    e['CAPABILITIES_ADMIN_PASSWORD'] ||
    ''
  );
}

/** Typing/paste quirks: zero-width space, Unicode ellipsis vs three dots. */
function normalizePasswordChars(s) {
  return String(s)
    .trim()
    .replace(/\u200b/g, '')
    .replace(/\u2026/g, '...');
}

/** Single source for admin password / X-Capabilities-Admin-Secret comparisons. */
export function getAdminSecretFromEnv() {
  return normalizePasswordChars(normalizeEnvSecret(readAdminSecretEnvRaw()));
}

/**
 * Admin UI: single shared password from CAPABILITIES_ADMIN_SECRET.
 */
export function validateAdminPassword(password) {
  const secret = getAdminSecretFromEnv();
  if (!secret || password == null) return false;
  const plain = normalizePasswordChars(password);
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

export function ndaSessionCookieHeader(token, secure) {
  const parts = [
    `${NDA_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearNdaSessionCookieHeader(secure) {
  const parts = [`${NDA_COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
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
