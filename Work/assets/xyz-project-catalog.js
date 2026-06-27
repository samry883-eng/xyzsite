/* xyz-project-catalog — hydrate preview pages from Work CMS catalog (by project slug) */
(function () {
  var SERVICE_ORDER = [
    'Creative Direction', 'Visual Effects', 'CGI', 'AI', 'Compositing', 'Clean Up & Beauty',
    'Sound Design', 'Mixing & Mastering', 'Compose',
  ];

  var CAT_LABEL = {
    'visual-effects': 'Visual Effects',
    sound: 'Sound',
    ai: 'AI',
    'making-of': 'Making Of',
  };

  function sortServices(services) {
    return (services || []).slice().sort(function (a, b) {
      var ia = SERVICE_ORDER.indexOf(a);
      var ib = SERVICE_ORDER.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  }

  function projectSlugFromPath() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var wi = parts.indexOf('work');
    if (wi < 0 || parts.length < wi + 2) return '';
    return parts[parts.length - 1];
  }

  function projectMkey() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var wi = parts.indexOf('work');
    if (wi < 0 || parts.length < wi + 3) return '';
    return parts[wi + 1] + '/' + parts[wi + 2];
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function findInCatalog(catalog, slug, mkey) {
    if (!catalog || !Array.isArray(catalog.projects) || !slug) return null;
    var matches = catalog.projects.filter(function (p) { return p.slug === slug; });
    if (matches.length === 1) return matches[0];
    if (mkey) {
      for (var i = 0; i < matches.length; i++) {
        if ((matches[i].category + '/' + matches[i].slug) === mkey) return matches[i];
      }
      for (var j = 0; j < catalog.projects.length; j++) {
        var p = catalog.projects[j];
        if ((p.category + '/' + p.slug) === mkey) return p;
      }
    }
    return matches[0] || null;
  }

  function findInPreviewMap(map, slug, mkey) {
    if (!map || !slug) return null;
    var entry = map[slug];
    if (!entry) return null;
    if (mkey && entry.category && (entry.category + '/' + entry.slug) !== mkey) {
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        var p = map[keys[i]];
        if (p && (p.category + '/' + p.slug) === mkey) return p;
      }
    }
    return entry;
  }

  function renderCreditsHtml(credits) {
    if (!Array.isArray(credits) || !credits.length) return '';
    return credits
      .filter(function (c) { return c && c.label && c.value; })
      .map(function (c) {
        return (
          '<div><div class="pj-cr-col-lbl">' + escapeHtml(c.label) + '</div>' +
          '<div class="pj-cr-col-val">' + escapeHtml(c.value) + '</div></div>'
        );
      })
      .join('');
  }

  function ensureServiceStyles() {
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

  function renderServicesBlock(services) {
    var credits = document.getElementById('pj-credits');
    var frames = credits && credits.querySelector('.pj-frames');
    if (!credits || !frames || credits.querySelector('.pj-services-wrap')) return;

    services = sortServices(services);
    if (!services.length) return;

    ensureServiceStyles();
    var wrap = document.createElement('div');
    wrap.className = 'pj-services-wrap';
    wrap.innerHTML =
      '<div class="pj-cr-col-lbl">Services</div>' +
      '<div class="pj-services-list">' +
      services.map(function (s) {
        return '<span class="pj-services-item">' + escapeHtml(s) + '</span>';
      }).join('') +
      '</div>';
    credits.insertBefore(wrap, frames);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function hydrateProject(project) {
    if (!project) return;

    document.title = project.client + ' \u2014 ' + project.title + ' \u2014 XYZ Studios';

    var titleNodes = document.querySelectorAll('.projects_item-title:not(.company), .pj-cr-title');
    titleNodes.forEach(function (el) { el.textContent = project.title; });

    var clientNodes = document.querySelectorAll('.projects_item-title.company, .pj-cr-sub');
    clientNodes.forEach(function (el) { el.textContent = project.client; });

    var catLabel = CAT_LABEL[project.category] || project.category || '';
    setText('pj-cr-cat', catLabel);

    var creditsWrap = document.querySelector('.pj-cr-credits-wrap');
    if (creditsWrap) {
      var cols = renderCreditsHtml(project.credits);
      creditsWrap.innerHTML = cols ? '<div class="pj-cr-cols">' + cols + '</div>' : '';
    }

    renderServicesBlock(project.services);

    var vid = document.getElementById('pj-video');
    if (vid && project.video) {
      var changed = vid.getAttribute('src') !== project.video;
      if (changed) {
        vid.setAttribute('src', project.video);
        vid.load();
      }
      if (project.poster) vid.setAttribute('poster', project.poster);
    }
  }

  function loadProject(slug, mkey) {
    if (window.__PROJECTS_CATALOG) {
      var fromInline = findInCatalog(window.__PROJECTS_CATALOG, slug, mkey);
      if (fromInline) return Promise.resolve(fromInline);
    }
    return fetch('/api/projects', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var fromApi = findInCatalog(d && d.catalog, slug, mkey);
        if (fromApi) return fromApi;
        return fetch('/work/assets/projects-preview.json', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (map) { return findInPreviewMap(map, slug, mkey); });
      })
      .catch(function () { return null; });
  }

  var slug = projectSlugFromPath();
  if (!slug) return;

  loadProject(slug, projectMkey()).then(function (project) {
    hydrateProject(project);
  });
})();
