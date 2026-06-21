# Home hero — archived setups

Two documented modes for the homepage hero video click behavior.

## Current (live): project-page navigation

**Since commit `126e7c9`**

- Home reel plays 8s preview clips from `/assets/home-previews/`.
- Clicking the video / banner opens the matching `/work/{mkey}/` project page.
- Script: `/* xyz-hero-project-link */` in `Home/index.html`.
- Return flow: white slide transition back to home (no loader replay), restores reel slide.

## Archived: in-page fullscreen (saved)

**Last commit before project links: `71c135d`**

- Clicking fullscreen stayed on the homepage.
- Full remote MP4s with deep seek (no 8s preview clips).
- `projects_item-close` CLOSE control on the overlay.
- Webflow in-page fullscreen + optional `xyz-hero-preview-fs` swap (see `d21cc9c`).

### Restore the old setup

```bash
# Full homepage file from archive
cp Home/archive/index-inpage-fullscreen-71c135d.html Home/index.html

# Or reset git to the tagged savepoint
git checkout savepoint-home-inpage-fullscreen -- Home/index.html
```

**Git tag:** `savepoint-home-inpage-fullscreen` → `71c135d`

### Preview archive locally

Serve the repo and open the archived file path if copied into `Home/index.html`, or inspect the static snapshot in `index-inpage-fullscreen-71c135d.html`.
