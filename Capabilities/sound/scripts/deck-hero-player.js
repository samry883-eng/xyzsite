/**

 * Deck hero player — volume + click-to-play for Capabilities sound deck slides.

 * Cursor matches Work project pages (#pj-cursor + play/pause path swap).

 */

(function () {

  window.initDeckHeroPlayer = function (opts) {

    var vid = document.getElementById(opts.videoId);

    var root = document.getElementById(opts.playerId);

    if (!vid || !root) return null;



    var playBtn = opts.playId ? document.getElementById(opts.playId) : null;

    var playLabel = playBtn && playBtn.querySelector('[hero_video-icon="play"]');

    var pauseLabel = playBtn && playBtn.querySelector('[hero_video-icon="pause"]');

    var volSlider = document.getElementById(opts.volumeId);

    var extraVideos = (opts.extraVideoIds || []).map(function (id) {

      return document.getElementById(id);

    }).filter(Boolean);

    var cursorVideos = [vid].concat(extraVideos);

    var cursor = opts.cursorId ? document.getElementById(opts.cursorId) : null;

    var cursorPath = opts.cursorPathId

      ? document.getElementById(opts.cursorPathId)

      : (cursor && cursor.querySelector('#pj-cursor-path, [id$="-cursor-path"]'));

    var startOffset = typeof opts.startOffset === 'number' ? opts.startOffset : 0;

    var endOffset = typeof opts.endOffset === 'number' ? opts.endOffset
      : (typeof opts.endAt === 'number' ? opts.endAt : null);

    var hoveredVideo = vid;

    var PLAY_PATH = 'M8 5v14l11-7z';

    var PAUSE_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

    var TOUCH_UI = window.matchMedia('(hover: none), (pointer: coarse)').matches;



    function updatePlay() {

      if (!playLabel && !pauseLabel) return;

      var paused = vid.paused;

      if (playLabel) playLabel.style.display = paused ? '' : 'none';

      if (pauseLabel) pauseLabel.style.display = paused ? 'none' : '';

    }



    function applyPlaybackBounds(target) {

      if (target !== vid || target.readyState < 1) return;

      if (startOffset && target.duration > startOffset && target.currentTime < startOffset) {

        target.currentTime = startOffset;

        return;

      }

      if (endOffset != null && target.currentTime >= endOffset) {

        if (vid.loop) target.currentTime = startOffset;

        else {

          target.currentTime = endOffset;

          target.pause();

        }

      }

    }



    if (startOffset || endOffset != null) {

      vid.addEventListener('loadedmetadata', function () { applyPlaybackBounds(vid); });

      vid.addEventListener('play', function () { applyPlaybackBounds(vid); });

      vid.addEventListener('timeupdate', function () {

        if (startOffset && vid.currentTime < startOffset - 0.05) vid.currentTime = startOffset;

        else if (endOffset != null && vid.currentTime >= endOffset) {

          if (vid.loop) vid.currentTime = startOffset;

          else {

            vid.currentTime = endOffset;

            vid.pause();

          }

        }

      });

    }



    function ensureVideoSrc(target) {
      var deferred = target.getAttribute('data-src');
      if (deferred && !target.getAttribute('src')) {
        target.setAttribute('src', deferred);
        target.removeAttribute('data-src');
        target.preload = 'auto';
        return true;
      }
      return false;
    }

    function syncTouchPausedUi(target) {

      if (!TOUCH_UI || !target) return;

      var wrap = target.closest ? target.closest('.deck-hero-wrap') : null;

      if (!wrap) return;

      if (target.paused) wrap.setAttribute('data-deck-paused', '1');

      else wrap.removeAttribute('data-deck-paused');

    }



    function toggleVideo(target) {

      if (!target.paused) {

        target.pause();

        syncTouchPausedUi(target);

        return;

      }

      ensureVideoSrc(target);

      if (target.readyState === 0) target.load();

      applyPlaybackBounds(target);

      var p = target.play();

      if (p && p.catch) p.catch(function () {});

      if (target.readyState < 3) {

        target.addEventListener('canplay', function () {

          applyPlaybackBounds(target);

          var p2 = target.play();

          if (p2 && p2.catch) p2.catch(function () {});

        }, { once: true });

      }

      syncTouchPausedUi(target);

    }



    function togglePlay(e) {

      toggleVideo((e && e.currentTarget) || vid);

    }



    var DEFAULT_VOL_PCT = 50;

    var userAdjustedVolume = false;

    function applyVolume(val, fromUser) {

      if (fromUser) userAdjustedVolume = true;

      var v = Math.max(0, Math.min(1, val / 100));

      cursorVideos.forEach(function (target) {

        if (v === 0 && userAdjustedVolume) {

          target.muted = true;

        } else {

          target.muted = false;

          target.volume = v > 0 ? v : 1;

        }

      });

      if (volSlider) volSlider.value = String(Math.round(v * 100));

    }



    if (volSlider) {

      cursorVideos.forEach(function (target) {

        target.muted = false;

      });

      var initVol = Number(volSlider.value);

      if (isNaN(initVol) || initVol <= 0) initVol = DEFAULT_VOL_PCT;

      volSlider.value = String(initVol);

      applyVolume(initVol, false);

      volSlider.addEventListener('input', function () {

        applyVolume(Number(volSlider.value), true);

      });

    } else {

      cursorVideos.forEach(function (target) {

        target.muted = false;

        target.volume = DEFAULT_VOL_PCT / 100;

      });

    }



    vid.addEventListener('play', updatePlay);

    vid.addEventListener('pause', updatePlay);

    vid.addEventListener('ended', updatePlay);



    if (playBtn) playBtn.addEventListener('click', togglePlay);

    if (!cursor) vid.addEventListener('click', togglePlay);



    function updateCursorIcon() {

      if (cursorPath) cursorPath.setAttribute('d', hoveredVideo.paused ? PLAY_PATH : PAUSE_PATH);

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



    function pointerIsOverAnyVideo(clientX, clientY) {

      for (var i = 0; i < cursorVideos.length; i++) {

        var v = cursorVideos[i];

        var under = document.elementFromPoint(clientX, clientY);

        if (under && (under === v || v.contains(under))) return v;

      }

      return null;

    }



    function handleVideoPointerTap(e, target) {

      if (volSlider && (e.target === volSlider || volSlider.contains(e.target))) return;

      e.preventDefault();

      e.stopPropagation();

      toggleVideo(target);

    }



    function bindCursorVideo(target) {

      target.addEventListener('play', function () {

        updateCursorIcon();

        syncTouchPausedUi(target);

      });

      target.addEventListener('pause', function () {

        updateCursorIcon();

        syncTouchPausedUi(target);

      });

      syncTouchPausedUi(target);



      if (TOUCH_UI) {

        target.addEventListener('pointerup', function (e) {

          if (e.pointerType === 'mouse') return;

          handleVideoPointerTap(e, target);

        }, { passive: false });

        return;

      }



      target.addEventListener('mouseenter', function (e) {

        if (volSlider && (e.target === volSlider || volSlider.contains(e.target))) return;

        hoveredVideo = target;

        updateCursorIcon();

        showCustomCursorAt(e.clientX, e.clientY);

      });

      target.addEventListener('mouseleave', hideCustomCursor);

      target.addEventListener('mousemove', function (e) {

        showCustomCursorAt(e.clientX, e.clientY);

      });

      target.addEventListener('click', function (e) {

        toggleVideo(target);

        updateCursorIcon();

        syncTouchPausedUi(target);

      });

    }



    if (cursor) {

      cursorVideos.forEach(bindCursorVideo);



      if (volSlider) {

        volSlider.addEventListener('mouseenter', hideCustomCursor);

        volSlider.addEventListener('mouseleave', function (e) {

          var hovered = pointerIsOverAnyVideo(e.clientX, e.clientY);

          if (hovered) {

            hoveredVideo = hovered;

            updateCursorIcon();

            showCustomCursorAt(e.clientX, e.clientY);

          }

        });

      }

    }



    cursorVideos.forEach(function (target) { target.pause(); });

    updatePlay();

    updateCursorIcon();



    return {

      getVideo: function () {

        return vid;

      },

      pauseForDeck: function () {

        cursorVideos.forEach(function (target) {

          try { target.pause(); } catch (e) {}

        });

      },

      playForDeck: function () {

        /* Slide enter stays paused until user clicks — no autoplay. */

      }

    };

  };

})();


