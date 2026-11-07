# 0002: Document Blocks, Stored Order, and Preview Drag

**Date**: 2026-10-10
**Status**: Accepted
**Deciders**: Project maintainer

---

## Context and Problem Statement

A report is a sequence of sections, each built by `src/lib/reportDocument.ts` from the official plan (`src/data/sections.ts`) or from the user's own `customSteps`. Both paths produce the same shape: a list of parts, each with paragraphs and sub-sections.

Two capabilities were needed on top of that:

1. A paragraph can be **moved within its section** (drag, or arrow buttons).
2. A paragraph can be **moved to another section**, carrying its text with it, so nothing is left behind.

Neither was expressible in the existing model. The official plan hardcodes which paragraphs a section has — `taches` is always "missions détaillées / compétences / problématiques", in that order — and the note text lives in `rapport.sections[stepId][fieldId]`, keyed by a field id that has no relationship to the paragraph's position.

---

## Decision Drivers

- A moved paragraph must take its text with it, or the report silently loses content.
- The move must be reachable on a phone, where HTML5 drag-and-drop never fires.
- Nothing about an untouched report may change: a report that never moves a paragraph must render exactly as it always did.
- The same gesture should move paragraphs and images.
- Every rejection should be visible, never a silent no-op.

---

## Considered Options

### 1. Reorder `step.fields`

Rejected. On the official plan the paragraphs are not derived from `step.fields` at all for several sections, so reordering fields moves nothing. It also cannot move a paragraph to another section.

### 2. Render the toolbars in a portal to `document.body`

Tried and reverted (commit `a4f56d1`). The A4 page is an `overflow: hidden` box, and a fixed-position panel is laid out against the preview's `scale`/`zoom` wrapper rather than the viewport, so coordinates drifted with the zoom. `MeasuredPages` also renders the same children once per page window, which duplicated each portalled panel at a shifted position.

### 3. HTML5 drag-and-drop for the move

Tried and replaced. The grip's `draggable`/`dataTransfer` path never fires on touch devices at all — the reason the image toolbar carried a `<select>` fallback. It has been replaced by pointer events, so images and paragraphs now move with the same gesture.

### 4. A stored order override plus an identity for every block

Chosen.

---

## Decision Outcome

### Identity

Every block a section renders has a key, built in one place (`blockKeyFor` in `src/lib/blockModel.ts`) and read back by the same module:

| key | meaning |
| --- | --- |
| `section:field` | an official-plan paragraph (`taches:missionsDetaillees`) |
| `<field id>` | a custom-plan paragraph |
| `paragraphes` | a merged paragraph (Remerciements, Introduction) that reads several fields as one block |
| `text:<id>` | a free paragraph added from the preview |
| `fusion-<a>-<b>` | a merged paragraph after it has been moved to another section |

### Order

`Rapport.blockOrder: Record<sectionKey, string[]>` holds a section's keys in display order. It is an **override**: the plan's own order is the default, a block that is not listed keeps its place at the end, and a report with no entry renders exactly as before. Numbering is derived from the displayed position (`numero` is `index + 1`, and the `a/`, `b/`, `c/` prefixes follow position), so moving a block renumbers it in place.

### Cross-section moves

`moveBlock()` in `src/lib/blockModel.ts` is pure — `Rapport → Rapport | null`, returning `null` when the move cannot be made so the caller leaves the report untouched. It resolves the block, moves the field, moves both the raw notes and the generated text, and rewrites both sections' orders. Where a paragraph has to leave the official plan, both sections are materialised into `customSteps` — the only way a plan paragraph can change sections, since its existence otherwise lives in code.

Two rules keep it safe:

- A destination whose step kind is not `notes` (presentation, activités, organigramme, fiche technique) is **refused**. Those sections render hardcoded blocks and ignore `fields`, so a paragraph moved there would be stored but rendered nowhere — invisible on screen and absent from the PDF.
- The order is written in the key format the report will use *after* the move. A report switches from `section:field` to `field` keys the first time a paragraph moves; writing the old format left every destination block unlisted and the drop position lost.

### Rendering

The preview is split by concern, each in `src/components/preview/`:

| file | owns |
| --- | --- |
| `PreviewA4.tsx` | assembler: parts, page numbers, the one paragraph drag, wiring |
| `SectionContent.tsx` | a text section: paragraphs, images, org chart, free paragraphs, reorder, move |
| `CoverPage.tsx` | the cover, its furniture (ribbon, banner, logo) and its inline controls |
| `Page.tsx` | one A4 window, paginated like print |
| `Sommaire.tsx`, `MaterielPage.tsx` | the table of contents and the equipment page |
| `paragraphDrag.ts` | the drag engine: target geometry, insertion line, auto-scroll |
| `pagination.ts` | which blocks fall on which sheet — a sheet is filled, then closed, and a block moves whole rather than being split to fit |
| `actions.ts` | `PreviewActions` — every capability the document can be asked to do |
| `blockModel.ts` | block identity, paragraph moves (pure) |

Everything a preview can be asked to do travels as one `PreviewActions` object rather than a prop per capability; adding a capability is one line in that interface and one line in `WorkspacePage`.

### Drag engine

`useParagraphDrag()` owns one drag for the whole document, because a drag crosses sections: the block starts in one and lands in another, so neither section can own the state. It also owns auto-scroll — while a pointer is down the gesture belongs to the drag, so without it a section below the fold is unreachable, especially on a touch screen. Targets are found by list geometry rather than by the topmost element, since whatever is on top (hover controls, the insertion line, the dragged block) must not change which section a drop lands in.

Every mutation still goes through `setRapportWithHistory`, so undo and autosave come free; `moveBlock` returning `null` means no history entry is written.

---

## Consequences

- **Positive**: A paragraph can be moved within a section or to another one, with its text, and the numbering follows.
- **Positive**: One gesture moves paragraphs and images, on mouse and on touch, with auto-scroll for sections that are off screen.
- **Positive**: Every refusal is a visible outcome — the picker lists only valid destinations, and a refused move leaves the report untouched.
- **Positive**: The data path is pure and tested: 30 assertions cover the key convention, moves in both directions, the plan switch and the refused cases.
- **Negative**: The first move converts a report to the custom plan, after which Remerciements and Introduction render as numbered sub-sections instead of one merged paragraph. The text is unaffected; the grouping differs.
- **Negative**: A dropped paragraph lands where the insertion line was, but a section mixing plan paragraphs with free ones resolves the position through the stored order rather than the field array, so the two can disagree by one.
- **Risk**: Dragging an existing paragraph to another section works in the data model and in tests, but has not been confirmed by a live drag on a phone. The `Déplacer…` picker is the guaranteed route, and the drop chip names its target so a silent failure is visible.

---

## Pros and Cons of the Options Considered

### Reordering `step.fields`

- **Pros**: Small, no new state.
- **Cons**: Cannot express a cross-section move, and does nothing on the official plan.

### Portal to `document.body`

- **Pros**: Escapes the page's `overflow: hidden`.
- **Cons**: Breaks under the preview's scale/zoom, and duplicated by per-window rendering.

### HTML5 drag-and-drop

- **Pros**: Native, no pointer code.
- **Cons**: Does not fire on touch at all, which is the primary target platform.

### Stored order plus block identity

- **Pros**: Expresses both kinds of move, keeps untouched reports byte-identical, testable as a pure function.
- **Cons**: Adds two optional fields to the model and a key convention that must stay in one place.
