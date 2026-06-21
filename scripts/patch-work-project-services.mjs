import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workRoot = path.join(__dirname, '..', 'Work');
const tag = '<script src="/work/assets/xyz-project-catalog.js"></script>';
let n = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') {
      const rel = path.relative(workRoot, p).replace(/\\/g, '/');
      if (rel === 'index.html' || rel === 'project/index.html' || rel.startsWith('unified')) continue;
      let s = fs.readFileSync(p, 'utf8');
      if (s.includes('xyz-project-catalog.js') || s.includes('xyz-project-services.js')) continue;
      if (!s.includes('</body>')) continue;
      s = s.replace('</body>', tag + '\n</body>');
      fs.writeFileSync(p, s);
      n++;
    }
  }
}

walk(workRoot);
console.log('[patch-work-project-services] injected into', n, 'project pages');
