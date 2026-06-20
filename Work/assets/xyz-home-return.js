/* xyz-home-return — return to home from project pages opened via the hero reel */
(function () {
  var navigating = false;
  var QS = window.xyzQuickSlide;

  function params() {
    return new URLSearchParams(location.search);
  }

  function slideIndex() {
    var s = params().get('slide');
    if (s != null && s !== '') return s;
    try {
      return sessionStorage.getItem('xyz-home-slide') || '0';
    } catch (e) {
      return '0';
    }
  }

  function cameFromHome() {
    if (params().get('from') === 'home') return true;
    try {
      if (sessionStorage.getItem('xyz-from-home') === '1') return true;
      var ref = document.referrer && new URL(document.referrer);
      return ref && ref.origin === location.origin && (ref.pathname === '/' || ref.pathname === '/index.html');
    } catch (e) {
      return false;
    }
  }

  function markFromHome() {
    try {
      sessionStorage.setItem('xyz-from-home', '1');
      var slide = params().get('slide');
      if (slide != null) sessionStorage.setItem('xyz-home-slide', slide);
    } catch (e) {}
  }

  function coverPanel() {
    var panel = document.getElementById('page-in');
    if (panel) {
      panel.style.display = '';
      return panel;
    }
    var el = document.getElementById('xyz-home-out');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'xyz-home-out';
    el.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;background:#fff;transform:translateY(100%);pointer-events:none;';
    document.body.appendChild(el);
    return el;
  }

  function navigateHome() {
    if (navigating) return;
    navigating = true;

    var slide = slideIndex();
    try {
      sessionStorage.setItem('xyz-home-return', '1');
      sessionStorage.setItem('xyz-home-slide', String(slide));
      sessionStorage.setItem('xyz-from-home', '1');
    } catch (e) {}

    var vid = document.getElementById('pj-video');
    if (vid) {
      try {
        vid.pause();
      } catch (e) {}
    }

    var panel = coverPanel();
    var go = function () {
      location.assign('/?return=1&slide=' + encodeURIComponent(slide));
    };

    if (QS) {
      QS.cover(panel, go);
      return;
    }

    panel.style.transition = 'none';
    panel.style.transform = 'translateY(100%)';
    panel.style.pointerEvents = 'all';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.style.transition = 'transform 0.48s cubic-bezier(0.76,0,0.24,1)';
        panel.style.transform = 'translateY(0)';
      });
    });
    setTimeout(go, 540);
  }

  window.xyzNavigateHome = navigateHome;

  function hijackBackButton() {
    var back = document.getElementById('pj-back-btn');
    if (!back || back.getAttribute('data-xyz-hijacked') === '1') return;
    var nu = back.cloneNode(true);
    nu.setAttribute('data-xyz-hijacked', '1');
    back.parentNode.replaceChild(nu, back);
    nu.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      navigateHome();
    });
  }

  function bindEndCard(vid) {
    if (!vid || vid.getAttribute('data-xyz-home-end') === '1') return;
    vid.setAttribute('data-xyz-home-end', '1');
    var card = document.getElementById('xyz-home-end-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'xyz-home-end-card';
      card.innerHTML = '<button type="button" id="xyz-home-end-btn">Back</button>';
      card.style.cssText =
        'position:fixed;inset:0;z-index:2147483645;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);pointer-events:none;';
      var btn = card.querySelector('#xyz-home-end-btn');
      btn.style.cssText =
        'pointer-events:auto;background:#fff;color:#111;border:0;padding:14px 28px;font:inherit;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;';
      document.body.appendChild(card);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        navigateHome();
      });
    }
    vid.addEventListener('ended', function () {
      if (document.fullscreenElement) return;
      card.style.display = 'flex';
      card.style.pointerEvents = 'auto';
    });
    vid.addEventListener('play', function () {
      card.style.display = 'none';
      card.style.pointerEvents = 'none';
    });
  }

  function init() {
    if (!cameFromHome()) return;
    markFromHome();
    hijackBackButton();

    var vid = document.getElementById('pj-video');
    if (vid) bindEndCard(vid);

    document.addEventListener(
      'keydown',
      function (e) {
        if (e.key !== 'Escape' || document.fullscreenElement) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        navigateHome();
      },
      true
    );
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
