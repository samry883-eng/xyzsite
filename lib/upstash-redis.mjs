/** Shared Upstash Redis REST client (runtime + build scripts). */

let redisClient;

const ENV_GROUPS = [
  { label: 'CAPABILITIES_UPSTASH_*', url: 'CAPABILITIES_UPSTASH_URL', token: 'CAPABILITIES_UPSTASH_TOKEN' },
  { label: 'UPSTASH_REDIS_REST_*', url: 'UPSTASH_REDIS_REST_URL', token: 'UPSTASH_REDIS_REST_TOKEN' },
  { label: 'KV_REST_API_*', url: 'KV_REST_API_URL', token: 'KV_REST_API_TOKEN' },
];

function normalizeEnvVal(raw) {
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

export function redisEnv() {
  const url = normalizeEnvVal(
    process.env.CAPABILITIES_UPSTASH_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL
  );
  const token = normalizeEnvVal(
    process.env.CAPABILITIES_UPSTASH_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN
  );
  return { url, token };
}

/** Which env var groups are set / partial / missing (for admin error messages). */
export function redisEnvDiagnostics() {
  const complete = [];
  const partial = [];
  for (const g of ENV_GROUPS) {
    const hasUrl = Boolean(normalizeEnvVal(process.env[g.url]));
    const hasToken = Boolean(normalizeEnvVal(process.env[g.token]));
    if (hasUrl && hasToken) complete.push(g.label);
    else if (hasUrl || hasToken) {
      const missing = hasUrl ? g.token : g.url;
      partial.push(`${g.label} (${missing} missing)`);
    }
  }
  const { url, token } = redisEnv();
  return {
    configured: Boolean(url && token),
    complete,
    partial,
    checked: ENV_GROUPS.flatMap((g) => [g.url, g.token]),
  };
}

export function redisConfigured() {
  return redisEnvDiagnostics().configured;
}

function formatConfigHelp(context) {
  const d = redisEnvDiagnostics();
  const lines = [];
  if (context) lines.push(context);
  if (d.configured) {
    lines.push(`Redis credentials found (${d.complete.join(', ')}).`);
  } else if (d.partial.length) {
    lines.push(`Partial Redis config: ${d.partial.join('; ')}.`);
  } else {
    lines.push('No Redis credentials found.');
  }
  lines.push(
    'Checked env vars (first complete pair wins): ' +
      ENV_GROUPS.map((g) => `${g.url} + ${g.token}`).join(' | ')
  );
  lines.push(
    'Use the same Upstash REST URL + token as Capabilities admin — no new token needed. ' +
      'Redeploy after saving env vars.'
  );
  return lines.join(' ');
}

export const REDIS_CONFIG_HELP = formatConfigHelp();

export function redisConfigHelp(context) {
  return formatConfigHelp(context);
}

function redisErrorDetail(err) {
  if (!err) return 'Unknown Redis error';
  if (typeof err === 'string') return err;
  return err.message || String(err);
}

async function restCommand(url, token, command) {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const text = await r.text().catch(() => '');
  if (!r.ok) {
    throw new Error(`Redis ${command[0]} HTTP ${r.status}${text ? `: ${text.slice(0, 300)}` : ''}`);
  }
  let j;
  try {
    j = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Redis ${command[0]} invalid JSON response${text ? `: ${text.slice(0, 300)}` : ''}`);
  }
  if (j.error) throw new Error(String(j.error));
  return j.result ?? null;
}

async function restGet(url, token, key) {
  return restCommand(url, token, ['GET', key]);
}

async function restSet(url, token, key, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  await restCommand(url, token, ['SET', key, body]);
}

function restFallbackClient(url, token) {
  return {
    async get(key) {
      return restGet(url, token, key);
    },
    async set(key, value) {
      await restSet(url, token, key, value);
    },
  };
}

export function clearRedisClient() {
  redisClient = undefined;
}

export async function getRedis() {
  if (redisClient) return redisClient;
  const { url, token } = redisEnv();
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (e) {
    console.error('[upstash-redis] SDK init failed, using REST fallback:', redisErrorDetail(e));
    redisClient = restFallbackClient(url, token);
    return redisClient;
  }
}

/** @returns {Promise<{ ok: true, value: any } | { ok: false, error: string }>} */
export async function redisGet(key) {
  const r = await getRedis();
  if (!r) return { ok: false, error: 'Redis not configured' };
  try {
    const value = await r.get(key);
    return { ok: true, value };
  } catch (e) {
    const error = redisErrorDetail(e);
    console.error('[upstash-redis] read failed:', error);
    clearRedisClient();
    return { ok: false, error };
  }
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
export async function redisSet(key, value) {
  const r = await getRedis();
  if (!r) return { ok: false, error: 'Redis not configured' };
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await r.set(key, payload);
    return { ok: true };
  } catch (e) {
    const error = redisErrorDetail(e);
    console.error('[upstash-redis] write failed:', error);
    clearRedisClient();
    return { ok: false, error };
  }
}
