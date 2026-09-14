# Design Specification: Organigramme de l'entreprise

**Date**: 2026-09-14  
**Status**: Approved

---

## 1. Overview

Add a dedicated **Organigramme** section to the rapport de stage, automatically inserted after "Présentation de l'entreprise". Students fill in a simple form (Name + Job Title + Parent node) to build a tree structure, which the app renders as a clean top-down SVG org chart on the A4 page. Gemini AI can pre-populate the nodes using existing company data + a free-text description prompt.

---

## 2. Placement in the Report

- **Official plan**: A new `WizardStep` with `id: 'organigramme'`, `kind: 'organigramme'`, inserted after the `'entreprise'` step and before `'remerciements'` in `WIZARD_STEPS`.
- **Custom plan**: Not included by default (students using custom plans manage their own sections). The organigramme is an official-plan-only feature.
- **A4 rendering**: Rendered as a self-contained A4 page or embedded section (respects `pageBreaks`), after the cover page header logo area.

---

## 3. Data Model

### New types in `src/types.ts`

```typescript
export interface OrgNode {
  id: string
  name: string        // e.g. "M. Ahmed Benali"
  title: string       // e.g. "Directeur Général"
  parentId?: string   // undefined = root node
}

export interface Organigramme {
  nodes: OrgNode[]
}
```

### Extended `Rapport` interface

```typescript
export interface Rapport {
  // ...existing fields
  organigramme?: Organigramme
}
```

### Storage compatibility
- `organigramme` is optional — existing reports without it render a placeholder "Section vide" on the A4 page and show an empty form in Edition mode.
- No migration needed: the field is simply absent on old reports.

---

## 4. Editor Interface (`OrganigrammeStep.tsx`)

A new wizard step component at `src/components/steps/OrganigrammeStep.tsx`.

### 4.1 Node Form (Form-Based Tree)

Each row = one node with:
- **Nom** text input (e.g. "M. Ahmed Benali")
- **Poste / Titre** text input (e.g. "Directeur Général")  
- **Rapporte à** dropdown — lists all other existing nodes by `title (name)`. Empty = root (top of hierarchy).
- **Delete** button (🗑) per row.

Controls:
- **"+ Ajouter un poste"** button to add a blank new row at the bottom.
- Drag-to-reorder rows (visual order only, does not affect tree structure).
- Max ~20 nodes to keep the chart readable.

### 4.2 AI Generation Panel

A collapsible card: **"✨ Générer avec l'IA"**

Contains:
- A **pre-filled text area** auto-populated with available company data:  
  `${entreprise.nom}, ${entreprise.secteurActivite}. ${entreprise.historique} ${entreprise.activitesPrincipales}`
- An **editable free-text area** below it: *"Décrivez la structure de l'entreprise..."*  
  Placeholder: `"Ex : PME de 12 personnes, 3 départements : fournil (5 boulangers), viennoiserie (3 pâtissiers), boutique (2 vendeurs). Directeur général : M. Benali."`
- A **"Générer l'organigramme"** button (calls Gemini).
- Gemini returns a list of `OrgNode[]` which replaces the current node list after user confirmation.

---

## 5. AI Generation (`src/lib/ai.ts`)

New exported function:

```typescript
export async function genererOrganigramme(
  companyContext: string,
  freeText: string
): Promise<OrgNode[]>
```

**Prompt strategy:**
- System: "Tu génères un organigramme JSON pour un rapport de stage français. Réponds uniquement avec un tableau JSON d'objets {id, name, title, parentId}."
- User: `${companyContext}\n\n${freeText}`
- Uses `response_schema` (structured JSON output via Gemini API) to enforce the `OrgNode[]` shape.
- Falls back to an offline stub returning a minimal 3-node tree if no API key is configured.

---

## 6. A4 Preview Rendering (`OrgChart.tsx` + `PreviewA4.tsx`)

### 6.1 `OrgChart` component (`src/components/preview/OrgChart.tsx`)

A pure SVG renderer. Takes `nodes: OrgNode[]` and the primary color as props.

**Rendering algorithm:**
1. Build tree from `nodes` using `parentId` references.
2. Compute positions with a simple recursive layout:
   - Each level is spaced `80px` vertically.
   - Siblings are distributed horizontally with equal spacing.
   - Center the root.
3. Draw connector lines (straight or elbow-style) between parent and child boxes.
4. Draw boxes:
   - Width: `160px`, Height: `52px`.
   - Border: `2px solid var(--doc-color)`.
   - Top color bar: `8px` filled with `var(--doc-color)` (primary color accent).
   - **Name**: bold, 11px, centered.
   - **Title**: regular, 10px, centered, muted color.

### 6.2 Integration in `PreviewA4.tsx`

- Add a new `OrganigrammePage` component.
- Render `<OrgChart nodes={rapport.organigramme?.nodes ?? []} />` inside a `<Page>` wrapper.
- If `nodes.length === 0`: show centered italic "Organigramme non renseigné".
- Insert between the existing Présentation and the first content section in the rendering order.

---

## 7. Navigation & Step Registration

### `src/data/sections.ts`
Add to `WIZARD_STEPS` after the `'entreprise'` step:

```typescript
{
  id: 'organigramme',
  numero: '03',
  titre: 'Organigramme',
  sousTitre: "Structure de l'entreprise",
  consigne: "Renseignez les postes et la hiérarchie de l'entreprise d'accueil. Vous pouvez utiliser l'IA pour générer automatiquement la structure à partir de la description de l'entreprise.",
  kind: 'organigramme',
  fields: [],
}
```

Re-number all subsequent steps (+1).

### `src/types.ts`
Add `'organigramme'` to `StepKind`.

### `src/pages/WorkspacePage.tsx`
Add a `step.kind === 'organigramme'` branch to render `<OrganigrammeStep>`.

---

## 8. Component Architecture

```mermaid
graph TD
  A[WorkspacePage] --> B[OrganigrammeStep]
  A --> C[PreviewA4]

  B -->|Node CRUD| D[OrgNode[] state in Rapport]
  B -->|AI generate| E[genererOrganigramme in ai.ts]
  E -->|nodes| B

  C --> F[OrganigrammePage]
  F --> G[OrgChart SVG renderer]
  G -->|reads| D
```

---

## 9. Files Summary

| Action | File |
|---|---|
| NEW | `src/components/steps/OrganigrammeStep.tsx` |
| NEW | `src/components/preview/OrgChart.tsx` |
| MODIFY | `src/types.ts` — add `OrgNode`, `Organigramme`, extend `Rapport`, extend `StepKind` |
| MODIFY | `src/data/sections.ts` — add organigramme step, renumber |
| MODIFY | `src/lib/ai.ts` — add `genererOrganigramme` |
| MODIFY | `src/lib/ai-stub.ts` — add offline stub |
| MODIFY | `src/components/PreviewA4.tsx` — add `OrganigrammePage`, insert in render order |
| MODIFY | `src/pages/WorkspacePage.tsx` — add `organigramme` step handler, patch function |
| MODIFY | `src/lib/storage.ts` / `storageV3.ts` — no migration needed (field is optional) |

---

## 10. Verification Plan

### Automated
- `npm run build` — 0 TypeScript errors.
- `npm run lint` — 0 warnings.

### Manual
1. Open a new report → verify "Organigramme" step appears after "Entreprise d'accueil".
2. Add 3–5 nodes with parent relationships → switch to Aperçu → verify tree renders correctly.
3. Test AI generation with and without an API key:
   - With key: verify nodes are populated from company data + free text.
   - Without key: verify offline stub returns a sensible minimal tree.
4. Test with 0 nodes → verify "Organigramme non renseigné" placeholder shows on A4.
5. Test PDF export → verify the SVG renders cleanly in the PDF.
6. Open an old existing report → verify it loads without error (organigramme field absent = graceful fallback).
