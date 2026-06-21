import fs from 'fs';
import path from 'path';
import { buildDefaultCatalog } from './projects-default-catalog.mjs';

function normVideo(url) {
  if (!url) return '';
  return String(url).split('?')[0].replace(/\/$/, '').toLowerCase();
}

function normKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function catFromMkey(mkey) {
  if (!mkey) return '';
  if (mkey.startsWith('ai/')) return 'AI';
  if (mkey.startsWith('sound/')) return 'Sound';
  if (mkey.startsWith('visual-effects/')) return 'Visual Effects';
  return '';
}

function parseAdminBlocks(html) {
  const dataM = html.match(/var DATA = (\{[\s\S]*?\});\s*\nvar HOME/);
  const catM = html.match(/var CATALOG = (\{[\s\S]*?\});\s*\nvar HOMEDEF/);
  return {
    data: dataM ? JSON.parse(dataM[1]) : null,
    catalog: catM ? JSON.parse(catM[1]) : null,
  };
}

/** Build lookup tables: admin key, normalized key, and source video URL → mkey. */
export function loadMkeyMaps(root) {
  const byKey = {};
  const byNormKey = {};
  const byVideo = {};

  function add(key, mkey, cat) {
    const ent = { mkey, cat: cat || catFromMkey(mkey) };
    if (key) {
      byKey[key] = ent;
      byNormKey[normKey(key)] = ent;
    }
    return ent;
  }

  try {
    const adminPath = path.join(root, 'Admin', 'index.html');
    const { data, catalog } = parseAdminBlocks(fs.readFileSync(adminPath, 'utf8'));
    if (data) {
      for (const cat of data.categories || []) {
        for (const p of data.projects[cat] || []) {
          if (p.key && p.mkey) add(p.key, p.mkey, catFromMkey(p.mkey) || cat);
        }
      }
    }
    if (catalog) {
      for (const [key, c] of Object.entries(catalog)) {
        const ent = byKey[key];
        if (ent && c.video) byVideo[normVideo(c.video)] = ent;
      }
    }
  } catch (e) {
    console.error('[home-mkey] admin read failed', e && e.message);
  }

  for (const p of buildDefaultCatalog().projects) {
    const mkey = `${p.category}/${p.slug}`;
    const ent = add(null, mkey, catFromMkey(mkey));
    if (p.video) byVideo[normVideo(p.video)] = ent;
  }

  return { byKey, byNormKey, byVideo };
}

/** @deprecated use loadMkeyMaps */
export function loadMkeyMap(root) {
  const { byKey } = loadMkeyMaps(root);
  const map = {};
  for (const [k, v] of Object.entries(byKey)) map[k] = v.mkey;
  return map;
}

export function resolveHomeMkey(row, maps) {
  if (!row) return row;
  const { byKey, byNormKey, byVideo } = maps || {};
  let hit = byKey?.[row.key];
  if (!hit && row.key) hit = byNormKey?.[normKey(row.key)];
  if (!hit && row.video) hit = byVideo?.[normVideo(row.video)];
  const mkey = hit?.mkey || row.mkey || '';
  const cat = hit?.cat || catFromMkey(mkey) || row.cat || '';
  return { ...row, mkey, cat: cat || row.cat };
}

/** mkey / video → canonical project href from the default catalog (+ optional local file). */
export function loadHrefMaps(root) {
  const byMkey = {};
  const byVideo = {};
  function add(p) {
    const mkey = `${p.category}/${p.slug}`;
    if (!p.href) return;
    byMkey[mkey] = p.href;
    if (p.video) byVideo[normVideo(p.video)] = p.href;
  }
  for (const p of buildDefaultCatalog().projects) add(p);
  if (root) {
    try {
      const catPath = path.join(root, 'data', 'projects-catalog.json');
      if (fs.existsSync(catPath)) {
        const c = JSON.parse(fs.readFileSync(catPath, 'utf8'));
        for (const p of c.projects || []) add(p);
      }
    } catch (e) {
      console.error('[home-mkey] catalog href read failed', e && e.message);
    }
  }
  return { byMkey, byVideo };
}

export function resolveHomeHref(row, hrefMaps) {
  if (!row) return row;
  const mkey = row.mkey || '';
  const href = row.href
    || hrefMaps?.byMkey?.[mkey]
    || (row.video && hrefMaps?.byVideo?.[normVideo(row.video)])
    || (mkey ? `/work/${mkey}/` : '');
  return href ? { ...row, href } : row;
}

export function normalizeHomeList(homeList, root) {
  if (!homeList || !homeList.length) return homeList;
  const maps = loadMkeyMaps(root);
  return homeList.map((x) => resolveHomeMkey(x, maps));
}
