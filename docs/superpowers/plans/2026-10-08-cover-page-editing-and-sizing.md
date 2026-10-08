# Cover Page Editing & Sizing Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable direct inline editing of text and activity photo on the cover page in Aperçu mode, and provide toolbar sliders to customize the blue ribbon width and orange footer banner padding.

**Architecture:**
- Extend `RapportStyle` with `coverRibbonWidth` and `coverBannerPadding` properties.
- Extend `useWorkspaceSteps.ts` `handlePreviewEdit` to route `source === 'couverture'` edits to `patchCouverture`.
- In `PreviewA4.tsx`, wrap cover page fields in `EditableText`, add an interactive photo overlay (replace/delete/fit), and bind ribbon width / banner padding to style properties.
- In `SettingsPanel.tsx`, add sliders for the blue ribbon width (70-140px) and orange banner padding (8-28px).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons.

---

### Task 1: Type Definitions and Edit Handler Extension

**Files:**
- Modify: `src/types.ts:116-126`
- Modify: `src/hooks/useWorkspaceSteps.ts:340-358`

- [ ] **Step 1: Add cover style properties and update EditHandler type in `src/types.ts`**

Add `coverRibbonWidth?: number` and `coverBannerPadding?: number` to `RapportStyle`. Update `EditHandler` to accept `'couverture'`.

- [ ] **Step 2: Update `handlePreviewEdit` in `src/hooks/useWorkspaceSteps.ts`**

Handle `source === 'couverture'`:
- If `field === 'membresJury'`: parse comma-separated string to `string[]`.
- Other fields: update `couverture` using `patchCouverture`.
Pass `patchCouverture` or dedicated photo callbacks so PreviewA4 can update `c.photoActivite` and `c.photoActiviteFit`.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc -b`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/types.ts src/hooks/useWorkspaceSteps.ts
git commit -m "feat(cover): extend types and edit handler for cover page"
```

---

### Task 2: Cover Page Inline Text and Image Editing in `PreviewA4.tsx`

**Files:**
- Modify: `src/components/PreviewA4.tsx:89-240`

- [ ] **Step 1: Update CoverPage props and dynamic dimensions**

Pass `onEdit?: EditHandler` and `onCoverChange?: (patch: Partial<Couverture>) => void` into `CoverPage`.
Bind blue ribbon width to `rapport.style?.coverRibbonWidth ?? 104`.
Bind orange banner padding to `rapport.style?.coverBannerPadding ?? 16`.

- [ ] **Step 2: Replace plain text with `EditableText` for cover fields**

Wrap:
- `c.nomStagiaire` with `EditableText` (field: `'nomStagiaire'`)
- `c.objectifStage` with `EditableText` (field: `'objectifStage'`)
- `c.tuteurPedagogique` with `EditableText` (field: `'tuteurPedagogique'`)
- `c.tuteurIndustriel` with `EditableText` (field: `'tuteurIndustriel'`)
- `c.membresJury` with `EditableText` (field: `'membresJury'`, joined by `', '`)

- [ ] **Step 3: Add activity photo overlay controls**

Add a hover overlay on the photo container when `onCoverChange` is present:
- File input for uploading/replacing photo.
- Delete button to clear photo.
- Toggle button to switch between `'contain'` and `'cover'`.
Ensure all buttons have `print:hidden`.

- [ ] **Step 4: Verify TypeScript compilation and build**

Run: `npx tsc -b && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/PreviewA4.tsx
git commit -m "feat(cover): add inline text editing and photo controls to cover page"
```

---

### Task 3: Ribbon and Banner Size Sliders in `SettingsPanel.tsx`

**Files:**
- Modify: `src/components/workspace/SettingsPanel.tsx:15-95`

- [ ] **Step 1: Add sliders for blue ribbon width and orange banner padding**

Add controls in `SettingsPanel.tsx`:
- "Ruban bleu (largeur)" with range 70 to 140 (default 104px)
- "Bandeau orange (épaisseur)" with range 8 to 28 (default 16px)

- [ ] **Step 2: Verify TypeScript compilation and build**

Run: `npx tsc -b && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 3**

```bash
git add src/components/workspace/SettingsPanel.tsx
git commit -m "feat(cover): add ribbon width and banner padding sliders in settings panel"
```

---

### Task 4: End-to-End Verification

- [ ] **Step 1: Run complete build and typecheck**
Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Verify PDF print styles**
Verify that all new buttons and overlays are tagged `print:hidden` and that `@media print` remains intact with no regression.
