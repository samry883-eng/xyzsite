let _client = null;
async function getRedis() {
  if (_client) return _client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    _client = new Redis({ url, token });
    return _client;
  } catch (e) { console.error('[site-store] redis init failed', e && e.message); return null; }
}
const KEY = 'site:work-order';
export async function getWorkOrder() {
  const r = await getRedis(); if (!r) return null;
  try { return await r.get(KEY); } catch { return null; }
}
export async function setWorkOrder(order) {
  const r = await getRedis(); if (!r) return false;
  try { await r.set(KEY, order); return true; } catch (e) { console.error('[site-store] set failed', e && e.message); return false; }
}
