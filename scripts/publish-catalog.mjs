#!/usr/bin/env node
/**
 * Publish data/projects-catalog.json to Redis (or local file) and optionally redeploy.
 * Usage: node scripts/publish-catalog.mjs [--redeploy]
 */
import '../load-env-local.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeCatalog } from '../lib/projects-store.mjs';
import { saveProjectsCatalog } from '../lib/projects-store.mjs';
import { redisConfigured, redisConfigHelp } from '../lib/upstash-redis.mjs';
import { triggerProductionRedeploy } from '../lib/vercel-redeploy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const redeploy = process.argv.includes('--redeploy');
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'projects-catalog.json'), 'utf8'));
const catalog = normalizeCatalog(raw, { applyDefaults: true }) || raw;

if (process.env.VERCEL && !redisConfigured()) {
  console.error('[publish-catalog] Redis required on Vercel.', redisConfigHelp());
  process.exit(1);
}

const saved = await saveProjectsCatalog(catalog);
if (!saved.ok) {
  console.error('[publish-catalog] write failed:', saved.error || 'unknown');
  process.exit(1);
}

console.log('[publish-catalog] wrote', catalog.projects.length, 'projects via', saved.storage);
if (redeploy) {
  const rd = await triggerProductionRedeploy();
  console.log('[publish-catalog] redeploy', rd.deployed ? 'triggered' : 'skipped/failed', rd.error || rd.warning || '');
}
