#!/usr/bin/env node
/**
 * Merge missing default-catalog projects into Redis (or local file).
 * Usage: node scripts/sync-projects-default.mjs [--redeploy]
 */
import '../load-env-local.mjs';
import { mergeDefaultCatalogMissing } from '../lib/projects-default-catalog.mjs';
import { getProjectsCatalog, saveProjectsCatalog } from '../lib/projects-store.mjs';
import { redisConfigured, redisConfigHelp } from '../lib/upstash-redis.mjs';
import { triggerProductionRedeploy } from '../lib/vercel-redeploy.mjs';

const redeploy = process.argv.includes('--redeploy');

if (process.env.VERCEL && !redisConfigured()) {
  console.error('[sync-default] Redis required on Vercel.', redisConfigHelp());
  process.exit(1);
}

const current = (await getProjectsCatalog()) || { version: 1, projects: [] };
const { catalog, added } = mergeDefaultCatalogMissing(current);

if (!added) {
  console.log('[sync-default] catalog already complete:', catalog.projects.length, 'projects');
  process.exit(0);
}

const saved = await saveProjectsCatalog(catalog);
if (!saved.ok) {
  console.error('[sync-default] write failed:', saved.error || 'unknown');
  process.exit(1);
}

console.log('[sync-default] added', added, 'project(s); total', catalog.projects.length, 'via', saved.storage);
if (redeploy) {
  const rd = await triggerProductionRedeploy();
  console.log('[sync-default] redeploy', rd.ok ? 'triggered' : 'failed', rd.error || '');
}
