# Kathisma Psalter

A vanilla-JS Progressive Web App for reading the whole Psalter on the Orthodox cycle of **20 Kathismata** and **60 Staseis**. It shows both Septuagint and Masoretic Psalm numbering, remembers your place, and resumes at the next Stasis when you reopen it. Offline-capable, mobile-first, with classical typography meant to be a pleasure to read.

> Status: early development. This README is a placeholder and will grow as the app is built.

## Features

- The complete Psalter divided into 20 Kathismata, each of 3 Staseis (60 in total), read in a continuous cycle.
- Dual numbering: Septuagint (Greek/Slavonic) and Masoretic (Hebrew/KJV), with the alternate always shown in parentheses.
- Remembers your position and resumes at the next Stasis on reopen.
- Works offline after first visit.
- Mobile-first, scales gracefully to desktop.
- Light and dark themes, adjustable font size.

## Tech

- Vanilla **ES modules**, **HTML**, and **CSS** only. No frameworks, no libraries, no CDN.
- **No build step.** The repository is served exactly as it is.
- CSS animations and transitions, no animation library.
- Service worker for offline use; deployable as a **GitHub Page**.

## Run locally

Any static file server works. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. A server is needed (rather than opening `index.html` directly) so that ES modules and the service worker load correctly.

## Deploy (GitHub Pages)

1. Push to GitHub.
2. In the repository settings, enable **Pages** from the root of your chosen branch.
3. The included `.nojekyll` file ensures all assets load correctly under the `username.github.io/repo/` subpath.

## Text source

English Psalm text from the public-domain **Brenton Septuagint** translation, which follows Septuagint numbering and versification.

## Licence

To be confirmed. Code and original content under an open licence; the Psalm text is public domain.
