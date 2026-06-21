/* xyz-project-services — inject Services block from Work CMS catalog */
(function () {
  var SERVICE_ORDER = [
    'Creative Direction', 'Visual Effects', 'CGI', 'AI', 'Compositing', 'Clean Up & Beauty',
    'Sound Design', 'Mixing & Mastering', 'Compose',
  ];

  function sortServices(services) {
    return (services || []).slice().sort(function (a, b) {
      var ia = SERVICE_ORDER.indexOf(a);
      var ib = SERVICE_ORDER.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  }

  function projectMkey() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var wi = parts.indexOf('work');
    if (wi < 0 || parts.length < wi + 3) return '';
    return parts[wi + 1] + '/' + parts[wi + 2];
  }

  function ensureStyles() {
    if (document.getElementById('xyz-pj-services-style')) return;
    var style = document.createElement('style');
    style.id = 'xyz-pj-services-style';
    style.textContent =
      '.pj-services-wrap{margin-bottom:40px}' +
      '.pj-services-list{display:flex;flex-wrap:wrap;gap:10px 24px}' +
      '.pj-services-item{font:400 13px/1.5 Micross,Arial,sans-serif;color:rgba(255,255,255,0.75);-webkit-font-smoothing:antialiased}' +
      '.pj-credits.revealed .pj-services-wrap{animation:pj-rise .7s cubic-bezier(.16,1,.3,1) .3s both}';
    document.head.appendChild(style);
  }

  function renderServices(services) {
    var credits = document.getElementById('pj-credits');
    var frames = credits && credits.querySelector('.pj-frames');
    if (!credits || !frames) return;
    if (credits.querySelector('.pj-services-wrap')) return;

    services = sortServices(services);
    if (!services.length) return;

    ensureStyles();
    var wrap = document.createElement('div');
    wrap.className = 'pj-services-wrap';
    wrap.innerHTML =
      '<div class="pj-cr-col-lbl">Services</div>' +
      '<div class="pj-services-list">' +
      services.map(function (s) {
        return '<span class="pj-services-item">' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
      }).join('') +
      '</div>';
    credits.insertBefore(wrap, frames);
  }

  function lookupFromCatalog(catalog, mkey) {
    if (!catalog || !Array.isArray(catalog.projects) || !mkey) return null;
    var i, p;
    for (i = 0; i < catalog.projects.length; i++) {
      p = catalog.projects[i];
      if ((p.category + '/' + p.slug) === mkey) return p.services || [];
    }
    return null;
  }

  function loadServices(mkey) {
    if (window.__PROJECTS_CATALOG) {
      var fromInline = lookupFromCatalog(window.__PROJECTS_CATALOG, mkey);
      if (fromInline) return Promise.resolve(fromInline);
    }
    return fetch('/work/assets/projects-services.json', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (map) {
        if (map && map[mkey]) return map[mkey];
        return fetch('/api/projects', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { return lookupFromCatalog(d && d.catalog, mkey) || []; });
      })
      .catch(function () { return []; });
  }

  var mkey = projectMkey();
  if (!mkey) return;

  loadServices(mkey).then(function (services) {
    renderServices(services);
  });
})();
