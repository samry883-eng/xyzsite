/**
 * Generate static project preview pages from the catalog (matches into-the-void layout).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_CATEGORIES } from './projects-store.mjs';
import { expectedPosterPath, isGenericPoster } from './project-poster-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '..', 'Work', 'visual-effects', 'into-the-void', 'index.html');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCreditsHtml(credits) {
  if (!Array.isArray(credits) || !credits.length) {
    return '<div class="pj-cr-credits-wrap"></div>';
  }
  const cols = credits
    .filter((c) => c && c.label && c.value)
    .map(
      (c) =>
        '      <div>\n' +
        `        <div class="pj-cr-col-lbl">${escapeHtml(c.label)}</div>\n` +
        `        <div class="pj-cr-col-val">${escapeHtml(c.value)}</div>\n` +
        '      </div>',
    )
    .join('\n');
  return `<div class="pj-cr-credits-wrap"><div class="pj-cr-cols">\n${cols}\n    </div></div>`;
}

let cachedTemplate = null;

function loadTemplate() {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return cachedTemplate;
}

export function renderProjectPage(project) {
  const title = escapeHtml(project.title);
  const client = escapeHtml(project.client);
  const video = escapeHtml(project.video);
  const poster = project.poster && !isGenericPoster(project.poster)
    ? project.poster
    : expectedPosterPath(project.category, project.slug);
  const posterAttr = poster ? ` poster="${escapeHtml(poster)}"` : '';
  let html = loadTemplate();

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${client} — ${title} — XYZ Studios</title>`);
  html = html.replace(
    /<video id="pj-video" src="[^"]*"[^>]*>/,
    `<video id="pj-video" src="${video}" playsinline preload="metadata"${posterAttr}>`,
  );
  html = html.replace(/<div class="projects_item-title">Into the Void<\/div>/, `<div class="projects_item-title">${title}</div>`);
  html = html.replace(/<div class="projects_item-title company">Atomic<\/div>/, `<div class="projects_item-title company">${client}</div>`);
  html = html.replace(/<div class="pj-cr-title">Into the Void<\/div>/, `<div class="pj-cr-title">${title}</div>`);
  html = html.replace(/<div class="pj-cr-sub">Atomic<\/div>/, `<div class="pj-cr-sub">${client}</div>`);
  html = html.replace(
    /<div class="pj-cr-credits-wrap">[\s\S]*?<\/div>\s*(?=\n\s*<!-- ── FRAMES)/,
    renderCreditsHtml(project.credits) + '\n\n    ',
  );

  return html;
}

export function projectPageRelPath(project) {
  return path.join(project.category, project.slug, 'index.html');
}

export function projectPageExists(workRoot, project) {
  return fs.existsSync(path.join(workRoot, projectPageRelPath(project)));
}

/** Scaffold missing catalog pages under workRoot (Work/ or dist/work/). */
export function scaffoldMissingProjectPages(workRoot, catalog, { dryRun = false } = {}) {
  const created = [];
  const skipped = [];
  if (!catalog || !Array.isArray(catalog.projects)) return { created, skipped, count: 0 };

  for (const project of catalog.projects) {
    if (!project.category || !project.slug || !PROJECT_CATEGORIES.includes(project.category)) {
      skipped.push({ slug: project.slug, reason: 'invalid category' });
      continue;
    }
    if (!project.video) {
      skipped.push({ slug: project.slug, reason: 'missing video' });
      continue;
    }
    const rel = projectPageRelPath(project);
    const dest = path.join(workRoot, rel);
    if (fs.existsSync(dest)) {
      skipped.push({ slug: project.slug, reason: 'exists' });
      continue;
    }
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, renderProjectPage(project), 'utf8');
    }
    created.push({ slug: project.slug, category: project.category, path: rel.replace(/\\/g, '/') });
  }

  return { created, skipped, count: created.length };
}
