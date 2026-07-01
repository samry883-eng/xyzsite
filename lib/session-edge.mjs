/**
 * Edge-safe session verification (matches lib/capabilities-auth.mjs HMAC).
 */

export const SOUND_DECK_SHARE_EMAIL = 'sound-deck-share@link.xyzstudios';
export const SOUND_DECK_SHARE_NDA_NAME = 'Sound Deck Guest';
const SESSION_DAYS = 7;
const COOKIE_NAME = 'xyz_capabilities';
const NDA_COOKIE_NAME = 'xyz_capabilities_nda';

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function b64urlDecode(s) {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = t.length % 4;
  if (pad) t += '='.repeat(4 - pad);
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bufferToBase64Url(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isSoundDeckShareEmail(email) {
  return normalizeEmail(email) === SOUND_DECK_SHARE_EMAIL;
}

/**
 * @param {string | undefined} token
 * @param {string} secret
 * @returns {Promise<string | null>} email or null
 */
export async function verifySessionEdge(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payloadB = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB));
  const expected = bufferToBase64Url(sigBuf);
  if (!timingSafeEqualStr(sig, expected)) return null;

  let data;
  try {
    const raw = b64urlDecode(payloadB);
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (!data.email || typeof data.exp !== 'number') return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return normalizeEmail(data.email);
}

/**
 * @param {string | undefined} token
 * @param {string} secret
 * @param {string} expectedEmail
 * @returns {Promise<{ email: string, name: string } | null>}
 */
export async function verifyNdaSessionEdge(token, secret, expectedEmail) {
  if (!token || typeof token !== 'string' || !secret || !expectedEmail) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payloadB = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB));
  const expected = bufferToBase64Url(sigBuf);
  if (!timingSafeEqualStr(sig, expected)) return null;

  let data;
  try {
    const raw = b64urlDecode(payloadB);
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (data.typ !== 'nda' || !data.email || !data.name || typeof data.exp !== 'number') return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  if (normalizeEmail(data.email) !== normalizeEmail(expectedEmail)) return null;
  return { email: normalizeEmail(data.email), name: String(data.name) };
}

export function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    if (k !== name) continue;
    let v = part.slice(i + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch {
      /* keep raw */
    }
    return v;
  }
  return '';
}

function bytesToBase64Url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256Base64Url(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bufferToBase64Url(sigBuf);
}

/**
 * @param {string} emailRaw
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function createSessionEdge(emailRaw, secret) {
  const email = normalizeEmail(emailRaw);
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = JSON.stringify({ email, exp });
  const payloadB = bytesToBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSha256Base64Url(payloadB, secret);
  return `${payloadB}.${sig}`;
}

/**
 * @param {string} emailRaw
 * @param {string} signerName
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function createNdaSessionEdge(emailRaw, signerName, secret) {
  const email = normalizeEmail(emailRaw);
  const name = String(signerName || '').trim().slice(0, 200);
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = JSON.stringify({ typ: 'nda', email, name, exp });
  const payloadB = bytesToBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSha256Base64Url(payloadB, secret);
  return `${payloadB}.${sig}`;
}

export function verifyShareToken(candidate, expected) {
  const a = String(candidate || '');
  const b = String(expected || '');
  if (!a || !b) return false;
  return timingSafeEqualStr(a, b);
}

function sessionCookieHeader(token, secure) {
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

function ndaSessionCookieHeader(token, secure) {
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

/**
 * Exchange a valid SOUND_DECK_SHARE_TOKEN for capabilities session cookies.
 * @returns {Promise<{ session: string, nda: string } | null>}
 */
export async function createSoundDeckShareCookies(secret) {
  if (!secret) return null;
  const session = await createSessionEdge(SOUND_DECK_SHARE_EMAIL, secret);
  const nda = await createNdaSessionEdge(SOUND_DECK_SHARE_EMAIL, SOUND_DECK_SHARE_NDA_NAME, secret);
  return { session, nda };
}

/**
 * @param {{ session: string, nda: string }} cookies
 * @param {boolean} secure
 * @returns {string[]}
 */
export function soundDeckShareSetCookieHeaders(cookies, secure) {
  return [
    sessionCookieHeader(cookies.session, secure),
    ndaSessionCookieHeader(cookies.nda, secure),
  ];
}
