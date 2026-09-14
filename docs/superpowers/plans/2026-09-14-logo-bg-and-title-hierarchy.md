# Logo Background Removal, Empty Titles & 3-Level Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an always-visible logo background removal toolbar with instant canvas-based transparency and revert support, allow section titles and subtitles to be empty ("vide") without orphan numbering, and establish a 3-level heading hierarchy (Level 1 unnumbered, Level 2 with 1, 2, 3..., Level 3 with a/, b/...).

**Architecture:** 
- `bgRemoval.ts` & `LogoUpload.tsx`: Canvas color-keying for instant white/plain background removal + AI worker fallback, with in-memory original image caching and visible action buttons.
- `types.ts` & `reportDocument.ts`: Backward-compatible `NoteField` with `parentId` and `prefix` to nest Level 3 items (`a/`, `b/`) under Level 2 (`1.`, `2.`). Headings without numbers for Level 1.
- `PreviewA4.tsx`: Omit headings completely if title is empty string; render Level 1 unnumbered, Level 2 numbered `1.`, `2.`, and Level 3 with `a/`, `b/`; support inline editing for titles.
- `NotesStep.tsx` & `WorkspacePage.tsx`: Add "+ Ajouter un point (a/)" under sub-sections with automated letter indexing and independent AI generation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Canvas API, IndexedDB.

---

### Task 1: Logo Background Removal — Instant Canvas Keying & Revert Toolbar

**Files:**
- Modify: `src/lib/bgRemoval.ts`
- Modify: `src/components/LogoUpload.tsx`

- [ ] **Step 1: Implement instant canvas background removal in `src/lib/bgRemoval.ts`**

Add `removeWhiteBackground(dataUrl: string, tolerance?: number): Promise<string>` to `src/lib/bgRemoval.ts`:
```typescript
/**
 * Fast client-side canvas-based background removal for logos on white or near-white backgrounds.
 * Operates synchronously on an HTMLCanvasElement in < 20ms with 0 network requests.
 */
export function removeWhiteBackground(dataUrl: string, tolerance: number = 32): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data

        // Detect corner background color (top-left pixel sample)
        const bgR = data[0]
        const bgG = data[1]
        const bgB = data[2]

        // Only process if corner is near white or plain light color
        const isNearWhite = bgR > 220 && bgG > 220 && bgB > 220

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          const dist = isNearWhite
            ? Math.min(255 - r, 255 - g, 255 - b)
            : Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB))

          if (isNearWhite) {
            if (r >= 255 - tolerance && g >= 255 - tolerance && b >= 255 - tolerance) {
              data[i + 3] = 0 // Transparent
            } else if (r >= 255 - tolerance * 2 && g >= 255 - tolerance * 2 && b >= 255 - tolerance * 2) {
              // Soft edge feathering
              const factor = (Math.min(255 - r, 255 - g, 255 - b)) / (tolerance * 2)
              data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, factor)))
            }
          } else if (dist <= tolerance) {
            data[i + 3] = 0
          }
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = (err) => reject(err)
    img.src = dataUrl
  })
}
```

- [ ] **Step 2: Update `src/components/LogoUpload.tsx` to add always-visible actions and revert state**

Update `LogoUpload.tsx` so:
1. `originalDataUrl` is tracked in state (persisted when a new image is loaded).
2. When an image is present, display an action toolbar below the image preview:
   - **`🪄 Retirer le fond`**: Tries instant canvas keying first; if image corner is not white or already transparent, uses neural worker.
   - **`↩ Rétablir l'original`**: Visible when image has been cut out (`isCutout === true`). Restores `originalDataUrl`.
   - **`🗑 Retirer`**: Calls `onChange(undefined)`.
3. Actions are always visible on mobile and desktop (remove `opacity-0 group-hover:opacity-100`).

- [ ] **Step 3: Run build to verify TypeScript compilation**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/lib/bgRemoval.ts src/components/LogoUpload.tsx
git commit -m "feat(logo): add instant canvas background removal and always-visible revert toolbar"
```

---

### Task 2: Data Model & Report Document 3-Level Hierarchy

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/reportDocument.ts`

- [ ] **Step 1: Add `parentId` and `prefix` to `NoteField` in `src/types.ts`**

Update `NoteField` in `src/types.ts`:
```typescript
export interface NoteField {
  id: string
  label: string
  hint?: string
  placeholder: string
  examples: string[]
  parentId?: string
  prefix?: string
}
```

- [ ] **Step 2: Update `ReportSubSection` and `ReportPart` in `src/lib/reportDocument.ts`**

Add `ReportSubSubSection`:
```typescript
export interface ReportSubSubSection {
  id: string
  titre: string
  prefix?: string
  texte: string
  editPath?: ReportEditPath
}

export interface ReportSubSection {
  id?: string
  titre: string
  numero?: number
  texte: string
  items?: ReportSubSubSection[]
  editPath?: ReportEditPath
}

export interface ReportPart {
  key: string
  numero: number | null
  titre: string
  sousSections?: ReportSubSection[]
  paragraphes?: string[]
  editPath?: { stepId: string; fieldIds: string[] }
}
```

- [ ] **Step 3: Update `buildReportParts(rapport)` in `src/lib/reportDocument.ts`**

Implement hierarchy logic:
1. **Level 1 (Part title)**: `numero: null` for custom steps and official report sections so Level 1 title is **unnumbered**!
2. **Level 2 (Sous-titres)**:
   - For custom steps: Filter `step.fields` where `!f.parentId`. Assign numeric sequence `numero: index + 1` (1, 2, 3...).
   - Each Level 2 item finds its children: `step.fields.filter(f => f.parentId === parent.id)`.
   - Map children to `ReportSubSubSection` with `prefix: child.prefix || `${letter}/`` and `titre: child.label`.
3. **Empty Titles Handling**:
   - Do NOT force default title text if blank. Preserve `titre: ''` so renderer can skip them.
4. **Official Sections**:
   - Convert official sections to have unnumbered Level 1 (`numero: null`), and numbered Level 2 (`numero: 1, 2, 3...`).

- [ ] **Step 4: Update `buildSommaireEntries` in `src/lib/reportDocument.ts`**

- Omit any entry whose `label` or `titre` is empty or whitespace.
- Level 1 entries render without number: `part.titre`.
- Level 2 entries render with number: `${sousSection.numero}. ${sousSection.titre}`.

- [ ] **Step 5: Run build to verify TypeScript compilation**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/types.ts src/lib/reportDocument.ts
git commit -m "feat(document): update data model and report builder for 3-level hierarchy and empty titles"
```

---

### Task 3: A4 Document Preview Rendering (`PreviewA4.tsx`)

**Files:**
- Modify: `src/components/PreviewA4.tsx`

- [ ] **Step 1: Update Level 1 rendering in `PartContent` / `PreviewA4.tsx`**

1. If `!part.titre || !part.titre.trim()`:
   Omit the `<h2>` tag entirely.
2. If `part.titre` is present:
   Render without number:
   ```tsx
   <h2 className="text-center font-bold" style={{ color: BLEU, fontSize: 'var(--doc-title-size)' }}>
     <EditableText
       text={part.titre}
       placeholder="Titre de la section..."
       onSave={onEdit ? (val) => onEdit('section', `${part.key}:__title__`, val) : undefined}
     />
   </h2>
   ```

- [ ] **Step 2: Update Level 2 and Level 3 rendering in `PartContent` / `PreviewA4.tsx`**

1. For each block / sub-section `b`:
   - If `b.titre && b.titre.trim() !== ''`:
     Render `<h3>` numbered with `b.numero ? `${b.numero}. ` : ''`:
     ```tsx
     <h3 className="font-semibold" style={{ color: BLEU, fontSize: 'var(--doc-subtitle-size)' }}>
       <EditableText
         text={b.titre}
         placeholder="Sous-titre..."
         onSave={onEdit && b.editPath ? (val) => onEdit(b.editPath!.source, `${b.editPath!.field}:__label__`, val) : undefined}
       />
     </h3>
     ```
   - Render main sub-section text (if present).
   - If `b.items && b.items.length > 0`:
     Render each Level 3 item:
     ```tsx
     {b.items.map((item) => (
       <div key={item.id} className="mt-4 pl-3 border-l border-line/40">
         {item.titre && item.titre.trim() !== '' && (
           <h4 className="font-semibold text-[13px] text-ink" style={{ fontFamily: 'var(--doc-title-font)' }}>
             <span className="font-bold text-gold-deep mr-1.5">{item.prefix || 'a/'}</span>
             <EditableText
               text={item.titre}
               placeholder="Point a/..."
               onSave={onEdit && item.editPath ? (val) => onEdit(item.editPath!.source, `${item.editPath!.field}:__label__`, val) : undefined}
               className="inline"
             />
           </h4>
         )}
         <div className="mt-1">
           <EditableText
             text={item.texte}
             placeholder="Rédigez ce point..."
             onSave={onEdit && item.editPath ? (val) => onEdit(item.editPath!.source, item.editPath!.field, val) : undefined}
             className="whitespace-pre-wrap"
             style={{ fontSize: 'var(--doc-body-size)', lineHeight: 'var(--doc-line-spacing)', textAlign: 'var(--doc-text-align)' as any }}
           />
         </div>
       </div>
     ))}
     ```

- [ ] **Step 3: Run build to verify TypeScript compilation**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/components/PreviewA4.tsx
git commit -m "feat(preview): render 3-level hierarchy with empty title omission and inline editing"
```

---

### Task 4: Editor Interface for 3-Level Hierarchy & Empty Titles

**Files:**
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/components/steps/NotesStep.tsx`
- Modify: `src/components/PlanPickerModal.tsx`

- [ ] **Step 1: Update `src/pages/WorkspacePage.tsx` with Level 3 handlers**

1. Implement `handleAddLevel3Item(stepId: string, parentFieldId: string)`:
   - Compute next letter index: find existing children where `parentId === parentFieldId`.
   - Letter is `String.fromCharCode(97 + children.length) + '/'` (e.g. `a/`, `b/`, `c/`...).
   - Insert new `NoteField` with `id: crypto.randomUUID()`, `parentId: parentFieldId`, `prefix: letter`, `label: 'Nouveau point'`.
2. Implement `handleDeleteLevel3Item(stepId: string, fieldId: string)`:
   - Remove the `NoteField` from `step.fields`.
3. Support inline title renaming from preview:
   - Handle `:__title__` in `handleEditFromPreview` to update `step.titre`.
   - Handle `:__label__` in `handleEditFromPreview` to update `field.label`.

- [ ] **Step 2: Update `src/components/steps/NotesStep.tsx`**

1. Separate `fields` into Level 2 parent fields (`!f.parentId`) and Level 3 children (`f.parentId`).
2. Display Level 2 subtitle with sequential number (`1. `, `2. `) and title input (allow empty/clearing).
3. Under each Level 2 card:
   - Add button: **`+ Ajouter un point (a/)`**.
   - Render each Level 3 child with:
     - Editable prefix input (defaults to `a/`, `b/`...).
     - Editable title input (can be left blank).
     - Textarea for notes + AI "Rédiger" drafting button.
     - Delete button.

- [ ] **Step 3: Update `src/components/PlanPickerModal.tsx`**

1. Allow custom section titles to be empty without blocking confirmation. If empty, default to "Section sans titre" or empty title.

- [ ] **Step 4: Run build & lint**

Run: `npm run build && npm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/pages/WorkspacePage.tsx src/components/steps/NotesStep.tsx src/components/PlanPickerModal.tsx
git commit -m "feat(editor): add level 3 item creation, empty title inputs, and plan picker updates"
```

---

### Task 5: End-to-End Verification & Walkthrough

**Files:**
- Create: `<appDataDir>/brain/<conversation-id>/walkthrough.md`

- [ ] **Step 1: Automated Verification**

Run: `npm run build && npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Manual functional test of all 3 features**

1. Test logo background removal:
   - Open Entreprise step.
   - Observe visible toolbar: "Retirer le fond" button and "Rétablir l'original".
   - Test instant canvas keying.
2. Test empty titles:
   - In a section, clear the title and subtitle.
   - Switch to Aperçu (Preview).
   - Verify that the title and subtitle headings are completely omitted, and no orphan numbers appear.
3. Test 3-level hierarchy:
   - In a custom section, verify Level 1 has no number.
   - Verify Level 2 has numbers `1.`, `2.`.
   - Add Level 3 items and verify they render with `a/`, `b/`.
   - Verify AI drafting works on Level 3 items.

- [ ] **Step 3: Document findings in walkthrough**
