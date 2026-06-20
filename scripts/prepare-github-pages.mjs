/**
 * Flatten repo folders into dist/ for static hosting (mirrors serve.mjs routes).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMkeyMap, slimHomeRow } from './home-order-lib.mjs';
import { injectProjectsCatalogFile } from './projects-catalog-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

rmrf(dist);
fs.mkdirSync(dist, { recursive: true });

fs.writeFileSync(path.join(dist, '.nojekyll'), '');

copyFile(path.join(root, 'Home', 'index.html'), path.join(dist, 'index.html'));

// --- Inject latest home hero order at build time (page ships static-correct; no runtime fetch/race) ---
try {
  let order = null;
  const EC = process.env.EDGE_CONFIG_ID, RT = process.env.EDGE_CONFIG_READ_TOKEN;
  if (EC && RT) {
    try { const r = await fetch(`https://edge-config.vercel.com/${EC}/item/workOrder?token=${RT}`); if (r.ok) order = await r.json(); } catch {}
  }
  if (!order) {
    try { const r = await fetch('https://www.xyzstudios.co/api/site-order'); if (r.ok) { const j = await r.json(); order = j && j.order; } } catch {}
  }
  const homeList = order && order.homeList;
  if (homeList && homeList.length) {
    const idxFile = path.join(dist, 'index.html');
    let s = fs.readFileSync(idxFile, 'utf8');
    const previewDir = path.join(root, 'Home', 'assets', 'home-previews');
    const mkeyMap = loadMkeyMap(root);
    const slim = homeList.map((x) => slimHomeRow(x, previewDir, mkeyMap));
    const payload = JSON.stringify({ homeList: slim }).replace(/</g, '\\u003c');
    s = s.replace(/window\.__HOME_ORDER=[\s\S]*?;\/\*XYZ_BUILD_ORDER\*\//, 'window.__HOME_ORDER=' + payload + ';/*XYZ_BUILD_ORDER*/');
    fs.writeFileSync(idxFile, s);
    console.log('[home-order] injected', homeList.length, 'videos');
  } else { console.warn('[home-order] no order fetched; using baked default'); }
} catch (e) { console.warn('[home-order] inject failed:', e && e.message); }

copyDir(path.join(root, 'Home', 'assets'), path.join(dist, 'assets'));

copyDir(path.join(root, 'Work'), path.join(dist, 'work'));

// Work CMS admin: /work/admin.html, /work/adminv2.html (copied via Work dir)

// Inject coordinated home-return script on project pages
function injectHomeReturn(dir) {
  const tag =
    '<script src="/work/assets/xyz-quick-slide.js"></script>\n<script src="/work/assets/xyz-home-return.js"></script>';
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) injectHomeReturn(p);
    else if (e.name === 'index.html') {
      const rel = path.relative(path.join(dist, 'work'), p).replace(/\\/g, '/');
      if (rel === 'index.html') continue;
      let s = fs.readFileSync(p, 'utf8');
      if (s.includes('xyz-home-return.js')) continue;
      if (!s.includes('</body>')) continue;
      s = s.replace('</body>', tag + '\n</body>');
      fs.writeFileSync(p, s);
    }
  }
}
injectHomeReturn(path.join(dist, 'work'));

fs.mkdirSync(path.join(dist, 'projects'), { recursive: true });
copyFile(path.join(root, 'Work', 'index.html'), path.join(dist, 'projects', 'index.html'));

fs.mkdirSync(path.join(dist, 'projects-v2'), { recursive: true });
copyFile(path.join(root, 'Work', 'unified', 'index.html'), path.join(dist, 'projects-v2', 'index.html'));
try {
  const inj = await injectProjectsCatalogFile(path.join(dist, 'projects-v2', 'index.html'), root);
  if (inj.ok) console.log('[projects-catalog] injected', inj.count, 'projects');
  else console.warn('[projects-catalog] marker not found; using inline fallback');
} catch (e) { console.warn('[projects-catalog] inject failed:', e && e.message); }

fs.mkdirSync(path.join(dist, 'projects-v3'), { recursive: true });
copyFile(path.join(root, 'Work', 'unified-v3', 'index.html'), path.join(dist, 'projects-v3', 'index.html'));

copyDir(path.join(root, 'Contact'), path.join(dist, 'contact'));

fs.mkdirSync(path.join(dist, 'contact-versions'), { recursive: true });
copyFile(path.join(root, 'Contact', 'versions.html'), path.join(dist, 'contact-versions', 'index.html'));

fs.mkdirSync(path.join(dist, 'contact-versions-2'), { recursive: true });
copyFile(path.join(root, 'Contact', 'versions2.html'), path.join(dist, 'contact-versions-2', 'index.html'));

copyDir(path.join(root, 'Services'), path.join(dist, 'services'));
copyDir(path.join(root, 'Capabilities'), path.join(dist, 'capabilities'));
copyDir(path.join(root, 'Admin'), path.join(dist, 'admin'));

const rootExtras = ['capabilitiesdeck.html'];
for (const f of rootExtras) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) copyFile(p, path.join(dist, f));
}

// GitHub project pages are served under https://user.github.io/REPO/ — prefix root-relative URLs.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
if (repoName) {
  const prefix = `/${repoName}`;
  function walkFiles(dir, fn) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkFiles(p, fn);
      else fn(p);
    }
  }
  function prefixRootPaths(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.html' && ext !== '.css') return;
    let s = fs.readFileSync(filePath, 'utf8');
    const before = s;
    s = s.replace(/\b(href|src|action)=(["'])\//g, `$1=$2${prefix}/`);
    s = s.replace(/url\(\s*\//g, `url(${prefix}/`);
    if (s !== before) fs.writeFileSync(filePath, s);
  }
  walkFiles(dist, prefixRootPaths);
  console.log('Prefixed paths for GitHub Pages repo:', prefix);
}

console.log('Prepared', dist);
