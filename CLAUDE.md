# CLAUDE.md — XYZ Studios site

Operational notes for working on this project. Read this first.

## Source of truth & deploy pipeline (IMPORTANT)

- **Live site `xyzstudios.co` / `www.xyzstudios.co`** is served by **Vercel project `xyzsite-omega`** (`prj_VJcvkk6j0pDBjgtmsS5OP2ZPcgpf`).
- That Vercel project deploys from **GitHub `samry883-eng/xyzsite`, branch `main`** (auto-deploys on every push to `main`).
- Build: `npm run build` -> `scripts/prepare-github-pages.mjs`, which **copies `Home/index.html` -> `dist/index.html`** (output dir is `dist`). So editing `Home/index.html` and pushing to `main` updates the live home page.
- **The GitHub repo is the source of truth, NOT the local folder.** The local copy can drift out of date (it was previously 1+ versions behind - 7 vs 8 hero videos). **Always pull `Home/index.html` from GitHub `main` before editing**, then push back. Do not deploy from a stale local copy or you will revert live content.
- Other Vercel projects exist for the same repo (`dist`, `xyzsite`) plus a separate `sound-capabilities` deck project - `xyzsite-omega` is the one mapped to the real domain.

## Home page hero videos & ordering (the "admin")

- The home hero is a Webflow CMS-style list (`.hero_list` > `.hero_item`). The static HTML contains **7 fallback videos**.
- The **real videos and their order are loaded at runtime** by an inline script (`/* xyz-home-reel */`) that does `fetch('/api/site-order')` -> reads `d.order.homeList` -> rebuilds the hero list (this is where the 8th video "I Forgot & Out of My Head" and the live order come from).
- **To change which videos show / their order, use the admin that writes to `/api/site-order`** - not the static HTML. The static 7 are only a fallback shown if that fetch fails.
- The slideshow behavior (which slide is active, play/pause, transitions) is controlled by **Slater** (`assets.slater.app/slater/17909.js`, project **17909**) - this code is **remote and edited in the Slater dashboard**, not in this repo.

## Hero fix applied (2026) - in `Home/index.html` inline scripts

Three coordinated, additive, reversible changes fixed: wrong/first video on load, missing/flashing UI, "order resets to original", and stuck/multiple videos playing at once:

1. **Gate Slater init** until the `/api/site-order` rebuild finishes (injector sets `window.__xyzReelReady` and dispatches `xyz-reel-ready`; the Slater loader waits for it, max 2.5s fallback). Prevents Slater binding to stale/static DOM.
2. **Single-video playback** (`/* xyz-hero-playback-fix */`): only *visible* hero videos play - the active slide, plus the outgoing slide during a crossfade - while fully hidden slides are paused. This prevents all 8 videos playing at once (perf/stutter) WITHOUT pausing the outgoing video mid-transition (keeps slides smooth). Also briefly holds slide 0 so the page lands on the first admin video. It hides only the **non-active slides' `.hero_content-footer`** (the identical bottom links) so they are not drawn 8x on top of each other (the "doubling" bug), while leaving `.hero_content` untouched so Slater's title slide-in/out animation keeps working.
3. **Intro loader hold**: the white `#xyz-wl` loader waits for `__xyzVideosReady` (the first 2 hero videos buffered to readyState>=3, max ~12s) before exiting - so the hero reveals only once the opening videos are ready (fixes refresh UI flash/stuck AND the 2nd-video loading screen).

4. **Sliding-window video buffering** (`/* xyz-video-preload */` + `manageBuffers` in the playback-fix): the preload script buffers only the first ~3 videos for the loader gate. Then, as the slideshow runs, only the **active slide + next 2** are kept at `preload="auto"`; videos that fall out of the window are set to `preload="none"` and `load()`ed to release their buffers. This keeps upcoming videos ready (no loading screen) WITHOUT keeping all 8 fully buffered at once - which previously exhausted browser memory/decoders and froze the tab/videos. NOTE: do NOT go back to preloading all 8 videos; that is what caused the "frozen videos" bug.

Root cause was a **race**: Slater initialized the slider on the static videos, then the `/api/site-order` script swapped the DOM out from under it.

## Gotchas

- Don't hand-edit the hero order in HTML - it's overwritten at runtime by `/api/site-order`.
- The slider/transition logic itself is in Slater (remote); page-level fixes go in `Home/index.html` inline scripts.
- `Capabilities/` admin + `api/capabilities/*` are a separate system (deck access grants via Upstash Redis), unrelated to home videos.
