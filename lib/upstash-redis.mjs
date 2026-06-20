/** Shared Upstash Redis REST client (runtime + build scripts). */

let redisClient;
let redisDead = false;

export function redisEnv() {
  const url = String(
    process.env.CAPABILITIES_UPSTASH_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      ''
  ).trim();
  const token = String(
    process.env.CAPABILITIES_UPSTASH_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      ''
  ).trim();
  return { url, token };
}

export function redisConfigured() {
  const { url, token } = redisEnv();
  return Boolean(url && token);
}

async function restGet(url, token, key) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Redis GET ${r.status}`);
  const j = await r.json();
  return j.result ?? null;
}

async function restSet(url, token, key, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const r = await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(body)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Redis SET ${r.status}`);
}

export async function getRedis() {
  if (redisDead) return null;
  if (redisClient) return redisClient;
  const { url, token } = redisEnv();
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (e) {
    console.error('[upstash-redis] SDK init failed, using REST fallback:', e && e.message);
    return {
      async get(key) {
        return restGet(url, token, key);
      },
      async set(key, value) {
        await restSet(url, token, key, value);
      },
    };
  }
}

export async function redisGet(key) {
  const r = await getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch (e) {
    console.error('[upstash-redis] read failed:', e && e.message);
    redisDead = true;
    redisClient = undefined;
    return null;
  }
}

export async function redisSet(key, value) {
  const r = await getRedis();
  if (!r) return false;
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await r.set(key, payload);
    return true;
  } catch (e) {
    console.error('[upstash-redis] write failed:', e && e.message);
    redisDead = true;
    redisClient = undefined;
    return false;
  }
}

export const REDIS_CONFIG_HELP =
  'Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on Vercel (Project Settings → Environment Variables), then redeploy. Same Redis as capabilities: CAPABILITIES_UPSTASH_* or KV_REST_API_* also work.';
