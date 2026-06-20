/* xyz-quick-slide — shared page transition (Animation 2). Long bar is home-only. */
(function (global) {
  var DUR = '0.48s';
  var EASE = 'cubic-bezier(0.76,0,0.24,1)';
  var NAV_MS = 540;

  function raf2(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }

  function snapHidden(el) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'translateY(-100%)';
    el.style.pointerEvents = 'none';
  }

  function snapCovered(el) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'translateY(0)';
    el.style.pointerEvents = 'none';
  }

  function cover(el, cb) {
    if (!el) {
      if (cb) cb();
      return;
    }
    try {
      document.documentElement.classList.add('xyz-quick-transit');
    } catch (e) {}
    el.style.transition = 'none';
    el.style.transform = 'translateY(100%)';
    el.style.pointerEvents = 'all';
    raf2(function () {
      el.style.transition = 'transform ' + DUR + ' ' + EASE;
      el.style.transform = 'translateY(0)';
    });
    setTimeout(cb || function () {}, NAV_MS);
  }

  function reveal(el, cb) {
    if (!el) {
      if (cb) cb();
      return;
    }
    el.style.transition = 'none';
    el.style.transform = 'translateY(0)';
    el.style.pointerEvents = 'none';
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(tid);
      if (cb) cb();
    }
    function onEnd(e) {
      if (e.propertyName !== 'transform') return;
      finish();
    }
    el.addEventListener('transitionend', onEnd);
    var tid = setTimeout(finish, 600);
    raf2(function () {
      el.style.transition = 'transform ' + DUR + ' ' + EASE;
      el.style.transform = 'translateY(-100%)';
    });
  }

  global.xyzQuickSlide = {
    DUR: DUR,
    EASE: EASE,
    NAV_MS: NAV_MS,
    snapHidden: snapHidden,
    snapCovered: snapCovered,
    cover: cover,
    reveal: reveal,
    markNav: function () {
      try {
        sessionStorage.setItem('xyz-quick-nav', '1');
      } catch (e) {}
    },
    wasQuickNav: function () {
      try {
        if (sessionStorage.getItem('xyz-quick-nav') === '1') {
          sessionStorage.removeItem('xyz-quick-nav');
          return true;
        }
      } catch (e) {}
      return false;
    },
  };
})(window);
