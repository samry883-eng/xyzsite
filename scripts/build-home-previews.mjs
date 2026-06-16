/**
 * Build ~8s 1080p-max hero preview clips from homeList (ffmpeg).
 * Output: Home/assets/home-previews/{key}.mp4
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const homeHtml = path.join(root, 'Home', 'index.html');
const outDir = path.join(root, 'Home', 'assets', 'home-previews');
const CLIP_SEC = 8;
const FORCE = process.argv.includes('--force');

function sec(x) {
  const s = String(x == null ? '' : x).trim();
  if (!s) return 0;
  if (s.includes(':')) {
    const p = s.split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseFloat(p[1]) || 0);
  }
  return parseFloat(s) || 0;
}

async function readHomeList() {
  let order = null;
  const EC = process.env.EDGE_CONFIG_ID;
  const RT = process.env.EDGE_CONFIG_READ_TOKEN;
  if (EC && RT) {
    try {
      const r = await fetch(`https://edge-config.vercel.com/${EC}/item/workOrder?token=${RT}`);
      if (r.ok) order = await r.json();
    } catch {}
  }
  if (!order) {
    try {
      const r = await fetch('https://www.xyzstudios.co/api/site-order');
      if (r.ok) {
        const j = await r.json();
        order = j && j.order;
      }
    } catch {}
  }
  if (order && order.homeList && order.homeList.length) return order.homeList;
  const html = fs.readFileSync(homeHtml, 'utf8');
  const m = html.match(/window\.__HOME_ORDER=(\{[\s\S]*?\});\/\*XYZ_BUILD_ORDER\*\//);
  if (!m) throw new Error('__HOME_ORDER not found in Home/index.html');
  return JSON.parse(m[1]).homeList || [];
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-800) || `ffmpeg exit ${code}`))));
  });
}

async function buildOne(item) {
  const dest = path.join(outDir, `${item.key}.mp4`);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
    console.log('[skip]', item.key);
    return dest;
  }
  const start = sec(item.start);
  const url = item.video;
  if (!url) throw new Error(`no video URL for ${item.key}`);
  console.log('[build]', item.key, `from ${start}s`);
  fs.mkdirSync(outDir, { recursive: true });
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(start),
    '-i', url,
    '-t', String(CLIP_SEC),
    '-an',
    '-vf', 'scale=-2:1080',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-movflags', '+faststart',
    dest,
  ];
  await runFfmpeg(args);
  return dest;
}

const list = await readHomeList();
if (!list.length) {
  console.warn('[home-previews] empty homeList');
  process.exit(0);
}

for (const item of list) {
  try {
    await buildOne(item);
  } catch (e) {
    console.error('[fail]', item.key, e.message || e);
    process.exitCode = 1;
  }
}

console.log('[home-previews] done', outDir);
