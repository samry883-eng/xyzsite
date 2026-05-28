(() => {
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
