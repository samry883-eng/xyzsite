# CLAUDE.md - XYZ Studios site

Operational notes. Read this first.

## Source of truth & deploy pipeline (IMPORTANT)

- Live site `xyzstudios.co` / `www.xyzstudios.co` -> Vercel project `xyzsite-omega` (`prj_VJcvkk6j0pDBjgtmsS5OP2ZPcgpf`), which auto-deploys from GitHub `samry883-eng/xyzsite` branch `main`.
- Build: `npm run build` -> `scripts/prepare-github-pages.mjs` -> output dir `dist`. It copies `Home/index.html` -> `dist/index.html` and (NEW) bakes the home order in (see below).
- The GitHub repo is the source of truth, NOT the local folder. Always pull from `main` before editing.

## Home hero videos & ordering (NEW architecture: BAKED at build, no runtime race)

This was rebuilt to kill a whole class of bugs. How it works now:

1. The admin order lives in **Vercel Edge Config**, key `workOrder` (its `homeList` is the hero order). It is read/written by `/api/site-order` (lib/site-store.mjs). Edit it via unified admin **`/work/admin`** → Home tab.
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
- **Home click modes:** see `Home/archive/README.md`. Current = project-page navigation (`126e7c9+`). Archived in-page fullscreen = tag `savepoint-home-inpage-fullscreen` (`71c135d`) + `Home/archive/index-inpage-fullscreen-71c135d.html`.
- Returning from a project opened via the hero reel uses `?from=home&slide=N` + `Work/assets/xyz-home-return.js` (white slide, no loader replay).
- `Capabilities/` deck login + NDA flows for external viewers; allow list + grants managed in unified admin **`/work/admin`** (Allow List tab). Legacy `/capabilities/admin` redirects there. APIs at `api/capabilities/*`.
- **Work CMS:** projects catalog in **Upstash Redis** (`projects_catalog_json`; Edge Config fallback); APIs at `/api/projects*`; **unified admin at `/work/admin`** (catalog, home reel, selected work, capabilities allow list); legacy `/work/adminv2` and `/admin` redirect here; baked to `window.__PROJECTS_CATALOG` on `/projects-v2` at build (same pattern as home order). **Work listing:** `/projects-v2/` only (`/work` redirects); project pages stay at `/work/{category}/{slug}/`.

---

## OPEN ISSUE — home hero 2nd-video goes black (handoff for Claude Code)

### What we want (the goal)
The home hero is a Slater slideshow of N full-length videos. Each slide shows a ~7-8s SECTION starting at a curated timestamp (`homeList[i].start`, e.g. 11s, 15s, 25s, 26s). Desired:
- NO black / loading frames when a slide appears — **especially the 2nd slide**.
- Loader should feel near-instant; remaining videos load **gradually while viewing**.
- KEEP curated start timestamps. Do **NOT** play videos from 0.

### Core problem (root cause)
Hero videos are full-length files on `r2.vidzflow.com` / `supabase` (`homeList[i].video`). The hero **seeks deep** into each (e.g. 25s). On a **cold load**, when the slideshow reaches slide 2 that video hasn't buffered enough *forward* from its deep offset, so playback **stalls → long black → then jumps in**. It's **positional** (whatever video is in slot 2), proven by reordering.

### Symptoms
- 1st video fine; 2nd video black/loading-circle for a long time, then plays. Same on scroll. Warm/cached browsers do NOT reproduce (must test COLD).

### Fixes applied & state
1. Hid orphaned `.background-load` Webflow loader (dark backdrop + spinner, z-index 1, always display:flex, nothing hid it) that peeked through during the crossfade = the "loading circle". Now display:none. KEEP.
2. Frame-gate (rejected): waited for `readyState>=2` (one frame) → frame showed but playback stalled = "black even longer".
3. Runway-gate (current, commit `64baca6`): `/* xyz-video-preload */` sequentially seeks each early video to start and waits for ~7.5s forward buffer (`start→start+7.5s` or `readyState>=4`), then sets `preload="metadata"` so only the ~7-8s SECTION loads (not the full file). Gates loader on first 2 slides, background-buffers the rest. Cap 12s. Sets `window.__xyzHeroSettled`; `#xyz-wl` loader exits on that or cap. NOT yet confirmed fixed on cold loads.

### Hard constraints (do NOT reintroduce)
- No play-from-0. No `preload="auto"` on all (froze tab). No runtime `preload="none"`+`load()` release (black/thumbnail-freeze). Slater = transitions only.

### Next ideas
- **Pre-trimmed ~7-8s clips per slide** (owner preference): tiny files, instant, no deep seek. Needs hosting (same-origin Vercel `public/` fastest), an ffmpeg trim step (`-ss start -t 8`), and must handle videos added via admin (ideally automated, else new videos fall back to slow path).
- **Gate the slideshow ADVANCE** (not the loader): enter when slide 1 ready, hold Slater from advancing to slide N+1 until its section is buffered. Harder — Slater drives timing.

### Key hooks
`Home/index.html`: `/* xyz-video-preload */` (section/readiness gate, sets `__xyzHeroSettled`), `/* xyz-hero-playback-fix */` (plays active, pauses rest), `#xyz-wl` loader, `/* xyz-hero-flash-fix */` style. Order in Edge Config `workOrder` via admin `POST /api/site-order` (writes + redeploys); baked to `window.__HOME_ORDER`. Deep offset = `homeList[i].start`.
