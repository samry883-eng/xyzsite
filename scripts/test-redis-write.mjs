#!/usr/bin/env node
/** Quick Redis write test for Work CMS catalog vs capabilities grants pattern. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRedis, redisEnv, redisEnvDiagnostics } from '../lib/upstash-redis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'projects-catalog.json'), 'utf8')
);

const { url, token } = redisEnv();
const diag = redisEnvDiagnostics();
console.log('configured:', diag.configured, 'complete:', diag.complete);
if (!url || !token) {
  console.error('No Redis credentials in env');
  process.exit(1);
}

const payload = JSON.stringify(catalog);
console.log('catalog bytes:', Buffer.byteLength(payload, 'utf8'));

const r = await getRedis();
if (!r) {
  console.error('getRedis() returned null');
  process.exit(1);
}

console.log('client type:', r.constructor?.name || 'REST fallback');

try {
  await r.set('projects_catalog_json_test', payload);
  console.log('SDK/REST set: OK');
  const back = await r.get('projects_catalog_json_test');
  console.log('read back type:', typeof back, 'len:', typeof back === 'string' ? back.length : JSON.stringify(back).length);
  await r.set('projects_catalog_json_test', '');
} catch (e) {
  console.error('WRITE FAILED:', e.message || e);
  process.exit(1);
}
