# TASKS.md — Kathisma Psalter PWA

A build plan for a Claude Code agent. Build a **Progressive Web App** for reading the whole Psalter across a structured plan based on the Orthodox **Kathismata** and **Staseis**. The app remembers the reader's place and resumes at the next stasis on reopen.

## Constraints (non-negotiable)

- **No build step.** No bundler, no transpiler, no npm install. The repo is served as-is.
- **No libraries or frameworks.** No React, no Vue, no Tailwind, no jQuery, nothing from a CDN. Vanilla **ES modules**, **HTML**, and **CSS** only. Animations are **CSS animations/transitions** (and `Web Animations API` if needed), never an animation library.
- **Deployable as a GitHub Page** from the repository root (or `/docs`). All paths must be relative so it works under a `username.github.io/repo/` subpath.
- **Offline-capable** via a service worker.
- **Mobile-first**, scaling gracefully to desktop.
- No em dashes in any user-facing copy (use commas, colons, or full stops).

---

## Phase 0 — Repository scaffold

- [ ] Create the directory layout:
  ```
  /
  ├── index.html
  ├── manifest.webmanifest
  ├── sw.js
  ├── /css
  │   ├── reset.css
  │   ├── tokens.css
  │   ├── typography.css
  │   ├── layout.css
  │   └── animations.css
  ├── /js
  │   ├── app.js            (entry module, registers SW, boots UI)
  │   ├── state.js          (reading-plan position, persistence)
  │   ├── plan.js           (kathisma/stasis structure + traversal)
  │   ├── numbering.js      (LXX <-> Masoretic mapping)
  │   ├── render.js         (DOM rendering of a stasis)
  │   ├── router.js         (hash routing: #/home, #/read/:kathisma/:stasis, #/plan, #/settings)
  │   └── storage.js        (localStorage wrapper with safe fallbacks)
  ├── /data
  │   ├── structure.json    (the 20 kathismata / 60 staseis map)
  │   └── psalms/
  │       └── lxx/001.json … 151.json   (psalm text, one file per psalm)
  ├── /icons
  │   ├── icon-192.png
  │   ├── icon-512.png
  │   ├── icon-maskable-512.png
  │   └── favicon.svg
  └── /fonts                (self-hosted woff2 only; no external font CDN)
  ```
- [ ] Add a `.nojekyll` file at the root so GitHub Pages serves the `_`-free paths and `/data` JSON without Jekyll interference.
- [ ] Write a short `README.md`: what it is, how to run locally (`python3 -m http.server`), how to deploy to GitHub Pages.

---

## Phase 1 — The Psalter data model

This is the heart of the app. Get the structure exactly right before touching UI.

### 1a. Kathisma / Stasis structure

- [ ] Create `/data/structure.json` encoding the **20 kathismata**, each with **3 staseis** (60 staseis total). Use **Septuagint (LXX) numbering** as the canonical internal key, since the kathisma divisions follow the LXX Psalter. Each stasis lists the psalms it contains; partial psalms (where a stasis ends mid-psalm) are noted with verse ranges.

  The canonical division is:

  | Kath. | Stasis 1 (LXX) | Stasis 2 (LXX) | Stasis 3 (LXX) |
  |------|----------------|----------------|----------------|
  | 1 | 1–3 | 4–6 | 7–8 |
  | 2 | 9–10 | 11–13 | 14–16 |
  | 3 | 17 | 18–20 | 21–23 |
  | 4 | 24–26 | 27–29 | 30–31 |
  | 5 | 32–33 | 34–35 | 36 |
  | 6 | 37–39 | 40–42 | 43–45 |
  | 7 | 46–48 | 49–50 | 51–54 |
  | 8 | 55–57 | 58–60 | 61–63 |
  | 9 | 64–66 | 67 | 68–69 |
  | 10 | 70–71 | 72–73 | 74–76 |
  | 11 | 77 | 78–80 | 81–84 |
  | 12 | 85–87 | 88 | 89–90 |
  | 13 | 91–93 | 94–96 | 97–100 |
  | 14 | 101–102 | 103 | 104 |
  | 15 | 105 | 106 | 107–108 |
  | 16 | 109–111 | 112–114 | 115–117 |
  | 17 | 118:1–72 | 118:73–131 | 118:132–176 |
  | 18 | 119–123 | 124–128 | 129–133 |
  | 19 | 134–136 | 137–139 | 140–142 |
  | 20 | 143–144 | 145–147 | 148–150 |

  Notes the agent must honour:
  - **Kathisma 17 is the single Psalm 118 (LXX) / Psalm 119 (Masoretic)**, the great alphabetic psalm, split into three staseis by verse: 1–72, 73–131, 132–176.
  - **Psalm 151 (LXX)** sits outside the kathismata. Include its text in `/data/psalms/lxx/151.json` and surface it as an optional appendix reading, not part of the 60-stasis cycle.
  - Each stasis object should carry: `kathisma` (1–20), `stasis` (1–3), `index` (1–60, the global order), `psalms` (array of `{lxx, fromVerse?, toVerse?}`), and a `glory: true` flag for rendering the "Glory..." doxology that closes each stasis.

- [ ] In `plan.js`, expose pure functions: `getStasis(kathisma, stasis)`, `getByIndex(globalIndex)`, `next(current)`, `previous(current)`, and `totalStaseis()` returning 60. `next()` past kathisma 20 / stasis 3 wraps to kathisma 1 / stasis 1 and increments a `cycle` counter (the Psalter is read in continuous repetition).

### 1b. Dual numbering (LXX <-> Masoretic)

- [ ] Create `numbering.js` implementing the Septuagint/Masoretic divergence. The mapping is **not** a constant offset; it shifts in blocks because of how psalms were split and joined:

  | LXX (Greek/Slavonic) | Masoretic (Hebrew/KJV) |
  |----------------------|------------------------|
  | 1–8 | 1–8 (identical) |
  | 9 | 9 + 10 (LXX 9 = Masoretic 9–10 joined) |
  | 10–112 | 11–113 (LXX = Masoretic minus 1) |
  | 113 | 114 + 115 (LXX 113 = Masoretic 114–115 joined) |
  | 114 + 115 | 116 (LXX 114–115 = Masoretic 116 split) |
  | 116–145 | 117–146 (LXX = Masoretic minus 1) |
  | 146 + 147 | 147 (LXX 146–147 = Masoretic 147 split) |
  | 148–150 | 148–150 (identical) |
  | 151 | (no Masoretic equivalent) |

- [ ] Expose `lxxToMasoretic(lxxNum)` returning a display string (e.g. `9` -> `"9–10"`, `113` -> `"114–115"`) and `masoreticToLxx(masNum)` for completeness. Store this as data the function reads, not as a long `if/else` ladder.
- [ ] A **setting** controls which numbering is *primary* in headings. Whichever is primary, the other is always shown in parentheses, e.g. **Psalm 50 (Masoretic 51)** or **Psalm 51 (LXX 50)**. The famous penitential psalm should read correctly under both.

### 1c. Psalm text

- [ ] One JSON file per psalm in `/data/psalms/lxx/NNN.json` (zero-padded to 3 digits), keyed by LXX number. Shape:
  ```json
  {
    "lxx": 50,
    "title": "Psalm of David, when Nathan the prophet came to him...",
    "verses": [
      { "n": 1, "t": "Have mercy on me, O God, according to thy great mercy..." }
    ]
  }
  ```
- [ ] Use a **public-domain English text**. Recommended: the **Brenton Septuagint translation** of the Psalms (public domain, and it follows LXX numbering and versification, which keeps the data internally consistent with the kathisma structure). Document the source in `README.md`.
- [ ] Write a one-off Node or Python helper (kept in a `/scripts` folder, **not** shipped to the page, and **not** part of the runtime) that the agent can run to populate the psalm JSON from a plain-text source. The PWA itself must never depend on this script.
- [ ] Verify versification: Psalm 118 (LXX) must have 176 verses so the kathisma-17 verse splits land correctly. Add a build-time assertion in the helper script that every stasis's verse ranges exist.

---

## Phase 2 — State and persistence

- [ ] `storage.js`: thin wrapper over `localStorage` with try/catch (private-mode / quota failures fall back to an in-memory object so the app never throws). Namespace keys under `psalter:`.
- [ ] `state.js` persists a single object:
  ```json
  {
    "current": { "kathisma": 1, "stasis": 1 },
    "cycle": 1,
    "numbering": "lxx",        // or "masoretic"
    "theme": "auto",           // auto | light | dark
    "fontScale": 1.0,
    "lastReadISO": "2026-06-14T...",
    "history": [ { "kathisma": 1, "stasis": 1, "atISO": "..." } ]
  }
  ```
- [ ] On launch, `app.js` reads `current` and routes straight to that stasis. The home screen shows **"Continue: Kathisma N, Stasis M"** as the primary action.
- [ ] Completing/leaving a stasis advances `current` to `next()` so reopening lands on the **next** stasis, exactly as specified. Provide an explicit **"Mark complete and continue"** button as well as plain back/forward navigation that does **not** advance the saved position (only completion advances it).
- [ ] Guard against schema drift: include a `version` integer in the stored object and a tiny migration step if it is missing.

---

## Phase 3 — Routing and screens

- [ ] `router.js`: hash-based router (`location.hash`) so it works on GitHub Pages with no server config. Routes:
  - `#/` Home (Continue card, today's reading, quick links)
  - `#/read/:kathisma/:stasis` Reader
  - `#/plan` Full plan overview (all 20 kathismata, 60 staseis, completion ticks)
  - `#/settings` Numbering, theme, font size, reset progress
- [ ] Unknown routes redirect to `#/`. Back button works naturally via hashchange.
- [ ] **Home screen**: large "Continue" card; a secondary line showing the psalm range of that stasis in both numberings; a subtle indicator of cycle number and overall progress (e.g. "Stasis 14 of 60").
- [ ] **Plan screen**: 20 kathismata as expandable rows; each row reveals its 3 staseis with their psalm ranges and a completion tick. Tapping a stasis opens it in the reader (this is "jump to", and does not overwrite `current` unless the reader is left via "Mark complete and continue").
- [ ] **Reader screen** (see Phase 4).
- [ ] **Settings screen**: toggle primary numbering, theme (auto/light/dark), font-size slider bound to `fontScale`, and a guarded "Reset reading plan" with a confirm step.

---

## Phase 4 — The Reader (the part that must be a pleasure to read)

- [ ] Render the stasis from `structure.json` + psalm JSON via `render.js`. For each psalm in the stasis:
  - A **psalm heading** showing the primary number large and the alternate number in parentheses (per the numbering setting), plus the psalm's inscription/title in a smaller italic.
  - **Verses** as numbered lines. Verse numbers are small, set in the margin or as a superscript, in a muted colour so they never compete with the text.
  - Where a stasis covers only part of a psalm (kathisma 17), render only the verses in range and show a quiet note like "continued in the next stasis".
- [ ] Close each stasis with the **"Glory" doxology** in a distinct, slightly emphasised block: *"Glory to the Father, and to the Son, and to the Holy Spirit, both now and ever, and unto the ages of ages. Amen."* (Alleluia x3 is traditional here; include it as a toggleable preference, default on.)
- [ ] **In-reader controls** (a slim, auto-hiding bar): previous stasis, next stasis, "mark complete and continue", font-size +/-, and a progress dot row for the 3 staseis of the current kathisma.
- [ ] **Reading ergonomics**:
  - Comfortable measure (max line length ~62–68ch on desktop, full-bleed-with-margins on mobile).
  - Generous line-height (~1.6) and paragraph spacing.
  - Respect `prefers-reduced-motion`.
  - Keep the scroll position per stasis; reset to top on stasis change.
- [ ] **Transitions**: a gentle CSS cross-fade / slide between staseis (page-turn feel), driven by a CSS class toggle, not a library. Disable under reduced-motion.

---

## Phase 5 — Typography and visual design

Aim: **lively but classical**, a genuine pleasure to read. Liturgical without being heavy or twee.

- [ ] **Self-host fonts** as `woff2` in `/fonts` (no Google Fonts CDN, for offline + privacy). Suggested pairing, all open-licence:
  - **Body / psalm text:** a warm, readable old-style serif with real character. **EB Garamond** (SIL OFL) is the recommended primary, it is classical, legible at length, and beautiful on screen. Alternative: **Cardo** (designed for liturgical/classical texts, has the right diacritics and a devotional feel).
  - **Headings / psalm numbers:** either the same serif at display weight, or a refined humanist sans for contrast. **Cormorant** (OFL) gives elegant, high-contrast display numerals; or keep it all-Garamond for unity.
  - **Optional accent for the "Glory" doxology and section labels:** small caps / letter-spaced caps of the body serif (use the font's real small-caps if available, otherwise `font-variant-caps`, never faux-caps via `text-transform` + scaling).
  - Always declare a robust system-serif fallback stack and `font-display: swap`.
- [ ] **Type scale** in `typography.css` using a modular scale (~1.25 ratio). Fluid sizing with `clamp()` so it reads well from 360px phones to wide desktops. Body around `clamp(1.05rem, 1rem + 0.4vw, 1.2rem)`.
- [ ] **Numerals:** prefer **old-style figures** (`font-feature-settings: "onum"`) in running text for that classical look; use **lining figures** for UI chips/buttons.
- [ ] **Ligatures and refinement:** enable common ligatures, sensible hanging punctuation if feasible, and proper hyphenation (`hyphens: auto` with `lang="en"` on `<html>`).
- [ ] **Colour and texture** in `tokens.css` as CSS custom properties:
  - A warm parchment-leaning light theme (off-white background, near-black warm ink, not pure `#fff`/`#000`).
  - A restful dark theme (deep warm charcoal, soft ivory text), switched via `prefers-color-scheme` and overridable in settings.
  - One **accent colour** with liturgical resonance (a deep ecclesial gold or a muted Marian blue, the reader can keep it singular and tasteful). Use it for the active progress dot, links, and the doxology rule.
  - Define everything as tokens (`--bg`, `--ink`, `--ink-muted`, `--accent`, `--rule`, `--surface`) so theming is one place.
- [ ] **Decorative restraint that still feels alive:**
  - A slim **drop-cap** or large versal on the first verse of each psalm (CSS `::first-letter` or a styled span), in the accent colour. Tasteful, not gaudy.
  - A thin ornamental rule or a small centred glyph (e.g. a cross or a botanical fleuron from the font) separating psalms within a stasis.
  - Subtle entrance animation: verses fade/rise in with a tiny stagger on stasis load (CSS animation with `animation-delay` steps, capped so it never feels slow; off under reduced-motion).
- [ ] **Layout** in `layout.css`: CSS Grid shell with a sticky-but-auto-hiding top bar, centred reading column, safe-area insets (`env(safe-area-inset-*)`) for notched phones, and a bottom control bar on mobile that becomes a side or floating control on desktop.

---

## Phase 6 — PWA plumbing

- [ ] `manifest.webmanifest`: `name`, `short_name`, `description`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `background_color`, `theme_color`, `orientation: "portrait-primary"`, and the icon set (192, 512, maskable). Use **relative** `start_url`/`scope` so it works under the GitHub Pages subpath.
- [ ] `sw.js`: cache-first service worker. Precache the app shell (HTML, CSS, JS, fonts, structure.json, icons) on install; runtime-cache psalm JSON as it is read (stale-while-revalidate). Bump a `CACHE_VERSION` constant to invalidate. Clean old caches on `activate`.
- [ ] Register the SW in `app.js` with a relative path (`./sw.js`) and handle the "new version available" case with a quiet "Refresh to update" prompt.
- [ ] Provide a small **install affordance**: capture `beforeinstallprompt`, show an unobtrusive "Add to home screen" hint in settings.
- [ ] Confirm full **offline** behaviour: after first load, the entire 60-stasis cycle is readable with the network off.

---

## Phase 7 — Accessibility and quality

- [ ] Semantic HTML: psalms as `<article>`, verses as an ordered list or paragraphs with proper numbering, headings in correct hierarchy. `lang="en"`.
- [ ] Keyboard support: left/right arrows move staseis in the reader; all controls reachable and focus-visible.
- [ ] ARIA: progress dots have labels ("Stasis 1 of 3, complete"); the auto-hiding bar is not a focus trap.
- [ ] Colour contrast meets WCAG AA in both themes; verify the muted verse numbers still pass.
- [ ] Respect `prefers-reduced-motion` everywhere animations exist.
- [ ] Touch targets >= 44px; test one-handed reach on mobile.

---

## Phase 8 — Verification checklist (do these before calling it done)

- [ ] Opening the app a second time resumes at the **stasis after** the last completed one, with cycle preserved.
- [ ] All 60 staseis render; kathisma 17 splits Psalm 118 at verses 72/73 and 131/132 exactly.
- [ ] Numbering toggle flips primary/parenthetical correctly across the divergence points (check LXX 9 -> Masoretic 9–10, LXX 113 -> 114–115, LXX 114/115 -> 116, LXX 146/147 -> 147, and the Psalm 50/51 penitential case).
- [ ] Psalm 151 is reachable as an appendix and excluded from the 60-stasis count.
- [ ] Works offline after first visit; passes Lighthouse PWA + Performance + Accessibility (aim 90+ each).
- [ ] Renders correctly at 360px width and at 1440px width; no horizontal scroll; notch-safe.
- [ ] No external network requests at runtime (check the Network tab: everything same-origin).
- [ ] No em dashes in any user-facing string.
- [ ] Deploys cleanly to GitHub Pages from the repo root with `.nojekyll`, all assets loading under the `/repo/` subpath.

---

## Suggested build order for the agent

1. Phase 0 scaffold + Phase 1a structure.json (no UI yet; log the traversal to console to prove `next()`/`previous()` and the wrap).
2. Phase 1b numbering with a tiny test harness page that prints every LXX->Masoretic mapping for visual confirmation.
3. Phase 1c psalm data for a handful of psalms (e.g. all of kathisma 1 plus Psalm 50/118) to develop against, then bulk-populate.
4. Phase 2 state + Phase 3 routing with placeholder reader.
5. Phase 4 reader rendering.
6. Phase 5 typography/design pass (this is where it becomes beautiful).
7. Phase 6 PWA plumbing.
8. Phases 7–8 accessibility and verification.
