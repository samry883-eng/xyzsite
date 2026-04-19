#!/usr/bin/env node
/**
 * Grant capabilities access and print CAPABILITIES_GRANTS_JSON in one command.
 * Usage: node scripts/capabilities-grant-and-print.mjs <email> [password]
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const grantScript = path.join(__dirname, 'capabilities-grant.mjs');
const printScript = path.join(__dirname, 'capabilities-print-env.mjs');

const [, , email, password] = process.argv;
if (!email) {
  console.error('Usage: node scripts/capabilities-grant-and-print.mjs <email> [password]');
  process.exit(1);
}

const grantArgs = password ? [grantScript, email, password] : [grantScript, email];
const grantRes = spawnSync(process.execPath, grantArgs, { stdio: 'inherit' });
if (grantRes.status !== 0) process.exit(grantRes.status ?? 1);

const printRes = spawnSync(process.execPath, [printScript], { stdio: 'inherit' });
process.exit(printRes.status ?? 0);
