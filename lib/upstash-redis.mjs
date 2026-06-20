/** Shared Upstash Redis REST client (runtime + build scripts). */

import { Redis } from '@upstash/redis';

let redisClient;

/** First complete pair wins. Standard Vercel/Upstash vars before legacy aliases. */
const ENV_GROUPS = [
  { label: 'UPSTASH_REDIS_REST_*', url: 'UPSTASH_REDIS_REST_URL', token: 'UPSTASH_REDIS_REST_TOKEN' },
  { label: 'KV_REST_API_*', url: 'KV_REST_API_URL', token: 'KV_REST_API_TOKEN' },
  { label: 'CAPABILITIES_UPSTASH_*', url: 'CAPABILITIES_UPSTASH_URL', token: 'CAPABILITIES_UPSTASH_TOKEN' },
];

function normalizeEnvVal(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^\uFEFF/, '').replace(/\u200b/g, '').replace(/\r/g, '').replace(/\n/g, '');
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** REST HTTPS endpoint only — reject TCP redis:// URLs pasted from the Upstash console. */
export function normalizeRedisUrl(raw) {
  let url = normalizeEnvVal(raw);
  if (!url) return '';
  if (/^rediss?:\/\//i.test(url)) {
    throw new Error(
      'UPSTASH REST URL must be HTTPS (e.g. https://xxx.upstash.io from REST API tab), not redis:// TCP endpoint'
    );
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }
  return url.replace(/\/+$/, '');
}

/** Matched URL + token from the first complete env group (never mix across groups). */
export function redisEnv() {
  for (const g of ENV_GROUPS) {
    const urlRaw = normalizeEnvVal(process.env[g.url]);
    const token = normalizeEnvVal(process.env[g.token]);
    if (!urlRaw || !token) continue;
    try {
      const url = normalizeRedisUrl(urlRaw);
      if (!url) continue;
      return { url, token, source: g.label };
    } catch (e) {
      return { url: '', token: '', source: g.label, urlError: e.message || String(e) };
    }
  }
  return { url: '', token: '', source: null };
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
  const env = redisEnv();
  let urlHost = null;
  if (env.url) {
    try {
      urlHost = new URL(env.url).host;
    } catch {
      urlHost = '(invalid URL)';
    }
  }
  return {
    configured: Boolean(env.url && env.token),
    activeSource: env.source,
    urlHost,
    urlError: env.urlError || null,
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
    lines.push(
      `Redis credentials found (${d.complete.join(', ')}). Active pair: ${d.activeSource || 'unknown'}` +
        (d.urlHost ? ` → ${d.urlHost}` : '')
    );
  } else if (d.urlError) {
    lines.push(`Redis URL invalid (${d.activeSource}): ${d.urlError}`);
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
    'Use the Upstash REST HTTPS URL + token (REST API tab). Redeploy after saving env vars.'
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
  const parts = [err.message || String(err)];
  if (err.cause && err.cause.message) parts.push(`cause: ${err.cause.message}`);
  return parts.join(' — ');
}

async function restFetch(url, token, init) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
  } catch (e) {
    throw new Error(`fetch failed${e && e.message ? `: ${e.message}` : ''}${e && e.cause ? ` (${e.cause.message || e.cause})` : ''}`);
  }
  return res;
}

async function restCommand(baseUrl, token, command) {
  const r = await restFetch(baseUrl, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function restGet(baseUrl, token, key) {
  return restCommand(baseUrl, token, ['GET', key]);
}

/** POST /set/{key} with raw body — reliable for large JSON payloads (~21KB catalog). */
async function restSet(baseUrl, token, key, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const setUrl = `${baseUrl}/set/${encodeURIComponent(key)}`;
  const r = await restFetch(setUrl, token, { method: 'POST', body });
  const text = await r.text().catch(() => '');
  if (!r.ok) {
    throw new Error(`Redis SET HTTP ${r.status}${text ? `: ${text.slice(0, 300)}` : ''}`);
  }
  let j;
  try {
    j = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Redis SET invalid JSON response${text ? `: ${text.slice(0, 300)}` : ''}`);
  }
  if (j.error) throw new Error(String(j.error));
}

async function restDel(baseUrl, token, key) {
  await restCommand(baseUrl, token, ['DEL', key]);
}

function restFallbackClient(baseUrl, token) {
  return {
    async get(key) {
      return restGet(baseUrl, token, key);
    },
    async set(key, value) {
      await restSet(baseUrl, token, key, value);
    },
    async del(key) {
      await restDel(baseUrl, token, key);
    },
  };
}

export function clearRedisClient() {
  redisClient = undefined;
}

export async function getRedis() {
  if (redisClient) return redisClient;
  const { url, token, urlError } = redisEnv();
  if (urlError) {
    console.error('[upstash-redis] invalid URL config:', urlError);
    return null;
  }
  if (!url || !token) return null;
  try {
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

/**
 * Admin diagnostic: SET/GET/DEL a tiny payload. Returns active env source + actual error.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function redisHealthCheck() {
  const diag = redisEnvDiagnostics();
  if (!diag.configured) {
    return {
      ok: false,
      error: diag.urlError || 'Redis not configured',
      diagnostics: diag,
    };
  }
  const testKey = `xyz:redis-health:${Date.now()}`;
  const testVal = `ok-${Date.now()}`;
  const started = Date.now();
  try {
    const r = await getRedis();
    if (!r) {
      return { ok: false, error: 'getRedis() returned null', diagnostics: diag, ms: Date.now() - started };
    }
    await r.set(testKey, testVal);
    const back = await r.get(testKey);
    if (typeof r.del === 'function') {
      await r.del(testKey);
    } else {
      await r.set(testKey, '');
    }
    const ok = back === testVal;
    return {
      ok,
      diagnostics: diag,
      client: r.constructor?.name || 'REST fallback',
      roundTrip: ok ? 'match' : `expected ${testVal}, got ${String(back).slice(0, 80)}`,
      ms: Date.now() - started,
      error: ok ? undefined : 'Round-trip mismatch',
    };
  } catch (e) {
    clearRedisClient();
    return {
      ok: false,
      error: redisErrorDetail(e),
      diagnostics: diag,
      ms: Date.now() - started,
    };
  }
}
