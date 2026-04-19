#!/usr/bin/env node
/**
 * Print minified JSON for Vercel env var CAPABILITIES_GRANTS_JSON
 * (after running capabilities:grant locally).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(__dirname, '..', 'data', 'capabilities-grants.json');

try {
  const raw = fs.readFileSync(STORE, 'utf8');
  const obj = JSON.parse(raw);
  console.log(JSON.stringify(obj));
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
