# Cover Page Editing & Sizing Controls Design

## 1. Overview
This feature allows users to edit cover page elements directly within the A4 Preview (Aperçu) mode, and to adjust the dimensions of the blue vertical ribbon and orange footer banner from the Style settings panel.

## 2. Architecture & Data Flow

### 2.1 Data Model
In `src/types.ts`:
Extend `RapportStyle` with two optional layout customization fields:
- `coverRibbonWidth?: number`: Width of the blue vertical ribbon on the cover page in pixels (min: 70, max: 140, default: 104).
- `coverBannerPadding?: number`: Vertical padding of the orange footer banner in pixels (min: 8, max: 28, default: 16).

Extend `EditHandler`:
```ts
export type EditHandler = (source: 'entreprise' | 'section' | 'couverture', field: string, value: string) => void
```

### 2.2 State Management (`src/hooks/useWorkspaceSteps.ts`)
- Update `handlePreviewEdit` to support `source === 'couverture'`:
  - `membresJury`: parsed as a comma-separated string, trimmed and filtered into `string[]`.
  - other fields (`nomStagiaire`, `objectifStage`, `periodeDebut`, `periodeFin`, `tuteurPedagogique`, `tuteurIndustriel`): patched directly into `couverture`.
- Provide `onCoverPhotoChange?: (fileDataUrl?: string) => void` and `onCoverPhotoFitToggle?: () => void` (or via `patchCouverture`).

## 3. UI Component Specifications

### 3.1 Cover Page Inline Editing (`src/components/PreviewA4.tsx`)
In `CoverPage`:
1. **Dynamic Dimensions**:
   - Blue ribbon width set via inline style: `width: `${ribbonWidth}px`` where `ribbonWidth = rapport.style?.coverRibbonWidth ?? 104`.
   - Content column left offset set to match ribbon width: `flex-1` absorbs the remaining space.
   - Orange banner padding set via inline style: `paddingTop: `${bannerPadding}px`, paddingBottom: `${bannerPadding}px`` where `bannerPadding = rapport.style?.coverBannerPadding ?? 16`.
2. **Inline Editable Text**:
   - Wrap the text nodes in `EditableText`:
     - Stagiaire: `c.nomStagiaire`
     - Objectif: `c.objectifStage`
     - Période: dates or direct text
     - Tuteur pédagogique: `c.tuteurPedagogique`
     - Tuteur industriel: `c.tuteurIndustriel`
     - Membres de jury: formatted as comma-separated string for editing, saved back to array.
   - When not in preview edit mode (e.g. print), `EditableText` renders plain text without hover decorations.
3. **Photo Management Overlay**:
   - When hovering over the activity image container in preview mode:
     - "Changer": triggers a hidden `<input type="file" accept="image/*">` and converts to base64 DataURL.
     - "Supprimer" (if photo exists): removes the photo (`patchCouverture({ photoActivite: undefined })`).
     - "Ajuster / Remplir": toggles `photoActiviteFit` between `'contain'` and `'cover'`.
   - Hidden during printing via `print:hidden`.

### 3.2 Style Settings Controls (`src/components/workspace/SettingsPanel.tsx`)
Add two controls in the Settings panel:
1. **Ruban bleu (largeur)**:
   - Slider from `70` to `140` (step 2), default 104px.
   - Reset button to restore default (104px).
2. **Bandeau orange (épaisseur)**:
   - Slider from `8` to `28` (step 2), default 16px.
   - Reset button to restore default (16px).

## 4. Print Safety & Regression Prevention
- All new controls on the cover page (image buttons, edit icons) must have `print:hidden` to ensure zero visual impact on printed/exported PDFs.
- Dynamic widths and paddings remain within safe bounds to prevent breaking the single-page print guarantee.
- Existing scale-to-fit safeguard remains active.

## 5. Verification Plan
1. **Type Checking**: Run `npx tsc -b` to verify full type safety.
2. **Build Check**: Run `npm run build` to verify clean bundle generation.
3. **Interactive Verification**:
   - Edit trainee name, objective, and tutors in preview: verify changes persist.
   - Upload new photo: verify image updates immediately in preview.
   - Adjust blue ribbon slider: verify ribbon shrinks/expands dynamically.
   - Adjust orange banner slider: verify vertical padding updates dynamically.
   - Verify print preview: ensure zero UI buttons appear in print and cover page stays strictly on Page 1.
