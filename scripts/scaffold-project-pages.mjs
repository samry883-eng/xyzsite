#!/usr/bin/env node
/**
 * Scaffold missing Work project preview pages from the catalog.
 * Usage:
 *   node scripts/scaffold-project-pages.mjs            # write to Work/ (source)
 *   node scripts/scaffold-project-pages.mjs --dist     # write to dist/work/
 *   node scripts/scaffold-project-pages.mjs --dry-run  # report only
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchProjectsCatalog } from './projects-catalog-lib.mjs';
import { scaffoldMissingProjectPages } from '../lib/scaffold-project-page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const toDist = process.argv.includes('--dist');
const dryRun = process.argv.includes('--dry-run');
const workRoot = path.join(root, toDist ? 'dist' : 'Work', toDist ? 'work' : '');

const catalog = await fetchProjectsCatalog(root);
const result = scaffoldMissingProjectPages(workRoot, catalog, { dryRun });

console.log('[scaffold-pages] target:', workRoot);
console.log('[scaffold-pages] catalog projects:', catalog.projects.length);
console.log('[scaffold-pages] created:', result.count);
if (result.created.length) {
  result.created.forEach((p) => console.log('  +', p.category + '/' + p.slug));
}
if (process.argv.includes('--verbose')) {
  const missing = result.skipped.filter((s) => s.reason !== 'exists');
  if (missing.length) console.log('[scaffold-pages] skipped:', missing.length);
}
