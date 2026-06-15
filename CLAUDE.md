# CLAUDE.md - XYZ Studios site

Operational notes. Read this first.

## Source of truth & deploy pipeline (IMPORTANT)

- Live site `xyzstudios.co` / `www.xyzstudios.co` -> Vercel project `xyzsite-omega` (`prj_VJcvkk6j0pDBjgtmsS5OP2ZPcgpf`), which auto-deploys from GitHub `samry883-eng/xyzsite` branch `main`.
- Build: `npm run build` -> `scripts/prepare-github-pages.mjs` -> output dir `dist`. It copies `Home/index.html` -> `dist/index.html` and (NEW) bakes the home order in (see below).
- The GitHub repo is the source of truth, NOT the local folder. Always pull from `main` before editing.

## Home hero videos & ordering (NEW architecture: BAKED at build, no runtime race)

This was rebuilt to kill a whole class of bugs. How it works now:

1. The admin order lives in **Vercel Edge Config**, key `workOrder` (its `homeList` is the hero order). It is read/written by `/api/site-order` (lib/site-store.mjs). Edit it via the admin UI.
2. At **build time**, `scripts/prepare-github-pages.mjs` fetches `workOrder` (Edge Config -> fallback live `/api/site-order` -> fallback baked default) and injects it into `dist/index.html` as `window.__HOME_ORDER`, replacing the `/*XYZ_BUILD_ORDER*/` placeholder.
3. The page rebuilds the hero list **synchronously** from `window.__HOME_ORDER` (the `/* xyz-home-reel */` inline script, runs at parse time BEFORE Slater). There is **NO runtime fetch**, so nothing races Slater. Slater then plays a clean static list.
4. Saving in the admin (`POST /api/site-order`) writes Edge Config **and auto-triggers a production redeploy** (via Vercel API), so the baked order refreshes hands-off in ~30s.
5. Two small support scripts in `Home/index.html`:
   - `/* xyz-hero-playback-fix */`: Slater does NOT autoplay videos or hide duplicate footers on its own here, so this plays the active video, pauses the rest, hides non-active `.hero_content-footer` (de-dupes the identical bottom links), briefly holds slide 0, and keeps crossfades smooth (opacity-based, leaves `.hero_content` alone so titles still slide).
   - `/* xyz-video-preload */`: LIGHT preload of the first ~4 videos only (no ongoing interval, NO buffer release).

## CRITICAL - do NOT reintroduce (these each caused outages)

- Do NOT make the page `fetch('/api/site-order')` at runtime to rebuild the hero. That async rebuild raced Slater = wrong first video, missing UI, "order resets to original", stuck/8-videos-playing. Order is baked at build now.
- Do NOT preload all 8 videos, and do NOT release videos at runtime with `preload="none"`+`load()`. Preloading all froze the tab (memory/decoder exhaustion); runtime release caused black frames / thumbnail-freeze-then-jump.
- Slater (`assets.slater.app/slater/17909.js`, project 17909, edited in the Slater dashboard) controls transitions only.

## Gotchas

- The original pre-reel home (commit ~`8db77a4`) was a clean static Slater slideshow with no reel JS - that is the behavioral baseline.
- `Capabilities/` admin + `api/capabilities/*` are a separate system (deck access grants), unrelated to the home hero.
