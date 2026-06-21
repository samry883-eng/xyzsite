import fs from 'fs';
import path from 'path';
import { loadMkeyMap, normalizeHomeList, resolveHomeMkey, loadMkeyMaps, catFromMkey, loadHrefMaps, resolveHomeHref } from '../lib/home-mkey.mjs';

export { loadMkeyMap, normalizeHomeList, loadMkeyMaps as loadMkeyLookup };

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

export function slimHomeRow(x, previewDir, lookup, root) {
  let resolved = x;
  if (lookup?.byKey) {
    resolved = resolveHomeMkey(x, lookup);
  } else if (lookup && typeof lookup === 'object') {
    const mkey = lookup[x.key] || x.mkey || '';
    resolved = { ...x, mkey, cat: catFromMkey(mkey) || x.cat };
  }
  const mkey = resolved.mkey || '';
  const row = resolveHomeHref({
    key: resolved.key,
    client: resolved.client,
    title: resolved.title,
    start: resolved.start,
    video: resolved.video,
    cat: resolved.cat,
    mkey,
  }, loadHrefMaps(root));
  if (mkey.startsWith('ai/')) row.cat = 'AI';
  else if (mkey.startsWith('sound/')) row.cat = 'Sound';
  else if (mkey.startsWith('visual-effects/')) row.cat = 'Visual Effects';
  const prev = path.join(previewDir, `${resolved.key}.mp4`);
  if (fs.existsSync(prev) && fs.statSync(prev).size > 1000) {
    row.preview = `/assets/home-previews/${resolved.key}.mp4`;
  }
  return row;
}