import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const p = path.join(root, 'Capabilities', 'vfx', 'index.html');
const frag = fs.readFileSync(path.join(root, 'Capabilities', '_craft-slides-fragment.html'), 'utf8');
let h = fs.readFileSync(p, 'utf8');

const startRe = /  <!-- [═]+[\s\S]*?24 · CRAFT/;
const endRe = /  <!-- [═]+[\s\S]*?32 · OUR FOCUS/;

const startM = h.match(startRe);
const endM = h.match(endRe);
if (!startM || !endM) {
  console.error('start', !!startM, 'end', !!endM);
  process.exit(1);
}
const a = startM.index;
const b = endM.index;
h = h.slice(0, a) + frag + '\n\n' + h.slice(b);
fs.writeFileSync(p, h);
console.log('Spliced craft slides', a, '->', b);
