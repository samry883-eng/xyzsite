/** Shared Upstash Redis REST client (runtime + build scripts). */

let redisClient;
let redisDead = false;

const ENV_GROUPS = [
  { label: 'CAPABILITIES_UPSTASH_*', url: 'CAPABILITIES_UPSTASH_URL', token: 'CAPABILITIES_UPSTASH_TOKEN' },
  { label: 'UPSTASH_REDIS_REST_*', url: 'UPSTASH_REDIS_REST_URL', token: 'UPSTASH_REDIS_REST_TOKEN' },
  { label: 'KV_REST_API_*', url: 'KV_REST_API_URL', token: 'KV_REST_API_TOKEN' },
];

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

/** Which env var groups are set / partial / missing (for admin error messages). */
export function redisEnvDiagnostics() {
  const complete = [];
  const partial = [];
  for (const g of ENV_GROUPS) {
    const hasUrl = Boolean(String(process.env[g.url] || '').trim());
    const hasToken = Boolean(String(process.env[g.token] || '').trim());
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

async function restCommand(url, token, command) {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Redis ${command[0]} ${r.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  const j = await r.json();
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
