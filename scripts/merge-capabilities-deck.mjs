/**
 * Builds Capabilities/vfx/index.html from deck-legacy.html:
 * slide 1 (cover), About, and Highlighted Work grid use pitch-embed AVIFs; slide 6+ stays legacy.
 * PDF: Capabilities/assets/XYZStudios-Capabilities-Deck-2026.pdf
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const legacyPath = path.join(root, 'Capabilities', 'deck-legacy.html');
const slidesPath = path.join(
  root,
  'Capabilities',
  'assets',
  'pitch-embed',
  'iyby7f',
  'slides.json'
);

const { slides: pitchSlides } = JSON.parse(fs.readFileSync(slidesPath, 'utf8'));
const asset = (i) => '/capabilities/assets/' + pitchSlides[i].local;

let html = fs.readFileSync(legacyPath, 'utf8');

const pitchCss = `
    /* Slide 1 — Pitch / PDF cover export (full-bleed) */
    .slide-pitch { background: #000; }
    .slide-pitch .slide-inner {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      padding: 0;
    }
    .slide-pitch img {
      width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;
    }
    #deck-pdf-link {
      position: absolute;
      top: var(--pt);
      right: calc(var(--p) + 6.25rem);
      left: auto;
      z-index: 200;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.38);
      text-decoration: underline;
      text-underline-offset: 3px;
      pointer-events: auto;
    }
    #deck-pdf-link:hover { color: rgba(255, 255, 255, 0.65); }
`;

html = html.replace('  </style>', pitchCss + '\n  </style>');

const pitchSlide1 = `  <!-- 01 · COVER — Pitch export (PDF p.1); source AVIF in /capabilities/assets/pitch-embed/ -->
  <div class="slide slide-pitch active" data-index="0" data-deck-chrome="full">
    <div class="slide-inner">
      <img src="${asset(0)}" alt="" width="1920" height="1080" decoding="sync" fetchpriority="high" />
    </div>
  </div>
`;

html = html.replace(
  /<!-- ═══════════════════════════════\s*\n\s*01 · COVER[\s\S]*?(<!-- ═══════════════════════════════\s*\n\s*02 · TABLE)/s,
  pitchSlide1 + '\n\n  $1'
);

/* About — PDF § About: use pitch still */
html = html.replace(
  /<div class="about-img">\s*<div class="ph"><img src="[^"]*"/,
  `<div class="about-img">\n        <div class="ph"><img src="${asset(2)}"`
);

/* Highlighted work grid: 9 tiles from pitch pack */
const wg = [4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => asset(n));
let wi = 0;
html = html.replace(
  /<div class="wg-cell"><div class="ph"><img src="[^"]*"/g,
  () => `<div class="wg-cell"><div class="ph"><img src="${wg[wi++]}"`
);

/* Pages 1–5 only (slides 0–4): dividers from slide 5 onward stay legacy — do not swap divider images here. */

html = html.replace(
  '<div id="slide-counter">01 / 34</div>',
  '<div id="slide-counter">01 / 34</div>\n<a id="deck-pdf-link" href="/capabilities/assets/XYZStudios-Capabilities-Deck-2026.pdf" target="_blank" rel="noopener">Deck PDF</a>'
);

html = html.replace(
  '<!-- HTML/CSS deck:',
  '<!-- Merged deck: cover + About + work grid = pitch-embed; from slide 6 = legacy. Deck PDF. Source: scripts/merge-capabilities-deck.mjs -->'
);

const out = path.join(root, 'Capabilities', 'vfx', 'index.html');
fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out);
