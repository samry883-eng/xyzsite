#!/usr/bin/env node
/**
 * Grant deck access locally (writes data/capabilities-grants.json).
 * Usage: node scripts/capabilities-grant.mjs <email> <password>
 * Password must be at least 8 characters.
 */
import { grantUpsert } from '../lib/capabilities-auth.mjs';

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/capabilities-grant.mjs <email> <password>');
  process.exit(1);
}

try {
  await grantUpsert(email, password);
  console.log('Access granted for', email);
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
