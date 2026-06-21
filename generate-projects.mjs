/**
 * generate-projects.mjs
 * Run: node generate-projects.mjs
 * Creates Work/{category}/{project}/index.html for every card in ROWS.
 * Re-run anytime you add a new project — existing pages are overwritten.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(__dirname, 'Work');

// ── Slugify ────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase()
    .replace(/[''`']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Project data ───────────────────────────────────────────
const VF = 'https://r2.vidzflow.com/source/';
const SB = 'https://xgjzloifyvgpbmyonaya.supabase.co/storage/v1/object/public/files/';

const ROWS = [
  {
    label: 'Visual Effects',
    cards: [
      { video: VF  + 'cbf82991-c743-4045-8898-b6ee78efd9b4.mp4',         client: 'Atomic',         title: 'Into the Void',                date: 'NOV 15', clipStart: 24, clipEnd: 33, credits: [
        { label: 'Directed by', value: 'Dris Yousif' },
        { label: 'Produced by', value: 'XYZ Studios' },
      ] },
      { video: VF  + 'd93de57b-6909-4f1e-81d3-8d1f6252c2f7.mp4',         client: 'Nike',           title: 'France World Cup',           date: 'JUN 26', slug: 'france-world-cup', poster: '/work/visual-effects/france-world-cup/poster.jpg', credits: [
        { label: 'Directed by', value: 'Alexis Belhumeur' },
        { label: 'Agency', value: 'Knas' },
      ] },
      { video: VF  + 'af62bf83-f2c4-4ff5-ae90-e056d209eaae.mp4',         client: 'Cara Delevingne', title: 'I Forgot & Out of My Head',   date: 'MAY 26', poster: '/work/visual-effects/i-forgot-out-of-my-head/poster.jpg', credits: [
        { label: 'Directed by', value: 'Jessica Le Gagne' },
        { label: 'Production Company USA', value: 'Reset Content' },
      ] },
      { video: VF  + 'ef1dc602-5a95-4973-a0ea-82794726bc4a.mp4',         client: 'Salomon',        title: 'Speedcross 3',                 date: 'OCT 25', credits: [
        { label: 'Directed by', value: 'Lenn Anton' },
        { label: 'Produced by', value: 'XYZ Studios' },
      ] },
      { video: SB  + 'PcB8hb2-uO/original',                              client: 'Salomon',        title: 's/lab Manifesto',              date: 'FEB 26', credits: [
        { label: 'Directed by', value: 'The Reids' },
        { label: 'Production', value: 'CommonVision' },
      ] },
      { video: SB  + '9O7xsj76Lw/original',                              client: 'Toyota',         title: 'Road to Palisades',            date: 'FEB 26', credits: [
        { label: 'Directed by', value: 'Jack Botti' },
        { label: 'Production', value: 'rabithaus' },
      ] },
      { video: SB  + '85D_It6HUS/original',                               client: 'RBC',            title: 'Canadian Open',                date: 'MAR 9', credits: [
        { label: 'Agency', value: 'Wasserman' },
        { label: 'Produced by', value: 'XYZ Studios' },
      ] },
      { video: SB  + 'JchEHAr96O/original',                               client: 'JennAir',        title: 'The Flip',                     date: 'JAN 10', credits: [
        { label: 'Directed by', value: 'Nick Martini' },
        { label: 'Production', value: 'Stept Studios' },
      ] },
      { video: SB  + '0yJ5A9ii2H/original',                               client: 'Fanatics',       title: 'NBA Store',                    date: 'DEC 20', credits: [
        { label: 'Directed by', value: 'Jimmy Derner' },
        { label: 'Production Company', value: 'Wolfpak Films' },
      ] },
      { video: SB  + 'mu8ewXP3uH/original',                               client: 'Fanatics',       title: 'NHL Store',                    date: 'DEC 15', credits: [
        { label: 'Directed by', value: 'Jimmy Derner' },
        { label: 'Production Company', value: 'Wolfpak Films' },
      ] },
      { video: VF  + 'edac671a-7d48-4eb1-b1ea-c2556b330ee4.mp4',         client: 'Chino Pacas',    title: 'Modo Capone ft. Drake',        date: 'SEP 12', credits: [
        { label: 'Directed by', value: 'Chris Villa' },
        { label: 'Production Company', value: 'SHOTCLOCK' },
      ] },
      { video: VF  + 'e07f965d-dc13-45bc-a958-08fd1baa3793.mp4',         client: 'Marc Jacobs',    title: 'The Essentials',               date: 'OCT 24', credits: [
        { label: 'Directed by', value: 'BRTHR' },
        { label: 'Produced by', value: 'Afterworld' },
      ] },
      { video: VF  + 'b383d525-8d02-4f4b-b2fa-0d9c29a71d91.mp4',         client: 'Fuerza Regida',  title: 'Tu Sancho',                    date: 'AUG 3', credits: [
        { label: 'Directed by', value: 'Miguel' },
        { label: 'Produced by', value: 'XYZ Studios' },
      ] },
      { video: VF  + 'daf3f8d1-9b55-438d-9259-922de5fb7c8f.mp4',         client: 'Fuerza Regida',  title: 'Secreto Victoria',             date: 'JUL 18', credits: [
        { label: 'Directed by', value: 'Miguel' },
        { label: 'Produced by', value: 'XYZ Studios' },
      ] },
      { video: VF  + '15e90e12-e3b1-420a-9b11-db60a7b199b0.mp4',         client: 'Tokischa',       title: 'De Maravisha',                 date: 'JUN 5', credits: [
        { label: 'Directed by', value: 'Olivia Decamps' },
        { label: 'Produced by', value: 'XYZ Studios' },
      ] },
      { video: VF  + '7c584065-5afb-43e4-9b67-ef1b5b6db304.mp4',         client: 'Audi',           title: 'F1 2026 Launch Film',          date: 'JUN 26', slug: 'f1-2026-launch-film' },
      { video: VF  + '11fe9d4e-0bef-4966-bf67-b9b48dc8eee5.mp4',         client: 'Need For Speed', title: 'Shibuya',                      date: 'JUN 26', slug: 'shibuya' },
    ]
  },
  {
    label: 'Sound',
    cards: [
      { video: '/work/sound/ai-awareness/video.mp4',                     client: 'Sumsub',         title: 'AI Awareness',                 date: 'JUN 26', poster: '/work/sound/ai-awareness/poster.jpg', credits: [
        { label: 'Directed by', value: 'Snezhana Yugai' },
        { label: 'Sound Design, Mix & Music', value: 'Klangtextur' },
      ] },
      { video: VF  + '214a3ae2-01ca-4593-8949-98a7191f6548.mp4',         client: 'Louis Vuitton',  title: 'SS26 Teaser',                  date: 'APR 14', director: 'Anthony Prince Leslie', soundDesign: 'Ken Psalms & William Landry', soundDesignMix: true },
      { video: VF  + '17e77d71-3bca-4d42-8275-71deb05724d1.mp4',         client: 'Beats',          title: 'Open',                         date: 'OCT 10', credits: [
        { label: 'Directed by', value: 'Aidan Cullen' },
        { label: 'Sound Design', value: 'Ken Psalms & Ayodo Uson' },
      ] },
      { video: VF  + '24fed0b9-4d02-45b3-895b-437c3ab89f38.mp4',         client: "Arc'teryx",      title: 'Precision Without Limits',     date: 'FEB 28' },
      { video: VF  + '6c66aad7-7df3-4809-a8d7-1f92a377fa5e.mp4',         client: 'Lucid',          title: 'Compromise Nothing',           date: 'DEC 5'  },
      { video: VF  + 'fb5e495e-8460-4277-a7aa-08accd388af0.mp4',         client: 'Prime Video',    title: 'Good Sports',                  date: 'NOV 21', poster: '/work/sound/good-sports/poster.jpg' },
      { video: VF  + '0f5dc170-f1e8-4b0b-a0bd-d9e6486a91e7.mp4',         client: 'Samsung',        title: 'Galaxy AI',                    date: 'MAY 28' },
      { video: VF  + '4f593e77-d9ea-4992-8dc1-f8520895f0e9.mp4',         client: 'Ford',           title: 'Join the Search',              date: 'JAN 16' },
      { video: VF  + '996ba39f-1c06-4887-8dc3-52c21a4089b1.mp4',         client: 'Apple Music',    title: "Don't Forget to Take a Break", date: 'DEC 23', credits: [
        { label: 'Directed by', value: 'Mithil Rajeev' },
        { label: 'Sound Design', value: 'Ken Psalms' },
      ] },
      { video: VF  + '5b0d552d-9e53-4967-9d5b-15a5deb86100.mp4',         client: 'New Era',        title: 'F1',                           date: 'NOV 4'  },
      { video: VF  + 'a1bc0884-b2b7-42a3-aac5-a490571499f5.mp4',         client: 'Burna Boy',      title: 'Tatata ft. Travis Scott',      date: 'SEP 12', credits: [
        { label: 'Sound Design', value: 'Ken Psalms' },
        { label: 'Mix', value: 'Ken Psalms' },
        { label: 'Directed by', value: 'Benny Boom' },
      ] },
      { video: VF  + '0e01d94b-2f38-4e6c-8874-14fc6e98dfeb.mp4',         client: 'Nike',           title: 'Hard Is Home',                 date: 'SEP 2', poster: '/work/sound/hard-is-home/poster.jpg', credits: [
        { label: 'Sound Design', value: 'Ken Psalms' },
        { label: 'Sound Mixer', value: 'William Landry' },
      ] },
      { video: VF  + '00c390f8-2185-4729-be87-dcc17552bc0b.mp4',         client: 'Foot Locker',    title: 'Stay in Rotation',             date: 'AUG 15', poster: '/work/sound/stay-in-rotation/poster.jpg', credits: [
        { label: 'Sound Design', value: 'Ken Psalms' },
        { label: 'Mix', value: 'Ken Psalms' },
        { label: 'Directed by', value: 'Edgar Esteves' },
      ] },
      { video: VF  + 'ad2de35b-a84f-4468-8ea1-704e79fc1d6e.mp4',         client: 'Ram Truck',      title: 'The Hunt',                     date: 'JUL 7', poster: '/work/sound/the-hunt/poster.jpg' },
      { video: VF  + '392708ea-1d8c-4872-a6cd-65f4a5e947ba.mp4',         client: 'SNIPES',         title: 'Style Is In Session',          date: 'SEP 3', poster: '/work/sound/style-is-in-session/poster.jpg', credits: [
        { label: 'Sound Design', value: 'Ken Psalms & William Landry' },
        { label: 'Sound Mixer', value: 'Ken Psalms & William Landry' },
        { label: 'Directed by', value: 'Joshua Smedina' },
      ] },
      { video: VF  + '68eb0d30-28c6-4074-a239-6ff8a10dbbf1.mp4',         client: 'Hongqi',         title: 'Hongqi',                       date: 'AUG 19' },
      { video: VF  + 'c5bfdb30-f5d1-4f1d-a96f-b736b4ab1fcf.mp4',         client: 'Celsius',        title: 'Spritez Vibez',                date: 'MAY 20', poster: '/work/sound/spritez-vibez/poster.jpg' },
    ]
  },
  {
    label: 'AI',
    cards: [
      { video: VF  + '55e60562-4203-4bba-8dc5-4343d1e5a127.mp4',         client: 'Nike',           title: "Imagine There's No Limit",     date: 'JUN 26', slug: 'imagine-theres-no-limit', poster: '/work/ai/imagine-theres-no-limit/poster.jpg' },
      { video: SB  + '2oBYsIWabd/original',                              client: 'Chanel',         title: 'Sous La Lune',                 date: 'AUG 7',  slug: 'sous-la-lune', director: 'Lenn Anton', production: 'Obsidian' },
      { video: SB  + 'LWep2Duvk-/original',                              client: 'Mercedes-Benz',  title: 'A Cold Wall',                  date: 'NOV 30' },
      { video: SB  + 'I_J-Bii5Ql/original',                              client: 'BMW',            title: 'Concept RR',                   date: 'MAR 14' },
      { video: SB  + 'Clp65xDTmS/original',                              client: 'Nike',           title: 'AI',                           date: 'FEB 8',  slug: 'ai-nike'         },
      { video: SB  + 'h-VCHXYcwA/original',                              client: 'Ducati',         title: 'AI',                           date: 'JAN 22', slug: 'ai-ducati'       },
    ]
  },
  /* hidden: Making Of category
  {  {
    label: 'Making Of',
    cards: [
      { video: SB  + 'gekxSgtk7e/original',                              client: 'MLS',            title: 'Rating Reloaded',              date: 'JAN 5'  },
      { video: SB  + 'YRUPuIBrjQ/original',                              client: 'Toyota',         title: 'Road to Palisades',            date: 'DEC 18' },
      { video: SB  + 'Bl0RrW0k4E/original',                              client: 'Concacaf',       title: 'Gold Cup',                     date: 'NOV 12' },
      { video: SB  + '1JIMnyZZIW/original',                              client: 'RBC',            title: 'Canadian Open',                date: 'OCT 4'  },
      { video: VF  + '8c451a49-eb58-4534-becf-87f4ca6f51dd.mp4',         client: 'Doritos',        title: 'Stranger Things',              date: 'SEP 28' },
      { video: SB  + 'S16jMx0Mpo/original',                              client: 'Pura',           title: 'Hands On',                     date: 'AUG 14' },
      { video: VF  + 'a9e377b3-727b-4129-adc4-f1c018d7f001.mp4',         client: 'Chris Brown',    title: 'City of Dreams',               date: 'JUL 2'  },
      { video: SB  + 'tlCbP796Kw/original',                              client: 'Square',         title: 'Released',                     date: 'JUN 9'  },
      { video: SB  + 'C9qMrM-8bD/original',                              client: 'Jasmin Savoy',   title: 'August',                       date: 'MAY 17' },
      { video: SB  + 'hREydGGtah/original',                              client: 'Barskih',        title: 'Someone New',                  date: 'APR 3'  },
      { video: SB  + 'wXBUhN3tQI/original',                              client: 'Max Barskh',     title: 'Mine',                         date: 'MAR 1'  },
    ]
  }
  */
];

// ── Credits — display names (no @ handles; title case first + last) ──
const CREDIT_NAME_ALIASES = {
  pslmsmn: 'Ken Psalms',
  williamlandryaudio: 'William Landry',
  ayodouson: 'Ayodo Uson',
  aidancullen1: 'Aidan Cullen',
  aidancullen: 'Aidan Cullen',
  directedbymithil: 'Mithil Rajeev',
  bennyboom: 'Benny Boom',
  joshuasmedina: 'Joshua Smedina',
  edgaresteves: 'Edgar Esteves',
  jessicaleegagne: 'Jessica Le Gagne',
  resetcontent: 'Reset Content',
  directedbymiguel: 'Miguel',
  oliviadecamps: 'Olivia Decamps',
  jackbotti: 'Jack Botti',
  jimmyderner: 'Jimmy Derner',
  chrisvilla: 'Chris Villa',
  brthr: 'BRTHR',
  xyzstudios: 'XYZ Studios',
};

function titleCaseWord(w) {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function formatCreditValue(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw.split(/\s*&\s*/).map((part) => {
    let s = part.trim().replace(/^@+/, '').replace(/\d+/g, '').trim();
    const aliasKey = s.toLowerCase().replace(/[^a-z]/g, '');
    if (CREDIT_NAME_ALIASES[aliasKey]) return CREDIT_NAME_ALIASES[aliasKey];
    s = s.replace(/[._-]+/g, ' ');
    return s.split(/\s+/).filter(Boolean).map(titleCaseWord).join(' ');
  }).join(' & ');
}

function normalizeCreditRow(row) {
  return { label: row.label, value: formatCreditValue(row.value) };
}

function creditRows(card) {
  let rows;
  if (Array.isArray(card.credits) && card.credits.length) {
    rows = card.credits.map(normalizeCreditRow);
  } else {
    rows = [];
    if (card.director) rows.push({ label: 'Directed by', value: card.director });
    if (card.soundDesign) {
      rows.push({ label: card.soundDesignMix ? 'Sound Design & Mix' : 'Sound Design', value: card.soundDesign });
    }
    if (card.soundMixer) rows.push({ label: 'Sound Mixer', value: card.soundMixer });
    if (card.mix) rows.push({ label: 'Mix', value: card.mix });
    if (card.dialogueEdit) rows.push({ label: 'Dialogue Edit', value: card.dialogueEdit });
    if (card.agency) rows.push({ label: 'Agency', value: card.agency });
    if (card.production) rows.push({ label: card.productionLabel || 'Produced by', value: card.production });
    if (!rows.length) {
      rows.push({ label: 'Directed by', value: 'XYZ Studios' });
      rows.push({ label: 'Produced by', value: 'XYZ Studios' });
    }
    rows = rows.map(normalizeCreditRow);
  }
  return rows;
}

function isDirectorCredit(c) { return /^directed by$/i.test(c.label); }
function isProductionCredit(c) { return /^(produced|production) by$/i.test(c.label); }
function isSoundCredit(c) {
  return /sound design|sound mixer|^mix$|dialogue edit|mix & music/i.test(c.label);
}

function partitionCredits(card) {
  const rows = creditRows(card);
  return {
    director: rows.find(isDirectorCredit) || null,
    production: rows.find(isProductionCredit) || null,
    sound: rows.filter(isSoundCredit),
  };
}

function renderCreditCell(c, esc) {
  return `<div>
        <div class="pj-cr-col-lbl">${esc(c.label)}</div>
        <div class="pj-cr-col-val">${esc(c.value)}</div>
      </div>`;
}

function renderCreditPair(left, right, esc) {
  return `<div class="pj-cr-cols">
      ${left ? renderCreditCell(left, esc) : '<div></div>'}
      ${right ? renderCreditCell(right, esc) : '<div></div>'}
    </div>`;
}

function renderSoundRows(soundItems, esc) {
  let html = '';
  for (let i = 0; i < soundItems.length; i += 2) {
    html += renderCreditPair(soundItems[i], soundItems[i + 1] || null, esc);
  }
  return html ? `<div class="pj-cr-sound-rows">${html}</div>` : '';
}

function renderMetaRows(meta, esc) {
  let html = '';
  for (let i = 0; i < meta.length; i += 2) {
    html += renderCreditPair(meta[i], meta[i + 1] || null, esc);
  }
  return html;
}

function renderCreditCols(card, esc) {
  const rows = creditRows(card);
  const sound = rows.filter(isSoundCredit);
  const meta = rows.filter(c => !isSoundCredit(c));
  const director = meta.find(isDirectorCredit) || null;
  let inner = '';

  if (!sound.length) {
    inner = meta.length
      ? renderMetaRows(meta, esc)
      : renderCreditPair(
        { label: 'Directed by', value: 'XYZ Studios' },
        { label: 'Produced by', value: 'XYZ Studios' },
        esc,
      );
  } else if (!director) {
    inner = renderSoundRows(sound, esc);
  } else if (sound.length === 1) {
    inner = renderCreditPair(director, sound[0], esc);
    const rest = meta.filter(c => !isDirectorCredit(c));
    inner += renderMetaRows(rest, esc);
  } else {
    inner = renderCreditPair(director, null, esc) + renderSoundRows(sound, esc);
    const rest = meta.filter(c => !isDirectorCredit(c));
    inner += renderMetaRows(rest, esc);
  }

  return `<div class="pj-cr-credits-wrap">${inner}</div>`;
}

// ── Page template ──────────────────────────────────────────
function makeHTML(card, catLabel, framesHTML = '') {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const posterAttr = card.poster ? ` poster="${esc(card.poster)}"` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(card.client)} — ${esc(card.title)} — XYZ Studios</title>
  <link href="/assets/xyz-studio-dev.webflow.shared.6e9159a05.css" rel="stylesheet" type="text/css">
  <style>
    @font-face {
      font-family: 'Micross';
      src: url('/assets/micross.ttf') format('truetype');
      font-weight: 400; font-style: normal; font-display: swap;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --pad: clamp(2rem, 3.5vw, 4rem);
      --nav: 80px;
      --pj-ui-pad: 1.25rem;
      --pj-scroll-h: 32px;
    }
    html, body {
      background: #000; color: #fff;
      font-family: Micross, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .pj-stage {
      position: relative;
      width: 100%;
      height: 100vh;
      height: 100svh;
      min-height: 100svh;
      padding-top: var(--nav);
      box-sizing: border-box;
      background: #000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    /* Video sits in the flex slot between nav and controls (no overlay) */
    .pj-video-area {
      flex: 1 1 0;
      width: 100%;
      min-height: 0;
      padding: clamp(8px, 1.2vh, 16px) var(--pad);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      z-index: 1;
    }
    .pj-video-frame {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      min-width: 0;
      min-height: 0;
      background: #000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pj-video-frame.is-buffering #pj-video { opacity: 0.7; }
    #pj-video {
      display: block !important;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      object-position: center center;
      cursor: none;
    }
    .pj-bottom-dock {
      flex-shrink: 0;
      position: relative;
      z-index: 10;
      width: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 var(--pad);
      box-sizing: border-box;
      background: #000;
    }
    .pj-scroll-hint {
      flex-shrink: 0;
      width: 100%;
      height: var(--pj-scroll-h);
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.42);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
      box-sizing: border-box;
    }
    .pj-scroll-hint:hover { color: rgba(255,255,255,0.75); }
    .pj-scroll-hint.is-hidden {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }
    @keyframes pj-scroll-nudge {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(5px); }
    }
    .pj-scroll-hint svg {
      display: block;
      width: 20px; height: 20px;
      animation: pj-scroll-nudge 2.2s ease-in-out infinite;
    }

    /* ── CUSTOM VIDEO CURSOR ──────────────────────────────── */
    #pj-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 300;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.18s ease;
      flex: none;
      width: 0;
      height: 0;
      overflow: visible;
    }
    #pj-cursor.visible { opacity: 1; }
    #pj-cursor svg { display: block; }

    .pj-nav-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      pointer-events: none; width: 100%; height: 0; overflow: visible;
    }
    .pj-fade {
      position: absolute; top: 0; left: 0; right: 0; height: 130px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%);
      pointer-events: none;
    }
    .pj-nav {
      position: relative; height: 80px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 var(--pad); pointer-events: all;
    }
    .pj-logo { display: block; line-height: 0; }
    .pj-logo img { height: 29px; width: auto; display: block; }
    #pj-back-btn {
      margin-left: auto; color: rgba(255,255,255,0.8);
      background: none; border: none; cursor: pointer; padding: 0;
      font: inherit; text-transform: uppercase; transition: color 0.2s;
    }
    #pj-back-btn:hover { color: #fff; }

    /* Home player UI — in-flow under video (same markup + shared CSS) */
    .pj-bottom-dock .pj-player-ui.hero_video-ui {
      position: relative;
      left: auto; right: auto; bottom: auto;
      z-index: auto;
      padding: var(--pj-ui-pad) 0 0.35rem;
      pointer-events: auto;
    }
    .pj-player-ui .hero_video-controls {
      flex-flow: column;
      align-items: stretch;
      gap: 0.55rem;
    }
    .pj-player-ui .hero_video-controls_inner {
      margin-top: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      align-items: center;
      gap: 1rem;
    }
    .pj-player-ui .pj-ctrl-play-row {
      display: flex;
      align-items: center;
      gap: clamp(12px, 1.6vw, 22px);
      flex-shrink: 0;
      pointer-events: auto;
    }
    .pj-player-ui .pj-ctrl-play-row .hero_video-toggle.play {
      min-width: 0;
      margin: 0;
    }
    .pj-player-ui .pj-ctrl-play-row .hero_video-time {
      margin-right: 0;
      justify-content: flex-start;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .pj-player-ui .pj-ctrl-play-row .hero_video-time-current,
    .pj-player-ui .pj-ctrl-play-row .hero_video-time-total {
      font: 400 10px/1 Micross, Arial, sans-serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }
    .hero_home-pj-ctrl-r {
      flex-wrap: nowrap !important;
      justify-content: flex-end !important;
      align-items: center !important;
      gap: 22px;
      grid-column-gap: 22px !important;
      grid-row-gap: 0 !important;
    }
    .hero_home-pj-ctrl-r .div-block-73 {
      flex-wrap: nowrap !important;
      justify-content: flex-end !important;
      align-items: center !important;
      gap: 10px;
      grid-column-gap: 10px !important;
    }
    .hero_home-pj-ctrl-r .hero_home-pj-mute,
    .hero_home-pj-ctrl-r .hero_home-pj-fs {
      color: rgba(255, 255, 255, 0.45) !important;
      background: none !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 0 !important;
      font: 400 10px/1 Micross, Arial, sans-serif !important;
      letter-spacing: 0.18em !important;
      text-transform: uppercase !important;
      -webkit-font-smoothing: antialiased;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      transition: color 0.2s ease !important;
    }
    .hero_home-pj-ctrl-r .hero_home-pj-mute:hover,
    .hero_home-pj-ctrl-r .hero_home-pj-fs:hover { color: #fff !important; }
    .hero_video-scrub-track { position: relative; }
    .hero_video-scrub-fill {
      width: 0%;
      will-change: width;
    }
    .hero_video-scrub-thumb {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      left: 0%;
    }
    .pj-player-ui .projects_item-titles {
      transition: opacity 0.4s ease;
      will-change: opacity;
    }

    .pj-stage.is-fullscreen {
      position: fixed; inset: 0; z-index: 500;
      min-height: 100svh; height: 100svh;
      padding-top: 0;
    }
    .pj-stage.is-fullscreen .pj-video-area {
      position: absolute;
      inset: 0;
      padding: 0;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pj-stage.is-fullscreen .pj-video-frame {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      max-width: none; max-height: none; aspect-ratio: unset;
    }
    .pj-stage.is-fullscreen #pj-video { object-fit: cover; }
    .pj-stage.is-fullscreen .pj-bottom-dock {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 0 var(--pad);
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
    }
    .pj-stage.is-fullscreen .pj-scroll-hint { display: none; }
    .pj-stage.is-fullscreen .hero_home-pj-fs { display: none !important; }
    .pj-stage.is-fullscreen .pj-logo { display: none; }

    /* ── CREDITS STAGGER ANIMATION ───────────────────────── */
    @keyframes pj-rise {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pj-credits.revealed .pj-cr-title { animation: pj-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
    .pj-credits.revealed .pj-cr-sub   { animation: pj-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
    .pj-credits.revealed .pj-cr-cols  { animation: pj-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
    .pj-credits.revealed .pj-frames   { animation: pj-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both; }

    /* ── CREDITS: tight, directly after stage ─────────────── */
    .pj-credits {
      background: #000;
      padding: 48px var(--pad) 80px;
    }
    .pj-cr-title {
      font: 700 48px/1.04 Micross, Arial, sans-serif;
      color: #fff; letter-spacing: -0.02em;
      margin-bottom: 10px;
      -webkit-font-smoothing: antialiased;
    }
    .pj-cr-sub {
      font: 400 12px/1 Micross, Arial, sans-serif;
      color: rgba(255,255,255,0.35);
      letter-spacing: 0.12em; text-transform: uppercase;
      margin-bottom: 40px;
      -webkit-font-smoothing: antialiased;
    }

    /* FRAMES: 2 per row */
    .pj-frames { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 48px; }
    .pj-frames:empty { display: none; margin: 0; }
    .pj-frames img { width: 100%; display: block; object-fit: cover; aspect-ratio: 16/9; }
    .pj-frames img.full { grid-column: 1 / -1; }

    /* Credits columns */
    .pj-cr-credits-wrap { margin-bottom: 40px; }
    .pj-cr-cols {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0 32px;
    }
    .pj-cr-sound-rows { margin-top: 22px; }
    .pj-cr-sound-rows .pj-cr-cols + .pj-cr-cols { margin-top: 22px; }
    .pj-cr-col-lbl { font: 400 8px/1 Micross, Arial, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.22); margin-bottom: 10px; -webkit-font-smoothing: antialiased; }
    .pj-cr-col-val { font: 400 13px/1.5 Micross, Arial, sans-serif; color: rgba(255,255,255,0.75); }
  </style>
</head>
<body>

  <!-- Page transition overlay (white — continues Work page cover, slides up to reveal) -->
  <div id="page-in" style="position:fixed;inset:0;z-index:9999;background:#fff;pointer-events:none;transform:translateY(0);">
    <img src="https://cdn.prod.website-files.com/6917408c1d0fee8fc2c58505/691f47e2f734702aa3a0675f_xyz-logo.png" alt="" style="position:absolute;bottom:36px;left:44px;width:72px;display:block;filter:invert(1);pointer-events:none;">
  </div>

  <!-- STAGE: hero + controls + scroll hint; video scales to largest 9:16 in the slot -->
  <div class="pj-stage" id="pj-stage">

    <div class="pj-nav-bar">
      <div class="pj-fade"></div>
      <div class="pj-nav">
        <a href="/" class="pj-logo">
          <img src="https://cdn.prod.website-files.com/6917408c1d0fee8fc2c58505/691f47e2f734702aa3a0675f_xyz-logo.png" alt="XYZ Studios" referrerpolicy="no-referrer" crossorigin="anonymous">
        </a>
        <button type="button" id="pj-back-btn">Back</button>
      </div>
    </div>

    <div id="pj-cursor">
      <svg id="pj-cursor-svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path id="pj-cursor-path" d="M8 5v14l11-7z"/>
      </svg>
    </div>

    <div class="pj-video-area">
      <div class="pj-video-frame">
        <video id="pj-video" src="${esc(card.video)}" playsinline preload="metadata"${posterAttr}></video>
      </div>
    </div>

    <div class="pj-bottom-dock">
      <div class="hero_video-ui pj-player-ui">
        <div class="hero_video-controls">
          <div class="hero_video-scrub" id="pj-scrub">
            <div class="hero_video-scrub-track">
              <div class="hero_video-scrub-buffer"></div>
              <div class="hero_video-scrub-fill"></div>
              <div class="hero_video-scrub-thumb"></div>
            </div>
          </div>
          <div class="hero_video-controls_inner">
            <div class="pj-ctrl-play-row">
              <div class="hero_video-toggle play" id="pj-play-btn">
                <div hero_video-icon="play">Play</div>
                <div hero_video-icon="pause" style="display:none">Pause</div>
              </div>
              <div class="hero_video-time">
                <div class="hero_video-time-current">0:00</div>
                <div class="hero_video-time-separator"></div>
                <div class="hero_video-time-total">0:00</div>
              </div>
            </div>
            <div class="projects_item-titles" id="pj-ui-titles">
              <div class="projects_item-title">${esc(card.title)}</div>
              <div class="projects_item-title company">${esc(card.client)}</div>
            </div>
            <div class="div-block-76 hero_home-pj-ctrl-r">
              <div class="div-block-73">
                <div class="hero_video-toggle hero_home-pj-mute" id="pj-mute-btn">
                  <div hero_video-text="sound">Sound:On</div>
                  <div hero_video-text="mute" style="display:none">Sound:Off</div>
                </div>
              </div>
              <div class="hero_video-toggle hero_home-pj-fs" id="pj-fs-btn"><div>Full Screen</div></div>
            </div>
          </div>
        </div>
      </div>
      <button type="button" class="pj-scroll-hint" id="pj-scroll-hint" aria-label="Scroll to project details">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
    </div>

  </div>

  <!-- CREDITS: tight directly after stage -->
  <div class="pj-credits" id="pj-credits">
    <div class="pj-cr-title">${esc(card.title)}</div>
    <div class="pj-cr-sub">${esc(card.client)}</div>

    ${renderCreditCols(card, esc)}

    <!-- ── FRAMES — add stills below ─────────────────────── -->
    <!--
      <img src="frame.jpg" alt="">           half-width (default)
      <img src="frame.jpg" class="full">     full-width
    -->
    <div class="pj-frames">${framesHTML}
    </div>
  </div>

<script>
  const stage   = document.getElementById('pj-stage');
  const vid     = document.getElementById('pj-video');
  const playBtn   = document.getElementById('pj-play-btn');
  const playLabel = playBtn.querySelector('[hero_video-icon="play"]');
  const pauseLabel= playBtn.querySelector('[hero_video-icon="pause"]');
  const muteBtn   = document.getElementById('pj-mute-btn');
  const soundLabel= muteBtn.querySelector('[hero_video-text="sound"]');
  const muteLabel = muteBtn.querySelector('[hero_video-text="mute"]');
  const fsBtn     = document.getElementById('pj-fs-btn');
  const backBtn   = document.getElementById('pj-back-btn');
  const scrub     = document.getElementById('pj-scrub');
  const progress  = document.querySelector('.hero_video-scrub-fill');
  const handle    = document.querySelector('.hero_video-scrub-thumb');
  const credits   = document.getElementById('pj-credits');
  const scrollHint = document.getElementById('pj-scroll-hint');
  const uiTitles  = document.getElementById('pj-ui-titles');
  const UI_TITLE_FADE_PX = 140;

  function updateUiTitleOpacity() {
    if (!uiTitles || stage.classList.contains('is-fullscreen')) return;
    const creditsTop = credits.getBoundingClientRect().top;
    const fadeEnd = window.innerHeight - UI_TITLE_FADE_PX;
    const opacity = creditsTop >= window.innerHeight
      ? 1
      : creditsTop <= fadeEnd
        ? 0
        : (creditsTop - fadeEnd) / (window.innerHeight - fadeEnd);
    uiTitles.style.opacity = String(opacity);
    uiTitles.style.pointerEvents = opacity < 0.05 ? 'none' : '';
  }

  vid.pause();
  const videoFrame = vid.closest('.pj-video-frame');
  const urlPoster = new URLSearchParams(location.search).get('poster');
  if (urlPoster && !vid.getAttribute('poster')) vid.setAttribute('poster', urlPoster);

  function syncDuration() {
    const total = document.querySelector('.hero_video-time-total');
    if (total && isFinite(vid.duration) && vid.duration > 0) total.textContent = fmt(vid.duration);
  }

  function togglePlay() {
    if (!vid.paused) { vid.pause(); return; }
    if (vid.readyState === 0) vid.load();
    videoFrame && videoFrame.classList.add('is-buffering');
    function start() {
      vid.play().catch(function () {}).finally(function () {
        videoFrame && videoFrame.classList.remove('is-buffering');
      });
    }
    if (vid.readyState >= 3) start();
    else vid.addEventListener('canplay', start, { once: true });
  }

  vid.addEventListener('loadedmetadata', syncDuration);
  vid.addEventListener('durationchange', syncDuration);

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
  }
  function updatePlay() {
    const paused = vid.paused;
    if (playLabel)  playLabel.style.display  = paused ? '' : 'none';
    if (pauseLabel) pauseLabel.style.display = paused ? 'none' : '';
  }
  function updateMute() {
    const muted = vid.muted;
    if (soundLabel) soundLabel.style.display = muted ? 'none' : '';
    if (muteLabel)  muteLabel.style.display  = muted ? '' : 'none';
  }

  let _raf = null;
  function _tick() {
    const cur = vid.currentTime, dur = vid.duration || 0;
    document.querySelector('.hero_video-time-current').textContent = fmt(cur);
    document.querySelector('.hero_video-time-total').textContent = fmt(dur);
    const pct = dur ? cur / dur : 0;
    progress.style.width = (pct * 100) + '%';
    handle.style.left = (pct * 100) + '%';
    _raf = requestAnimationFrame(_tick);
  }
  function _startRaf() { if (!_raf) _raf = requestAnimationFrame(_tick); }
  function _stopRaf()  { if (_raf) { cancelAnimationFrame(_raf); _raf = null; } }
  vid.addEventListener('play',  () => { updatePlay(); _startRaf(); });
  vid.addEventListener('pause', () => { updatePlay(); _stopRaf(); });
  vid.addEventListener('ended', () => { updatePlay(); _stopRaf(); });

  // Custom cursor on video
  // Custom cursor
  const cursor     = document.getElementById('pj-cursor');
  const cursorPath = document.getElementById('pj-cursor-path');
  const PLAY_PATH  = 'M8 5v14l11-7z';
  const PAUSE_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';
  function updateCursorIcon() { cursorPath.setAttribute('d', vid.paused ? PLAY_PATH : PAUSE_PATH); }
  vid.addEventListener('mouseenter', () => cursor.classList.add('visible'));
  vid.addEventListener('mouseleave', () => cursor.classList.remove('visible'));
  vid.addEventListener('mousemove',  e  => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });
  vid.addEventListener('play',  updateCursorIcon);
  vid.addEventListener('pause', updateCursorIcon);

  // Click to play/pause (waits for canplay on large sources)
  vid.addEventListener('click', togglePlay);
  playBtn.addEventListener('click', togglePlay);
  muteBtn.addEventListener('click', () => { vid.muted = !vid.muted; updateMute(); });

  // Fullscreen — enter only; CSS hides fsBtn when in fullscreen; Back btn becomes Close
  fsBtn.addEventListener('click', () => { stage.requestFullscreen && stage.requestFullscreen(); });
  document.addEventListener('fullscreenchange', () => {
    const fs = !!document.fullscreenElement;
    stage.classList.toggle('is-fullscreen', fs);
    backBtn.textContent = fs ? 'Close' : 'Back';
    if (uiTitles) {
      uiTitles.style.opacity = fs ? '' : undefined;
      uiTitles.style.pointerEvents = fs ? '' : undefined;
    }
    updateUiTitleOpacity();
  });

  // Scrubber
  let scrubbing = false;
  function seekTo(e) {
    const r = scrub.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (isFinite(vid.duration)) vid.currentTime = pct * vid.duration;
  }
  scrub.addEventListener('mousedown', e => { scrubbing = true; seekTo(e); });
  document.addEventListener('mousemove', e => { if (scrubbing) seekTo(e); });
  document.addEventListener('mouseup',   () => { scrubbing = false; });


  // Page enter: white panel slides up (matches Work → project cover handoff)
  const pageIn = document.getElementById('page-in');
  function slideAwayPageIn() {
    if (!pageIn) return;
    pageIn.style.transition = 'none';
    pageIn.style.transform = 'translateY(0)';
    pageIn.style.pointerEvents = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pageIn.style.transition = 'transform 0.48s cubic-bezier(0.76,0,0.24,1)';
        pageIn.style.transform = 'translateY(-100%)';
      });
    });
  }
  slideAwayPageIn();
  window.addEventListener('pageshow', e => { if (e.persisted) slideAwayPageIn(); });

  // Back: fade to black then navigate
  const pageOut = document.createElement('div');
  pageOut.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;opacity:0;pointer-events:none;transition:opacity 0.38s cubic-bezier(0.4,0,1,1);';
  document.body.appendChild(pageOut);

  function goBack() {
    pageOut.style.opacity = '1';
    pageOut.style.pointerEvents = 'all';
    setTimeout(() => {
      if (document.referrer && new URL(document.referrer).host === window.location.host) history.back();
      else window.location.href = '/projects/';
    }, 420);
  }
  backBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      goBack();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.fullscreenElement) goBack(); });

  updatePlay(); updateMute(); updateCursorIcon();

  // Scroll hint → credits
  scrollHint.addEventListener('click', () => {
    credits.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  window.addEventListener('scroll', updateUiTitleOpacity, { passive: true });
  window.addEventListener('resize', updateUiTitleOpacity);
  updateUiTitleOpacity();

  new IntersectionObserver((entries) => {
    scrollHint.classList.toggle('is-hidden', entries[0].isIntersecting);
  }, { threshold: 0.04, rootMargin: '0px 0px -8% 0px' }).observe(credits);

  // Credits stagger — trigger when scrolled into view
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { credits.classList.add('revealed'); obs.disconnect(); }
  }, { threshold: 0.05 }).observe(credits);
</script>
</body>
</html>`;
}

// ── Per-project frames (add images here) ───────────────────
// Key format: 'catSlug/projSlug'
const FRAMES = {
  'visual-effects/speedcross-3': `
      <img src="1.png" alt="">
      <img src="2.png" alt="">
      <img src="3.png" alt="">`,
  'visual-effects/road-to-palisades': `
      <img src="1.jpg" alt="">
      <img src="2.jpg" alt="">
      <img src="Toyota%20Palisades%20Tundra.mp4_snapshot_00.23.046.jpg" alt="">
      <img src="Toyota%20Palisades%20Tundra.mp4_snapshot_00.26.274.jpg" alt="">`,
  // Add more projects here as needed:
  // 'sound/open': `<img src="frame1.jpg" alt=""><img src="frame2.jpg" alt="">`,
};

// ── Generate ───────────────────────────────────────────────
let total = 0;
for (const row of ROWS) {
  const catSlug = slugify(row.label);
  const catDir  = path.join(WORK, catSlug);
  fs.mkdirSync(catDir, { recursive: true });

  for (const card of row.cards) {
    const projSlug = card.slug || slugify(card.title);
    const projDir  = path.join(catDir, projSlug);
    fs.mkdirSync(projDir, { recursive: true });
    const framesHTML = FRAMES[`${catSlug}/${projSlug}`] || '';
    fs.writeFileSync(path.join(projDir, 'index.html'), makeHTML(card, row.label, framesHTML));
    console.log(`  ✓  /work/${catSlug}/${projSlug}/`);
    total++;
  }
}

console.log(`\nDone — ${total} project pages generated.`);
