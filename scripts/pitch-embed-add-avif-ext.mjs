/**
 * Renames extensionless imgproxy files referenced in slides.json to .avif
 * (helps static hosts send image/avif).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(
  __dirname,
  '..',
  'Capabilities',
  'assets',
  'pitch-embed',
  'iyby7f'
);

const p = path.join(dir, 'slides.json');
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
for (const s of j.slides) {
  const rel = s.local.replace(/^pitch-embed\/iyby7f\//, '');
  const oldPath = path.join(dir, rel);
  if (!fs.existsSync(oldPath) || path.extname(oldPath)) continue;
  const newName = rel + '.avif';
  fs.renameSync(oldPath, path.join(dir, newName));
  s.local = 'pitch-embed/iyby7f/' + newName;
}
fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
console.log('slides.json + files updated');
