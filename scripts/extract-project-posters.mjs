#!/usr/bin/env node
/**
 * Extract project poster.jpg from each catalog video at a deterministic offset.
 * Usage:
 *   node scripts/extract-project-posters.mjs
 *   node scripts/extract-project-posters.mjs --force
 *   node scripts/extract-project-posters.mjs --dry-run
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { fetchProjectsCatalog } from './projects-catalog-lib.mjs';
import { buildDefaultCatalog } from '../lib/projects-default-catalog.mjs';
import {
  expectedPosterPath,
  localPosterFile,
  needsPosterExtraction,
  pickPosterTimeSec,
} from '../lib/project-poster-lib.mjs';

let ffmpegPath;
try {
  ffmpegPath = (await import('ffmpeg-static')).default;
} catch {
  ffmpegPath = null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-800) || `${cmd} exit ${code}`))));
  });
}

async function probeDuration(url) {
  if (!ffmpegPath) return null;
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath, ['-hide_banner', '-i', url], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      if (!m) return resolve(null);
      resolve((+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]));
    });
  });
}

async function extractFrame(url, timeSec, dest) {
  if (!ffmpegPath) throw new Error('ffmpeg-static unavailable');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await run(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(timeSec),
    '-i', url,
    '-frames:v', '1',
    '-q:v', '2',
    '-vf', 'scale=-2:1080',
    dest,
  ]);
}

const GENERIC_MARK = '69c0bbd38bf9e9ecfb7c293b_final';

function patchProjectPagePoster(workRoot, project) {
  const pagePath = path.join(workRoot, project.category, project.slug, 'index.html');
  if (!fs.existsSync(pagePath)) return false;
  const poster = expectedPosterPath(project.category, project.slug);
  let html = fs.readFileSync(pagePath, 'utf8');
  const videoRe = /(<video id="pj-video"[^>]*?)poster="[^"]*"/;
  if (!videoRe.test(html)) return false;
  if (!html.includes(GENERIC_MARK) && html.includes(poster)) return false;
  const next = html.replace(videoRe, `$1poster="${poster}"`);
  if (next === html) return false;
  fs.writeFileSync(pagePath, next);
  return true;
}

export async function extractProjectPosters(catalogRoot, catalog, { workRoot, force = FORCE, dryRun = DRY_RUN } = {}) {
  catalogRoot = catalogRoot || root;
  workRoot = workRoot || path.join(catalogRoot, 'Work');
  const results = { extracted: [], skipped: [], failed: [], patched: [] };

  if (!catalog?.projects?.length) return results;
  if (!ffmpegPath && !dryRun) {
    console.warn('[extract-posters] ffmpeg-static unavailable — skipping extraction');
    return results;
  }

  const defaultById = new Map(buildDefaultCatalog().projects.map((p) => [p.id, p]));

  for (const project of catalog.projects) {
    const def = defaultById.get(project.id);
    const effective = def
      ? { ...project, category: def.category, slug: def.slug, clipStart: project.clipStart ?? def.clipStart }
      : project;
    const label = `${effective.category}/${effective.slug}`;
    if (!needsPosterExtraction(effective, workRoot, { force })) {
      results.skipped.push(label);
      continue;
    }
    if (!effective.video) {
      results.skipped.push(label);
      continue;
    }

    const dest = localPosterFile(workRoot, effective);

    if (dryRun) {
      const timeSec = pickPosterTimeSec(effective.id, null, effective.clipStart);
      console.log('[dry-run]', label, `→ ${dest} @ ${timeSec.toFixed(2)}s`);
      results.extracted.push(label);
      continue;
    }

    try {
      const duration = await probeDuration(effective.video);
      const seek = pickPosterTimeSec(effective.id, duration, effective.clipStart);
      console.log('[extract]', label, `@ ${seek.toFixed(2)}s`);
      await extractFrame(effective.video, seek, dest);
      project.poster = expectedPosterPath(effective.category, effective.slug);
      if (patchProjectPagePoster(workRoot, effective)) {
        results.patched.push(label);
      }
      results.extracted.push(label);
    } catch (e) {
      console.warn('[extract-posters] failed', label, e?.message || e);
      results.failed.push({ label, error: e?.message || String(e) });
    }
  }

  return results;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const catalog = await fetchProjectsCatalog(root);
  const result = await extractProjectPosters(root, catalog);
  console.log('[extract-posters] extracted:', result.extracted.length);
  console.log('[extract-posters] skipped:', result.skipped.length);
  if (result.patched.length) console.log('[extract-posters] patched pages:', result.patched.length);
  if (result.failed.length) console.log('[extract-posters] failed:', result.failed.length);
}
