# PoE2 Utility Hub

PoE2 Utility Hub is a static Path of Exile 2 support-build wiki focused on party utility builds. It is designed for personal build curation: gear requirements first, clear usage notes second, and reusable concept nodes for mechanics that appear across multiple builds.

## Features

- Static site, no backend required.
- Chinese / English UI toggle in the top-right corner.
- Mobile-friendly layout for build browsing and PoB import previews.
- PoE2DB unique item cache with local icons where available.
- poe.ninja / Path of Building import-code cache.
- Browser-side PoB import parser: paste or load an import code, then generate a site draft.
- Visual PoB import preview: equipment slots, unique item icons, skill groups, and passive-tree SVG based on local PoB `TreeData`.
- Local draft preview via `localStorage` before formally adding a build to `data/builds.js`.

## Open Locally

Open `index.html` directly in a browser:

```text
toolman-bd-wiki/index.html
```

No build step is required for the static site.

## Data Workflows

Refresh PoE2DB unique item cache:

```powershell
node scripts\crawl-poe2db.mjs --all-uniques --download-icons
```

Refresh poe.ninja PoB import-code cache:

```powershell
node scripts\crawl-poe-ninja-pob.mjs
```

Export the latest local PoB 0.4 passive tree data:

```powershell
node scripts\export-pob-tree.mjs --version 0_4
```

Check passive-tree matching for the cached sample build:

```powershell
node scripts\check-passive-map.mjs
```

## Add A poe.ninja Build

1. Add a source entry to `data/pob-sources.json`.
2. Run `node scripts\crawl-poe-ninja-pob.mjs`.
3. Open the site and use `PoB Draft Import`.
4. Generate the draft, review the visual equipment/skill/tree data, then copy the JSON into `data/builds.js`.
5. Rewrite the human-facing sections: position, usage, warnings, concept nodes, and ratings.

## GitHub Pages

This repository can be served as a static GitHub Pages site. Use the repository root as the Pages source, or move this folder's contents to the repository root before enabling Pages.

Recommended Pages setting:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

## Notes

PoB import codes only contain allocated passive node ids. The real passive-tree image is reconstructed from the local Path of Building Community PoE2 `TreeData/0_4/tree.lua` data. The site renders this as SVG instead of using PoB's original DDS/ZST texture pipeline, which is not directly browser-readable.
