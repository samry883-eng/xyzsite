#!/usr/bin/env node
/**
 * Seed projects catalog to Upstash Redis (or local file when not on Vercel).
 * Usage: node scripts/seed-projects-catalog.mjs [--redeploy]
 */
import '../load-env-local.mjs';
import { buildDefaultCatalog } from '../lib/projects-default-catalog.mjs';
import { saveProjectsCatalog } from '../lib/projects-store.mjs';
import { redisConfigured, redisConfigHelp } from '../lib/upstash-redis.mjs';
import { triggerProductionRedeploy } from '../lib/vercel-redeploy.mjs';

const redeploy = process.argv.includes('--redeploy');
const catalog = buildDefaultCatalog();

if (process.env.VERCEL && !redisConfigured()) {
  console.error('[seed] Redis required on Vercel.', redisConfigHelp());
  process.exit(1);
}

const saved = await saveProjectsCatalog(catalog);
if (!saved.ok) {
  console.error('[seed] write failed:', saved.error || 'unknown');
  process.exit(1);
}

console.log('[seed] wrote', catalog.projects.length, 'projects via', saved.storage);
if (redeploy) {
  const rd = await triggerProductionRedeploy();
  console.log('[seed] redeploy', rd ? 'triggered' : 'skipped/failed');
}
