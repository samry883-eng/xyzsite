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

function normalize(raw) {
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== 'object' || !obj.grants || typeof obj.grants !== 'object') {
    return { grants: {} };
  }
  return { grants: obj.grants };
}

try {
  if (fs.existsSync(STORE)) {
    const raw = fs.readFileSync(STORE, 'utf8');
    console.log(JSON.stringify(normalize(raw)));
    process.exit(0);
  }

  // Fallback lets you round-trip existing Vercel value even when local file is absent.
  const envJson = process.env.CAPABILITIES_GRANTS_JSON;
  if (envJson && String(envJson).trim()) {
    console.log(JSON.stringify(normalize(String(envJson))));
    process.exit(0);
  }

  // Safe default for first-time setup.
  console.log(JSON.stringify({ grants: {} }));
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
