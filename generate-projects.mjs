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
      { video: VF  + 'cbf82991-c743-4045-8898-b6ee78efd9b4.mp4',         client: 'Atomic',         title: 'Into the Void',                date: 'NOV 15', clipStart: 24, clipEnd: 33 },
      { video: VF  + 'ef1dc602-5a95-4973-a0ea-82794726bc4a.mp4',         client: 'Salomon',        title: 'Speedcross 3',                 date: 'OCT 25' },
      { video: SB  + 'PcB8hb2-uO/original',                              client: 'Salomon',        title: 's/lab Manifesto',              date: 'FEB 26' },
      { video: SB  + '9O7xsj76Lw/original',                              client: 'Toyota',         title: 'Road to Palisades',            date: 'FEB 26' },
      { video: SB  + '85D_It6HUS/original',                               client: 'RBC',            title: 'Canadian Open',                date: 'MAR 9'  },
      { video: SB  + 'JchEHAr96O/original',                               client: 'JennAir',        title: 'The Flip',                     date: 'JAN 10' },
      { video: SB  + '0yJ5A9ii2H/original',                               client: 'Fanatics',       title: 'NBA Store',                    date: 'DEC 20' },
      { video: SB  + 'mu8ewXP3uH/original',                               client: 'Fanatics',       title: 'NHL Store',                    date: 'DEC 15' },
      { video: VF  + 'c5bfdb30-f5d1-4f1d-a96f-b736b4ab1fcf.mp4',         client: 'Celsius',        title: 'Spritez Vibez',                date: 'MAY 20' },
      { video: VF  + 'edac671a-7d48-4eb1-b1ea-c2556b330ee4.mp4',         client: 'Chino Pacas',    title: 'Modo Capone',                  date: 'SEP 12' },
      { video: VF  + 'e07f965d-dc13-45bc-a958-08fd1baa3793.mp4',         client: 'Marc Jacobs',    title: 'The Essentials',               date: 'OCT 24' },
      { video: VF  + 'b383d525-8d02-4f4b-b2fa-0d9c29a71d91.mp4',         client: 'Fuerza Regida',  title: 'Tu Sancho',                    date: 'AUG 3'  },
      { video: VF  + 'daf3f8d1-9b55-438d-9259-922de5fb7c8f.mp4',         client: 'Fuerza Regida',  title: 'Secreto Victoria',             date: 'JUL 18' },
      { video: VF  + '15e90e12-e3b1-420a-9b11-db60a7b199b0.mp4',         client: 'Tokischa',       title: 'De Maravisha',                 date: 'JUN 5'  },
    ]
  },
  {
    label: 'Sound',
    cards: [
      { video: VF  + '214a3ae2-01ca-4593-8949-98a7191f6548.mp4',         client: 'Louis Vuitton',  title: 'SS26 Teaser',                  date: 'APR 14' },
      { video: VF  + '17e77d71-3bca-4d42-8275-71deb05724d1.mp4',         client: 'Beats',          title: 'Open',                         date: 'OCT 10' },
      { video: VF  + '24fed0b9-4d02-45b3-895b-437c3ab89f38.mp4',         client: "Arc'teryx",      title: 'Precision Without Limits',     date: 'FEB 28' },
      { video: VF  + '6c66aad7-7df3-4809-a8d7-1f92a377fa5e.mp4',         client: 'Lucid',          title: 'Compromise Nothing',           date: 'DEC 5'  },
      { video: VF  + 'fb5e495e-8460-4277-a7aa-08accd388af0.mp4',         client: 'Prime Video',    title: 'Good Sports',                  date: 'NOV 21' },
      { video: VF  + '0f5dc170-f1e8-4b0b-a0bd-d9e6486a91e7.mp4',         client: 'Samsung',        title: 'Galaxy AI',                    date: 'MAY 28' },
      { video: VF  + '4f593e77-d9ea-4992-8dc1-f8520895f0e9.mp4',         client: 'Ford',           title: 'Join the Search',              date: 'JAN 16' },
      { video: VF  + '996ba39f-1c06-4887-8dc3-52c21a4089b1.mp4',         client: 'Apple Music',    title: "Don't Forget to Take a Break", date: 'DEC 23' },
      { video: VF  + '5b0d552d-9e53-4967-9d5b-15a5deb86100.mp4',         client: 'New Era',        title: 'F1',                           date: 'NOV 4'  },
      { video: VF  + 'a1bc0884-b2b7-42a3-aac5-a490571499f5.mp4',         client: 'Burna Boy',      title: 'Tatata ft. Travis Scott',      date: 'SEP 12' },
      { video: VF  + '0e01d94b-2f38-4e6c-8874-14fc6e98dfeb.mp4',         client: 'Nike',           title: 'Hard Is Home',                 date: 'SEP 2'  },
      { video: VF  + '00c390f8-2185-4729-be87-dcc17552bc0b.mp4',         client: 'Foot Locker',    title: 'Stay in Rotation',             date: 'AUG 15' },
      { video: VF  + 'ad2de35b-a84f-4468-8ea1-704e79fc1d6e.mp4',         client: 'Ram Truck',      title: 'The Hunt',                     date: 'JUL 7'  },
      { video: VF  + '392708ea-1d8c-4872-a6cd-65f4a5e947ba.mp4',         client: 'SNIPES',         title: 'Style Is In Session',          date: 'SEP 3'  },
      { video: VF  + '68eb0d30-28c6-4074-a239-6ff8a10dbbf1.mp4',         client: 'Hongqi',         title: 'Hongqi',                       date: 'AUG 19' },
    ]
  },
  {
    label: 'AI',
    cards: [
      { video: SB  + 'I_J-Bii5Ql/original',                              client: 'BMW',            title: 'Concept RR',                   date: 'MAR 14' },
      { video: SB  + 'Clp65xDTmS/original',                              client: 'Nike',           title: 'AI',                           date: 'FEB 8',  slug: 'ai-nike'         },
      { video: SB  + 'h-VCHXYcwA/original',                              client: 'Ducati',         title: 'AI',                           date: 'JAN 22', slug: 'ai-ducati'       },
      { video: SB  + 'V0a7Q0zaqq/original',                              client: 'Ferrari',        title: 'AI',                           date: 'DEC 11', slug: 'ai-ferrari'      },
      { video: SB  + 'LWep2Duvk-/original',                              client: 'Mercedes-Benz',  title: 'A Cold Wall',                  date: 'NOV 30' },
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

// ── Page template ──────────────────────────────────────────
function makeHTML(card, catLabel, framesHTML = '') {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(card.client)} — ${esc(card.title)} — XYZ Studios</title>
  <style>
    @font-face {
      font-family: 'Micross';
      src: url('/assets/micross.ttf') format('truetype');
      font-weight: 400; font-style: normal; font-display: swap;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --pad: 48px;    /* align with .pj-nav — player spans logo ↔ Back */
      --nav: 80px;    /* fixed header band (logo / Back) */
      --video-top: 64px; /* offset before player (under fixed nav) */
      --ctrl: 50px;   /* scrubber + control row */
      --pj-scroll-h: 36px; /* scroll hint — match .pj-scroll-hint */
      /* Max player height: landscape 16:9 box must fit above bottom dock */
      --pj-video-slot-h: calc(100vh - var(--video-top) - var(--ctrl) - var(--pj-scroll-h));
      --pj-video-slot-h: calc(100svh - var(--video-top) - var(--ctrl) - var(--pj-scroll-h));
    }
    html, body { background: #000; color: #fff; font-family: Micross, Arial, sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

    /* ── STAGE: min first screen; flex pushes controls + hint below a larger video ─ */
    .pj-stage {
      position: relative;
      width: 100%;
      min-height: 100vh;
      min-height: 100svh;
      background: #000;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* Fills viewport between header and dock; player centered like the reference */
    .pj-video-area {
      flex: 1 1 auto;
      width: 100%;
      min-height: 0;
      padding: var(--video-top) var(--pad) 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .pj-bottom-dock {
      flex-shrink: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
    }

    /*
      Wrapper fixes layout: <video> uses intrinsic dimensions otherwise.
      Reference: large 16:9 cinematic frame, full width between nav gutters.
    */
    .pj-video-frame {
      position: relative;
      box-sizing: border-box;
      width: min(100%, calc(100vw - 2 * var(--pad)), calc(var(--pj-video-slot-h) * 16 / 9));
      max-width: 100%;
      max-height: var(--pj-video-slot-h);
      aspect-ratio: 16 / 9;
      height: auto;
      background: #000;
      overflow: hidden;
      flex-shrink: 0;
    }
    #pj-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: center center;
      cursor: none;
    }

    /* Scroll arrow — row height matches --pj-scroll-h */
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

    /* ── NAV: always pinned, never hides ─────────────────── */
    .pj-nav-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      pointer-events: none;
      flex: none;
      width: 100%;
      height: 0;
      overflow: visible;
    }

    /* Dark gradient fade at top */
    .pj-fade {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 130px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%);
      pointer-events: none;
    }

    /* Shared label */
    .lbl {
      font: 400 10px/1 Micross, Arial, sans-serif;
      letter-spacing: 0.18em; text-transform: uppercase;
      -webkit-font-smoothing: antialiased;
    }

    /* Nav row: logo left, back/close right */
    .pj-nav {
      position: relative;
      height: 80px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 48px;
      pointer-events: all;
    }
    .pj-logo { display: block; line-height: 0; }
    .pj-logo img { height: 29px; width: auto; display: block; }

    /* BACK / CLOSE button — always right-aligned */
    #pj-back-btn {
      margin-left: auto;
      color: rgba(255,255,255,0.8);
      background: none; border: none; cursor: pointer; padding: 0;
      transition: color 0.2s;
    }
    #pj-back-btn:hover { color: #fff; }

    /* ── CONTROLS BAR: stack below video area */
    .pj-ctrl-bar {
      flex-shrink: 0;
      width: 100%;
      height: var(--ctrl);
      box-sizing: border-box;
      background: #000;
      padding: 3px var(--pad) 5px;
      display: flex; flex-direction: column; justify-content: center;
      gap: 5px;
    }

    /* Progress track */
    .pj-track {
      height: 1px;
      background: rgba(255,255,255,0.15);
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
    }
    #pj-progress {
      position: absolute; left: 0; top: 0; bottom: 0;
      background: rgba(255,255,255,0.88);
      pointer-events: none; width: 0%;
    }
    #pj-handle {
      position: absolute; top: 50%;
      transform: translate(-50%, -50%);
      width: 9px; height: 9px; border-radius: 50%;
      background: #fff; pointer-events: none; left: 0%;
      opacity: 0; transition: opacity 0.15s;
    }
    .pj-track:hover #pj-handle { opacity: 1; }

    /* Controls row — play/time | title — client | sound/fullscreen */
    .pj-ctrl-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      width: 100%;
      gap: 12px;
    }
    .pj-ctrl-l { display: flex; align-items: center; gap: 18px; min-width: 0; }
    .pj-ctrl-m {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
      white-space: nowrap;
      min-width: 0;
      text-align: center;
    }
    .pj-ctrl-r { display: flex; align-items: center; gap: 22px; justify-content: flex-end; min-width: 0; }

    #pj-play-btn { color: rgba(255,255,255,0.55); background: none; border: none; cursor: pointer; padding: 0; transition: color 0.2s; }
    #pj-play-btn:hover { color: #fff; }
    #pj-time { color: rgba(255,255,255,0.3); font-variant-numeric: tabular-nums; }
    #pj-title-span { color: rgba(255,255,255,0.75); }
    #pj-sep-span { color: rgba(255,255,255,0.22); letter-spacing: 0; }
    #pj-client-span { color: rgba(255,255,255,0.38); }
    #pj-mute-btn, #pj-fs-btn {
      color: rgba(255,255,255,0.45); background: none; border: none; cursor: pointer; padding: 0;
      transition: color 0.2s;
      font: 400 10px/1 Micross, Arial, sans-serif;
      letter-spacing: 0.18em; text-transform: uppercase;
      -webkit-font-smoothing: antialiased;
    }
    #pj-mute-btn:hover, #pj-fs-btn:hover { color: #fff; }

    /* ── FULLSCREEN: video fills entire screen ────────────── */
    .pj-stage.is-fullscreen .pj-video-area {
      position: absolute;
      inset: 0;
      z-index: 0;
      padding: 0;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pj-stage.is-fullscreen .pj-video-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      aspect-ratio: unset;
    }
    .pj-stage.is-fullscreen #pj-video {
      object-fit: cover;
    }
    .pj-stage.is-fullscreen .pj-scroll-hint { display: none; }
    .pj-stage.is-fullscreen .pj-bottom-dock {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      z-index: 50;
    }
    .pj-stage.is-fullscreen .pj-ctrl-bar {
      position: relative;
      background: transparent;
      border-top: none;
    }
    .pj-stage.is-fullscreen .pj-logo { display: none; }
    .pj-stage.is-fullscreen #pj-fs-btn { display: none; }
    .pj-stage.is-fullscreen .pj-nav-bar { position: absolute; }

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
      padding: 48px 48px 80px;
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
    .pj-cr-cols {
      display: grid; grid-template-columns: 1fr 1fr;
      margin-bottom: 40px;
    }
    .pj-cr-col-lbl { font: 400 8px/1 Micross, Arial, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.22); margin-bottom: 10px; -webkit-font-smoothing: antialiased; }
    .pj-cr-col-val { font: 400 13px/1.5 Micross, Arial, sans-serif; color: rgba(255,255,255,0.75); }
  </style>
</head>
<body>

  <!-- Page transition overlay -->
  <div id="page-in" style="position:fixed;inset:0;z-index:9998;background:#000;opacity:1;pointer-events:none;transition:opacity 0.6s cubic-bezier(0,0,0.3,1);"></div>

  <!-- STAGE: hero + controls + scroll hint; video scales to largest 9:16 in the slot -->
  <div class="pj-stage" id="pj-stage">

    <!-- NAV: fixed — first in DOM so flex order stays video → spacer → dock -->
    <div class="pj-nav-bar">
      <div class="pj-fade"></div>
      <div class="pj-nav">
        <a href="/" class="pj-logo">
          <img src="/assets/691f47e2f734702aa3a0675f_xyz-logo.png" alt="XYZ Studios">
        </a>
        <button class="lbl" id="pj-back-btn">Back</button>
      </div>
    </div>

    <div id="pj-cursor">
      <svg id="pj-cursor-svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path id="pj-cursor-path" d="M8 5v14l11-7z"/>
      </svg>
    </div>

    <div class="pj-video-area">
      <div class="pj-video-frame">
        <video id="pj-video" src="${esc(card.video)}" playsinline preload="auto"></video>
      </div>
    </div>

    <div class="pj-bottom-dock">
      <div class="pj-ctrl-bar">
        <div class="pj-track" id="pj-track">
          <div id="pj-progress"></div>
          <div id="pj-handle"></div>
        </div>
        <div class="pj-ctrl-row">
          <div class="pj-ctrl-l">
            <button class="lbl" id="pj-play-btn">Play</button>
            <span class="lbl" id="pj-time">0:00 \u2014 0:00</span>
          </div>
          <div class="pj-ctrl-m">
            <span class="lbl" id="pj-title-span">${esc(card.title)}</span>
            <span class="lbl" id="pj-sep-span">\u2014</span>
            <span class="lbl" id="pj-client-span">${esc(card.client)}</span>
          </div>
          <div class="pj-ctrl-r">
            <button id="pj-mute-btn">Sound:On</button>
            <button id="pj-fs-btn">Full Screen</button>
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

    <div class="pj-cr-cols">
      <div>
        <div class="pj-cr-col-lbl">Directed by</div>
        <div class="pj-cr-col-val">XYZ Studios</div>
      </div>
      <div>
        <div class="pj-cr-col-lbl">Production by</div>
        <div class="pj-cr-col-val">XYZ Studios</div>
      </div>
    </div>

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
  const playBtn = document.getElementById('pj-play-btn');
  const timeEl  = document.getElementById('pj-time');
  const muteBtn = document.getElementById('pj-mute-btn');
  const fsBtn   = document.getElementById('pj-fs-btn');
  const backBtn = document.getElementById('pj-back-btn');
  const track   = document.getElementById('pj-track');
  const progress= document.getElementById('pj-progress');
  const handle  = document.getElementById('pj-handle');

  // Start paused
  vid.pause();

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
  }
  function updatePlay() { playBtn.textContent = vid.paused ? 'Play' : 'Pause'; }
  function updateMute() { muteBtn.textContent = vid.muted ? 'Sound:Off' : 'Sound:On'; }

  vid.addEventListener('play',  updatePlay);
  vid.addEventListener('pause', updatePlay);
  vid.addEventListener('timeupdate', () => {
    const cur = vid.currentTime, dur = vid.duration || 0;
    timeEl.textContent = fmt(cur) + ' \u2014 ' + fmt(dur);
    const pct = dur ? (cur / dur) * 100 : 0;
    progress.style.width = pct + '%';
    handle.style.left    = pct + '%';
  });

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

  // Click to play/pause
  vid.addEventListener('click', () => { vid.paused ? vid.play() : vid.pause(); });
  playBtn.addEventListener('click', () => { vid.paused ? vid.play() : vid.pause(); });
  muteBtn.addEventListener('click', () => { vid.muted = !vid.muted; updateMute(); });

  // Fullscreen — enter only; CSS hides fsBtn when in fullscreen; Back btn becomes Close
  fsBtn.addEventListener('click', () => { stage.requestFullscreen && stage.requestFullscreen(); });
  document.addEventListener('fullscreenchange', () => {
    const fs = !!document.fullscreenElement;
    stage.classList.toggle('is-fullscreen', fs);
    backBtn.textContent = fs ? 'Close' : 'Back';
  });

  // Scrubber
  let scrubbing = false;
  function seekTo(e) {
    const r = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (isFinite(vid.duration)) vid.currentTime = pct * vid.duration;
  }
  track.addEventListener('mousedown', e => { scrubbing = true; seekTo(e); });
  document.addEventListener('mousemove', e => { if (scrubbing) seekTo(e); });
  document.addEventListener('mouseup',   () => { scrubbing = false; });


  // Page enter: fade in from black
  const pageIn = document.getElementById('page-in');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { pageIn.style.opacity = '0'; });
  });

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
  const credits = document.getElementById('pj-credits');
  const scrollHint = document.getElementById('pj-scroll-hint');
  scrollHint.addEventListener('click', () => {
    credits.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
      <img src="image%201.jpg" alt="">
      <img src="image%202.jpg" alt="">
      <img src="image%203.jpg" alt="">`,
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
