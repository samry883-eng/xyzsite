(function () {
  var OVERLAY_ID = 'xyz-nda-overlay';
  var STORAGE_KEY = 'xyz_capabilities_nda';

  function buildModal() {
    if (document.getElementById(OVERLAY_ID)) return;

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'xyz-nda-title');
    overlay.innerHTML =
      '<div id="xyz-nda-modal">' +
        '<div class="nda-eyebrow">XYZ Studios · Capabilities</div>' +
        '<h2 id="xyz-nda-title">Confidentiality agreement</h2>' +
        '<div class="nda-copy">' +
          '<p>This capabilities deck contains confidential business information, case studies, pricing guidance, and proprietary workflow details belonging to XYZ Studios.</p>' +
          '<p>By continuing, you agree not to copy, share, distribute, or disclose any part of this deck without prior written consent from XYZ Studios. Access is granted for evaluation purposes only.</p>' +
          '<p>This is an interim test agreement for deck access. A formal NDA may be requested for active pitches.</p>' +
        '</div>' +
        '<form id="xyz-nda-form" novalidate>' +
          '<div class="ct-field" id="xyz-nda-name-field">' +
            '<label class="ct-label" for="xyz-nda-name">Full name *</label>' +
            '<input type="text" id="xyz-nda-name" name="name" required autocomplete="name" />' +
          '</div>' +
          '<label class="nda-check">' +
            '<input type="checkbox" id="xyz-nda-accept" name="accept" required />' +
            '<span>I have read and accept this confidentiality agreement on behalf of myself and my organization.</span>' +
          '</label>' +
          '<div class="nda-err" id="xyz-nda-err" aria-live="polite"></div>' +
          '<button type="submit" class="ct-submit" id="xyz-nda-btn">Accept &amp; enter deck &rarr;</button>' +
        '</form>' +
      '</div>';

    document.body.appendChild(overlay);
    wireForm(overlay);
  }

  function showModal() {
    buildModal();
    document.documentElement.classList.add('xyz-nda-open');
    var overlay = document.getElementById(OVERLAY_ID);
    overlay.classList.add('visible');
    var name = document.getElementById('xyz-nda-name');
    if (name) {
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && saved.name) name.value = saved.name;
      } catch (e) {}
      syncFilled();
      setTimeout(function () { name.focus(); }, 0);
    }
  }

  function hideModal() {
    document.documentElement.classList.remove('xyz-nda-open');
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.classList.remove('visible');
    if (window.location.search.indexOf('nda=') !== -1) {
      var url = new URL(window.location.href);
      url.searchParams.delete('nda');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }

  function syncFilled() {
    var name = document.getElementById('xyz-nda-name');
    var field = document.getElementById('xyz-nda-name-field');
    if (name && field) field.classList.toggle('filled', (name.value || '').length > 0);
  }

  function wireForm(overlay) {
    var form = overlay.querySelector('#xyz-nda-form');
    var name = overlay.querySelector('#xyz-nda-name');
    var accept = overlay.querySelector('#xyz-nda-accept');
    var err = overlay.querySelector('#xyz-nda-err');
    var btn = overlay.querySelector('#xyz-nda-btn');

    name.addEventListener('input', syncFilled);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      if (!accept.checked) {
        err.textContent = 'Please accept the agreement to continue.';
        return;
      }
      var signer = name.value.trim();
      if (!signer) {
        err.textContent = 'Full name required.';
        return;
      }
      btn.disabled = true;
      fetch('/api/capabilities/nda-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: signer, accepted: true }),
      })
        .then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, data: data }; });
        })
        .then(function (x) {
          if (!x.ok || !x.data.ok) {
            err.textContent = (x.data && x.data.error) || 'Unable to record acceptance.';
            btn.disabled = false;
            return;
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              name: signer,
              at: new Date().toISOString(),
            }));
          } catch (e) {}
          hideModal();
        })
        .catch(function () {
          err.textContent = 'Network error.';
          btn.disabled = false;
        });
    });
  }

  function shouldForceFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return params.get('nda') === '1' || params.get('nda') === 'pending';
  }

  function init() {
    fetch('/api/capabilities/session', { credentials: 'same-origin' })
      .then(function (r) {
        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
      })
      .then(function (x) {
        if (!x.ok || !x.data.ok) return;
        if (x.data.ndaName) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              name: x.data.ndaName,
              at: x.data.ndaSignedAt || new Date().toISOString(),
            }));
          } catch (e) {}
        }
        if (!x.data.ndaAccepted || shouldForceFromQuery()) showModal();
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
