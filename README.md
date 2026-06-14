# Kathisma Psalter

A Progressive Web App for reading the complete Orthodox Psalter across 20 Kathismata and 60 Staseis. It remembers your place, resumes at the next Stasis on reopen, works offline, and is built with no frameworks and no build step.

![PWA](https://img.shields.io/badge/PWA-offline--capable-5a189a) ![Vanilla JS](https://img.shields.io/badge/JS-vanilla%20ES%20modules-f7df1e) ![Licence](https://img.shields.io/badge/licence-MIT-blue)

## Features

- **Complete Psalter**: all 151 Psalms divided into 20 Kathismata, each of three Staseis (60 in total), read in a continuous cycle that tracks which cycle you are on.
- **Dual numbering**: toggle between Septuagint (LXX, Greek/Slavonic) and Masoretic (Hebrew/KJV) as your primary system; the alternate is always shown beneath the heading. Handles all divergence points correctly: LXX 9 = MT 9-10, LXX 113 = MT 114-115, LXX 114-115 = MT 116, LXX 146-147 = MT 147.
- **Psalm 151**: the supernumerary psalm from the Septuagint is available as an appendix reading, outside the 60-stasis cycle.
- **Reading position**: completing a Stasis (via the checkmark button) advances your saved position to the next one. Back and forward navigation does not move your saved position.
- **Offline after first visit**: a service worker precaches the app shell; psalm JSON is cached as you read.
- **Classical typography**: self-hosted EB Garamond (SIL OFL), warm parchment light theme, deep charcoal dark theme, drop caps, old-style figures, and gentle entrance animations.
- **Mobile-first**: safe-area insets for notched phones, 44px touch targets, auto-hiding bars on scroll.
- **Settings**: primary numbering, light/dark/auto theme, font size, Alleluia after doxology toggle, reading plan reset.

## Screenshots

| Home | Reader | Plan |
|------|--------|------|
| Continue card with Stasis and cycle info | Psalm text with drop cap and doxology | All 20 Kathismata, expandable |

## Run locally

Any static file server works. A server is required (not `file://`) because ES modules and the service worker both need HTTP.

```bash
python3 -m http.server 8123
```

Then open `http://localhost:8123`.

## Deploy to GitHub Pages

1. Push to GitHub.
2. In repository Settings, enable **Pages** from the root of your chosen branch.
3. The `.nojekyll` file at the repo root ensures all assets load correctly under the `username.github.io/repo/` subpath.

No build step needed. The repository is served as-is.

## Project structure

```
/
├── index.html                  App shell
├── manifest.webmanifest        PWA manifest
├── sw.js                       Service worker (cache-first + stale-while-revalidate)
├── .nojekyll                   GitHub Pages: disable Jekyll
├── css/
│   ├── reset.css
│   ├── tokens.css              CSS custom properties (colours, spacing, radii)
│   ├── typography.css          Font faces, type scale, ligatures
│   ├── layout.css              Grid shell, reader column, bars, cards
│   └── animations.css          Verse entrance, cross-fade transitions
├── js/
│   ├── app.js                  Entry: SW registration, routing, screen renderers
│   ├── router.js               Hash router (#/, #/read/:k/:s, #/plan, #/settings)
│   ├── render.js               DOM rendering for a Stasis (psalms, doxology)
│   ├── plan.js                 Structure loader, next()/previous() traversal
│   ├── numbering.js            LXX to Masoretic mapping and display labels
│   ├── state.js                Persistent reading position, settings, history
│   └── storage.js              localStorage wrapper with in-memory fallback
├── data/
│   ├── structure.json          20 Kathismata, 60 Staseis, psalm ranges
│   └── psalms/lxx/001.json     One JSON file per psalm (001-151)
├── fonts/                      Self-hosted EB Garamond woff2 (SIL OFL)
├── icons/                      favicon.svg, icon-192.png, icon-512.png, maskable
└── scripts/
    └── fetch_psalms.py         One-off scraper used to populate psalm JSON (not shipped)
```

## Text source

Psalm text from the public-domain **Brenton Septuagint** translation (1851), sourced via ebible.org. The Brenton follows Septuagint numbering and versification, which matches the Kathisma structure directly.

## Tech constraints

- Vanilla ES modules, HTML, and CSS only. No React, no Vue, no Tailwind, no jQuery, nothing from a CDN.
- No build step, no bundler, no transpiler, no npm.
- All paths are relative so the app works under any `username.github.io/repo/` subpath.

## Licence

Code: MIT. EB Garamond font: SIL Open Font Licence 1.1. Psalm text: public domain.
