/**
 * One-time export: decode __bundler/manifest assets from Claude bundled deck
 * into Capabilities/assets/deck-stills/ for the native VFX deck.
 *
 * Usage: node scripts/export-bundled-deck-stills.mjs "path/to/bundled.html"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const defaultBundled = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'XYZ Studios Capabilities Deck (bundled) (1).html'
);
const bundledPath = process.argv[2] || defaultBundled;
const outDir = path.join(root, 'Capabilities', 'assets', 'deck-stills');

/** Bundled screen label → manifest uuid */
const EXPORTS = [
  ['08-craft', '67739518-a027-4773-bced-39255b675979'],
  ['09-creative-development', '31d4be56-0064-46e0-a88a-a525bcba6059'],
  ['10-cg-integration', '9b95970e-a264-4b36-b6af-a226dcc6bb66'],
  ['11-cg-environments', 'f3fbb8a7-9a88-445f-8abf-33924203078d'],
  ['12-compositing', '5e87f644-338f-45f2-9392-3a3e736d2f37'],
  ['13-simulation-and-fx', '331ca6ff-5235-450a-a0d4-272f49eedfee'],
  ['14-polish', 'b650137d-efee-42e1-ae12-5871d2596da1'],
  ['15-sound', 'ca70a4c5-4fba-48a2-9b90-df44a1f06cda'],
  ['16-ai-assisted-workflow', '72965422-1b05-4b38-810a-a0bde5bdc291'],
  ['30-our-focus', 'f40ad1cc-42fd-475c-b75f-7d7618c59884'],
  ['31-how-we-work', '5b129586-3ffa-4cf2-b606-4fd85354119d'],
  ['32-contact', '1d598fad-9617-4af9-a9ca-a5bc8a9a173a'],
];

function extForMime(mime) {
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('woff')) return '.woff2';
  return '.bin';
}

async function decodeEntry(entry) {
  const binaryStr = Buffer.from(entry.data, 'base64');
  if (!entry.compressed) return binaryStr;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const rs = Readable.from(binaryStr);
    const gunzip = createGunzip();
    gunzip.on('data', (c) => chunks.push(c));
    gunzip.on('end', () => resolve(Buffer.concat(chunks)));
    gunzip.on('error', reject);
    rs.pipe(gunzip);
  });
}

async function main() {
  if (!fs.existsSync(bundledPath)) {
    console.error('Bundled file not found:', bundledPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(bundledPath, 'utf8');
  const m = raw.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)<\/script>/);
  if (!m) {
    console.error('No manifest in bundled file');
    process.exit(1);
  }
  const manifest = JSON.parse(m[1]);
  fs.mkdirSync(outDir, { recursive: true });

  for (const [name, uuid] of EXPORTS) {
    const entry = manifest[uuid];
    if (!entry) {
      console.warn('Missing manifest entry:', uuid, name);
      continue;
    }
    const bytes = await decodeEntry(entry);
    const ext = extForMime(entry.mime);
    const dest = path.join(outDir, name + ext);
    fs.writeFileSync(dest, bytes);
    console.log('Wrote', path.relative(root, dest), `(${(bytes.length / 1024).toFixed(0)} KB)`);
  }
  console.log('Done.', EXPORTS.length, 'files in', path.relative(root, outDir));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
