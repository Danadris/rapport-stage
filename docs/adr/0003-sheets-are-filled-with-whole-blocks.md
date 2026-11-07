# 0003: Sheets Are Filled With Whole Blocks

**Date**: 2026-10-12
**Status**: Accepted
**Deciders**: Project maintainer

---

## Context and Problem Statement

The report is shown as a stack of fixed A4 windows, and the same windows are what print lays on the paper: each window is one sheet, `break-after: page` makes each one a page, and the sommaire counts them from a `data-pages` attribute. Screen and PDF agree by construction.

A section is not always one sheet long, so the windows have to be cut out of a growing document. The first cut was geometric: measure the content, then render the same copy once per window, each translated up by one sheet's worth of content height and clipped (`transform: translateY(-i * 963px)` + `overflow: hidden`).

That cuts wherever the boundary lands. A paragraph straddling the foot of a page is cut in half: page one ends mid-sentence, page two starts mid-sentence. An image can be sliced down the middle. The print stylesheet asks for better — `break-inside: avoid` on headings and figures, `orphans`/`widows` on paragraphs — and cannot have them, because each window is already a clipped box by the time the browser paginates it.

---

## Decision Drivers

- A paragraph that ends mid-sentence at the foot of a page reads as a defect in a document an institute will mark.
- Nothing about the existing pagination should change: one window is one sheet, page numbers keep counting the sheets a section fills, and screen and print keep agreeing.
- Figures are positioned freely against the document's copy (see [ADR-0002](./0002-document-blocks-and-preview-drag.md)); whatever paginates must not move that coordinate system.
- One gesture has to keep working: the drag resolves its target by the geometry of the section lists, and it must keep resolving the same way.

---

## Considered Options

### 1. Keep the geometric slice

Rejected. It is simple and it never loses content, but it cuts paragraphs mid-sentence, which is the defect being fixed.

### 2. Render each page's own blocks, and drop the rest

Split the children into per-page groups and render each group in its own window. Rejected, because it moves the copy: each window would then hold only its own blocks, so the blocks of a later page would no longer keep their space, and a figure positioned free against the copy would have to be re-based on every re-pagination — the free positions already stored in reports would not survive it.

### 3. Keep one copy per window, and hide the blocks of the other sheets

Chosen. Every window still holds the whole document, translated by the offset its sheet opens at, and the blocks that belong to other sheets are turned invisible with `visibility: hidden` instead of removed. Invisible boxes keep their space, so the layout of the copy is the same in every window — which is what leaves the bottom of a page blank rather than pulling the next block up, and what keeps the copy a single coordinate system.

---

## Decision Outcome

The rule lives in `src/components/preview/pagination.ts` as a pure function over the blocks' boxes, so it can be tested without a browser:

- **A sheet is filled, then closed.** The next block opens the next sheet, at the block's own top, so it does not inherit a gap from the sheet above.
- **A block moves whole.** Only a block taller than a whole sheet is cut — across as many sheets as it needs, because that is the only place its overflow can go — and the next block starts after the last of them.
- **A sheet ends between two lines, never inside one.** Where a block is cut, the cut moves *up* to the top of the line that would have been split, so the sheet's last line is shown whole and the next sheet opens with the line after it. The few pixels that leaves at the foot of the sheet are covered: the tail of that line is shown whole on the next sheet, and would otherwise appear twice. The mirror is covered too: the previous sheet's last line would otherwise leak onto the next sheet's top padding, under the header, so that band is covered as well and the header prints on top of it.
- **A heading is never left alone at the foot of a sheet.** It is placed with the block after it: if the pair cannot share a sheet, the block is left where it is rather than cut in half to make room for its heading, unless the block was going to run over several sheets anyway — in which case it carries its heading onto the first of them, and the cut lands in its text rather than between the two.
- **The blocks of a document are `data-unit` elements.** A page made of no blocks of its own — the sommaire, the equipment list — paginates by its top-level children instead.

`MeasuredPages` measures the blocks and applies the rule. It also reads where each block can be cut — the top of every line of text inside it, from a `Range` over each of the block's own text nodes; a block holding a picture, a chart or a table has no lines to cut between and is cut at the sheet's own edge instead. The block's controls (the grip, the arrows, the "Move to…" picker and their icons) are laid out inside the block but are not its text, so their words and icons are excluded from the measurement — a cut there once blanked most of a page. It measures from any window, because the copy lays out identically in all of them, which is why the document does not need a second, hidden measuring copy. Re-measuring is idempotent: measuring an already-cut document gives the same pagination back, so there is no feedback loop between the measurement and the rendering.

---

## Consequences

- **Positive**: A paragraph is never cut mid-sentence, and neither is an image, unless it is taller than a whole sheet. Where a paragraph does run over a sheet, the sheet ends between two lines, exactly as a word processor breaks it.
- **Positive**: Orphaned headings are gone — a heading moves onto the sheet its block opens.
- **Positive**: The page furniture never prints over the text. The header band sits fully inside the top padding, 24px above the first line, and the page number sits 24px below the last line at minimum — the two gaps are equal, the way a word processor reserves them. Both covers sit underneath the furniture, so a continuation page opens with its header and then its first line — never a line under a logo — and the bottom cover runs to the bottom of the window, so no text ever takes the place of the footer.
- **Positive**: One window is still one sheet, so the sommaire and the page numbers are unchanged, and screen and print still agree.
- **Positive**: The rule is a pure function, tested with 2000 randomised documents: no block is cut where it would have fitted, and none falls between two sheets.
- **Negative**: A sheet now closes where the next block will not fit, so the last sheet of a section can end well short of the bottom, where before it filled up to the last pixel.
- **Negative**: A block holding no splittable text — a full-width image, a wide chart — is still cut at the sheet's own edge, as before. So is a block whose lines could not be read: the cut is never moved forward past the block's head, because everything before it would then belong to no sheet at all.
- **Negative**: One more pass over the blocks per pagination, a `visibility` write per block per window, and a line measurement per block that might be cut. What each window shows is tracked per window, so a re-measure that moves a cut is always shown and a stale layout can never freeze on screen.

---

## Pros and Cons of the Options Considered

### Keep the geometric slice

- **Pros**: No new code, no measurement changes.
- **Cons**: Cuts paragraphs and figures in the middle, which is the defect.

### Render each page's own blocks

- **Pros**: Nothing to hide; each block exists once.
- **Cons**: Breaks the single coordinate system free figures are stored against, and would need their stored positions re-based.

### Keep one copy per window and hide the other sheets

- **Pros**: Blocks move whole, the copy keeps one coordinate system, no second measuring copy, screen and print agree by construction.
- **Cons**: The whole document is in the DOM once per sheet, as it always was; and the last sheet of a section can end short.
