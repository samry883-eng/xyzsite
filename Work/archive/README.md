# Work — archived listings & experiments

## Current live work grid

**`/work/`** → `Work/unified/index.html` (baked catalog at build time to `dist/work/index.html`).

Routing: `serve.mjs` and `vercel.json` both serve `/work/` from `Work/unified/index.html`. Legacy listing URLs (`/projects`, `/projects-v2`, `/projects-v3`, etc.) redirect to `/work/`. Project detail pages stay at `/work/{category}/{slug}/`.

### Current filter panel (live)

**Since 2026-06-27** (local; deploy after commit)

- Project Type column on the left; Services offset to the right (overlay grid, not side-by-side columns).
- Refined typography tokens (`--type-filter-*`), curtain/scrim animation, staggered link reveals.
- `FILTER_GROUPS` order: Project Type first, Services second.

## Archived filter panel (legacy, unused)

**Last committed before filter promotion — blob `6ac86a8` (commit `49a5622` on `main`)**

- Two-column filter body (`grid-template-columns: 2fr 1fr`): Services left, Project Type right.
- `FILTER_GROUPS` order: Services first, Project Type second.
- Snapshot: `index-filter-legacy-6ac86a8.html`

### Restore the legacy filter panel

```bash
# Copy archived snapshot back to live source
cp Work/archive/index-filter-legacy-6ac86a8.html Work/unified/index.html

# Or reset from git (if the new filter was committed and you want the old file from main history)
git checkout 49a5622 -- Work/unified/index.html
```

Then rebuild/redeploy (`npm run build` → Vercel) so `dist/work/index.html` picks up the restored file.

## Other archived paths

| Path | Notes |
|------|--------|
| `index-filter-legacy-6ac86a8.html` | Former live filter layout (Services \| Project Type columns) |
| `index-redirect-to-projects-v2.html` | Former listing redirect stub (retired) |
| `unified-v3/` | Alternate grid experiment (`/projects-v3` redirects to `/work/`) |
| `admin-redirect-to-adminv2.html` | Old `/work/admin` stub before unified admin |

## Admin

Unified site admin: **`/work/admin`** (`Work/admin.html`) — work CMS, home reel, capabilities allow list.
Legacy `/work/adminv2`, `/admin`, `/capabilities/admin` redirect here (`?tab=access` for allow list).
