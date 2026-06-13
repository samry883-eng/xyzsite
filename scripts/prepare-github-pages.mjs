/**
 * Flatten repo folders into dist/ for static hosting (mirrors serve.mjs routes).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
copyDir(path.join(root, 'Home', 'assets'), path.join(dist, 'assets'));

copyDir(path.join(root, 'Work'), path.join(dist, 'work'));

fs.mkdirSync(path.join(dist, 'projects'), { recursive: true });
copyFile(path.join(root, 'Work', 'index.html'), path.join(dist, 'projects', 'index.html'));

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
