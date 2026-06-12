/**
 * Build the capabilities deck page from an extracted PPTX (Pitch export).
 *
 * Source: an unzipped .pptx (ppt/slides/slideN.xml + ppt/media).
 * Output: Capabilities/index.html (full-screen slide deck) + Capabilities/deck-media/*.
 *
 * The PPTX from Pitch is simple: black slides, absolutely-positioned text
 * boxes and images (rect-only, no rotation, no tables). We map shapes 1:1 to
 * absolutely-positioned divs inside a 1280x720 artboard that scales to fit
 * the viewport.
 *
 * Usage: node scripts/build-deck-from-pptx.mjs [path-to-extracted-pptx]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || 'C:/Users/Admin/.cursor/projects/empty-window/pptx-extract';
const SLIDES_DIR = path.join(SRC, 'ppt', 'slides');
const MEDIA_DIR = path.join(SRC, 'ppt', 'media');
const OUT_HTML = path.join(ROOT, 'Capabilities', 'index.html');
const OUT_MEDIA = path.join(ROOT, 'Capabilities', 'deck-media');
const MEDIA_URL = 'deck-media'; // relative to /capabilities/

// Slide geometry: 9144000 x 5143500 EMU = 720 x 405 pt. Artboard: 1280 x 720 px.
const SLIDE_CX = 9144000;
const SLIDE_CY = 5143500;
const PX_PER_PT = 1280 / 720; // 1.77778

// Copy fixes applied to run text (the master deck contains these typos).
const TEXT_FIXES = [
  [/Intergration/g, 'Integration'],
  [/Enviroment/g, 'Environment'],
  [/\bLinked In\b/g, 'LinkedIn'],
  [/\bMcilroy\b/g, 'McIlroy'],
  [/\bPEICE\b/g, 'PIECE'],
  [/(^|\s)Ai(\s|$)/g, '$1AI$2'],
  [/^cleanup, beauty work/, 'Cleanup, beauty work'],
  [/larger extensions, The result/g, 'larger extensions, the result'],
  [/19 - 18/g, '19 - 22'],
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fixText(t) {
  let out = String(t).replace(/[\u200b\uFEFF]/g, '');
  for (const [re, rep] of TEXT_FIXES) out = out.replace(re, rep);
  return out;
}

const px = (pt) => Math.round(pt * PX_PER_PT * 100) / 100;
const pctX = (emu) => Math.round((emu / SLIDE_CX) * 100000) / 1000;
const pctY = (emu) => Math.round((emu / SLIDE_CY) * 100000) / 1000;

// ---------- tiny XML helpers (regex-based; fine for Pitch's flat output) ----------

/** Find balanced top-level elements with the given tag inside xml string. */
function findElements(xml, tag) {
  const out = [];
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let i = 0;
  while (true) {
    const start = xml.indexOf(open, i);
    if (start === -1) break;
    const afterOpen = xml.charAt(start + open.length);
    if (afterOpen !== ' ' && afterOpen !== '>' && afterOpen !== '/') {
      i = start + open.length;
      continue;
    }
    // self-closing?
    const gtIdx = xml.indexOf('>', start);
    if (xml.charAt(gtIdx - 1) === '/') {
      out.push(xml.slice(start, gtIdx + 1));
      i = gtIdx + 1;
      continue;
    }
    // balanced search
    let depth = 1;
    let j = gtIdx + 1;
    while (depth > 0) {
      const nextOpen = xml.indexOf(open, j);
      const nextClose = xml.indexOf(close, j);
      if (nextClose === -1) {
        j = xml.length;
        break;
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // ensure it's a real tag boundary
        const c = xml.charAt(nextOpen + open.length);
        if (c === ' ' || c === '>' || c === '/') {
          const g = xml.indexOf('>', nextOpen);
          if (xml.charAt(g - 1) === '/') {
            j = g + 1;
            continue;
          }
          depth++;
        }
        j = nextOpen + open.length;
      } else {
        depth--;
        j = nextClose + close.length;
      }
    }
    out.push(xml.slice(start, j));
    i = j;
  }
  return out;
}

function attr(xml, name) {
  const m = xml.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function firstTag(xml, tag) {
  const els = findElements(xml, tag);
  return els.length ? els[0] : null;
}

function parseXfrm(spPr) {
  const xfrm = firstTag(spPr, 'a:xfrm');
  if (!xfrm) return null;
  const off = xfrm.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
  const ext = xfrm.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
  if (!off || !ext) return null;
  return { x: +off[1], y: +off[2], cx: +ext[1], cy: +ext[2] };
}

function parseColor(node) {
  // returns {hex, alpha 0..1} from a fill-ish fragment containing srgbClr
  const m = node.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"\s*(\/>|>([\s\S]*?)<\/a:srgbClr>)/);
  if (!m) return null;
  let alpha = 1;
  if (m[3]) {
    const a = m[3].match(/<a:alpha val="(\d+)"/);
    if (a) alpha = +a[1] / 100000;
  }
  return { hex: m[1].toUpperCase(), alpha };
}

function cssColor(c) {
  if (!c) return '#FFF';
  if (c.alpha >= 0.999) return `#${c.hex}`;
  const r = parseInt(c.hex.slice(0, 2), 16);
  const g = parseInt(c.hex.slice(2, 4), 16);
  const b = parseInt(c.hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.round(c.alpha * 1000) / 1000})`;
}

function parseGradient(fillXml) {
  const stopsXml = findElements(fillXml, 'a:gs');
  const stops = stopsXml
    .map((gs) => {
      const pos = +(attr(gs, 'pos') || 0) / 1000; // -> percent
      const c = parseColor(gs);
      return { pos, css: cssColor(c) };
    })
    .sort((a, b) => a.pos - b.pos);
  const lin = fillXml.match(/<a:lin ang="(\d+)"/);
  // OOXML: 0 = left->right; CSS: 90deg = left->right
  const deg = lin ? (+lin[1] / 60000 + 90) % 360 : 180;
  const stopList = stops.map((s) => `${s.css} ${Math.round(s.pos * 100) / 100}%`).join(', ');
  return `linear-gradient(${Math.round(deg * 100) / 100}deg, ${stopList})`;
}

// ---------- media handling ----------

const mediaOut = new Map(); // mediaFile -> output filename
let mediaJobs = [];
const mediaLum = new Map(); // mediaFile -> mean luminance 0..255

async function computeLuminances() {
  for (const f of fs.readdirSync(MEDIA_DIR)) {
    try {
      const stats = await sharp(path.join(MEDIA_DIR, f)).stats();
      const lum = stats.channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3;
      mediaLum.set(f, lum);
    } catch {
      mediaLum.set(f, 0);
    }
  }
}

function queueMedia(mediaFile) {
  if (mediaOut.has(mediaFile)) return mediaOut.get(mediaFile);
  const srcPath = path.join(MEDIA_DIR, mediaFile);
  const base = path.basename(mediaFile, path.extname(mediaFile));
  const job = (async () => {
    const img = sharp(srcPath);
    const meta = await img.metadata();
    const hasAlpha = meta.hasAlpha;
    const maxW = 2000;
    let pipeline = sharp(srcPath);
    if (meta.width > maxW) pipeline = pipeline.resize({ width: maxW });
    let outName;
    if (hasAlpha) {
      outName = `${base}.webp`;
      await pipeline.webp({ quality: 84 }).toFile(path.join(OUT_MEDIA, outName));
    } else {
      outName = `${base}.jpg`;
      await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT_MEDIA, outName));
    }
    return [mediaFile, outName];
  })();
  mediaJobs.push(job);
  // optimistic name (alpha unknown until job runs) — patch HTML afterwards
  const placeholder = `__MEDIA:${mediaFile}__`;
  mediaOut.set(mediaFile, placeholder);
  return placeholder;
}

// ---------- shape rendering ----------

function renderPic(pic, rels, frame, box) {
  const blip = pic.match(/<a:blip r:embed="(rId\d+)"/);
  if (!blip) return '';
  const target = rels.get(blip[1]);
  if (!target) return '';
  const mediaFile = path.basename(target);

  // Drop stale white-template screenshots that Pitch bakes in as full-slide
  // backgrounds (the deck design is black; real content sits in separate
  // elements layered above them).
  const isFullSlide = box && box.cx >= SLIDE_CX * 0.98 && box.cy >= SLIDE_CY * 0.98;
  if (isFullSlide && (mediaLum.get(mediaFile) || 0) > 190) return '';

  const ref = queueMedia(mediaFile);

  const srcRect = pic.match(/<a:srcRect( [^/]*)\/>/);
  let l = 0,
    r = 0,
    t = 0,
    b = 0;
  if (srcRect) {
    l = +(attr(srcRect[1], 'l') || 0) / 100000;
    r = +(attr(srcRect[1], 'r') || 0) / 100000;
    t = +(attr(srcRect[1], 't') || 0) / 100000;
    b = +(attr(srcRect[1], 'b') || 0) / 100000;
  }
  const visW = 1 - l - r;
  const visH = 1 - t - b;
  let imgStyle = 'width:100%;height:100%;object-fit:fill;display:block;';
  if (visW < 0.9999 || visH < 0.9999) {
    const w = (100 / visW).toFixed(3);
    const h = (100 / visH).toFixed(3);
    const left = (-l / visW) * 100;
    const top = (-t / visH) * 100;
    imgStyle = `position:absolute;width:${w}%;height:${h}%;left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;display:block;`;
  }
  return `<div class="shp" style="${frame}overflow:hidden;"><img src="${MEDIA_URL}/${ref}" alt="" loading="lazy" style="${imgStyle}"></div>`;
}

function renderParagraph(p, bodyDefaults) {
  const pPr = firstTag(p, 'a:pPr') || '';
  const algn = attr(pPr, 'algn') || 'l';
  const alignCss = { l: 'left', ctr: 'center', r: 'right', just: 'justify' }[algn] || 'left';
  const lnSpcM = pPr.match(/<a:lnSpc><a:spcPts val="(\d+)"/);
  const lineHeightPx = lnSpcM ? px(+lnSpcM[1] / 100) : null;

  const runs = findElements(p, 'a:r');

  let maxSz = 0;
  const spans = runs
    .map((r) => {
      const rPr = firstTag(r, 'a:rPr') || '';
      const tM = r.match(/<a:t>([\s\S]*?)<\/a:t>/);
      let text = tM ? tM[1] : '';
      text = text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
      text = fixText(text);
      if (!text) return '';
      const sz = +(attr(rPr, 'sz') || 1800);
      maxSz = Math.max(maxSz, sz);
      const bold = attr(rPr, 'b') === '1';
      const ital = attr(rPr, 'i') === '1';
      const spc = +(attr(rPr, 'spc') || 0);
      const color = parseColor(rPr);
      const css = [
        `font-size:${px(sz / 100)}px`,
        `color:${cssColor(color || { hex: 'FFFFFF', alpha: 1 })}`,
      ];
      if (bold) css.push('font-weight:700');
      if (ital) css.push('font-style:italic');
      if (spc) css.push(`letter-spacing:${px(spc / 100)}px`);
      return `<span style="${css.join(';')};">${esc(text)}</span>`;
    })
    .join('');

  if (!spans) {
    // empty paragraph (or whitespace-only runs) -> vertical gap
    const endPr = p.match(/<a:endParaRPr [^>]*sz="(\d+)"/);
    const h = lineHeightPx || (maxSz ? px(maxSz / 100) : endPr ? px(+endPr[1] / 100) : 16);
    return `<div style="height:${h}px;"></div>`;
  }

  const pCss = [`text-align:${alignCss}`, 'margin:0'];
  pCss.push(`line-height:${lineHeightPx ? lineHeightPx + 'px' : '1.25'}`);
  return `<p style="${pCss.join(';')};">${spans}</p>`;
}

function renderSp(sp, frame) {
  const spPr = firstTag(sp, 'p:spPr') || '';
  const txBody = firstTag(sp, 'p:txBody');

  // Fill / border on the box itself
  const boxCss = [];
  const fillXml = firstTag(spPr, 'a:solidFill');
  if (fillXml) boxCss.push(`background:${cssColor(parseColor(fillXml))}`);
  const gradXml = firstTag(spPr, 'a:gradFill');
  if (gradXml) boxCss.push(`background:${parseGradient(gradXml)}`);
  const ln = firstTag(spPr, 'a:ln');
  if (ln && attr(ln, 'w')) {
    const w = Math.max(1, Math.round((+attr(ln, 'w') / 12700) * PX_PER_PT));
    const lc = parseColor(ln);
    if (lc) boxCss.push(`border:${w}px solid ${cssColor(lc)}`);
  }

  if (!txBody) {
    if (!boxCss.length) return '';
    return `<div class="shp" style="${frame}${boxCss.join(';')};"></div>`;
  }

  const bodyPr = firstTag(txBody, 'a:bodyPr') || '';
  const anchor = attr(bodyPr, 'anchor') || 't';
  const wrap = attr(bodyPr, 'wrap');
  const paras = findElements(txBody, 'a:p').map((p) => renderParagraph(p)).join('');

  const css = [...boxCss];
  if (anchor === 'ctr' || anchor === 'b') {
    css.push('display:flex', 'flex-direction:column');
    css.push(`justify-content:${anchor === 'ctr' ? 'center' : 'flex-end'}`);
  }
  if (wrap === 'none') css.push('white-space:nowrap');
  return `<div class="shp" style="${frame}${css.join(';')};">${paras}</div>`;
}

/** frame style from absolute EMU box */
function frameStyle(box) {
  return `left:${pctX(box.x)}%;top:${pctY(box.y)}%;width:${pctX(box.cx)}%;height:${pctY(box.cy)}%;`;
}

/** Walk an spTree (or grpSp) emitting shapes in document order. `map` converts child EMU coords to absolute. */
function walkTree(xml, rels, map) {
  // iterate direct children in order: find positions of each shape kind
  const kinds = ['p:sp', 'p:pic', 'p:grpSp'];
  const items = [];
  for (const kind of kinds) {
    // grpSp: avoid matching the outer container itself by walking only inner content
    for (const el of findElements(xml, kind)) {
      const pos = xml.indexOf(el);
      items.push({ kind, el, pos });
    }
  }
  items.sort((a, b) => a.pos - b.pos);

  let html = '';
  for (const { kind, el } of items) {
    const spPr = firstTag(el, kind === 'p:grpSp' ? 'p:grpSpPr' : 'p:spPr') || '';
    const xf = parseXfrm(spPr);
    if (!xf) continue;
    const abs = map(xf);
    if (kind === 'p:pic') {
      html += renderPic(el, rels, frameStyle(abs), abs);
    } else if (kind === 'p:sp') {
      html += renderSp(el, frameStyle(abs));
    } else {
      // group: build child coordinate mapping
      const xfrm = firstTag(spPr, 'a:xfrm') || '';
      const chOff = xfrm.match(/<a:chOff x="(-?\d+)" y="(-?\d+)"/);
      const chExt = xfrm.match(/<a:chExt cx="(\d+)" cy="(\d+)"/);
      if (!chOff || !chExt) continue;
      const co = { x: +chOff[1], y: +chOff[2], cx: +chExt[1], cy: +chExt[2] };
      const sx = co.cx ? abs.cx / co.cx : 1;
      const sy = co.cy ? abs.cy / co.cy : 1;
      const childMap = (c) => ({
        x: abs.x + (c.x - co.x) * sx,
        y: abs.y + (c.y - co.y) * sy,
        cx: c.cx * sx,
        cy: c.cy * sy,
      });
      // strip the group's own opening tag so findElements doesn't re-match it
      const inner = el.slice(el.indexOf('>') + 1, el.lastIndexOf('</'));
      html += walkTree(inner, rels, childMap);
    }
  }
  return html;
}

function parseRels(slideFile) {
  const relPath = path.join(SLIDES_DIR, '_rels', `${slideFile}.rels`);
  const map = new Map();
  if (!fs.existsSync(relPath)) return map;
  const xml = fs.readFileSync(relPath, 'utf8');
  for (const m of xml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

// ---------- main ----------

async function main() {
  await computeLuminances();
  fs.mkdirSync(OUT_MEDIA, { recursive: true });
  // clean old media
  for (const f of fs.readdirSync(OUT_MEDIA)) fs.unlinkSync(path.join(OUT_MEDIA, f));

  const slideFiles = fs
    .readdirSync(SLIDES_DIR)
    .filter((f) => /^slide\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const slidesHtml = [];
  for (const f of slideFiles) {
    const xml = fs.readFileSync(path.join(SLIDES_DIR, f), 'utf8');
    const rels = parseRels(f);
    const spTree = firstTag(xml, 'p:spTree') || '';
    // background
    let bg = '#000';
    const bgEl = firstTag(xml, 'p:bg');
    if (bgEl) {
      const c = parseColor(bgEl);
      if (c) bg = cssColor(c);
    }
    const inner = walkTree(spTree, rels, (c) => c);
    slidesHtml.push(`<section class="slide" style="background:${bg};">${inner}</section>`);
  }

  const results = await Promise.all(mediaJobs);
  const finalNames = new Map(results); // mediaFile -> final output name

  let html = buildShell(slidesHtml);
  html = html.replace(/__MEDIA:(.+?)__/g, (_, mf) => finalNames.get(mf) || mf);

  fs.writeFileSync(OUT_HTML, html, 'utf8');

  const totalBytes = fs
    .readdirSync(OUT_MEDIA)
    .reduce((s, f) => s + fs.statSync(path.join(OUT_MEDIA, f)).size, 0);
  console.log(
    `Wrote ${OUT_HTML} (${slidesHtml.length} slides), media: ${results.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
  );
}

function buildShell(slides) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>XYZ Studios — Capabilities</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
  html, body { height: 100%; background: #000; overflow: hidden; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, "Microsoft Sans Serif", sans-serif; color: #fff; }
  #stage { position: fixed; inset: 0; }
  #artboard-wrap { position: absolute; left: 50%; top: 50%; width: 1280px; height: 720px; transform-origin: 0 0; }
  .slide { position: absolute; inset: 0; overflow: hidden; opacity: 0; visibility: hidden; transform: translateY(48px); transition: opacity .55s ease, transform .55s ease, visibility 0s linear .55s; }
  .slide.active { opacity: 1; visibility: visible; transform: translateY(0); transition: opacity .55s ease, transform .55s ease; }
  .slide.prev { transform: translateY(-48px); }
  .shp { position: absolute; }
  #counter { position: fixed; left: 28px; bottom: 22px; font-size: 11px; letter-spacing: .14em; color: rgba(255,255,255,.55); z-index: 50; font-variant-numeric: tabular-nums; user-select: none; }
  #hint { position: fixed; right: 28px; bottom: 22px; font-size: 10px; letter-spacing: .14em; color: rgba(255,255,255,.3); z-index: 50; text-transform: uppercase; user-select: none; transition: opacity .8s ease; }
  #hint.hidden { opacity: 0; }
  #progress { position: fixed; left: 0; top: 0; height: 2px; background: rgba(255,255,255,.45); width: 0; z-index: 60; transition: width .4s ease; }
</style>
</head>
<body>
<div id="progress"></div>
<div id="stage"><div id="artboard-wrap">
${slides.join('\n')}
</div></div>
<div id="counter">01 / ${String(slides.length).padStart(2, '0')}</div>
<div id="hint">Scroll &middot; Arrow keys</div>
<script>
(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var counter = document.getElementById('counter');
  var hint = document.getElementById('hint');
  var progress = document.getElementById('progress');
  var wrap = document.getElementById('artboard-wrap');
  var idx = 0, total = slides.length, animLock = 0;

  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    wrap.style.transform = 'translate(' + (-640 * s) + 'px,' + (-360 * s) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  function show(n, dir) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === idx && slides[idx].classList.contains('active')) return;
    slides.forEach(function (s, i) {
      s.classList.remove('active', 'prev');
      if (i < n) s.classList.add('prev');
    });
    idx = n;
    slides[idx].classList.add('active');
    counter.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    progress.style.width = ((idx + 1) / total * 100) + '%';
    if (idx > 0) hint.classList.add('hidden');
    try { history.replaceState(null, '', '#' + (idx + 1)); } catch (e) {}
  }

  function step(d) {
    var now = Date.now();
    if (now - animLock < 450) return;
    animLock = now;
    show(idx + d, d);
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(total - 1); }
  });

  var wheelAcc = 0, wheelTs = 0;
  window.addEventListener('wheel', function (e) {
    e.preventDefault();
    var now = Date.now();
    if (now - wheelTs > 280) wheelAcc = 0;
    wheelTs = now;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 60) { step(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; }
  }, { passive: false });

  var touchY = null;
  window.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (touchY == null) return;
    var dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) step(dy > 0 ? 1 : -1);
    touchY = null;
  }, { passive: true });

  var start = parseInt((location.hash || '').slice(1), 10);
  show(isNaN(start) ? 0 : start - 1);
})();
</script>
</body>
</html>
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
