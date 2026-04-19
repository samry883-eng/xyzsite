import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(
  __dirname,
  '..',
  'Capabilities',
  'assets',
  'pitch-embed',
  'iyby7f',
  'manifest.json'
);

const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const byUuid = new Map();

m.assets.forEach((a, i) => {
  if (!a.url.includes('imgproxy')) return;
  const ma = a.url.match(
    /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  );
  if (!ma) return;
  const uuid = ma[1];
  const cur = byUuid.get(uuid);
  const firstIdx = cur ? cur.firstIdx : i;
  if (!cur || a.bytes > cur.bytes) {
    byUuid.set(uuid, {
      uuid,
      local: a.local,
      bytes: a.bytes,
      firstIdx,
    });
  } else {
    byUuid.set(uuid, { ...cur, firstIdx });
  }
});

const slides = [...byUuid.values()].sort((a, b) => a.firstIdx - b.firstIdx);
const outPath = path.join(
  __dirname,
  '..',
  'Capabilities',
  'assets',
  'pitch-embed',
  'iyby7f',
  'slides.json'
);
fs.writeFileSync(outPath, JSON.stringify({ slug: 'iyby7f', slides }, null, 2));
console.log('slides:', slides.length, '→', outPath);
