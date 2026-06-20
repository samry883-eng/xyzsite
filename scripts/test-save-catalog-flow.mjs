#!/usr/bin/env node
/** Test Work CMS saveCatalog paths (draft save vs update site w/ redeploy). */
import '../load-env-local.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveProjectsCatalog, getProjectsCatalog } from '../lib/projects-store.mjs';
import { triggerProductionRedeploy } from '../lib/vercel-redeploy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'projects-catalog.json'), 'utf8')
);

async function saveCatalog(redeploy = false) {
  const saved = await saveProjectsCatalog(catalog);
  if (!saved.ok) {
    return { ok: false, phase: 'save', error: saved.error };
  }
  if (!redeploy) return { ok: true, redeployed: false, storage: saved.storage };
  const rd = await triggerProductionRedeploy();
  if (!rd.ok) {
    return {
      ok: true,
      redeployed: false,
      phase: 'redeploy',
      storage: saved.storage,
      warning: `Saved to Redis, but redeploy failed: ${rd.error}`,
    };
  }
  return { ok: true, redeployed: true, storage: saved.storage };
}

console.log('catalog projects:', catalog.projects.length);
console.log('catalog bytes:', Buffer.byteLength(JSON.stringify(catalog), 'utf8'));
console.log('VERCEL env:', process.env.VERCEL || '(local)');
console.log('--- Save (redeploy:false) ---');
const draft = await saveCatalog(false);
console.log(JSON.stringify(draft, null, 2));
console.log('--- Update site (redeploy:true) ---');
const publish = await saveCatalog(true);
console.log(JSON.stringify(publish, null, 2));
const back = await getProjectsCatalog();
console.log('read back projects:', back && back.projects ? back.projects.length : 0);
