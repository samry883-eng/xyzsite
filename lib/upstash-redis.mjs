/** Shared Upstash Redis REST client (runtime + build scripts). Uses native fetch, not the SDK. */

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

/** Mask host for admin diagnostics, e.g. us1-abc-xyz.upstash.io → us1-***.upstash.io */
export function maskRedisHost(host) {
  if (!host) return null;
  const parts = String(host).split('.');
  if (parts.length >= 2 && parts[parts.length - 2] === 'upstash') {
    const sub = parts[0];
    parts[0] = sub.length <= 4 ? '***' : `${sub.slice(0, 3)}***`;
    return parts.join('.');
  }
  return host.length <= 8 ? '***' : `${host.slice(0, 4)}***${host.slice(-4)}`;
}

/** REST HTTPS endpoint only — reject TCP redis:// URLs pasted from the Upstash console. */
export function normalizeRedisUrl(raw) {
  let url = normalizeEnvVal(raw);
  if (!url) return '';
  if (/^rediss?:\/\//i.test(url)) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL must be the REST API HTTPS URL from Upstash dashboard (https://xxx.upstash.io), not redis:// TCP endpoint'
    );
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }
  url = url.replace(/\/+$/, '');
  try {
    const u = new URL(url);
    if (!u.hostname.includes('upstash.io') && !u.hostname.includes('upstash.io'.replace('io', ''))) {
      // Allow custom domains / Vercel KV proxy hosts; only warn in diagnostics.
    }
    if (!u.hostname || u.hostname === 'https' || u.hostname.length < 4) {
      throw new Error('REST URL hostname is missing or invalid');
    }
  } catch (e) {
    if (e.message.includes('hostname')) throw e;
    throw new Error(`REST URL is not valid HTTPS: ${e.message || e}`);
  }
  return url;
}

function rawUrlFormatHint(raw) {
  const s = normalizeEnvVal(raw);
  if (!s) return null;
  if (/^rediss?:\/\//i.test(s)) {
    return 'Env URL looks like redis:// TCP endpoint — use REST API tab URL (https://xxx.upstash.io) instead';
  }
  if (/^UPSTASH_REDIS_REST/i.test(s) || s.includes('REST_TOKEN')) {
    return 'Env URL looks like a variable name, not a URL — paste the https://xxx.upstash.io value';
  }
  return null;
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
      return { url, token, source: g.label, urlRaw };
    } catch (e) {
      return { url: '', token: '', source: g.label, urlError: e.message || String(e), urlRaw };
    }
  }
  return { url: '', token: '', source: null };
}

/** Which env var groups are set / partial / missing (for admin error messages). */
export function redisEnvDiagnostics() {
  const complete = [];
  const partial = [];
  const urlHints = [];
  for (const g of ENV_GROUPS) {
    const urlRaw = normalizeEnvVal(process.env[g.url]);
    const tokenRaw = normalizeEnvVal(process.env[g.token]);
    const hint = rawUrlFormatHint(urlRaw);
    if (hint) urlHints.push(`${g.url}: ${hint}`);
    if (urlRaw && tokenRaw) complete.push(g.label);
    else if (urlRaw || tokenRaw) {
      const missing = urlRaw ? g.token : g.url;
      partial.push(`${g.label} (${missing} missing)`);
    }
  }
  const env = redisEnv();
  let urlHost = null;
  let urlScheme = null;
  if (env.url) {
    try {
      const u = new URL(env.url);
      urlHost = u.host;
      urlScheme = u.protocol;
    } catch {
      urlHost = '(invalid URL)';
    }
  }
  const activeGroup = ENV_GROUPS.find((g) => g.label === env.source);
  const tokenLen = env.token ? env.token.length : 0;
  return {
    configured: Boolean(env.url && env.token),
    activeSource: env.source,
    urlHost,
    urlHostMasked: maskRedisHost(urlHost),
    urlScheme,
    tokenLength: tokenLen,
    tokenLengthOk: tokenLen >= 20,
    urlError: env.urlError || null,
    urlFormatHints: urlHints.length ? urlHints : undefined,
    complete,
    partial,
    checked: ENV_GROUPS.flatMap((g) => [g.url, g.token]),
    activeEnvKeys: activeGroup ? { url: activeGroup.url, token: activeGroup.token } : null,
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
        (d.urlHostMasked ? ` → ${d.urlHostMasked}` : '')
    );
    if (!d.tokenLengthOk) {
      lines.push(`Token length is ${d.tokenLength} chars — Upstash REST tokens are usually 100+ chars; re-copy from REST API tab.`);
    }
  } else if (d.urlError) {
    lines.push(`Redis URL invalid (${d.activeSource}): ${d.urlError}`);
  } else if (d.partial.length) {
    lines.push(`Partial Redis config: ${d.partial.join('; ')}.`);
  } else {
    lines.push('No Redis credentials found.');
  }
  if (d.urlFormatHints?.length) {
    lines.push(d.urlFormatHints.join(' '));
  }
  lines.push(
    'Checked env vars (first complete pair wins): ' +
      ENV_GROUPS.map((g) => `${g.url} + ${g.token}`).join(' | ')
  );
  lines.push(
    'Use the Upstash REST HTTPS URL + token (REST API tab, not redis://). Redeploy after saving env vars.'
  );
  return lines.join(' ');
}

export const REDIS_CONFIG_HELP = formatConfigHelp();

export function redisConfigHelp(context) {
  return formatConfigHelp(context);
}

function fetchErrorDetail(err) {
  if (!err) return { message: 'Unknown fetch error' };
  const out = {
    message: err.message || String(err),
    code: err.code || err.cause?.code || undefined,
    errno: err.errno ?? err.cause?.errno ?? undefined,
  };
  if (err.cause?.message && err.cause.message !== out.message) {
    out.cause = err.cause.message;
  }
  return out;
}

function formatFetchError(err) {
  const d = fetchErrorDetail(err);
  let msg = `fetch failed: ${d.message}`;
  if (d.code) msg += ` [${d.code}]`;
  if (d.cause) msg += ` (${d.cause})`;
  if (/ENOTFOUND|getaddrinfo/i.test(String(d.message) + d.code)) {
    msg += ' — DNS could not resolve REST URL host; check UPSTASH_REDIS_REST_URL is https://xxx.upstash.io';
  }
  if (/CERT_|UNABLE_TO_VERIFY|SSL/i.test(String(d.message) + d.cause)) {
    msg += ' — TLS/SSL error; URL must be https:// from Upstash REST API tab';
  }
  return msg;
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
    const detail = fetchErrorDetail(e);
    const err = new Error(formatFetchError(e));
    err.fetchDetail = detail;
    throw err;
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

function createRestClient(baseUrl, token) {
  return {
    client: 'native-rest',
    async get(key) {
      return restGet(baseUrl, token, key);
    },
    async set(key, value) {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      if (Buffer.byteLength(payload, 'utf8') > 1024) {
        await restSet(baseUrl, token, key, payload);
      } else {
        await restCommand(baseUrl, token, ['SET', key, payload]);
      }
    },
    async del(key) {
      await restDel(baseUrl, token, key);
    },
  };
}

export function clearRedisClient() {
  redisClient = undefined;
}

/** Native Upstash REST client (primary path — avoids @upstash/redis SDK fetch issues on Vercel). */
export async function getRedis() {
  if (redisClient) return redisClient;
  const { url, token, urlError } = redisEnv();
  if (urlError) {
    console.error('[upstash-redis] invalid URL config:', urlError);
    return null;
  }
  if (!url || !token) return null;
  redisClient = createRestClient(url, token);
  return redisClient;
}

function redisErrorDetail(err) {
  if (!err) return 'Unknown Redis error';
  if (typeof err === 'string') return err;
  const parts = [err.message || String(err)];
  if (err.fetchDetail?.code) parts.push(`code=${err.fetchDetail.code}`);
  if (err.cause && err.cause.message) parts.push(`cause: ${err.cause.message}`);
  return parts.join(' — ');
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
 * Admin diagnostic: PING + SET/GET/DEL round-trip via native REST.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function redisHealthCheck() {
  const diag = redisEnvDiagnostics();
  if (!diag.configured) {
    return {
      ok: false,
      error: diag.urlError || 'Redis not configured',
      diagnostics: diag,
      hint: diag.urlFormatHints?.[0] ||
        'Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN from Upstash dashboard → REST API tab, then redeploy.',
    };
  }
  const { url, token } = redisEnv();
  const testKey = `xyz:redis-health:${Date.now()}`;
  const testVal = `ok-${Date.now()}`;
  const started = Date.now();
  const steps = {};

  try {
    try {
      steps.ping = await restCommand(url, token, ['PING']);
    } catch (e) {
      steps.ping = { error: redisErrorDetail(e), fetchDetail: e.fetchDetail || null };
      throw e;
    }

    try {
      await restCommand(url, token, ['SET', testKey, testVal]);
      steps.setCommand = 'ok';
    } catch (e) {
      steps.setCommand = { error: redisErrorDetail(e), fetchDetail: e.fetchDetail || null };
      throw e;
    }

    const back = await restGet(url, token, testKey);
    steps.get = back === testVal ? 'match' : `mismatch: ${String(back).slice(0, 80)}`;

    await restDel(url, token, testKey);
    steps.del = 'ok';

    const ok = back === testVal;
    return {
      ok,
      client: 'native-rest',
      diagnostics: diag,
      steps,
      roundTrip: ok ? 'match' : steps.get,
      ms: Date.now() - started,
      error: ok ? undefined : 'Round-trip mismatch',
    };
  } catch (e) {
    clearRedisClient();
    return {
      ok: false,
      error: redisErrorDetail(e),
      fetchDetail: e.fetchDetail || null,
      diagnostics: diag,
      steps,
      ms: Date.now() - started,
      hint: diag.urlFormatHints?.[0] ||
        (diag.tokenLengthOk === false
          ? 'Token looks too short — re-copy UPSTASH_REDIS_REST_TOKEN from Upstash REST API tab.'
          : 'Verify UPSTASH_REDIS_REST_URL is https://xxx.upstash.io (REST API tab, not redis://). Redeploy after fixing.'),
    };
  }
}
