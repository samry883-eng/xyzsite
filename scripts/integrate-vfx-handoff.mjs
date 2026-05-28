/**
 * Integrate Capabilities handoff (deck-stage) into Capabilities/vfx/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const handoff = path.join('C:', 'Users', 'Admin', 'Documents', 'AI SITE', 'Capabilities', 'handoff');
const vfx = path.join(root, 'Capabilities', 'vfx');
const stills = path.join(root, 'Capabilities', 'assets', 'deck-stills');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Missing: ${src}`);
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

const PROJECT_VIDEOS = {
  'speedcross-hero':
    '<video autoplay muted loop playsinline src="https://r2.vidzflow.com/source/ef1dc602-5a95-4973-a0ea-82794726bc4a.mp4" poster="media/speedcross-hero.jpg"></video>',
  'void-hero':
    '<video autoplay muted loop playsinline preload="metadata" data-clip-start="24" data-clip-end="33" src="https://r2.vidzflow.com/source/cbf82991-c743-4045-8898-b6ee78efd9b4.mp4"></video>',
  'rbc-hero':
    '<video autoplay muted loop playsinline src="https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/85D_It6HUS/original" poster="media/rbc-hero.jpg"></video>',
  'goldcup-hero':
    '<video autoplay muted loop playsinline src="https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/Bl0RrW0k4E/original"></video>',
  'doritos-hero':
    '<video autoplay muted loop playsinline src="https://r2.vidzflow.com/source/8c451a49-eb58-4534-becf-87f4ca6f51dd.mp4"></video>',
  'celsius-hero':
    '<video autoplay muted loop playsinline src="https://r2.vidzflow.com/source/c5bfdb30-f5d1-4f1d-a96f-b736b4ab1fcf.mp4"></video>',
};

const CRAFT_STILLS = {
  'creative-dev': '09-creative-development.jpg',
  'cg-integration': '10-cg-integration.jpg',
  'cg-environments': '11-cg-environments.jpg',
  compositing: '12-compositing.jpg',
  simulation: '13-simulation-and-fx.jpg',
  polish: '14-polish.jpg',
  sound: '15-sound.jpg',
  ai: '16-ai-assisted-workflow.jpg',
  focus: '30-our-focus.jpg',
};

function stillSrc(file) {
  return `../assets/deck-stills/${file}`;
}

function imgTag(file, alt = '') {
  return `<img src="${stillSrc(file)}" alt="${alt}" loading="lazy" />`;
}

function injectProjectHero(html, slot, inner) {
  const re = new RegExp(
    `(data-slot="${slot}"[^>]*)(>\\s*</div>|\\s+style="[^"]*"\\s*></div>)`,
    's'
  );
  return html.replace(
    re,
    `$1>${inner}</div>`
  );
}

function fillCraftSlots(html) {
  for (const [prefix, file] of Object.entries(CRAFT_STILLS)) {
    const re = new RegExp(
      `(<div class="slot" data-slot="${prefix}[^"]*"[^>]*)(></div>)`,
      'g'
    );
    html = html.replace(re, `$1>${imgTag(file)}</div>`);
  }
  return html;
}

function patchIndex(html) {
  if (!html.includes('robots')) {
    html = html.replace(
      '<meta name="viewport"',
      '<meta name="robots" content="noindex, nofollow" />\n<meta name="viewport"'
    );
  }

  html = html.replace(
    '<script src="scripts/deck-stage.js"></script>',
    '<script src="scripts/deck-stage.js"></script>\n<script src="scripts/deck-media.js" defer></script>'
  );

  // Full Production divider — background reel
  html = html.replace(
    /(<div class="divider__bg slot" data-slot="divider-full-production") style="background-image:url\('media\/divider-full-production\.jpg'\);"><\/div>/,
    `$1><video autoplay muted loop playsinline src="https://r2.vidzflow.com/source/ef1dc602-5a95-4973-a0ea-82794726bc4a.mp4" poster="media/divider-full-production.jpg"></video></div>`
  );

  for (const [slot, inner] of Object.entries(PROJECT_VIDEOS)) {
    html = injectProjectHero(html, slot, inner);
  }

  html = fillCraftSlots(html);

  // Toyota strip — use road-to-palisades stills from site work folder
  const toyotaImgs = [
    '/work/visual-effects/road-to-palisades/1.jpg',
    '/work/visual-effects/road-to-palisades/2.jpg',
    '/work/visual-effects/s-lab-manifesto/image%202.png',
  ];
  ['toyota-1', 'toyota-2', 'toyota-3'].forEach((slot, i) => {
    html = html.replace(
      new RegExp(`(<div class="slot" data-slot="${slot}"[^>]*)(></div>)`),
      `$1><img src="${toyotaImgs[i]}" alt="" loading="lazy" /></div>`
    );
  });

  return html;
}

function patchDeckCss(css) {
  const extra = `
/* VFX integration — hero / divider video */
.project__hero > video,
.divider__bg > video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.project__panel,
.project .chrome-top,
.project .corner-bl,
.project .corner-br,
.project .slide__rule,
.divider__title,
.divider .chrome-bot,
.divider .slide__rule {
  z-index: 3;
}
`;
  if (!css.includes('VFX integration')) {
    css += extra;
  }
  return css;
}

// Backup legacy native deck once
const legacyPath = path.join(vfx, 'index.legacy.html');
const currentIndex = path.join(vfx, 'index.html');
if (fs.existsSync(currentIndex) && !fs.existsSync(legacyPath)) {
  copyFile(currentIndex, legacyPath);
  console.log('Backed up index.html -> index.legacy.html');
}

copyFile(path.join(handoff, 'index.html'), path.join(vfx, 'index.html'));
copyFile(path.join(handoff, 'deck.css'), path.join(vfx, 'deck.css'));
copyDir(path.join(handoff, 'scripts'), path.join(vfx, 'scripts'));
copyDir(path.join(handoff, 'media'), path.join(vfx, 'media'));

let index = fs.readFileSync(path.join(vfx, 'index.html'), 'utf8');
index = patchIndex(index);
fs.writeFileSync(path.join(vfx, 'index.html'), index);

let css = fs.readFileSync(path.join(vfx, 'deck.css'), 'utf8');
css = patchDeckCss(css);
fs.writeFileSync(path.join(vfx, 'deck.css'), css);

const deckMedia = `(() => {
  function bindClipRange(vid) {
    const end = parseFloat(vid.dataset.clipEnd, 10);
    const start = parseFloat(vid.dataset.clipStart, 10);
    if (Number.isNaN(end) || Number.isNaN(start)) return;
    vid.addEventListener('timeupdate', () => {
      if (vid.currentTime >= end) vid.currentTime = start;
    });
    vid.addEventListener('loadedmetadata', () => {
      vid.currentTime = start;
    }, { once: true });
  }

  document.querySelectorAll('video[data-clip-start][data-clip-end]').forEach(bindClipRange);

  const stage = document.querySelector('deck-stage');
  if (!stage) return;

  function playVideos(slide) {
    if (!slide) return;
    slide.querySelectorAll('video').forEach((v) => {
      v.muted = true;
      if (v.dataset.clipStart) v.currentTime = parseFloat(v.dataset.clipStart, 10) || 0;
      v.play().catch(() => {});
    });
  }

  function pauseVideos(slide) {
    if (!slide) return;
    slide.querySelectorAll('video').forEach((v) => {
      try { v.pause(); } catch (_) {}
    });
  }

  stage.addEventListener('slidechange', (e) => {
    const { slide, previousSlide } = e.detail;
    if (previousSlide) pauseVideos(previousSlide);
    playVideos(slide);
  });

  const active = stage.querySelector('[data-deck-active]') || stage.querySelector('section');
  playVideos(active);
})();
`;

fs.writeFileSync(path.join(vfx, 'scripts', 'deck-media.js'), deckMedia);

console.log('Handoff integrated into Capabilities/vfx/');
