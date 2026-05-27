/**
 * Capabilities deck navigation (include after slide goTo/next/prev exist).
 * Expects: slides, current, animating, goTo, next, prev, hint, deck-viewport.
 */
(function (global) {
  function initDeckNav(ctx) {
    var animating = function () {
      return ctx.animating;
    };
    var next = ctx.next;
    var prev = ctx.prev;
    var hint = ctx.hint;
    var deckViewport = document.getElementById('deck-viewport');
    var isCoarse =
      global.matchMedia && global.matchMedia('(pointer: coarse)').matches;

    if (deckViewport) deckViewport.style.touchAction = 'none';

    if (hint) {
      hint.textContent = isCoarse
        ? 'Swipe up · tap arrows'
        : 'Scroll or use arrow keys';
    }

    var WHEEL_THRESHOLD = 90;
    var wheelAccum = 0;
    var wheelCooldown = false;

    function onWheelNav(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        return;
      }
      if (animating() || wheelCooldown) {
        e.preventDefault();
        return;
      }
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) {
        e.preventDefault();
        return;
      }
      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      wheelCooldown = true;
      e.preventDefault();
      if (dir > 0) next();
      else prev();
      setTimeout(function () {
        wheelCooldown = false;
      }, 920);
    }

    document.addEventListener('wheel', onWheelNav, { passive: false });

    var ty = 0;
    var swipeMin = isCoarse ? 52 : 44;
    document.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1) return;
        ty = e.touches[0].clientY;
      },
      { passive: true }
    );
    document.addEventListener(
      'touchend',
      function (e) {
        if (animating()) return;
        var d = ty - (e.changedTouches[0] && e.changedTouches[0].clientY);
        if (Math.abs(d) < swipeMin) return;
        if (d > 0) next();
        else prev();
      },
      { passive: true }
    );

    var btnNext = document.getElementById('deck-arrow-next');
    var btnPrev = document.getElementById('deck-arrow-prev');
    if (btnNext) btnNext.addEventListener('click', function () {
      if (!animating()) next();
    });
    if (btnPrev) btnPrev.addEventListener('click', function () {
      if (!animating()) prev();
    });
  }

  global.__initDeckNav = initDeckNav;
})(window);
