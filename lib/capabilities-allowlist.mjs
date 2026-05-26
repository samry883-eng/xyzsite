import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
const DATA_DIR = path.join(__dirname, '..', 'data');
/** Primary file for npm run deck:allow */
export const ALLOWLIST_FILE = path.join(DATA_DIR, 'deck-allowlist.txt');
/** Also read data/allowlist (no extension) — common shorthand */
export const ALLOWLIST_PATHS = [
  path.join(DATA_DIR, 'deck-allowlist.txt'),
  path.join(DATA_DIR, 'allowlist'),
  path.join(DATA_DIR, 'allowlist.txt'),
];

/** Split comma, semicolon, or newline separated emails. */
export function parseEmailList(raw) {
  if (raw == null || String(raw).trim() === '') return [];
  const out = [];
  const seen = new Set();
  for (const part of String(raw).split(/[,;\n\r]+/)) {
    const email = normalizeEmail(part);
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function getEnvAllowlistEmails() {
  return parseEmailList(process.env.CAPABILITIES_ALLOWED_EMAILS);
}

function parseAllowlistFile(raw) {
  const out = [];
  const seen = new Set();
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const email = normalizeEmail(t);
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function getFileAllowlistEmails() {
  const merged = [];
  const seen = new Set();
  for (const filePath of ALLOWLIST_PATHS) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      for (const email of parseAllowlistFile(raw)) {
        if (seen.has(email)) continue;
        seen.add(email);
        merged.push(email);
      }
    } catch {
      /* missing file */
    }
  }
  return merged;
}

export function getAllowlistEmailSet() {
  const set = new Set();
  for (const e of getEnvAllowlistEmails()) set.add(e);
  for (const e of getFileAllowlistEmails()) set.add(e);
  return set;
}

export function isAllowlistedEmail(emailRaw) {
  const email = normalizeEmail(emailRaw);
  return getAllowlistEmailSet().has(email);
}

/** One line for Vercel env CAPABILITIES_ALLOWED_EMAILS */
export function formatAllowlistForEnv(emails) {
  return [...new Set(emails.map(normalizeEmail).filter((e) => e && e.includes('@')))].sort().join(
    ', '
  );
}

export function getAllowlistSnapshot() {
  const env = getEnvAllowlistEmails();
  const file = getFileAllowlistEmails();
  const all = [...new Set([...env, ...file])].sort();
  return {
    env,
    file,
    all,
    envValue: formatAllowlistForEnv(all),
  };
}
