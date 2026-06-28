(function fontReady() {
  var done = function () {
    document.documentElement.removeAttribute('data-fonts-pending');
  };
  if (document.fonts && document.fonts.ready) {
    Promise.race([
      document.fonts.ready,
      new Promise(function (r) { setTimeout(r, 2000); }),
    ]).then(done);
  } else {
    setTimeout(done, 100);
  }
})();

(function deckProtect() {
  function block(e) { e.preventDefault(); }
  function isDeckLink(el) {
    return el && el.closest && el.closest('a.deck-link, button.breakdown-btn, button.deck-go-back');
  }
  document.addEventListener('contextmenu', block, true);
  document.addEventListener('selectstart', function (e) {
    if (isDeckLink(e.target)) return;
    block(e);
  }, true);
  document.addEventListener('dragstart', function (e) {
    if (isDeckLink(e.target)) return;
    if (e.target && e.target.closest && e.target.closest('img, video')) block(e);
  }, true);
  document.addEventListener('copy', block, true);
  document.addEventListener('cut', block, true);
  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    var k = e.key.toLowerCase();
    if (k === 's' || k === 'p' || k === 'u' || k === 'a') block(e);
  }, true);
  window.addEventListener('beforeprint', block);
})();

const slides = document.querySelectorAll('.slide');
const total = slides.length;
let current = 0;
let animating = false;
let breakdownMode = false;

const BREAKDOWN_INDICES = [];
const REGULAR_INDICES = [];
slides.forEach(function (slide, i) {
  const section = slide.querySelector('.vfx-artboard');
  if (section && section.classList.contains('breakdown')) {
    BREAKDOWN_INDICES.push(i);
  } else {
    REGULAR_INDICES.push(i);
  }
});
const FIRST_BREAKDOWN = BREAKDOWN_INDICES[0];
const LAST_BREAKDOWN = BREAKDOWN_INDICES[BREAKDOWN_INDICES.length - 1];
const AFTER_BREAKDOWN = LAST_BREAKDOWN != null ? LAST_BREAKDOWN + 1 : -1;
let RBC_PROJECT_INDEX = -1;
slides.forEach(function (slide, i) {
  if (slide.querySelector('.breakdown-btn')) RBC_PROJECT_INDEX = i;
});

function isBreakdownIndex(idx) {
  return BREAKDOWN_INDICES.indexOf(idx) !== -1;
}

function regularNextIndex(from) {
  let idx = from + 1;
  while (idx < total && isBreakdownIndex(idx)) idx++;
  return idx;
}

function regularPrevIndex(from) {
  let idx = from - 1;
  while (idx >= 0 && isBreakdownIndex(idx)) idx--;
  return idx;
}

function resolveNextIndex() {
  if (breakdownMode) {
    if (current >= LAST_BREAKDOWN) return AFTER_BREAKDOWN;
    return current + 1;
  }
  return regularNextIndex(current);
}

function resolvePrevIndex() {
  if (breakdownMode) {
    if (current <= FIRST_BREAKDOWN) return RBC_PROJECT_INDEX;
    return current - 1;
  }
  return regularPrevIndex(current);
}

function enterBreakdown() {
  if (FIRST_BREAKDOWN == null) return;
  breakdownMode = true;
  goTo(FIRST_BREAKDOWN);
}

function exitBreakdown() {
  if (!breakdownMode) return;
  breakdownMode = false;
  goTo(RBC_PROJECT_INDEX >= 0 ? RBC_PROJECT_INDEX : regularPrevIndex(FIRST_BREAKDOWN));
}

const dotsWrap = document.getElementById('nav-dots');
REGULAR_INDICES.forEach(function (slideIdx, i) {
  const d = document.createElement('div');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.dataset.slideIndex = String(slideIdx);
  d.addEventListener('click', function () { goTo(slideIdx); });
  dotsWrap.appendChild(d);
});

const dots = document.querySelectorAll('.dot');
const prog = document.getElementById('progress');
const hint = document.getElementById('hint');
const slideNumberEl = document.getElementById('deck-slide-number');
const slideLabelEl = document.getElementById('deck-slide-label');
let hintShown = false;

const pad2 = (n) => String(n).padStart(2, '0');

function slideDurationMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur').trim();
  if (!raw) return 880;
  if (raw.endsWith('ms')) return parseFloat(raw) || 880;
  return (parseFloat(raw) || 0.88) * 1000;
}

function slideNumberText(index) {
  const section = slides[index] && slides[index].querySelector('.vfx-artboard');
  const mtr = section && section.querySelector('.m-tr .d');
  if (section && section.classList.contains('breakdown') && mtr) {
    return mtr.textContent.trim();
  }
  return pad2(index + 1) + ' / ' + pad2(total);
}

function syncArtboardNumbers() {
  slides.forEach(function (slide, i) {
    const section = slide.querySelector('.vfx-artboard');
    const mtr = section && section.querySelector('.m-tr .d');
    if (!section || section.classList.contains('cover') || !mtr) return;
    if (section.classList.contains('breakdown')) return;
    mtr.textContent = pad2(i + 1) + ' / ' + pad2(total);
  });
  syncFixedSlideNumber();
  syncFixedSlideLabel();
}

function syncFixedSlideNumber(index) {
  if (!slideNumberEl) return;
  const idx = index !== undefined ? index : current;
  const slide = slides[idx];
  const section = slide && slide.querySelector('.vfx-artboard');
  if (!section || section.classList.contains('cover')) {
    slideNumberEl.textContent = '';
    slideNumberEl.classList.remove('visible');
    return;
  }
  slideNumberEl.textContent = slideNumberText(idx);
  slideNumberEl.classList.add('visible');
}

function coverSlideLabelEl() {
  const section = slides[0] && slides[0].querySelector('.vfx-artboard.cover');
  return section && section.querySelector('.m-tl');
}

function setCoverLabelSuppressed(suppress) {
  const mtl = coverSlideLabelEl();
  if (mtl) mtl.style.visibility = suppress ? 'hidden' : '';
}

function syncFixedSlideLabel(index) {
  if (!slideLabelEl) return;
  const idx = index !== undefined ? index : current;
  const slide = slides[idx];
  const section = slide && slide.querySelector('.vfx-artboard');
  const mtl = section && section.querySelector('.m-tl');
  if (!section || section.classList.contains('cover') || !mtl) {
    slideLabelEl.innerHTML = '';
    slideLabelEl.classList.remove('visible');
    return;
  }
  slideLabelEl.innerHTML = mtl.innerHTML;
  slideLabelEl.classList.add('visible');
}

const PORTRAIT_PHONE_MAX_W = 900;

function isPortraitPhoneViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w <= PORTRAIT_PHONE_MAX_W && h > w;
}

function deckFrameSize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (isPortraitPhoneViewport()) return { vw: h, vh: w };
  return { vw: w, vh: h };
}

function deckScrollHintText() {
  return isPortraitPhoneViewport() ? 'swipe left or right' : 'scroll or use arrow keys';
}

function syncCoverScrollHint() {
  const el = document.querySelector('.cover-scroll-hint');
  if (el) el.textContent = deckScrollHintText();
}

function syncPortraitFallback() {
  const on = isPortraitPhoneViewport();
  document.documentElement.classList.toggle('deck-portrait-fallback', on);
  const text = deckScrollHintText();
  if (hint) hint.textContent = text;
  syncCoverScrollHint();
  return on;
}

function tryLockLandscape() {
  try {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(function () {});
    }
  } catch (e) {}
}

function positionSlideNumber() {
  if (!slideNumberEl) return;
  const frame = deckFrameSize();
  const s = Math.min(frame.vw / 1920, frame.vh / 1080);
  slideNumberEl.style.right = ((frame.vw - 1920 * s) / 2 + 64 * s) + 'px';
  slideNumberEl.style.top = ((frame.vh - 1080 * s) / 2 + 48 * s) + 'px';
  slideNumberEl.style.fontSize = (13 * s) + 'px';
}

function positionSlideLabel() {
  if (!slideLabelEl) return;
  const frame = deckFrameSize();
  const s = Math.min(frame.vw / 1920, frame.vh / 1080);
  slideLabelEl.style.left = ((frame.vw - 1920 * s) / 2 + 64 * s) + 'px';
  slideLabelEl.style.top = ((frame.vh - 1080 * s) / 2 + 48 * s) + 'px';
  slideLabelEl.style.fontSize = (13 * s) + 'px';
}

function scaleArtboards() {
  syncPortraitFallback();
  const frame = deckFrameSize();
  const s = Math.min(frame.vw / 1920, frame.vh / 1080);
  document.querySelectorAll('.artboard-scaler').forEach(function (el) {
    el.style.transform = 'scale(' + s + ')';
  });
  positionSlideNumber();
  positionSlideLabel();
}

function slideVideo(slide) {
  if (!slide) return null;
  return slide.querySelector('.proj-bg') || slide.querySelector('.bd-cell video');
}

function projVideoClipSeekStart(vid) {
  if (!vid || vid.dataset.clipStart === undefined) return;
  const s = parseFloat(vid.dataset.clipStart, 10);
  if (!Number.isNaN(s)) vid.currentTime = s;
}

function whenVideoMeta(v, fn) {
  if (v.readyState >= 1) fn();
  else v.addEventListener('loadedmetadata', fn, { once: true });
}

function bindProjVideoClipRange(vid) {
  const end = parseFloat(vid.dataset.clipEnd, 10);
  const start = parseFloat(vid.dataset.clipStart, 10);
  if (Number.isNaN(end) || Number.isNaN(start)) return;
  vid.addEventListener('timeupdate', function () {
    if (vid.currentTime >= end) vid.currentTime = start;
  });
  vid.addEventListener('loadedmetadata', function () {
    vid.currentTime = start;
  });
}
document.querySelectorAll('video[data-clip-start][data-clip-end]').forEach(bindProjVideoClipRange);

function pauseSlideVideos(slide) {
  if (!slide) return;
  slide.querySelectorAll('video').forEach(function (v) {
    v.pause();
    v.muted = true;
  });
}

function prepareSlideVideos(slide) {
  if (!slide) return;
  slide.querySelectorAll('video').forEach(function (v) {
    v.muted = true;
    v.pause();
    if (v.hasAttribute('data-clip-start')) {
      whenVideoMeta(v, projVideoClipSeekStart.bind(null, v));
    }
  });
}

function updateUI() {
  dots.forEach(function (d) {
    const slideIdx = parseInt(d.dataset.slideIndex, 10);
    d.classList.toggle('active', slideIdx === current);
    d.style.visibility = breakdownMode ? 'hidden' : '';
  });
  syncArtboardNumbers();
  if (breakdownMode && isBreakdownIndex(current)) {
    const bdPos = BREAKDOWN_INDICES.indexOf(current);
    prog.style.width = ((bdPos + 1) / BREAKDOWN_INDICES.length * 100) + '%';
  } else {
    const regularPos = REGULAR_INDICES.indexOf(current);
    prog.style.width = ((regularPos + 1) / REGULAR_INDICES.length * 100) + '%';
  }
  if (hint) hint.style.visibility = (current === 0 || breakdownMode) ? 'hidden' : '';
  scaleArtboards();
}

function goTo(idx) {
  if (animating || idx === current || idx < 0 || idx >= total) return;
  if (!breakdownMode && isBreakdownIndex(idx)) return;
  animating = true;
  if (!hintShown && hint) { hint.style.opacity = '0'; hintShown = true; }

  const fromIdx = current;
  const from = slides[fromIdx];
  const to = slides[idx];
  const dir = idx > fromIdx ? 1 : -1;
  const durMs = slideDurationMs();

  pauseSlideVideos(from);
  const cursorEl = document.getElementById('pj-cursor');
  if (cursorEl) cursorEl.classList.remove('visible');
  const fromSection = from && from.querySelector('.vfx-artboard');
  if (fromSection && fromSection.classList.contains('cover')) setCoverLabelSuppressed(true);
  syncFixedSlideNumber(idx);
  syncFixedSlideLabel(idx);
  positionSlideNumber();
  positionSlideLabel();

  to.style.zIndex = '2';
  from.style.zIndex = '1';

  to.style.transition = 'none';
  to.style.transform = dir > 0 ? 'translateY(100%)' : 'translateY(-100%)';
  to.classList.add('active');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    to.style.transition = '';
    from.style.transition = '';
    to.style.transform = 'translateY(0%)';
    from.style.transform = dir > 0 ? 'translateY(-100%)' : 'translateY(100%)';

    prepareSlideVideos(to);

    setTimeout(() => {
      from.classList.remove('active');
      from.style.transform = '';
      from.style.transition = '';
      from.style.zIndex = '';
      to.style.zIndex = '';
      current = idx;
      animating = false;
      if (current === 0) setCoverLabelSuppressed(false);
      updateUI();
    }, durMs);
  }));
}

function navigateNext() {
  const idx = resolveNextIndex();
  if (idx >= total) return;
  if (breakdownMode && idx === AFTER_BREAKDOWN) breakdownMode = false;
  if (breakdownMode && idx === RBC_PROJECT_INDEX) breakdownMode = false;
  goTo(idx);
}

function navigatePrev() {
  const idx = resolvePrevIndex();
  if (idx < 0) return;
  if (breakdownMode && idx === RBC_PROJECT_INDEX) breakdownMode = false;
  goTo(idx);
}

const next = navigateNext;
const prev = navigatePrev;

document.querySelectorAll('.breakdown-btn').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    enterBreakdown();
  });
});

document.querySelectorAll('.deck-go-back').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    exitBreakdown();
  });
});

(function initVfxDeckVideoCursor() {
  const cursor = document.getElementById('pj-cursor');
  const cursorPath = document.getElementById('pj-cursor-path');
  const deckVideos = Array.from(document.querySelectorAll('#deck video'));
  if (!deckVideos.length) return;

  const PLAY_PATH = 'M8 5v14l11-7z';
  const PAUSE_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';
  let hoveredVideo = deckVideos[0];

  function updateCursorIcon() {
    if (!cursorPath || !hoveredVideo) return;
    cursorPath.setAttribute('d', hoveredVideo.paused ? PLAY_PATH : PAUSE_PATH);
  }

  function showCustomCursorAt(x, y) {
    if (!cursor) return;
    cursor.classList.add('visible');
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
  }

  function hideCustomCursor() {
    if (cursor) cursor.classList.remove('visible');
  }

  function toggleVideo(target) {
    if (!target.paused) {
      target.pause();
      return;
    }
    if (target.readyState === 0) target.load();
    function start() {
      if (target.hasAttribute('data-clip-start')) projVideoClipSeekStart(target);
      const p = target.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (target.readyState >= 3) start();
    else target.addEventListener('canplay', start, { once: true });
  }

  function bindCursorVideo(target) {
    target.addEventListener('mouseenter', function (e) {
      hoveredVideo = target;
      updateCursorIcon();
      showCustomCursorAt(e.clientX, e.clientY);
    });
    target.addEventListener('mouseleave', hideCustomCursor);
    target.addEventListener('mousemove', function (e) {
      showCustomCursorAt(e.clientX, e.clientY);
    });
    target.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleVideo(target);
      updateCursorIcon();
    });
    target.addEventListener('play', updateCursorIcon);
    target.addEventListener('pause', updateCursorIcon);
  }

  deckVideos.forEach(function (v) {
    v.removeAttribute('autoplay');
    v.pause();
    v.muted = true;
    bindCursorVideo(v);
  });

  if (cursor) updateCursorIcon();
})();

document.addEventListener('wheel', function (e) {
  if (e.ctrlKey) { e.preventDefault(); return; }
}, { passive: false });
document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && ['+', '-', '=', '0'].includes(e.key)) { e.preventDefault(); return; }
  if (['ArrowDown', 'ArrowRight', 'Space', ' '].includes(e.key)) { e.preventDefault(); next(); }
  if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); prev(); }
});

let wt;
document.addEventListener('wheel', function (e) {
  if (e.ctrlKey) return;
  clearTimeout(wt);
  wt = setTimeout(function () { e.deltaY > 0 ? next() : prev(); }, 40);
}, { passive: true });

let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', function (e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', function (e) {
  const portraitFallback = document.documentElement.classList.contains('deck-portrait-fallback');
  const t = e.changedTouches[0];
  if (portraitFallback) {
    const dx = touchStartX - t.clientX;
    if (Math.abs(dx) > 48) dx > 0 ? next() : prev();
    return;
  }
  const dy = touchStartY - t.clientY;
  if (Math.abs(dy) > 48) dy > 0 ? next() : prev();
}, { passive: true });

syncArtboardNumbers();
updateUI();
prepareSlideVideos(slides[0]);
window.addEventListener('resize', scaleArtboards);
window.addEventListener('orientationchange', scaleArtboards);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) scaleArtboards();
});
tryLockLandscape();
setTimeout(scaleArtboards, 0);
setTimeout(function () { if (hint) hint.style.opacity = '0'; }, 4000);
