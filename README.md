# THOM Activity Map

Interactive map of anti-China and anti-US activity worldwide (1989–2025), with classification typology and matched China / US official responses.

Data sources:
- THOM_ALL_v2.xlsx — classified ACLED events (4,337 with lat/lon, valid for analysis)
- china_usactivity_SINO_with_responses_v13e.xlsx — China + US response columns
- 2026-04-09_MFA-china-threats.xlsx — Ministry of Foreign Affairs Q&A transcripts
- 2025_xinhua_GT_PD response attacks.xlsx — Xinhua / Global Times / People's Daily articles

## Quick start

```bash
npm install
npm run build-data    # rebuild public/data/*.json from upstream xlsx (only when source data changes)
npm run dev           # start dev server at http://localhost:5173
```

## Production build

```bash
npm run build         # outputs to dist/
npm run preview       # serve dist/ locally to verify
```

## Project layout

```
website/
├── package.json
├── vite.config.js
├── index.html              ← entry: header + filters + map + charts shell
├── public/
│   └── data/
│       ├── events.geojson  ← lean features for fast filter/cluster
│       ├── responses_full.json
│       ├── mfa_quotes.json
│       └── media_quotes.json
├── src/
│   ├── main.js             ← bootstrap
│   ├── map.js              ← MapLibre GL setup, cluster source, category colours
│   ├── filters.js          ← dataset toggle, year slider, category checkboxes
│   ├── popup.js            ← tabbed event popup with lazy-loaded responses
│   ├── charts.js           ← time/country/response Chart.js panel
│   ├── state.js            ← tiny pub-sub store + filter logic
│   ├── categories.js       ← 12-category palette + ordering
│   ├── i18n.js             ← Chinese category labels (anti-China events only)
│   └── style.css
└── scripts/
    └── build_data.py       ← Python ETL that produces public/data/*.json
```

## How the data joins together

The Python script (`scripts/build_data.py`) is the single source of truth for what ends up on the map.

1. Load THOM_ALL_v2.xlsx (sheet `Data`).
2. Filter to `valid_for_analysis == True` AND lat/lon both populated. Drops 743 of 5,080 rows (FALSE POSITIVE / UNCLASSIFIED / Military Forces Attacks excluded; ~120 lacking coordinates).
3. Left-join `china_usactivity_SINO_with_responses_v13e.xlsx` on `event_id_cnty` ↔ `event_id`. Keep ~48 response columns.
4. Look up MFA transcripts by `mfa_threat_id`.
5. Look up state-media articles by `media_match_source`.
6. Emit four JSON files into `public/data/`:
   - `events.geojson` — one feature per event with minimal properties for filtering/clustering.
   - `responses_full.json` — full response text + action flags + host response, keyed by event id.
   - `mfa_quotes.json` — matched MFA Q&A.
   - `media_quotes.json` — matched media articles.

## How the UI hangs together

- **State** lives in `src/state.js` — a tiny pub-sub store with `dataset`, `yearMin`, `yearMax`, `enabledCategories`. `filterFeatures()` returns a filtered subset.
- **Map** subscribes to state changes and updates the GeoJSON source via `map.getSource(...).setData()`. MapLibre handles clustering.
- **Filters** push to state (`setDataset`, `setYearRange`, `toggleCategory`).
- **Charts** also subscribe to state and recompute aggregates from the same filter.
- **Popup** lazy-loads `responses_full.json` / `mfa_quotes.json` / `media_quotes.json` on first click and caches the result.

## Bilingual

Chinese subtitles appear only in popups for events tagged `target === 'anti-china'` — see `src/i18n.js` for the 9 category translations.

## Deployment to GitHub Pages

`vite.config.js` uses `base: './'` so the build is hostable at any subpath.

```bash
npm run build
# Push the contents of dist/ to the gh-pages branch (or use a GitHub Action).
```

If you want a GitHub Action, the standard `actions/deploy-pages` setup works. Add it as `.github/workflows/pages.yml` and Vite will publish on every push to main.

## Updating the data

Whenever any of the four upstream xlsx files change, re-run:

```bash
npm run build-data
```

This regenerates `public/data/*.json`. The dev server (or production build) will pick up the new data on next reload.

## Caveats

- 120 events without lat/lon are silently dropped from the map. They remain in the source xlsx; consider a "missing-coords" sidebar list later.
- 12-color palette in `src/categories.js` is hand-tuned but not formally tested for color-blind safety. Iterate as needed.
- `responses_full.json` is loaded on first click to keep initial page weight down. If responses stay small (~1.7 MB) it could be merged into `events.geojson` for simpler popups.
- Matching counts at last build: 430 China responses, 12 US responses, 161 MFA quotes, 85 media quotes.
