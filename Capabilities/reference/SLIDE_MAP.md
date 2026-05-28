# Capabilities deck — bundled wireframe → native VFX deck

Use the **bundled HTML** (`XYZ Studios Capabilities Deck (bundled) (1).html`) as a **layout reference only** (text position, spacing, media framing).  
**Do not** host the bundled file on the site — it uses a different viewer and breaks scroll.

**Production deck:** `Capabilities/vfx/index.html`  
**Scroll / navigation:** built-in `goTo()`, wheel, arrow keys, side dots (unchanged).

---

## Recommended workflow

1. Open bundled HTML **locally** in a browser (double-click the file).
2. Open live native deck: `/capabilities/vfx/` (after login).
3. For each row below, compare bundled screen → native slide and adjust **CSS + copy + media** in `vfx/index.html` only.
4. Prefer **existing** assets (`/capabilities/assets/…`, pitch-embed AVIFs, project videos) before exporting from the bundle.
5. Rebuild is optional; static HTML deploys from `Capabilities/vfx/index.html` on push.

---

## Slide count

| Source | Slides | Notes |
|--------|--------|--------|
| Bundled reference | **32** | Flat `section.slide` screens |
| Native VFX deck | **35** | Extra: Table of Contents + Services grid structure |

To match bundled order exactly, you can hide or merge native slides 1 (TOC) later — not required for layout pass.

---

## Mapping (bundled → native)

| # | Bundled label | Native `data-index` | Native type | Media / notes |
|---|---------------|---------------------|-------------|----------------|
| 01 | Cover | 0 | `slide-cover` | `cover-hero.png`, pitch cover AVIF via merge script |
| 02 | About | 2 | `slide-about` | About image/video in `.about-img` |
| 03 | What We Do | 4 | `slide-services` | 6 service columns — align copy to bundled |
| 04 | Full Production | 5 | `slide-divider` | Divider title only |
| 05 | Speedcross 6 | 6 | `slide-project` | Salomon video + proj panel (already wired) |
| 06 | Into the Void | 7 | `slide-project` | Atomic video + clip range |
| 07 | RBC Canadian Open | 8 | `slide-project` | Rory / RBC video |
| 08 | Craft | 24 | `slide-craft` | First craft slide — or divider 18 “Craft” if present |
| 09 | Creative Development | 25 | `slide-craft` | |
| 10 | CG Integration | 26 | `slide-craft` | |
| 11 | CG Environments | 27 | `slide-craft` | |
| 12 | Compositing | 28 | `slide-craft` | |
| 13 | Simulation and FX | 29 | `slide-craft` | |
| 14 | Polish | 30 | `slide-craft` | |
| 15 | Sound | 31 | `slide-craft` | |
| 16 | AI-Assisted Workflow | (native order may differ) | `slide-craft` | Check index 24–31 block in `vfx/index.html` |
| 17 | Selected Work | 3 | `slide-work-grid` | 9 tiles from pitch-embed |
| 18 | Road to Palisades — Toyota | — | `slide-case` or project | Match to closest native case slide |
| 19 | Gold Cup — CONCACAF | — | `slide-case` | |
| 20 | Doritos x Stranger Things | — | `slide-case` | |
| 21 | Case Studies | 9 | `slide-divider` | “Case Studies” divider |
| 22 | Storyboard | 10 | `slide-case--storyboard` | Fixed 1600×900 artboard |
| 23 | Pre-visualization | 11 | `slide-case--fixed` | |
| 24 | Asset Prep | 12 | `slide-case--fixed` | |
| 25 | Environment | 13+ | `slide-case` | Celsius / RBC case chain |
| 26 | Reference | 14 | `slide-case` | |
| 27 | Celsius — Spritz Vibe | 15–17 | `slide-project` / case | |
| 28 | On Location References | 16 | `slide-case` | |
| 29 | Live Action Plate | 17 | `slide-case` | |
| 30 | Our Focus | 32 | `slide-focus` | |
| 31 | How We Work | 33 | `slide-hww` | |
| 32 | Contact | 34 | `slide-contact` | Hotspots in bundled → native contact layout |

**Native-only slides (no bundled equivalent):**  
- `data-index` **1** — Table of contents  
- Extra project/case slides in the middle (indices 15–22) — keep or reorder after layout pass

---

## Layout types in bundled HTML (what to copy into native CSS)

| Bundled pattern | CSS / structure | Port to native class |
|-----------------|-----------------|----------------------|
| Full-bleed image | `section.slide > img.bg` | `slide-craft`, `slide-case` hero images |
| Project split | `.project` `--pad-x: 72px`, `.project__panel`, `.project__hero` | Already similar: `.slide-project`, `.proj-overlay` |
| Contact hotspots | `.contact-links a` with % positions | `.slide-contact` links if needed |
| Cover 60/40 band | `.cover-top-band` / `.cover-photo-band` | `.slide-cover` (already split layout) |

Copy **measurements** (padding, column width, type size) from bundled DevTools into the matching block in `Capabilities/vfx/index.html` `<style>` — do not import the bundled viewer script.

---

## Media strategy

1. **Videos** — keep current `proj-video-bg` URLs (Speedcross, Atomic, RBC, etc.).
2. **Still slides** — use `/capabilities/assets/pitch-embed/iyby7f/*.avif` where merge script already points.
3. **Missing stills** — export once from bundled manifest (39 assets) into `Capabilities/assets/deck-stills/` and reference by filename.
4. **Manual pass** — you can drop images into the correct `.ph img` or `.slide-craft` slot per row in the table above.

---

## What not to do

- Do not replace `vfx/index.html` with the bundled file.
- Do not add `ensureBundledDeckNav` or other scroll patches on top of the bundle.
- Do not use `post-production-vfx` route for the main deck (removed; use `/capabilities/vfx/`).
