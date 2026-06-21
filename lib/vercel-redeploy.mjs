import { redisGet, redisSet } from './upstash-redis.mjs';

const REDEPLOY_TIMEOUT_MS = 15000;
const REDEPLOY_COOLDOWN_MS = Number(process.env.VERCEL_REDEPLOY_COOLDOWN_MS) || 10 * 60 * 1000;
const REDIS_LAST_KEY = 'xyz:last_redeploy_at';

let memoryLastRedeployAt = 0;

function parseQuotaError(status, detail) {
  if (status === 402) return true;
  return /api-deployments-free-per-day|payment_required|Resource is limited/i.test(detail || '');
}

export function redeployQuotaMessage() {
  return 'Saved successfully. Live publish paused — Vercel daily API deploy limit reached (100/day). Retry Update site after quota resets (~24h) or push to GitHub main.';
}

function redeployCooldownMessage(retryAfterMs) {
  const mins = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Saved successfully. Redeploy skipped — wait ~${mins} min before publishing again.`;
}

async function getLastRedeployAt() {
  const r = await redisGet(REDIS_LAST_KEY);
  if (r.ok && r.value != null) {
    const n = Number(r.value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return memoryLastRedeployAt || 0;
}

async function recordRedeployAt(ts = Date.now()) {
  memoryLastRedeployAt = ts;
  await redisSet(REDIS_LAST_KEY, String(ts));
}

async function triggerViaDeployHook(hookUrl) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REDEPLOY_TIMEOUT_MS);
  try {
    const res = await fetch(hookUrl, { method: 'POST', signal: ac.signal });
    const detail = await res.text().catch(() => '');
    if (!res.ok) {
      return { ok: false, error: `Deploy hook HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e && e.name === 'AbortError'
      ? `Deploy hook timed out after ${REDEPLOY_TIMEOUT_MS}ms`
      : (e && e.message ? e.message : String(e));
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function triggerViaDeploymentsApi(tok, team) {
  const url = 'https://api.vercel.com/v13/deployments' + (team ? ('?teamId=' + team) : '');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REDEPLOY_TIMEOUT_MS);
  try {
    const dr = await fetch(url, {
      method: 'POST',
      signal: ac.signal,
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xyzsite-omega',
        project: 'prj_VJcvkk6j0pDBjgtmsS5OP2ZPcgpf',
        target: 'production',
        gitSource: { type: 'github', repoId: '1214633005', ref: 'main' },
      }),
    });
    const detail = await dr.text().catch(() => '');
    if (!dr.ok) {
      const msg = `Vercel redeploy HTTP ${dr.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`;
      console.error('[redeploy] failed', msg);
      return { ok: false, status: dr.status, error: msg };
    }
    return { ok: true };
  } catch (e) {
    const msg = e && e.name === 'AbortError'
      ? `Vercel redeploy timed out after ${REDEPLOY_TIMEOUT_MS}ms`
      : (e && e.message ? e.message : String(e));
    console.error('[redeploy] error', msg);
    return { ok: false, error: `Vercel redeploy: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{
 *   ok: boolean,
 *   deployed?: boolean,
 *   skipped?: boolean,
 *   skipReason?: string,
 *   warning?: string,
 *   error?: string,
 *   quotaExceeded?: boolean,
 *   retryAfterMs?: number,
 *   method?: string
 * }>}
 */
export async function triggerProductionRedeploy(opts = {}) {
  const force = opts.force === true;
  const now = Date.now();

  if (!force) {
    const last = await getLastRedeployAt();
    const elapsed = now - last;
    if (last > 0 && elapsed < REDEPLOY_COOLDOWN_MS) {
      const retryAfterMs = REDEPLOY_COOLDOWN_MS - elapsed;
      return {
        ok: false,
        deployed: false,
        skipped: true,
        skipReason: 'cooldown',
        retryAfterMs,
        warning: redeployCooldownMessage(retryAfterMs),
      };
    }
  }

  const hookUrl = (process.env.VERCEL_DEPLOY_HOOK_URL || '').trim();
  if (hookUrl) {
    const hook = await triggerViaDeployHook(hookUrl);
    if (hook.ok) {
      await recordRedeployAt(now);
      return { ok: true, deployed: true, method: 'deploy_hook' };
    }
    console.warn('[redeploy] deploy hook failed, falling back to API:', hook.error);
  }

  const tok = process.env.VERCEL_API_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  if (!tok) {
    return {
      ok: false,
      deployed: false,
      error: hookUrl
        ? 'Deploy hook failed and VERCEL_API_TOKEN is not set'
        : 'VERCEL_API_TOKEN not set — add VERCEL_DEPLOY_HOOK_URL or API token',
    };
  }

  const api = await triggerViaDeploymentsApi(tok, team);
  if (api.ok) {
    await recordRedeployAt(now);
    return { ok: true, deployed: true, method: 'api' };
  }

  if (parseQuotaError(api.status, api.error)) {
    return {
      ok: false,
      deployed: false,
      quotaExceeded: true,
      warning: redeployQuotaMessage(),
      error: api.error,
    };
  }

  return { ok: false, deployed: false, error: api.error };
}
