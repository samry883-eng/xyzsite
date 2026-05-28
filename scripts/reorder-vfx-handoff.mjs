/**
 * Remove handoff slides 02–03 (About, What We Do) and extra legacy slides;
 * reorder remaining slides to match handoff sequence (minus those two).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'Capabilities', 'vfx', 'index.html');

const SKIP = [
  'TABLE OF CONTENTS',
  'ABOUT',
  'HIGHLIGHTED WORK',
  'WHAT WE DO',
  'MAXMARA',
];

/** Handoff slide order after removing 02 About and 03 What We Do */
const ORDER = [
  'COVER',
  'FULL PRODUCTION',
  'SPEEDCROSS',
  'INTO THE VOID',
  'RBC CANADIAN',
  'CRAFT (bundled',
  'CREATIVE DEVELOPMENT',
  'CG INTEGRATION',
  'CG ENVIRONMENTS',
  'COMPOSITING',
  'SIMULATION AND FX',
  'POLISH',
  'SOUND',
  'AI-ASSISTED',
  'SELECTED WORK',
  'TOYOTA',
  'GOLD CUP',
  'DORITOS',
  'DIVIDER — CASE',
  'STORYBOARD',
  'PRE-VISUALIZATION',
  'ASSET PREP',
  'ENVIRONMENT',
  'REFERENCE',
  'CELSIUS / SPRITZ',
  'REFERENCES (CELSIUS)',
  'LIVE ACTION PLATE',
  'OUR FOCUS',
  'HOW WE WORK',
  'CONTACT',
];

function slideLabel(part) {
  const m = part.match(/<!--\s*[\s\S]*?·\s*([^\n]+)/);
  return m ? m[1].trim() : '';
}

function matchSlide(part, needle) {
  const label = slideLabel(part).toUpperCase();
  return label.includes(needle.toUpperCase());
}

let html = fs.readFileSync(indexPath, 'utf8');
const deckOpen = html.indexOf('<div id="deck">');
if (deckOpen < 0) throw new Error('Missing #deck');
const deckInnerStart = deckOpen + '<div id="deck">'.length;
const deckClose = html.indexOf('\n</div><!-- /deck-stage -->');
if (deckClose < 0) throw new Error('Missing deck close');

const preamble = html.slice(0, deckInnerStart);
const deckInner = html.slice(deckInnerStart, deckClose);
const postamble = html.slice(deckClose);

const parts = deckInner.split(/(?=\n  <!-- )/).filter((p) => p.trim());
const pool = [...parts];

const ordered = [];
for (const needle of ORDER) {
  const idx = pool.findIndex((p) => matchSlide(p, needle));
  if (idx < 0) {
    console.warn(`Missing slide: ${needle}`);
    continue;
  }
  ordered.push(pool.splice(idx, 1)[0]);
}

const skipped = pool.filter((p) => {
  const label = slideLabel(p);
  return SKIP.some((s) => label.toUpperCase().includes(s));
});
const leftover = pool.filter((p) => !SKIP.some((s) => slideLabel(p).toUpperCase().includes(s)));

if (leftover.length) {
  console.warn('Unplaced slides:', leftover.map(slideLabel));
}

// Strip data-index; first slide active
const slides = ordered.map((part, i) => {
  let s = part.replace(/\s*data-index="\d+"/g, '');
  s = s.replace(
    /class="slide([^"]*) active"/,
    i === 0 ? 'class="slide$1 active"' : 'class="slide$1"'
  );
  if (i === 0 && !s.includes(' active')) {
    s = s.replace(/class="slide/, 'class="slide active');
  } else if (i > 0) {
    s = s.replace(/\sactive(?=")/, '');
  }
  return s;
});

const total = slides.length;
let out = preamble + slides.join('') + postamble;
out = out.replace(/<div id="slide-counter">[^<]*<\/div>/, `<div id="slide-counter">01 / ${String(total).padStart(2, '0')}</div>`);

fs.writeFileSync(indexPath, out);
console.log(`Reordered VFX deck: ${total} slides (removed ${skipped.length + (parts.length - ordered.length - leftover.length)} sections).`);
