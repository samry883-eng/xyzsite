import fs from 'fs';
import path from 'path';

export function loadMkeyMap(root) {
  const admin = path.join(root, 'Admin', 'index.html');
  const s = fs.readFileSync(admin, 'utf8');
  const m = s.match(/var DATA = (\{[\s\S]*?\});\s*\nvar HOME/);
  if (!m) return {};
  const data = JSON.parse(m[1]);
  const map = {};
  for (const cat of data.categories || []) {
    for (const p of data.projects[cat] || []) {
      if (p.key && p.mkey) map[p.key] = p.mkey;
    }
  }
  return map;
}

/** Build-time fetch: live API first (reads Edge Config), then direct Edge Config. */
export async function fetchWorkOrderForBuild() {
  let order = null;
  try {
    const r = await fetch('https://www.xyzstudios.co/api/site-order');
    if (r.ok) {
      const j = await r.json();
      order = j && j.order;
    }
  } catch {}
  const EC = process.env.EDGE_CONFIG_ID;
  const RT = process.env.EDGE_CONFIG_READ_TOKEN;
  if ((!order || !order.homeList?.length) && EC && RT) {
    try {
      const r = await fetch(`https://edge-config.vercel.com/${EC}/item/workOrder?token=${RT}`);
      if (r.ok) order = await r.json();
    } catch {}
  }
  return order && order.homeList && order.homeList.length ? order : null;
}

export function slimHomeRow(x, previewDir, mkeyMap) {
  const row = {
    key: x.key,
    client: x.client,
    title: x.title,
    start: x.start,
    video: x.video,
    cat: x.cat,
    mkey: x.mkey || mkeyMap[x.key] || '',
  };
  const prev = path.join(previewDir, `${x.key}.mp4`);
  if (fs.existsSync(prev) && fs.statSync(prev).size > 1000) {
    row.preview = `/assets/home-previews/${x.key}.mp4`;
  }
  return row;
}
