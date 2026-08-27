# Architecture

Rapport de stage is a local-first React application packaged for web and Android.

## Runtime Model

```text
React + Vite UI
  |
  | local reads/writes
  v
Browser or WebView storage

React + Vite UI
  |
  | optional, only when the user configured a Gemini key
  v
Google Gemini API
```

There is no project backend, no central database, no account system and no project-owned AI billing.

## Main Boundaries

- `src/pages`: route-level screens.
- `src/components`: reusable UI and report editing components.
- `src/components/preview`: focused preview subcomponents such as inline text editing and image placement controls.
- `src/components/steps`: wizard step implementations.
- `src/data/sections.ts`: official wizard structure and progress rules.
- `src/lib/storage.ts`: local persistence, settings and JSON backup import/export.
- `src/lib/reportDocument.ts`: pure report document assembly, table-of-contents rows and page-break grouping.
- `src/lib/ai.ts`: AI adapter. Uses Gemini when a key exists, otherwise uses local fallbacks.
- `src/lib/ai-stub.ts`: local company-search fallback data.
- `src/components/PreviewA4.tsx`: A4 page composition and document rendering.
- `android/`: Capacitor-generated Android wrapper.

## Data Ownership

Reports are owned by the user's device. The app stores report drafts, imported images and the optional Gemini API key in IndexedDB with a localStorage fallback for browsers where IndexedDB is unavailable. Visual preferences use localStorage.

The JSON backup feature exports reports only. It does not export the Gemini key.

## AI Behavior

AI is optional by design.

- Without a key, company search uses a local example-based fallback and paragraph generation uses simple local text rules.
- With a Gemini key, the app sends the relevant prompt text directly from the user's device to Gemini.
- Calls do not pass through a project server.

## Android Packaging

Capacitor wraps the built Vite app into an Android WebView.

Build flow:

```text
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Release APK and AAB builds use optional local signing from `android/key.properties`. See [ANDROID_RELEASE.md](./ANDROID_RELEASE.md).

## Known Tradeoffs

- WebView/browser storage is local to the app install or browser profile. Users still need JSON backup/export before uninstalling, clearing site data or moving devices.
- PDF export relies on browser print. This is practical and now has print QA coverage, but a future native PDF renderer would allow stricter pagination.
- Direct browser-side BYOK is acceptable for this local-first project, but users should understand that keys used in browser JavaScript are not protected like server-side secrets.

## Next Architecture Moves

1. Move report mutation, undo and autosave into a dedicated hook or small store.
2. Add a stronger local paragraph generator for offline use.
3. Add optional native filesystem backup/export on Android.
4. Add native PDF generation if browser print is not accurate enough for final institute formatting.
