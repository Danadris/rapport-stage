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
- `src/components/preview`: focused preview subcomponents — inline text editing, image placement, the org chart, the cover, one A4 window, and the paragraph drag engine.
- `src/components/steps`: wizard step implementations.
- `src/data/sections.ts`: official wizard structure and progress rules.
- `src/lib/storageV3.ts`: local persistence (single source of truth, IndexedDB v2), settings, V1→V3 migration, Rapport adapter (dataUrls ↔ Blobs).
- `src/lib/reportDocument.ts`: pure report document assembly, table-of-contents rows and page-break grouping.
- `src/lib/blockModel.ts`: block identity and paragraph moves (pure `Rapport → Rapport`). See [ADR-0002](./adr/0002-document-blocks-and-preview-drag.md).
- `src/lib/ai.ts`: AI adapter. Uses Gemini when a key exists, otherwise uses local fallbacks.
- `src/lib/ai-stub.ts`: local company-search fallback data.
- `src/lib/backupV3.ts`: JSON backup export/import (v3 format, legacy v1 accepted).
- `src/components/PreviewA4.tsx`: A4 page composition and document rendering.
- `android/`: Capacitor-generated Android wrapper.

## Preview Boundaries

The preview is split by concern, and every capability it can be asked to do travels as one `PreviewActions` object from `WorkspacePage` down, so adding a capability is one line in that interface and one line in `WorkspacePage`:

| file | owns |
| --- | --- |
| `PreviewA4.tsx` | assembler — builds the parts, owns page numbers, the one paragraph drag and the wiring |
| `preview/SectionContent.tsx` | a text section: paragraphs, images, org chart, free paragraphs, reorder, move |
| `preview/CoverPage.tsx` | the cover, its furniture (blue ribbon, orange banner, IFMBP logo) and their inline controls |
| `preview/Page.tsx` | one A4 window, paginated like print |
| `preview/Sommaire.tsx`, `preview/MaterielPage.tsx` | table of contents and equipment page |
| `preview/paragraphDrag.ts` | the drag engine — target geometry, insertion line, auto-scroll |
| `preview/freePlacement.ts` | the shared math for floating images and text boxes — visible slice, clamping |
| `preview/TextBlockView.tsx` | a free paragraph: in the flow, or floating anywhere like a Word text box |
| `preview/pagination.ts` | which blocks fall on which sheet — a sheet is filled, then closed, and a block moves whole rather than being split to fit |
| `preview/actions.ts` | `PreviewActions` — every capability the document can be asked to do |
| `preview/blockModel.ts` | block identity and paragraph moves (pure) |

Every mutation goes through `setRapportWithHistory` in `useWorkspaceSteps`, so undo and autosave apply uniformly to text, images, org charts, free paragraphs and moves.

## Document Model

A section's blocks are identified by keys built in one place and read back by the same module (`blockKeyFor`): `section:field` on the official plan, a field id on a custom plan, `paragraphes` for a merged paragraph, `text:<id>` for one added from the preview, and `fusion-<a>-<b>` for a merged paragraph after it has moved.

`rapport.blockOrder` stores a section's display order as an override over the plan's; a block that is not listed keeps its place at the end, so a report that never reorders anything renders exactly as before. Numbering follows the displayed position.

A paragraph can be moved within its section or to another, carrying its raw notes and generated text with it. Where the move requires leaving the official plan, both sections are materialised into `customSteps`. Moves to a section that renders hardcoded content (presentation, activités, organigramme, fiche technique) are refused rather than silently stored-and-invisible. See [ADR-0002](./adr/0002-document-blocks-and-preview-drag.md) for the reasoning and the known limitations.

A free paragraph can also float: `positioning: 'free'` with unit-relative `x`/`y`/`width` places it anywhere like a Word text box — grabbed by its outline, overlapping text, in the margins, in the white above the first line and below the last one, on another page — the box shows on whatever page holds its position rather than its anchor's, and on release it snaps whole onto the page under the pointer so it never prints split across two sheets. A drop in another section re-anchors it there. Its settings bar hides when unneeded — hover, focus or the … button shows it. The unit stays in the flow, so ordering, section moves and the print fallback — where it renders back in the text — keep working.

## Pagination

One window is one A4 sheet, and a growing section is cut across as many windows as it needs. A sheet is filled, then closed, and the next block opens the next one, so a paragraph is never cut mid-sentence — only a block taller than a whole sheet is, because that is the only place its overflow can go.

`preview/pagination.ts` holds the rule as a pure function over the blocks' boxes; `MeasuredPages` measures the blocks and applies it. Where a block runs past a sheet, the cut moves up to the top of the line that would have been split, so a sheet ends between two lines and the text continues on the next one — the tail of that last line is covered, since the next sheet shows it whole. Every window holds the whole document, translated by the offset its sheet opens at, and the blocks of other sheets are turned invisible rather than removed: invisible boxes keep their space, which leaves the bottom of a page blank instead of pulling the next block up, and keeps the copy one coordinate system — the one free-positioned figures are stored against. `data-pages` counts the sheets a section fills, which is what keeps the sommaire accurate. See [ADR-0003](./adr/0003-sheets-are-filled-with-whole-blocks.md).

## Data Ownership

Reports are owned by the user's device. The app stores report drafts in IndexedDB (`rapport-stage-v3`): `reportMeta` (lightweight dashboard rows), `reportData` (full content, no binaries), `images` (Blobs), `settings` (Gemini key/model), `_migration` (one-time V1→V3 state). One-time V1 data (`rapport-stage-db`) is read read-only on first launch and never modified. Section images are kept in memory as dataUrls (`Rapport`) and converted to Blobs on save, hydrated back on load. Visual preferences use localStorage.

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

- **Cross-section paragraph moves on the official plan.** The data path is verified by tests, but a live drag of an *existing* paragraph into another section has not been confirmed on a phone. Inside a section works, free paragraphs added from the preview work, and the `Déplacer…` picker is the guaranteed route. The drop chip names its target so a failure is never silent. See [ADR-0002](./adr/0002-document-blocks-and-preview-drag.md).
- WebView/browser storage is local to the app install or browser profile. Users still need JSON backup/export before uninstalling, clearing site data or moving devices.
- PDF export relies on browser print. This is practical and now has print QA coverage, but a future native PDF renderer would allow stricter pagination.
- Direct browser-side BYOK is acceptable for this local-first project, but users should understand that keys used in browser JavaScript are not protected like server-side secrets.

## Next Architecture Moves

1. Add a stronger local paragraph generator for offline use.
2. Add native PDF generation if browser print is not accurate enough for final institute formatting.

> History and autosave are already separate hooks (`useRapportHistory`, `useRapportAutosave`); block/pagination tests are committed (`blockModel.test.ts`, `pagination.test.ts`).

## Design history

- `docs/superpowers/plans/` and `docs/superpowers/specs/` hold dated agent design drafts (logo/bg, organigramme, cover editing). They are historical context, not current documentation — ADRs and this file are the sources of truth.
