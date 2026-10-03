/**
 * SEO pass over the built site (dist/). Runs last in the build.
 *
 * Public pages only: home, /work/, /contact, /services and every published
 * project page. Adds what search engines and link previews read, without
 * touching layout or scripts:
 *   - meta description, canonical, Open Graph + Twitter preview tags
 *   - one h1 per page (visually hidden, so the design does not change)
 *   - alt text on images that have none
 * Also writes robots.txt and sitemap.xml.
 *
 * /dashboard (XYZ HQ) is a separate app proxied by vercel.json rewrites. It is
 * never in dist/, is never touched here, and robots.txt keeps it out of search.
 */
import fs from 'fs';
import path from 'path';

const SITE = 'https://xyzstudios.co';
const DEFAULT_IMAGE = '/work/visual-effects/france-world-cup/poster.jpg';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const decode = (s) =>
  String(s ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const clean = (s) => decode(s).replace(/\s+/g, ' ').trim();
const clip = (s, n = 158) => {
  s = clean(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
};
const abs = (u) => (!u ? null : /^https?:\/\//.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u));
const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

const CATEGORY = {
  'visual-effects': 'visual effects',
  sound: 'sound design',
  ai: 'AI-integrated production',
  'making-of': 'behind the scenes',
};

function projectMeta(p) {
  const title = clean(p.title);
  const client = clean(p.client);
  const name = client && client.toLowerCase() !== title.toLowerCase() ? `${title} for ${client}` : title;
  const services = (p.services || []).map((s) => clean(s)).filter(Boolean);
  const kind = clean(p.projectType || 'Commercial').toLowerCase();
  const did = services.length ? list(services) : CATEGORY[p.category] || 'post-production';
  const director = (p.credits || []).find((c) => /director/i.test(c.label || ''))?.value;
  const agency = (p.credits || []).find((c) => /agency/i.test(c.label || ''))?.value;
  let d = `${name}, a ${kind} by XYZ Studios. What we did: ${did}.`;
  if (director) d += ` Directed by ${clean(director)}.`;
  if (agency && d.length < 120) d += ` Agency: ${clean(agency)}.`;
  return {
    h1: name,
    description: clip(d),
    image: p.poster || null,
    url: p.href || `/work/${p.slug}/`,
    alt: `${name}, film still`,
  };
}

const PAGES = {
  'index.html': {
    url: '/',
    h1: 'XYZ Studios: Creative Production Studio',
    description:
      'XYZ Studios is an international post-production studio for VFX, CGI, finishing and sound on commercials and brand films. We make the film or finish yours.',
    alt: 'XYZ Studios',
    jsonld: true,
  },
  'work/index.html': {
    url: '/work/',
    h1: 'Our Work',
    description:
      'Commercials, brand films and music videos by XYZ Studios: visual effects, CGI, AI-integrated work, finishing and sound for brands like Nike, Audi F1, Chanel and the NBA.',
    alt: 'XYZ Studios work',
  },
  'work/unified/index.html': {
    url: '/work/',
    h1: 'Our Work',
    description:
      'Commercials, brand films and music videos by XYZ Studios: visual effects, CGI, AI-integrated work, finishing and sound for brands like Nike, Audi F1, Chanel and the NBA.',
    alt: 'XYZ Studios work',
  },
  'contact/index.html': {
    url: '/contact',
    h1: 'Contact XYZ Studios',
    description:
      'Talk to XYZ Studios about VFX, CGI, finishing and sound for your next commercial or brand film, or request our capabilities deck.',
    alt: 'XYZ Studios',
  },
  'services/index.html': {
    url: '/services',
    h1: 'Services',
    description:
      'What XYZ Studios does: visual effects, CGI, AI-integrated workflows, finishing and sound design for commercials and branded content.',
    alt: 'XYZ Studios',
  },
};

const H1_STYLE =
  'position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;border:0!important';

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key.replace(/[:.]/g, '\\$&')}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function imageAlt(tag, meta) {
  const src = (tag.match(/\ssrc=["']([^"']+)/i) || [])[1] || '';
  if (/logo/i.test(src)) return 'XYZ Studios logo';
  if (/subtract\.svg/i.test(src)) return 'XYZ Studios mark';
  if (/instagram/i.test(src)) return 'Instagram';
  if (/linkedin/i.test(src)) return 'LinkedIn';
  if (/poster|snapshot|still|thumb|\.avif/i.test(src)) return meta.alt;
  return meta.alt;
}

// Only real markup: <img> strings inside <script> blocks are left alone.
function outsideScripts(html, fn) {
  return html
    .split(/(<script\b[\s\S]*?<\/script>)/i)
    .map((part, i) => (i % 2 ? part : fn(part)))
    .join('');
}
const withoutScripts = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, '');

function fixAlts(html, meta) {
  let n = 0;
  const out = outsideScripts(html, (chunk) => chunk.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = tag.match(/\salt=(["'])(.*?)\1/i);
    if (m && m[2].trim()) return tag;
    n++;
    const alt = ` alt="${esc(imageAlt(tag, meta))}"`;
    return m ? tag.replace(m[0], alt) : tag.replace(/<img\b/i, '<img' + alt);
  }));
  return { html: out, n };
}

function apply(file, meta) {
  let html = fs.readFileSync(file, 'utf8');
  if (!/<\/head>/i.test(html) || !/<body[^>]*>/i.test(html)) return null;
  const title = clean((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || 'XYZ Studios');
  const url = abs(meta.url);
  const image = abs(meta.image || DEFAULT_IMAGE);

  html = setMeta(html, 'name', 'description', meta.description);
  if (/<link[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${esc(url)}">`);
  } else {
    html = html.replace(/<\/head>/i, `  <link rel="canonical" href="${esc(url)}">\n</head>`);
  }
  for (const [k, v] of [
    ['og:type', 'website'],
    ['og:site_name', 'XYZ Studios'],
    ['og:title', title],
    ['og:description', meta.description],
    ['og:url', url],
    ['og:image', image],
    ['og:image:alt', meta.h1],
  ]) html = setMeta(html, 'property', k, v);
  for (const [k, v] of [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', meta.description],
    ['twitter:image', image],
  ]) html = setMeta(html, 'name', k, v);

  if (meta.jsonld && !/application\/ld\+json/i.test(html)) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'XYZ Studios',
      url: SITE,
      logo: 'https://cdn.prod.website-files.com/6917408c1d0fee8fc2c58505/691f47e2f734702aa3a0675f_xyz-logo.png',
      description: meta.description,
      email: 'inquiries@xyzstudios.co',
      address: { '@type': 'PostalAddress', addressRegion: 'AB', addressCountry: 'CA' },
      sameAs: ['https://www.instagram.com/xyz__studios/', 'https://www.linkedin.com/company/xyzstudioss/'],
    };
    html = html.replace(/<\/head>/i, `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
  }

  let addedH1 = false;
  if (!/<h1\b/i.test(withoutScripts(html))) {
    html = html.replace(/<body[^>]*>/i, (b) => `${b}<h1 class="xyz-seo-h1" style="${H1_STYLE}">${esc(meta.h1)}</h1>`);
    addedH1 = true;
  }
  const alts = fixAlts(html, meta);
  html = alts.html;
  fs.writeFileSync(file, html);
  return { url: meta.url, h1: addedH1, alts: alts.n };
}

export function runSeoPass(dist, catalog) {
  const done = [];
  const urls = [];
  for (const [rel, meta] of Object.entries(PAGES)) {
    const f = path.join(dist, rel);
    if (!fs.existsSync(f)) continue;
    const r = apply(f, meta);
    if (r) {
      done.push(r);
      urls.push(meta.url);
    }
  }
  for (const p of catalog?.projects || []) {
    if (!p.slug || p.draft) continue;
    const candidates = [path.join(dist, 'work', p.category || '', p.slug, 'index.html'), path.join(dist, 'work', p.slug, 'index.html')];
    const f = candidates.find((x) => fs.existsSync(x));
    if (!f) continue;
    const meta = projectMeta(p);
    // Share previews need a JPG/PNG (Facebook and LinkedIn skip AVIF).
    const dir = path.dirname(f);
    const local = ['poster.jpg', 'frame.jpg'].find((x) => fs.existsSync(path.join(dir, x)));
    if (local) meta.image = '/' + path.relative(dist, path.join(dir, local)).replace(/\\/g, '/');
    else if (!meta.image || /\.avif(\?|$)/i.test(meta.image)) meta.image = null;
    const r = apply(f, meta);
    if (r) {
      done.push(r);
      urls.push(meta.url);
    }
  }

  const robots = [
    'User-agent: *',
    'Allow: /',
    // Private areas: the HQ dashboard, deck, admin and APIs.
    'Disallow: /dashboard',
    'Disallow: /deck',
    'Disallow: /capabilities',
    'Disallow: /work/admin',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /tatum-5',
    'Disallow: /direction',
    'Disallow: /contact-versions',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'robots.txt'), robots);

  const today = new Date().toISOString().slice(0, 10);
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...new Set(urls)].map((u) => `  <url><loc>${esc(abs(u))}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    '\n</urlset>\n';
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
  return done;
}
