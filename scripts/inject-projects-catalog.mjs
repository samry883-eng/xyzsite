#!/usr/bin/env node
/** Bake projects catalog into Work/unified/index.html for local dev. */
import '../load-env-local.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { injectProjectsCatalogFile } from './projects-catalog-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const unified = path.join(root, 'Work', 'unified', 'index.html');

const result = await injectProjectsCatalogFile(unified, root);
if (!result.ok) {
  console.warn('[inject-projects-catalog] marker not found in', unified);
  process.exit(1);
}
console.log('[inject-projects-catalog] updated', result.count, 'projects');
