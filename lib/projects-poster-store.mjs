import { getRedis, redisGet, redisSet } from './upstash-redis.mjs';

const POSTER_PREFIX = 'project_poster:';
const MAX_POSTER_BYTES = 256000;

export function posterRedisKey(projectId) {
  return POSTER_PREFIX + String(projectId);
}

export function posterApiUrl(projectId, version) {
  const v = version || Date.now();
  return `/api/projects/poster/${encodeURIComponent(String(projectId))}?v=${v}`;
}

function parseImageBase64(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  const m = s.match(/^data:image\/jpe?g;base64,(.+)$/i);
  if (m) s = m[1];
  try {
    const buf = Buffer.from(s, 'base64');
    if (!buf.length || buf.length > MAX_POSTER_BYTES) return null;
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    return buf;
  } catch {
    return null;
  }
}

/** @returns {Promise<Buffer|null>} */
export async function getProjectPosterBuffer(projectId) {
  const key = posterRedisKey(projectId);
  const direct = await redisGet(key);
  if (direct.ok && direct.value) {
    try {
      return Buffer.from(String(direct.value), 'base64');
    } catch {
      return null;
    }
  }
  const r = await getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return Buffer.from(String(raw), 'base64');
  } catch {
    return null;
  }
}

/** @returns {Promise<{ ok: boolean, error?: string, bytes?: number }>} */
export async function saveProjectPosterBuffer(projectId, jpegBuffer) {
  if (!jpegBuffer || !Buffer.isBuffer(jpegBuffer) || !jpegBuffer.length) {
    return { ok: false, error: 'Empty image' };
  }
  if (jpegBuffer.length > MAX_POSTER_BYTES) {
    return { ok: false, error: `Poster too large (${Math.round(jpegBuffer.length / 1024)}KB, max ${Math.round(MAX_POSTER_BYTES / 1024)}KB)` };
  }
  if (jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) {
    return { ok: false, error: 'Image must be JPEG' };
  }
  const saved = await redisSet(posterRedisKey(projectId), jpegBuffer.toString('base64'));
  if (!saved.ok) return { ok: false, error: saved.error || 'Redis save failed' };
  return { ok: true, bytes: jpegBuffer.length };
}

/** @returns {Promise<{ ok: boolean, error?: string, bytes?: number, poster?: string }>} */
export async function saveProjectPosterBase64(projectId, imageBase64) {
  const buf = parseImageBase64(imageBase64);
  if (!buf) return { ok: false, error: 'Invalid JPEG base64 (max ~250KB)' };
  const saved = await saveProjectPosterBuffer(projectId, buf);
  if (!saved.ok) return saved;
  return { ok: true, bytes: saved.bytes, poster: posterApiUrl(projectId) };
}
