/** Trigger production redeploy so baked static pages refresh (~30s). */
export async function triggerProductionRedeploy() {
  const tok = process.env.VERCEL_API_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  if (!tok) return false;
  try {
    const url = 'https://api.vercel.com/v13/deployments' + (team ? ('?teamId=' + team) : '');
    const dr = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xyzsite-omega',
        project: 'prj_VJcvkk6j0pDBjgtmsS5OP2ZPcgpf',
        target: 'production',
        gitSource: { type: 'github', repoId: '1214633005', ref: 'main' },
      }),
    });
    if (!dr.ok) {
      console.error('[redeploy] failed', dr.status, await dr.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[redeploy] error', e && e.message);
    return false;
  }
}
