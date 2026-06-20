#!/usr/bin/env node
/**
 * Seed Edge Config projectsCatalog from default 38-project catalog.
 * Usage: node scripts/seed-projects-catalog.mjs [--redeploy]
 */
import '../load-env-local.mjs';
import { buildDefaultCatalog } from '../lib/projects-default-catalog.mjs';
import { setProjectsCatalog } from '../lib/projects-store.mjs';
import { ecWritable } from '../lib/site-store.mjs';
import { triggerProductionRedeploy } from '../lib/vercel-redeploy.mjs';

const redeploy = process.argv.includes('--redeploy');
const catalog = buildDefaultCatalog();

if (!ecWritable()) {
  console.error('[seed] Edge Config write not configured (EDGE_CONFIG_ID + VERCEL_API_TOKEN)');
  process.exit(1);
}

const ok = await setProjectsCatalog(catalog);
if (!ok) {
  console.error('[seed] write failed');
  process.exit(1);
}

console.log('[seed] wrote', catalog.projects.length, 'projects to projectsCatalog');
if (redeploy) {
  const rd = await triggerProductionRedeploy();
  console.log('[seed] redeploy', rd ? 'triggered' : 'skipped/failed');
}
