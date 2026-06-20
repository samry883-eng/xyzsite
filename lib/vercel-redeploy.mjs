const REDEPLOY_TIMEOUT_MS = 15000;

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
export async function triggerProductionRedeploy() {
  const tok = process.env.VERCEL_API_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  if (!tok) {
    return { ok: false, error: 'VERCEL_API_TOKEN not set on this deployment' };
  }
  try {
    const url = 'https://api.vercel.com/v13/deployments' + (team ? ('?teamId=' + team) : '');
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REDEPLOY_TIMEOUT_MS);
    let dr;
    try {
      dr = await fetch(url, {
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
    } finally {
      clearTimeout(timer);
    }
    if (!dr.ok) {
      const detail = await dr.text().catch(() => '');
      const msg = `Vercel redeploy HTTP ${dr.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`;
      console.error('[redeploy] failed', msg);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    const msg = e && e.name === 'AbortError'
      ? `Vercel redeploy timed out after ${REDEPLOY_TIMEOUT_MS}ms`
      : (e && e.message ? e.message : String(e));
    console.error('[redeploy] error', msg);
    return { ok: false, error: `Vercel redeploy: ${msg}` };
  }
}
