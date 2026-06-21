/**
 * Flatten repo folders into dist/ for static hosting (mirrors serve.mjs routes).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMkeyLookup, slimHomeRow, fetchWorkOrderForBuild } from './home-order-lib.mjs';
import { injectProjectsCatalogFile, fetchProjectsCatalog, writeProjectsServicesMap, writeProjectsPreviewMap } from './projects-catalog-lib.mjs';
import { scaffoldMissingProjectPages } from '../lib/scaffold-project-page.mjs';

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
  const order = await fetchWorkOrderForBuild();
  const homeList = order && order.homeList;
  if (homeList && homeList.length) {
    const idxFile = path.join(dist, 'index.html');
    let s = fs.readFileSync(idxFile, 'utf8');
    const previewDir = path.join(root, 'Home', 'assets', 'home-previews');
    const lookup = loadMkeyLookup(root);
    const slim = homeList.map((x) => slimHomeRow(x, previewDir, lookup, root));
    const payload = JSON.stringify({ homeList: slim }).replace(/</g, '\\u003c');
    s = s.replace(/window\.__HOME_ORDER=[\s\S]*?;\/\*XYZ_BUILD_ORDER\*\//, 'window.__HOME_ORDER=' + payload + ';/*XYZ_BUILD_ORDER*/');
    fs.writeFileSync(idxFile, s);
    console.log('[home-order] injected', homeList.length, 'videos');
  } else { console.warn('[home-order] no order fetched; using baked default'); }
} catch (e) { console.warn('[home-order] inject failed:', e && e.message); }

copyDir(path.join(root, 'Home', 'assets'), path.join(dist, 'assets'));

copyDir(path.join(root, 'Work'), path.join(dist, 'work'));

// Scaffold any catalog project pages missing from Work/ (writes into dist/work/)
try {
  const catalogForPages = await fetchProjectsCatalog(root);
  const scaffolded = scaffoldMissingProjectPages(path.join(dist, 'work'), catalogForPages);
  if (scaffolded.count) {
    console.log('[scaffold-pages] created', scaffolded.count, 'preview page(s) at build');
    scaffolded.created.forEach((p) => console.log('  +', p.category + '/' + p.slug));
  }
} catch (e) { console.warn('[scaffold-pages] failed:', e && e.message); }

// Slim preview + services maps for project preview pages (xyz-project-catalog.js)
try {
  const catalog = await fetchProjectsCatalog(root);
  const svc = await writeProjectsServicesMap(root, catalog);
  const preview = await writeProjectsPreviewMap(root, catalog);
  const distSvc = path.join(dist, 'work', 'assets', 'projects-services.json');
  const distPreview = path.join(dist, 'work', 'assets', 'projects-preview.json');
  fs.copyFileSync(svc.path, distSvc);
  fs.copyFileSync(preview.path, distPreview);
  console.log('[projects-preview] wrote', preview.count, 'entries');
  console.log('[projects-services] wrote', svc.count, 'entries');
} catch (e) { console.warn('[projects-preview] map write failed:', e && e.message); }

// Unified site admin: /work/admin.html (/work/adminv2 + legacy paths redirect here)

// Inject coordinated home-return + services scripts on project pages
function injectProjectScripts(dir) {
  const homeTag =
    '<script src="/work/assets/xyz-quick-slide.js"></script>\n<script src="/work/assets/xyz-home-return.js"></script>';
  const servicesTag = '<script src="/work/assets/xyz-project-catalog.js"></script>';
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) injectProjectScripts(p);
    else if (e.name === 'index.html') {
      const rel = path.relative(path.join(dist, 'work'), p).replace(/\\/g, '/');
      if (rel === 'index.html') continue;
      let s = fs.readFileSync(p, 'utf8');
      if (!s.includes('</body>')) continue;
      let changed = false;
      if (!s.includes('xyz-home-return.js')) {
        s = s.replace('</body>', homeTag + '\n</body>');
        changed = true;
      }
      if (!s.includes('xyz-project-catalog.js') && !s.includes('xyz-project-services.js')) {
        s = s.replace('</body>', servicesTag + '\n</body>');
        changed = true;
      }
      if (changed) fs.writeFileSync(p, s);
    }
  }
}
injectProjectScripts(path.join(dist, 'work'));

// Legacy listing URLs → /work/ (redirect stubs; grid lives at /work/ via unified index).
const legacyWorkRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=/work/">
  <link rel="canonical" href="/work/">
  <title>Work — XYZ Studios</title>
  <script>location.replace('/work/');</script>
</head>
<body><p><a href="/work/">WORK</a></p></body>
</html>
`;
fs.mkdirSync(path.join(dist, 'projects'), { recursive: true });
fs.writeFileSync(path.join(dist, 'projects', 'index.html'), legacyWorkRedirect);
fs.mkdirSync(path.join(dist, 'projects-v2'), { recursive: true });
fs.writeFileSync(path.join(dist, 'projects-v2', 'index.html'), legacyWorkRedirect);

// Public work grid at /work/ (also rewritten to unified/index.html on Vercel).
copyFile(path.join(root, 'Work', 'unified', 'index.html'), path.join(dist, 'work', 'index.html'));

// Bake catalog into the files served at /work/ and /work/unified/.
const catalogTargets = [
  path.join(dist, 'work', 'unified', 'index.html'),
  path.join(dist, 'work', 'index.html'),
];
for (const target of catalogTargets) {
  try {
    const inj = await injectProjectsCatalogFile(target, root);
    if (inj.ok) console.log('[projects-catalog] injected', inj.count, 'projects into', path.relative(dist, target));
    else console.warn('[projects-catalog] marker not found in', path.relative(dist, target));
  } catch (e) { console.warn('[projects-catalog] inject failed for', path.relative(dist, target), e && e.message); }
}

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
