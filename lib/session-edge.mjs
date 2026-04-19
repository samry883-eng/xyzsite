/**
 * Edge-safe session verification (matches lib/capabilities-auth.mjs HMAC).
 */

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
 * Same HMAC format as deck session; payload is { typ: 'admin', exp }.
 */
export async function verifyAdminSessionEdge(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
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
  if (!timingSafeEqualStr(sig, expected)) return false;

  let data;
  try {
    const raw = b64urlDecode(payloadB);
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return false;
  }
  if (data.typ !== 'admin' || typeof data.exp !== 'number') return false;
  if (data.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
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
