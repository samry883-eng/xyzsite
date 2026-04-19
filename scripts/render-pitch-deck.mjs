/**
 * Builds Capabilities/index.html from assets/pitch-embed/iyby7f/slides.json
 * Run after: node scripts/build-pitch-deck-data.mjs && node scripts/fetch-pitch-embed.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const slidesPath = path.join(
  root,
  'Capabilities',
  'assets',
  'pitch-embed',
  'iyby7f',
  'slides.json'
);
const { slides } = JSON.parse(fs.readFileSync(slidesPath, 'utf8'));

const slideHtml = slides
  .map(
    (s, i) => `  <div class="slide slide-pitch${i === 0 ? ' active' : ''}" data-index="${i}" data-deck-chrome="full">
    <div class="slide-inner">
      <img src="/capabilities/assets/${s.local}" alt="" width="1920" height="1080" decoding="${i < 2 ? 'sync' : 'async'}"${i === 0 ? ' fetchpriority="high"' : ''} />
    </div>
  </div>`
  )
  .join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en" class="deck-protect">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>XYZStudios — Capabilities Deck</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --black: #0b0b0b;
      --white: #ffffff;
      --divider: rgba(255,255,255,0.1);
      --dur: 0.88s;
      --ease: cubic-bezier(0.76, 0, 0.24, 1);
      --deck-pad-x: 64px;
      --deck-pad-y: 56px;
      --pt: 32px;
      --p: var(--deck-pad-x);
    }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: var(--black); color: var(--white);
      font-family: "Microsoft Sans Serif", "Segoe UI", Tahoma, Geneva, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    html.deck-protect, html.deck-protect body {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      touch-action: manipulation;
      -webkit-touch-callout: none;
      user-select: none;
    }
    html.deck-protect img { -webkit-user-drag: none; pointer-events: auto; }
    @media print { html.deck-protect body { display: none !important; } }

    #deck-viewport { position: fixed; inset: 0; z-index: 1; background: #000; }
    #deck-stage { position: absolute; inset: 0; overflow: hidden; container-type: size; container-name: deck; }
    #deck { position: absolute; inset: 0; overflow: hidden; }

    .slide {
      position: absolute; inset: 0;
      transform: translateY(100%);
      transition: transform var(--dur) var(--ease);
      will-change: transform;
      overflow: hidden;
    }
    .slide.active { transform: translateY(0%); }
    .slide.exit { transform: translateY(-100%); }

    .slide-pitch { background: #000; }
    .slide-pitch .slide-inner {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
    }
    .slide-pitch img {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    #deck-static-chrome {
      position: absolute; inset: 0; pointer-events: none; z-index: 9;
      opacity: 1;
      transition: opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1);
    }
    #deck-static-chrome[data-mode="compact"] #deck-static-xyz,
    #deck-static-chrome[data-mode="compact"] #deck-static-line { opacity: 0; visibility: hidden; }
    .xyz-logo {
      position: absolute; top: var(--pt); left: var(--p);
      font-size: 11px; font-weight: 500; letter-spacing: 0.13em; color: var(--white); z-index: 10;
    }
    .slide-footer-line {
      position: absolute;
      bottom: calc(var(--deck-pad-y) + 22px);
      left: var(--p); right: var(--p);
      height: 1px; background: var(--divider);
    }
    .slide-year {
      position: absolute; bottom: var(--deck-pad-y); left: var(--p);
      font-size: 11px; color: rgba(255,255,255,0.22); z-index: 10;
    }
    .slide-logo-mark {
      position: absolute;
      bottom: max(12px, calc(var(--deck-pad-y) * 0.42));
      right: var(--p); z-index: 10;
    }
    .slide-logo-mark img { height: 30px; width: auto; opacity: 0.55; }

    #progress {
      position: absolute; bottom: 0; left: 0; height: 2px;
      background: rgba(255, 255, 255, 0.45);
      transition: width var(--dur) var(--ease);
      z-index: 200;
    }
    #nav-dots {
      position: absolute;
      right: max(10px, 1.1cqw);
      top: 50%;
      transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 7px;
      z-index: 200; pointer-events: auto;
    }
    .dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: rgba(255,255,255,0.22); cursor: pointer;
      transition: background 0.3s, transform 0.3s;
    }
    .dot.active { background: rgba(255,255,255,0.85); transform: scale(1.6); }
    #slide-counter {
      position: absolute; top: var(--pt); right: var(--p);
      font-size: 10px; color: rgba(255, 255, 255, 0.22);
      letter-spacing: 0.1em; z-index: 200;
      font-variant-numeric: tabular-nums; pointer-events: none;
    }
    #hint {
      position: absolute;
      bottom: calc(var(--deck-pad-y) + 40px);
      left: 50%; transform: translateX(-50%);
      font-size: 10px; letter-spacing: 0.15em;
      color: rgba(255,255,255,0.18); text-transform: uppercase;
      z-index: 200; transition: opacity 1s; pointer-events: none;
    }
    @media (max-width: 900px) {
      :root { --deck-pad-x: 24px; --deck-pad-y: 24px; --pt: 20px; }
    }
  </style>
</head>
<body class="is-cover-active">
<div id="deck-viewport">
<div id="deck-stage">
<div id="deck">

${slideHtml}

</div>

<div id="deck-static-chrome" data-mode="full" aria-hidden="false">
  <div class="xyz-logo" id="deck-static-xyz">XYZSTUDIOS</div>
  <div class="slide-footer-line" id="deck-static-line"></div>
  <div class="slide-year" id="deck-static-year">2026</div>
  <div class="slide-logo-mark" id="deck-static-logo-mark">
    <img src="/capabilities/assets/xyz-logo.png" alt="" width="120" height="40" decoding="async" />
  </div>
</div>

<div id="nav-dots"></div>
<div id="progress"></div>
<div id="slide-counter">01 / ${String(slides.length).padStart(2, '0')}</div>
<div id="hint">scroll or use arrow keys</div>

</div>
</div>

<script>
(function () {
  function block(e) { e.preventDefault(); }
  document.addEventListener('contextmenu', block, true);
  document.addEventListener('selectstart', block, true);
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.closest && e.target.closest('img, video')) block(e);
  }, true);
  document.addEventListener('copy', block, true);
  document.addEventListener('cut', block, true);
  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    var k = e.key.toLowerCase();
    if (k === 's' || k === 'p' || k === 'u') block(e);
  }, true);
  window.addEventListener('beforeprint', block);
})();

const slides = document.querySelectorAll('.slide');
const total = slides.length;
let current = 0;
let animating = false;

const dotsWrap = document.getElementById('nav-dots');
slides.forEach(function (_, i) {
  var d = document.createElement('div');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.addEventListener('click', function () { goTo(i); });
  dotsWrap.appendChild(d);
});

const dots = document.querySelectorAll('.dot');
const counter = document.getElementById('slide-counter');
const prog = document.getElementById('progress');
const hint = document.getElementById('hint');
let hintShown = false;

function syncDeckStaticChrome() {
  var root = document.getElementById('deck-static-chrome');
  if (!root) return;
  var slide = slides[current];
  var mode = slide.dataset.deckChrome || 'full';
  root.dataset.mode = mode === 'compact' ? 'compact' : 'full';
  root.setAttribute('aria-hidden', 'false');
  root.classList.add('deck-static--visible');
}

function updateUI() {
  dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
  counter.textContent =
    String(current + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  document.body.classList.toggle('is-cover-active', current === 0);
  prog.style.width = ((current + 1) / total * 100) + '%';
  syncDeckStaticChrome();
}

function goTo(idx) {
  if (animating || idx === current || idx < 0 || idx >= total) return;
  animating = true;
  if (!hintShown) { hint.style.opacity = '0'; hintShown = true; }

  var from = slides[current];
  var to = slides[idx];
  var dir = idx > current ? 1 : -1;

  to.style.transition = 'none';
  to.style.transform = dir > 0 ? 'translateY(100%)' : 'translateY(-100%)';
  to.classList.add('active');

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      to.style.transition = '';
      to.style.transform = 'translateY(0%)';
      from.style.transform = dir > 0 ? 'translateY(-100%)' : 'translateY(100%)';

      setTimeout(function () {
        from.classList.remove('active');
        from.style.transform = '';
        from.style.transition = '';
        current = idx;
        updateUI();
        animating = false;
      }, 880);
    });
  });
}

function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }

document.addEventListener('wheel', function (e) {
  if (e.ctrlKey) { e.preventDefault(); }
}, { passive: false });
document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && ['+', '-', '=', '0'].includes(e.key)) { e.preventDefault(); return; }
  if (['ArrowDown', 'ArrowRight', 'Space', ' '].includes(e.key)) { e.preventDefault(); next(); }
  if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); prev(); }
});

var wt;
document.addEventListener('wheel', function (e) {
  if (e.ctrlKey) return;
  clearTimeout(wt);
  wt = setTimeout(function () { e.deltaY > 0 ? next() : prev(); }, 40);
}, { passive: true });

var ty = 0;
document.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', function (e) {
  var d = ty - e.changedTouches[0].clientY;
  if (Math.abs(d) > 48) d > 0 ? next() : prev();
}, { passive: true });

updateUI();
setTimeout(function () { hint.style.opacity = '0'; }, 4000);
</script>
</body>
</html>
`;

const out = path.join(root, 'Capabilities', 'index.html');
fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out, '(' + slides.length + ' slides)');
