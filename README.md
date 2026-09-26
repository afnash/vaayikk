# Folio

A warm, private reading room for your PDFs. Android-first, with a responsive desktop library. No accounts, backend, analytics, remote fonts, or document uploads.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. On Windows PowerShell with restricted script execution, use `npm.cmd` instead of `npm`.

## Production and offline use

```sh
npm run build
npm run start
```

The build creates a fully static `out/` directory. Deploy that directory to any HTTPS static host, at the domain root. A backend is not needed. Configure `/sw.js` and `/offline-assets.json` to revalidate rather than caching them indefinitely. The PDF.js worker must be served with a JavaScript MIME type.

The production service worker precaches the app, PDF worker, fonts, character maps, WASM decoders, icons, and starter books. Wait for **Ready for offline reading** before going offline. Offline caching is intentionally disabled during development. Install from Chrome on Android using **Add to home screen → Install**. HTTPS (or localhost for testing) is required for service workers and installation.

## Features

- Multiple PDF import and desktop drag-and-drop; local first-page cover generation and PDF title/author metadata.
- Grid/list library, title/filename/collection search, sorting, favorites, editable titles, custom collections, book information, and removal.
- Single-page PDF reader with swipes, left/right taps, arrow keys, direct page slider, center-tap immersive mode, native fullscreen, pinch zoom, and bounded panning.
- Automatic reading position, progress, last-opened timestamp, and page bookmarks; finished at 98% progress.
- Persistent light, dark, and sepia appearance; mobile bottom sheets and safe-area support.
- Six original short reading samples, with custom cover art and actual locally bundled PDFs. Samples are marked as Folio Originals and can be removed. They never reappear after removal.

## Storage and privacy

Dexie stores PDF and cover blobs, metadata, collections, bookmarks, and preferences in the browser's IndexedDB. The app does not send imported files anywhere. It requests persistent browser storage after import when supported. Data belongs to this browser and origin: clearing site data, removing the browser profile, or browser storage eviction may remove the library. Keep original PDFs separately. Imports currently support PDFs up to 250 MB; password-protected PDFs need an unlocked copy.

Dark/sepia modes adjust the rendered page using color filters; PDF layout remains fixed, without ebook text reflow. V1 does not implement text search, annotations, or cloud sync.

## Architecture

`src/lib/db.ts` owns the IndexedDB schema and library operations; `src/lib/pdf.ts` owns document loading and import. UI is in `src/components/folio-app.tsx`, with the reader separately loaded from `reader.tsx`. Reusable shadcn-style Button and Radix Dialog-based Sheet live in `src/components/ui/`. Tailwind 4 and semantic CSS supply responsive themes. Framer Motion handles library and page transitions.

`scripts/prepare-assets.mjs` copies the local PDF.js runtime assets and generates PWA icons and original starter books. `scripts/prepare-offline.mjs` fingerprints the static build and creates the service worker's precache manifest. All runtime resources are same-origin.

## Verification

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

The Playwright suite uses the production build and verifies PDF import, rendering, progress/resume, bookmarks, favorites, rename, collection search, removal, persistent appearance, mobile swipes and pinch/pan, invalid PDF handling, and offline reload/import/reading.

To use an existing Google Chrome installation instead of downloading Chromium, set `FOLIO_BROWSER_CHANNEL=chrome` before running the tests.
