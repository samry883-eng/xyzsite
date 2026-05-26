#!/usr/bin/env node
/**
 * Add email(s) to data/deck-allowlist.txt (git push → Vercel deploy = access live).
 * Usage: node scripts/deck-allow-add.mjs email@one.com [email2@...]
 *        node scripts/deck-allow-add.mjs --paste "a@b.com, c@d.com"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ALLOWLIST_FILE, parseEmailList } from '../lib/capabilities-allowlist.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readLines() {
  try {
    return fs.readFileSync(ALLOWLIST_FILE, 'utf8').split(/\n/);
  } catch {
    return ['# Capabilities deck — allowed emails (one per line).', ''];
  }
}

function existingEmails(lines) {
  const set = new Set();
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    set.add(t.toLowerCase());
  }
  return set;
}

const args = process.argv.slice(2);
let toAdd = [];
if (args[0] === '--paste') {
  toAdd = parseEmailList(args.slice(1).join(' '));
} else {
  toAdd = parseEmailList(args.join(' '));
}

if (!toAdd.length) {
  console.error('Usage: node scripts/deck-allow-add.mjs email@example.com [more@...]');
  console.error('       node scripts/deck-allow-add.mjs --paste "a@b.com, c@d.com"');
  process.exit(1);
}

const lines = readLines();
const have = existingEmails(lines);
const added = [];
for (const email of toAdd) {
  if (have.has(email)) continue;
  have.add(email);
  lines.push(email);
  added.push(email);
}

if (!added.length) {
  console.log('No new emails (already on the list).');
  process.exit(0);
}

fs.mkdirSync(path.dirname(ALLOWLIST_FILE), { recursive: true });
fs.writeFileSync(ALLOWLIST_FILE, lines.join('\n').replace(/\n*$/, '\n'), 'utf8');
console.log('Added to data/deck-allowlist.txt:');
added.forEach((e) => console.log('  ', e));
console.log('\nCommit and push to deploy access on the live site.');
