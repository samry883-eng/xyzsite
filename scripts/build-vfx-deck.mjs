#!/usr/bin/env node
/**
 * Generates Capabilities/vfx/index.html from the reference design system
 * (Geist + JetBrains Mono + Helvetica Neue, 1920×1080 artboards).
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'Capabilities/vfx/index.html');
const TOTAL = 27;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function slideWrap(inner, active = false) {
  return `<div class="slide${active ? ' active' : ''}"><div class="slide-inner"><div class="artboard-scaler">${inner}</div></div></div>`;
}

function artboard(cls, label, body, extra = '') {
  return `<section class="vfx-artboard ${cls}" data-screen-label="${esc(label)}"${extra}>${body}</section>`;
}

function metaTL(dim) {
  return `<span class="m-tl"><b>XYZ</b> <span class="d">${dim}</span></span>`;
}

function metaTR(num, opts = {}) {
  const { breakdown, hideOnSlide } = opts;
  if (breakdown) {
    return `<span class="m-tr"><span class="d">Breakdown</span> ${breakdown}</span>`;
  }
  const n = String(num).padStart(2, '0');
  const t = String(TOTAL).padStart(2, '0');
  const inner = hideOnSlide ? '' : `${n} / ${t}`;
  return `<span class="m-tr">${inner ? `<span class="d">${inner}</span>` : ''}</span>`;
}

function metaFoot() {
  return '<span class="m-bl"></span><span class="m-br"></span>';
}

function cover() {
  return artboard('cover', '01 Cover', `
${metaTL('· Studios — Visual Effects')}
${metaTR('', { hideOnSlide: true })}
<img class="cover-hero" src="/capabilities/assets/cover-hero.png" alt="" decoding="async" fetchpriority="high" />
<div class="cover-grad"></div>
<div class="abs cover-headline">
  <h1 class="h-hero">Creative,<br>end to end.</h1>
</div>
<div class="abs cover-aside">
  <p class="copy cover-copy">A boutique post-production house spanning visual effects, CGI, animation and sound — selective on purpose, and hands-on from concept to final delivery.</p>
</div>
<a href="mailto:inquiries@xyzstudios.co" class="abs lbl deck-link cover-footer-link" style="left:64px;bottom:48px;font-size:12px;">↗ &nbsp;inquiries@xyzstudios.co</a>
<span class="abs lbl dim" style="right:64px;bottom:48px;font-size:12px;">xyzstudios.co</span>
<span class="m-tr cover-cap-tr"><span class="d">Capabilities ·</span> 2026</span>
<span class="abs cover-scroll-hint">scroll or use arrow keys</span>
${metaFoot()}`);
}

function focusSlide() {
  const imgs = [
    ['/capabilities/deck-media/image-4-1.jpg', '01 —', 'Early Development'],
    ['/capabilities/deck-media/image-4-2.jpg', '02 —', 'Look Exploration'],
    ['/capabilities/deck-media/image-4-3.jpg', '03 —', 'Full-Shot Execution'],
    ['/capabilities/deck-media/image-4-4.jpg', '04 —', 'Roto &amp; Matte'],
    ['/capabilities/deck-media/image-4-5.jpg', '05 —', 'Final Polish'],
  ];
  const cols = imgs.map(([src, ix, nm]) => `
    <div class="focus-col">
      <img src="${src}" alt="" loading="lazy" decoding="async" />
      <div class="focus-cap"><span class="d">${ix}</span> ${nm}</div>
    </div>`).join('');
  return artboard('focus bg-paper', '02 Our Focus', `
${metaTL('· The Studio')}
${metaTR(2)}
<div class="abs focus-top">
  <div class="focus-top-l">
    <div class="eyebrow">Our focus</div>
    <h2 class="h-section">Every stage of the shot,<br>in our hands.</h2>
  </div>
  <p class="copy focus-top-r">One shot, tracked end to end — from the first dev pass to the final composite. Same building, same team.</p>
</div>
<div class="abs focus-strip">${cols}</div>
${metaFoot()}`);
}

function pipelineSlide() {
  const steps = ['Concept', 'Pre-vis', 'Plate', 'Asset', 'CG', 'Comp', 'Polish', 'Sound'];
  const nodes = steps.map((name, i) => `
    <div class="pipe-node">
      <div class="pipe-dot"></div>
      <div class="pipe-ix">${String(i + 1).padStart(2, '0')}</div>
      <div class="pipe-nm">${name}</div>
    </div>`).join('');
  return artboard('pipeline', '03 Pipeline', `
${metaTL('· How we work')}
${metaTR(3)}
<div class="abs pipe-intro">
  <div class="eyebrow">The pipeline</div>
  <h2 class="h-pipe">From concept<br>to final frame.</h2>
</div>
<div class="abs pipe-track">
  <div class="pipe-line"></div>
  <div class="pipe-grid">${nodes}</div>
</div>
<p class="abs copy pipe-foot">Concept, production and post all happen in the same building, with the same team.</p>
${metaFoot()}`);
}

function dividerSlide(label, screenLabel, num, sectionTag, eyebrow, title, img) {
  return artboard(`divider ${sectionTag}`, screenLabel, `
<img class="div-hero" src="${img}" alt="" loading="lazy" decoding="async" />
<div class="div-grad"></div>
${metaTL(`· ${sectionTag === 'div-selected' ? 'Selected Work' : sectionTag === 'div-craft' ? 'Craft' : 'Full Production'}`)}
${metaTR(num, { breakdown: null })}
<div class="abs div-copy">
  <div class="div-eyebrow">${eyebrow}</div>
  <h2 class="h-divider">${title}</h2>
</div>
${metaFoot()}`);
}

function projectSlide(opts) {
  const {
    num, section, eyebrow, title, video, scope, build, output,
    cols3 = true, breakdownBtn = false, clipStart, clipEnd,
  } = opts;
  const grid = cols3 ? `
    <div class="proj-grid">
      <div><div class="proj-lbl">Scope</div><div class="proj-val">${scope}</div></div>
      <div><div class="proj-lbl">Build</div><div class="proj-val">${build}</div></div>
      <div><div class="proj-lbl">Output</div><div class="proj-val">${output}</div></div>
    </div>` : `
    <div class="proj-grid proj-grid--meta">${scope}</div>`;
  const clipAttrs = clipStart != null ? ` data-clip-start="${clipStart}" data-clip-end="${clipEnd}"` : '';
  const btn = breakdownBtn
    ? `<button type="button" class="breakdown-btn">View Breakdown <span>→</span></button>`
    : '';
  return artboard('project', `${String(num).padStart(2, '0')} ${title.split('<')[0].trim()}`, `
<video class="proj-bg" muted loop playsinline preload="metadata" src="${video}"${clipAttrs}></video>
<div class="proj-grad"></div>
${metaTL(`· ${section}`)}
${metaTR(num)}
${btn}
<div class="abs proj-panel${breakdownBtn ? ' proj-panel--rbc' : ''}">
  <div class="proj-ey">${eyebrow}</div>
  <h2 class="h-proj">${title}</h2>
  ${grid}
</div>
${metaFoot()}`);
}

function breakdownSlide(num, part, title, body, gridHtml) {
  return artboard('breakdown bg-paper', `${String(num).padStart(2, '0')} RBC · ${title}`, `
${metaTL('· RBC — Breakdown')}
${metaTR(num, { breakdown: `${part} / 05` })}
<div class="abs bd-head">
  <div class="bd-head-l">
    <div class="bd-sub">Rory McIlroy · RBC Canadian Open</div>
    <h2 class="h-bd">${title}</h2>
  </div>
  <p class="copy bd-head-r">${body}</p>
</div>
<div class="abs bd-media">${gridHtml}</div>
<button type="button" class="deck-go-back">← Go back</button>
${metaFoot()}`);
}

function stillSlide(num, label, src, alt = '') {
  return artboard('still', `${String(num).padStart(2, '0')} ${label}`, `
<img class="still-full" src="${src}" alt="${esc(alt || label)}" loading="lazy" decoding="async" />
${metaFoot()}`);
}

function craftLayoutSlide(num, craftPart, title, body, mediaHtml) {
  return artboard('craft-layout', `${String(num).padStart(2, '0')} ${title}`, `
${metaTL('· Craft')}
${metaTR(num)}
<div class="abs craft-copy">
  <div class="craft-ix">Craft — ${craftPart}</div>
  <h2 class="h-craft">${title}</h2>
  <p class="copy craft-body">${body}</p>
</div>
<div class="abs craft-media">${mediaHtml}</div>
${metaFoot()}`);
}

function contactSlide() {
  return artboard('contact', '27 Contact', `
${metaTL('· Studios — Visual Effects')}
${metaTR(27)}
<div class="abs contact-main">
  <div class="eyebrow">Start a project</div>
  <h2 class="h-contact">Let's make<br>something.</h2>
  <a href="mailto:inquiries@xyzstudios.co" class="contact-email deck-link">inquiries@xyzstudios.co</a>
</div>
<span class="abs lbl" style="left:64px;bottom:48px;font-size:12px;">Boutique Post-Production House · Est. 2024</span>
<span class="abs lbl dim" style="right:64px;bottom:48px;font-size:12px;">xyzstudios.co</span>
${metaFoot()}`);
}

// ── Slide definitions ──
const slides = [
  cover(),
  focusSlide(),
  pipelineSlide(),
  dividerSlide('Full Production', '04 Full Production', 4, 'div-full', 'Concept to delivery', 'Full<br>production.', '/Work/visual-effects/s-lab-manifesto/image%201.png'),
  projectSlide({
    num: 5, section: 'Full Production', eyebrow: 'Salomon · 2025 — Dir. Lenn Anton',
    title: 'Speedcross 6', video: 'https://r2.vidzflow.com/source/ef1dc602-5a95-4973-a0ea-82794726bc4a.mp4',
    scope: 'Concept to Final Delivery · Creative Direction · Production · VFX · CG · AI · Compositing · Editing · Sound Design &amp; Mix',
    build: '60% Live Action<br>33% AI<br>7% CGI', output: '214 Final Frames<br>2 Hero Shots',
  }),
  projectSlide({
    num: 6, section: 'Full Production', eyebrow: 'Atomic · 2025 — Dir. Dris Yousif',
    title: 'Into the Void', video: 'https://r2.vidzflow.com/source/cbf82991-c743-4045-8898-b6ee78efd9b4.mp4',
    scope: 'Concept to Final Delivery · Creative Direction · Production · CG · Simulation · Compositing · Editing · Sound Design &amp; Mix',
    build: '1 Environment<br>92% CG<br>8% AI', output: '1400 Final Frames<br>10 Hero Shots',
    clipStart: 24, clipEnd: 33,
  }),
  projectSlide({
    num: 7, section: 'Full Production', eyebrow: 'RBC · 2025 — Dir. Samry Yussuf',
    title: 'RBC Canadian Open', video: 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/85D_It6HUS/original',
    scope: 'Concept to Final Delivery · Creative Direction · Production · VFX · CG · Compositing · Editing · Sound Design &amp; Mix',
    build: '4 Environments<br>72% CG<br>20% MoGraph · 7% Live', output: '1009 Final Frames<br>8 Hero Shots',
    breakdownBtn: true,
  }),
  breakdownSlide(8, '01', 'Storyboard',
    'With no live shoot possible, the client asked us to develop the creative direction and bring the concept to life. We crafted a stylized 3D hype reel — taking the project from concept art through to final execution, with the client closely involved throughout as we shaped the visuals around Rory\'s momentum and the anticipation of the tournament.',
    `<div class="bd-grid bd-grid--sb">
      <div class="bd-cell"><img src="/capabilities/Case%20Studies/Storyboard%20left%20side.png" alt="" /></div>
      <div class="bd-cell"><video muted loop playsinline preload="metadata" src="https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/85D_It6HUS/original"></video></div>
    </div>`),
  breakdownSlide(9, '02', 'Pre-visualization',
    'Before moving into final production, we built a full pre-vis to map out pacing, camera moves and overall flow — giving the client a clear first look at how the story would unfold on screen. Reviewing timing, framing and energy early kept everyone aligned creatively before resources went into final rendering and polish.',
    `<div class="bd-grid" style="grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:18px;">
      <div class="bd-cell" style="grid-row:span 2"><img src="/Work/visual-effects/canadian-open/Golf%20Final%20(4)%20(0-00-36-15).png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/22.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/2.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/1.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/22.png" alt="" /></div>
    </div>`),
  breakdownSlide(10, '03', 'Asset Prep',
    'The client asked that specific elements feature within the reel to tie back to Rory and the tournament. We developed 3D assets for the Osprey bird (a nod to the course), Rory\'s championship ring, the custom gold ball and the RBC Canadian Open trophy — each designed and integrated to enhance the narrative while aligning with the overall creative direction.',
    `<div class="bd-grid" style="grid-template-columns:1.4fr 1fr 1fr 1.5fr;grid-template-rows:1fr 1fr;gap:18px;">
      <div class="bd-cell" style="grid-row:span 2"><img src="/Work/visual-effects/canadian-open/1.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/22.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/2.png" alt="" /></div>
      <div class="bd-cell" style="grid-row:span 2"><img src="/Work/visual-effects/canadian-open/Golf%20Final%20(4)%20(0-00-36-15).png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/22.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/2.png" alt="" /></div>
    </div>`),
  breakdownSlide(11, '04', 'Environment',
    'With no shoot possible, we relied on archival footage of Rory and rebuilt the tournament setting digitally. Using detailed course maps as a base, we laid out and modeled the landscapes of Osprey Valley — re-creating and enhancing textures, rebuilding surfaces and scattering nature to deliver fully CG environments that replicate the real course while supporting the stylized, cinematic direction of the reel.',
    `<div class="bd-grid" style="grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:18px;">
      <div class="bd-cell" style="grid-row:span 2"><img src="/Work/visual-effects/canadian-open/Golf%20Final%20(4)%20(0-00-36-15).png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/1.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/2.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/22.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/1.png" alt="" /></div>
    </div>`),
  breakdownSlide(12, '05', 'Reference',
    'The client provided detailed references of Osprey Valley, which we used as the foundation for the build. These materials ensured the environments were accurate to the real course and helped us deliver a CG space that feels authentic and true to the tournament setting.',
    `<div class="bd-grid" style="grid-template-columns:1fr 1.5fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:18px;">
      <div class="bd-cell" style="grid-row:span 2"><img src="/Work/visual-effects/canadian-open/2.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/22.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/1.png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/2.png" alt="" /></div>
      <div class="bd-cell" style="grid-column:span 2"><img src="/Work/visual-effects/canadian-open/Golf%20Final%20(4)%20(0-00-36-15).png" alt="" /></div>
      <div class="bd-cell"><img src="/Work/visual-effects/canadian-open/1.png" alt="" /></div>
    </div>`),
  dividerSlide('Selected Work', '13 Selected Work', 13, 'div-selected', '2024 — 2026', 'Selected<br>work.', '/Work/visual-effects/s-lab-manifesto/image%202.png'),
  projectSlide({
    num: 14, section: 'Selected Work', eyebrow: 'Toyota · 2026 — Dir. Jack Botti',
    title: 'Road to Palisades', video: 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/9O7xsj76Lw/original',
    scope: 'Creative Direction · VFX · CG · Animation · Clean Up · Compositing',
    build: '90% Live Action<br>33% AI<br>7% CGI', output: '214 Final Frames<br>5 Hero Shots',
  }),
  projectSlide({
    num: 15, section: 'Selected Work', eyebrow: 'CONCACAF · 2025 — Dir. Toby Preyer',
    title: 'Gold Cup', video: 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/Bl0RrW0k4E/original',
    scope: 'CGI · Crowd Simulation / Integration · Compositing · FX Simulation · Clean Up',
    build: '10% CG<br>10% Motion Graphics<br>80% Live Action', output: '730 Final Frames<br>12 Hero Shots',
  }),
  projectSlide({
    num: 16, section: 'Selected Work', eyebrow: 'Doritos · 2025 — Dir. Dylan Bradshaw',
    title: 'Stranger Things', video: 'https://r2.vidzflow.com/source/8c451a49-eb58-4534-becf-87f4ca6f51dd.mp4',
    scope: 'Character Rigging · Animation · Texture · CG',
    build: '100% CG', output: '214 Final Frames<br>5 Hero Shots',
  }),
  projectSlide({
    num: 17, section: 'Selected Work', eyebrow: 'Celsius · 2025',
    title: 'Spritz Vibe', video: 'https://r2.vidzflow.com/source/c5bfdb30-f5d1-4f1d-a96f-b736b4ab1fcf.mp4',
    scope: 'Pre-Production · VFX · CG · Simulation · Clean Up · Compositing · Sound Design &amp; Mix',
    build: '1 Environment<br>40% CG · 60% Live', output: '992 Final Frames<br>8 Hero Shots',
  }),
  projectSlide({
    num: 18, section: 'Selected Work', eyebrow: 'Nike — Dir. Alexis Belhumeur',
    title: 'France World Cup', video: 'https://r2.vidzflow.com/source/d93de57b-6909-4f1e-81d3-8d1f6252c2f7.mp4',
    cols3: false,
    scope: `
      <div><div class="proj-lbl">Discipline</div><div class="proj-val">Visual Effects</div></div>
      <div><div class="proj-lbl">Directed by</div><div class="proj-val">Alexis Belhumeur</div></div>
      <div><div class="proj-lbl">Agency</div><div class="proj-val">Knas</div></div>`,
    build: '', output: '',
  }),
  projectSlide({
    num: 19, section: 'Selected Work', eyebrow: 'Chanel — Dir. Lenn Anton',
    title: 'Sous La Lune', video: 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/2oBYsIWabd/original',
    cols3: false,
    scope: `
      <div><div class="proj-lbl">Discipline</div><div class="proj-val">AI Production</div></div>
      <div><div class="proj-lbl">Directed by</div><div class="proj-val">Lenn Anton</div></div>
      <div><div class="proj-lbl">Produced by</div><div class="proj-val">Obsidian</div></div>`,
    build: '', output: '',
  }),
  projectSlide({
    num: 20, section: 'Selected Work', eyebrow: 'Mercedes-Benz — XYZ Studios',
    title: 'A Cold Wall', video: 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/LWep2Duvk-/original',
    cols3: false,
    scope: `
      <div><div class="proj-lbl">Discipline</div><div class="proj-val">AI Production</div></div>
      <div><div class="proj-lbl">Directed by</div><div class="proj-val">XYZ Studios</div></div>
      <div><div class="proj-lbl">Produced by</div><div class="proj-val">XYZ Studios</div></div>`,
    build: '', output: '',
  }),
  stillSlide(21, 'Craft', '/capabilities/assets/deck-stills/08-craft.jpg', 'Craft'),
  stillSlide(22, 'Creative Dev', '/capabilities/assets/deck-stills/09-creative-development.jpg', 'Creative Development'),
  craftLayoutSlide(23, '03 / 06', 'CG Integration &amp; Environments',
    'CG elements embedded into live-action plates with accurate tracking, lighting and material response — plus full digital environments, from set extensions to complete builds, matched to the tone of every sequence.',
    `<div class="craft-grid craft-grid--cg">
      <div class="craft-row">
        <div class="craft-tile"><img src="/capabilities/assets/deck-stills/10-cg-integration.jpg" alt="" /><span class="craft-tag">Integration</span></div>
        <div class="craft-tile"><img src="/capabilities/deck-media/image-10-1.webp" alt="" /></div>
        <div class="craft-tile"><img src="/capabilities/deck-media/image-11-2.webp" alt="" /></div>
      </div>
      <div class="craft-row">
        <div class="craft-tile"><img src="/capabilities/assets/deck-stills/11-cg-environments.jpg" alt="" /><span class="craft-tag">Environments</span></div>
        <div class="craft-tile"><img src="/capabilities/deck-media/image-11-3.jpg" alt="" /></div>
        <div class="craft-tile"><img src="/capabilities/deck-media/image-11-4.webp" alt="" /></div>
      </div>
    </div>`),
  craftLayoutSlide(24, '04 / 06', 'Compositing &amp; Polish',
    'Live-action and rendered elements unified through precise control of depth, exposure and colour — then cleanup, beauty work and set extensions that refine continuity and deliver a clean, cohesive finish.',
    `<div class="craft-grid craft-grid--comp">
      <div class="craft-tile"><img src="/capabilities/assets/deck-stills/12-compositing.jpg" alt="" /></div>
      <div class="craft-tile"><img src="/capabilities/deck-media/image-12-2.jpg" alt="" /></div>
      <div class="craft-tile"><img src="/capabilities/deck-media/image-12-3.jpg" alt="" /></div>
      <div class="craft-tile"><img src="/capabilities/assets/deck-stills/14-polish.jpg" alt="" /></div>
      <div class="craft-tile"><img src="/capabilities/deck-media/image-14-2.jpg" alt="" /></div>
      <div class="craft-tile"><img src="/capabilities/deck-media/image-14-3.jpg" alt="" /></div>
    </div>`),
  stillSlide(25, 'Simulation &amp; FX', '/capabilities/assets/deck-stills/13-simulation-and-fx.jpg'),
  stillSlide(26, 'AI Workflow', '/capabilities/assets/deck-stills/16-ai-assisted-workflow.jpg', 'AI-Assisted Workflow'),
  contactSlide(),
];

const slideHtml = slides.map((s, i) => slideWrap(s, i === 0)).join('\n\n');

const cssPath = join(ROOT, 'Capabilities/vfx/deck.css');
const jsPath = join(ROOT, 'Capabilities/vfx/deck.js');
const css = readFileSync(cssPath, 'utf8');
const js = readFileSync(jsPath, 'utf8');

const html = `<!DOCTYPE html>
<html lang="en" class="deck-protect" data-fonts-pending>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<title>XYZ Studios — Visual Effects · 2026</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=block" rel="stylesheet" />
<link rel="stylesheet" href="/capabilities/assets/nda-modal.css" />
<style>
${css}
</style>
</head>
<body>

<div id="deck-viewport">
<div id="deck-stage">
<div id="deck">

${slideHtml}

</div>
<div id="deck-slide-number" aria-hidden="true"></div>
<div id="deck-slide-label" aria-hidden="true"></div>
<div id="nav-dots"></div>
<div id="progress"></div>
<div id="hint">scroll or use arrow keys</div>
</div>
</div>

<div id="pj-cursor" aria-hidden="true">
  <svg id="pj-cursor-svg" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
    <path id="pj-cursor-path" d="M8 5v14l11-7z"/>
  </svg>
</div>

<script>
${js}
</script>
<script src="/capabilities/assets/nda-modal.js" defer></script>
</body>
</html>
`;

writeFileSync(OUT, html, 'utf8');
console.log(`Wrote ${OUT} (${TOTAL} slides)`);
