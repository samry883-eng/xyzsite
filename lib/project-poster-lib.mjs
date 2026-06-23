/**
 * Deterministic poster paths + frame times for project thumbnails.
 */
import fs from 'fs';
import path from 'path';

export const GENERIC_POSTER =
  'https://cdn.prod.website-files.com/69174740184591f142f019c1/69c0bbd38bf9e9ecfb7c293b_final%20test1.mp4_snapshot_00.27.567.jpg';

const GENERIC_POSTER_MARK = '69c0bbd38bf9e9ecfb7c293b_final';

export function expectedPosterPath(category, slug) {
  return `/work/${category}/${slug}/poster.jpg`;
}

export function isGenericPoster(poster) {
  if (!poster) return true;
  const s = String(poster).trim();
  if (!s) return true;
  if (s === GENERIC_POSTER) return true;
  if (s.includes(GENERIC_POSTER_MARK)) return true;
  return false;
}

function hashProjectId(id) {
  let h = 2166136261;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable pseudo-random seek time (seconds) per project id — varies per project, stable across builds. */
export function pickPosterTimeSec(projectId, durationSec, clipStart) {
  const clip = clipStart != null ? Number(clipStart) : NaN;
  if (Number.isFinite(clip) && clip > 0) {
    const jitter = (hashProjectId(projectId) % 20) / 10;
    return clip + jitter;
  }
  const dur = durationSec && durationSec > 8 ? durationSec : 60;
  const minPct = 0.15;
  const maxPct = 0.85;
  const frac = minPct + (hashProjectId(projectId) % 1000) / 1000 * (maxPct - minPct);
  return Math.max(1, Math.min(dur - 0.5, dur * frac));
}

export function localPosterFile(workRoot, project) {
  return path.join(workRoot, project.category, project.slug, 'poster.jpg');
}

export function hasLocalPoster(workRoot, project) {
  try {
    const file = localPosterFile(workRoot, project);
    return fs.existsSync(file) && fs.statSync(file).size > 1000;
  } catch {
    return false;
  }
}

/** True when build should ffmpeg-extract a poster for this catalog row. */
export function needsPosterExtraction(project, workRoot, { force = false } = {}) {
  if (!project?.video || !project.category || !project.slug) return false;

  const expected = expectedPosterPath(project.category, project.slug);
  const poster = String(project.poster || '').trim();

  if (!force && hasLocalPoster(workRoot, project) && !isGenericPoster(poster)) {
    return false;
  }

  if (poster && !isGenericPoster(poster) && poster !== expected) {
    if (!poster.endsWith('/poster.jpg') && !poster.includes('/api/projects/poster/')) {
      return false;
    }
  }

  if (!force && hasLocalPoster(workRoot, project) && poster === expected) {
    return false;
  }

  return true;
}
