#!/usr/bin/env node
/** HTTP integration test: Save vs Update site via local serve.mjs */
import '../load-env-local.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const base = process.env.TEST_BASE || 'http://localhost:2002';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'projects-catalog.json'), 'utf8')
);

function getCookie(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function login() {
  const pw = process.env.CAPABILITIES_ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error('Set CAPABILITIES_ADMIN_SECRET in .env.local');
  const res = await fetch(base + '/api/capabilities/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  });
  if (!res.ok) throw new Error('login failed ' + res.status);
  return getCookie(res);
}

async function putCatalog(cookie, redeploy) {
  const res = await fetch(base + '/api/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ catalog, redeploy }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const cookie = await login();
console.log('PUT redeploy:false (Save)');
console.log(JSON.stringify(await putCatalog(cookie, false), null, 2));
console.log('PUT redeploy:true (Update site)');
console.log(JSON.stringify(await putCatalog(cookie, true), null, 2));
