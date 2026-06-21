import fs from 'fs';
import path from 'path';

export function loadMkeyLookup(root) {
  const admin = path.join(root, 'Admin', 'index.html');
  const s = fs.readFileSync(admin, 'utf8');
  const dataM = s.match(/var DATA = (\{[\s\S]*?\});\s*\nvar HOME/);
  const catM = s.match(/var CATALOG = (\{[\s\S]*?\});\s*\nvar HOMEDEF/);
  const byKey = {};
  const byVideo = {};
  if (dataM) {
    const data = JSON.parse(dataM[1]);
    for (const cat of data.categories || []) {
      for (const p of data.projects[cat] || []) {
        if (p.key && p.mkey) byKey[p.key] = p.mkey;
      }
    }
  }
  if (catM) {
    const catalog = JSON.parse(catM[1]);
    for (const [key, row] of Object.entries(catalog)) {
      const mkey = byKey[key];
      if (mkey && row.video) byVideo[row.video] = mkey;
    }
  }
  return { byKey, byVideo };
}

/** @deprecated use loadMkeyLookup */
export function loadMkeyMap(root) {
  return loadMkeyLookup(root).byKey;
}

export function resolveHomeMkey(row, lookup) {
  if (!row) return '';
  return lookup.byKey[row.key] || (row.video && lookup.byVideo[row.video]) || row.mkey || '';
}

export function applyMkeyRow(row, lookup) {
  const mkey = resolveHomeMkey(row, lookup);
  const out = { ...row, mkey };
  if (mkey.startsWith('ai/')) out.cat = 'AI';
  else if (mkey.startsWith('sound/')) out.cat = 'Sound';
  else if (mkey.startsWith('visual-effects/')) out.cat = 'Visual Effects';
  return out;
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

export function normalizeHomeList(homeList, lookup = { byKey: {}, byVideo: {} }) {
  if (!homeList || !homeList.length) return homeList;
  return homeList.map((x) => applyMkeyRow(x, lookup));
}

export function slimHomeRow(x, previewDir, lookup) {
  const row = applyMkeyRow({
    key: x.key,
    client: x.client,
    title: x.title,
    start: x.start,
    video: x.video,
    cat: x.cat,
    mkey: x.mkey,
  }, lookup);
  const prev = path.join(previewDir, `${x.key}.mp4`);
  if (fs.existsSync(prev) && fs.statSync(prev).size > 1000) {
    row.preview = `/assets/home-previews/${x.key}.mp4`;
  }
  return row;
}
