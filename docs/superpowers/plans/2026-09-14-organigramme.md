# Organigramme Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Organigramme wizard step to the rapport de stage, with a form-based tree editor (Name + Job Title + Parent dropdown), AI generation via Gemini, and a clean top-down SVG org chart rendered on the A4 preview page.

**Architecture:** New `OrganigrammeStep` editor component + `OrgChart` SVG renderer + `OrgNode[]` data model in `Rapport`. New `genererOrganigramme()` in `ai.ts`. New `'organigramme'` StepKind. Inserted as step 03 in `WIZARD_STEPS`, renumbering all subsequent steps. Backward-compatible: `organigramme` field is optional on `Rapport`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, SVG (no external chart library), Gemini API (`@google/genai`).

---

### Task 1: Data Model & Type Definitions

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add `OrgNode`, `Organigramme`, extend `StepKind` and `Rapport`**

In `src/types.ts`, add after the `NoteField` interface:

```typescript
export interface OrgNode {
  id: string
  name: string      // e.g. "M. Ahmed Benali"
  title: string     // e.g. "Directeur Général"
  parentId?: string // undefined = root node
}

export interface Organigramme {
  nodes: OrgNode[]
}
```

Update `StepKind`:
```typescript
export type StepKind = 'couverture' | 'entreprise' | 'organigramme' | 'presentation' | 'activites' | 'notes'
```

Extend `Rapport`:
```typescript
export interface Rapport {
  // ...all existing fields unchanged
  organigramme?: Organigramme
}
```

- [ ] **Step 2: Run build to verify TypeScript**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(organigramme): add OrgNode, Organigramme types and extend Rapport"
```

---

### Task 2: WIZARD_STEPS Registration & Step Renumbering

**Files:**
- Modify: `src/data/sections.ts`

- [ ] **Step 1: Insert organigramme step at position 3 (after 'entreprise')**

In `src/data/sections.ts`, insert the following object after the `entreprise` step entry and before the `remerciements` step:

```typescript
{
  id: 'organigramme',
  numero: '03',
  titre: 'Organigramme',
  sousTitre: "Structure de l'entreprise",
  consigne:
    "Renseignez les postes et la hiérarchie de l'entreprise d'accueil. Vous pouvez utiliser l'IA pour générer automatiquement la structure à partir des informations de l'entreprise.",
  kind: 'organigramme' as StepKind,
  fields: [],
},
```

- [ ] **Step 2: Renumber all subsequent steps**

Change `numero` for all steps after the new organigramme step:
- `remerciements`: `'03'` → `'04'`
- `introduction`: `'04'` → `'05'`
- `presentation`: `'05'` → `'06'`
- `activites`: `'06'` → `'07'`
- `contexte`: `'07'` → `'08'`
- `objectifs`: `'08'` → `'09'`
- `deroulement`: `'09'` → `'10'`
- `taches`: `'10'` → `'11'`
- `bilan`: `'11'` → `'12'`
- `conclusion`: `'12'` → `'13'`

- [ ] **Step 3: Run build to verify TypeScript**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/sections.ts
git commit -m "feat(organigramme): register organigramme wizard step as step 03"
```

---

### Task 3: AI Generation Function

**Files:**
- Modify: `src/lib/ai.ts`
- Modify: `src/lib/ai-stub.ts`

- [ ] **Step 1: Add `genererOrganigramme` to `src/lib/ai.ts`**

Add the following import at the top (already present: `GoogleGenAI, Type`):

```typescript
import type { OrgNode } from '../types'
```

Add the offline stub import reference and the function:

```typescript
export async function genererOrganigramme(
  companyContext: string,
  freeText: string,
): Promise<OrgNode[]> {
  const client = await getClient()

  const prompt = [
    companyContext.trim() ? `Informations sur l'entreprise :\n${companyContext.trim()}` : '',
    freeText.trim() ? `Description de la structure :\n${freeText.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  if (!prompt.trim()) {
    return genererOrganigrammeOffline()
  }

  if (!client) {
    return genererOrganigrammeOffline()
  }

  try {
    const response = await client.ai.models.generateContent({
      model: client.model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Tu es un assistant qui génère des organigrammes d'entreprise pour des rapports de stage français (boulangerie/pâtisserie/restauration). Génère un organigramme JSON réaliste et cohérent.

${prompt}

Réponds UNIQUEMENT avec un tableau JSON valide. Chaque élément doit avoir :
- "id": identifiant unique court (ex: "1", "2", "3"...)
- "name": prénom et nom de la personne (ou "—" si inconnu)
- "title": intitulé du poste
- "parentId": id du supérieur hiérarchique direct, ou null/absent pour la racine

Exemple de réponse attendue :
[
  {"id":"1","name":"M. Benali","title":"Directeur Général"},
  {"id":"2","name":"Mme Fassi","title":"Chef de Production","parentId":"1"},
  {"id":"3","name":"M. Idrissi","title":"Responsable Boutique","parentId":"1"},
  {"id":"4","name":"—","title":"Boulanger","parentId":"2"},
  {"id":"5","name":"—","title":"Pâtissier","parentId":"2"}
]`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              title: { type: Type.STRING },
              parentId: { type: Type.STRING },
            },
            required: ['id', 'name', 'title'],
          },
        },
      },
    })

    const raw = response.text ?? '[]'
    const parsed: OrgNode[] = JSON.parse(raw)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return genererOrganigrammeOffline()
    }

    // Normalize: remove parentId if it's null/empty string
    return parsed.map((n) => ({
      id: n.id,
      name: n.name || '—',
      title: n.title || '—',
      parentId: n.parentId || undefined,
    }))
  } catch {
    return genererOrganigrammeOffline()
  }
}
```

- [ ] **Step 2: Add `genererOrganigrammeOffline` stub to `src/lib/ai-stub.ts`**

```typescript
import type { OrgNode } from '../types'

export function genererOrganigrammeOffline(): OrgNode[] {
  return [
    { id: '1', name: '—', title: 'Directeur Général' },
    { id: '2', name: '—', title: 'Responsable de Production', parentId: '1' },
    { id: '3', name: '—', title: 'Responsable Boutique', parentId: '1' },
    { id: '4', name: '—', title: 'Employé', parentId: '2' },
    { id: '5', name: '—', title: 'Employé', parentId: '3' },
  ]
}
```

Import and use it in `ai.ts`:
```typescript
import { genererOrganigrammeOffline } from './ai-stub'
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai.ts src/lib/ai-stub.ts
git commit -m "feat(organigramme): add genererOrganigramme AI function with offline fallback"
```

---

### Task 4: SVG OrgChart Renderer

**Files:**
- Create: `src/components/preview/OrgChart.tsx`

- [ ] **Step 1: Implement `OrgChart` component**

Create `src/components/preview/OrgChart.tsx`:

```typescript
import type { OrgNode } from '../../types'

interface OrgChartProps {
  nodes: OrgNode[]
  primaryColor?: string
}

interface TreeNode {
  node: OrgNode
  children: TreeNode[]
  x: number
  y: number
  width: number
}

const BOX_W = 160
const BOX_H = 56
const LEVEL_H = 110   // vertical spacing between levels
const MIN_H_GAP = 24  // minimum horizontal gap between sibling boxes

function buildTree(nodes: OrgNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const node of nodes) {
    map.set(node.id, { node, children: [], x: 0, y: 0, width: BOX_W })
  }

  for (const tnode of map.values()) {
    const parentId = tnode.node.parentId
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(tnode)
    } else {
      roots.push(tnode)
    }
  }

  return roots
}

function assignPositions(roots: TreeNode[], startY = 0): void {
  function subtreeWidth(tnode: TreeNode): number {
    if (tnode.children.length === 0) return BOX_W
    const childrenWidth = tnode.children.reduce(
      (sum, c) => sum + subtreeWidth(c) + MIN_H_GAP,
      -MIN_H_GAP,
    )
    return Math.max(BOX_W, childrenWidth)
  }

  function layout(tnode: TreeNode, x: number, y: number): void {
    tnode.width = subtreeWidth(tnode)
    tnode.x = x + tnode.width / 2 - BOX_W / 2
    tnode.y = y

    if (tnode.children.length > 0) {
      let childX = x
      for (const child of tnode.children) {
        const cw = subtreeWidth(child)
        layout(child, childX, y + LEVEL_H)
        childX += cw + MIN_H_GAP
      }
    }
  }

  let totalX = 0
  for (const root of roots) {
    layout(root, totalX, startY)
    totalX += subtreeWidth(root) + MIN_H_GAP * 2
  }
}

function collectNodes(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(t: TreeNode) {
    result.push(t)
    for (const c of t.children) walk(c)
  }
  for (const r of roots) walk(r)
  return result
}

function collectEdges(roots: TreeNode[]): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  function walk(t: TreeNode) {
    for (const child of t.children) {
      edges.push({
        x1: t.x + BOX_W / 2,
        y1: t.y + BOX_H,
        x2: child.x + BOX_W / 2,
        y2: child.y,
      })
      walk(child)
    }
  }
  for (const r of roots) walk(r)
  return edges
}

export function OrgChart({ nodes, primaryColor = '#2f5496' }: OrgChartProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm italic text-neutral-400">
        Organigramme non renseigné
      </div>
    )
  }

  const roots = buildTree(nodes)
  assignPositions(roots)
  const allNodes = collectNodes(roots)
  const edges = collectEdges(roots)

  // Compute SVG viewBox
  const allX = allNodes.map((n) => n.x)
  const allY = allNodes.map((n) => n.y)
  const minX = Math.min(...allX) - 20
  const minY = Math.min(...allY) - 20
  const maxX = Math.max(...allX) + BOX_W + 20
  const maxY = Math.max(...allY) + BOX_H + 20
  const svgW = maxX - minX
  const svgH = maxY - minY

  return (
    <svg
      viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
      width="100%"
      style={{ maxHeight: '600px', overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Connector lines */}
      {edges.map((e, i) => {
        const midY = (e.y1 + e.y2) / 2
        return (
          <path
            key={i}
            d={`M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`}
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        )
      })}

      {/* Boxes */}
      {allNodes.map(({ node, x, y }) => (
        <g key={node.id}>
          {/* Box border */}
          <rect
            x={x}
            y={y}
            width={BOX_W}
            height={BOX_H}
            rx={4}
            ry={4}
            fill="white"
            stroke={primaryColor}
            strokeWidth="1.5"
          />
          {/* Top color accent bar */}
          <rect
            x={x}
            y={y}
            width={BOX_W}
            height={8}
            rx={4}
            ry={4}
            fill={primaryColor}
          />
          {/* Clip bottom corners of accent bar */}
          <rect x={x} y={y + 4} width={BOX_W} height={4} fill={primaryColor} />

          {/* Title (job) */}
          <text
            x={x + BOX_W / 2}
            y={y + 24}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill={primaryColor}
            fontFamily="var(--doc-title-font, sans-serif)"
          >
            {node.title.length > 24 ? node.title.slice(0, 22) + '…' : node.title}
          </text>

          {/* Name */}
          <text
            x={x + BOX_W / 2}
            y={y + 38}
            textAnchor="middle"
            fontSize="8.5"
            fill="#4b5563"
            fontFamily="var(--doc-body-font, sans-serif)"
          >
            {node.name.length > 26 ? node.name.slice(0, 24) + '…' : node.name}
          </text>
        </g>
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/OrgChart.tsx
git commit -m "feat(organigramme): add SVG OrgChart renderer with top-down tree layout"
```

---

### Task 5: OrganigrammeStep Editor Component

**Files:**
- Create: `src/components/steps/OrganigrammeStep.tsx`

- [ ] **Step 1: Implement `OrganigrammeStep`**

Create `src/components/steps/OrganigrammeStep.tsx`. This component receives:
- `value: Organigramme` (current state)
- `onChange: (o: Organigramme) => void`
- `entreprise: Entreprise` (for AI context pre-fill)

The component renders:

**Node list section:**
- For each `OrgNode` in `value.nodes`, a row with:
  - Text input for `name` (placeholder: "Prénom Nom")
  - Text input for `title` (placeholder: "Intitulé du poste")
  - Select dropdown for `parentId`: options are all other nodes shown as `${node.title} — ${node.name}`, plus a blank root option "Aucun (racine)"
  - Delete button (Trash2 icon, disabled if it's the last node)
- **"+ Ajouter un poste"** button (Plus icon) at the bottom of the list

**AI generation card** (collapsible with ChevronDown, default collapsed):
- Label: "✨ Générer avec l'IA"
- A readonly summary textarea pre-filled with company context (derived from `entreprise`)
- An editable free-text textarea: "Décrivez la structure de l'entreprise..."
  - Placeholder: "Ex : PME de 12 personnes, 3 rayons : fournil (5 boulangers), viennoiserie, boutique. Direction : M. Benali."
- Button: "Générer l'organigramme" — calls `genererOrganigramme(companyContext, freeText)`, shows loading spinner, on success shows a "preview" list of generated nodes with a **"Confirmer"** button to replace current nodes, and a **"Annuler"** button to discard.
- Error message display if generation fails.

**Helper functions inside component:**
```typescript
const addNode = () => onChange({
  nodes: [...value.nodes, { id: crypto.randomUUID(), name: '', title: '' }]
})

const updateNode = (id: string, patch: Partial<OrgNode>) => onChange({
  nodes: value.nodes.map(n => n.id === id ? { ...n, ...patch } : n)
})

const deleteNode = (id: string) => onChange({
  nodes: value.nodes.filter(n => n.id !== id).map(n =>
    n.parentId === id ? { ...n, parentId: undefined } : n
  )
})
```

- [ ] **Step 2: Run build & lint**

Run: `npm run build && npm run lint`
Expected: PASS with 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/steps/OrganigrammeStep.tsx
git commit -m "feat(organigramme): add OrganigrammeStep editor with node form and AI generation"
```

---

### Task 6: A4 Preview Integration

**Files:**
- Modify: `src/components/PreviewA4.tsx`

- [ ] **Step 1: Import `OrgChart` and `Organigramme` type**

At the top of `src/components/PreviewA4.tsx`, add:
```typescript
import { OrgChart } from './preview/OrgChart'
import type { Organigramme } from '../types'
```

- [ ] **Step 2: Add `OrganigrammePage` component**

After the `CoverPage` function definition, add:

```typescript
function OrganigrammePage({
  organigramme,
  startPageNum,
  headerLogo,
  primaryColor,
}: {
  organigramme?: Organigramme
  startPageNum?: number
  headerLogo?: string | null
  primaryColor?: string
}) {
  return (
    <Page data-part="organigramme" startPageNum={startPageNum} headerLogo={headerLogo}>
      <h2
        className="text-center font-bold mb-8"
        style={{ color: BLEU, fontSize: 'var(--doc-title-size)' }}
      >
        Organigramme de l&apos;entreprise
      </h2>
      <OrgChart
        nodes={organigramme?.nodes ?? []}
        primaryColor={primaryColor || '#2f5496'}
      />
    </Page>
  )
}
```

- [ ] **Step 3: Insert `OrganigrammePage` in the `PreviewA4` render order**

In the main `PreviewA4` component return, insert `<OrganigrammePage>` after the cover page and before the sommaire/remerciements pages. Pass `rapport.organigramme`, `rapport.style?.primaryColor`, and the appropriate `startPageNum` and `headerLogo`.

Also add `'organigramme'` to the `usePageNumbers` tracked parts list if it exists, or ensure `data-part="organigramme"` is tracked.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/PreviewA4.tsx
git commit -m "feat(organigramme): add OrganigrammePage in A4 preview after cover page"
```

---

### Task 7: WorkspacePage Wiring

**Files:**
- Modify: `src/pages/WorkspacePage.tsx`

- [ ] **Step 1: Import `OrganigrammeStep` and add organigramme patch handler**

At the top of `WorkspacePage.tsx`, add:
```typescript
import { OrganigrammeStep } from '../components/steps/OrganigrammeStep'
import type { Organigramme } from '../types'
```

Add a handler function after the existing `patchEntreprise` handler:
```typescript
const patchOrganigramme = (patch: Organigramme) => {
  setRapportWithHistory((r) =>
    r ? { ...r, organigramme: patch, updatedAt: Date.now() } : r,
  )
}
```

- [ ] **Step 2: Add `step.kind === 'organigramme'` branch**

In the edition mode render block, after the `step.kind === 'entreprise'` branch, add:
```typescript
{step.kind === 'organigramme' && (
  <OrganigrammeStep
    value={rapport.organigramme ?? { nodes: [] }}
    onChange={patchOrganigramme}
    entreprise={rapport.entreprise}
  />
)}
```

- [ ] **Step 3: Run build & lint**

Run: `npm run build && npm run lint`
Expected: PASS with 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/pages/WorkspacePage.tsx
git commit -m "feat(organigramme): wire OrganigrammeStep in WorkspacePage"
```

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Run final build & lint**

Run: `npm run build && npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Manual functional verification**

1. Open a new report → verify "Organigramme" step appears as step 03 in the sidebar.
2. Add 3–5 nodes, set parent relationships → switch to Aperçu → verify tree renders correctly with colored boxes and connectors.
3. Delete a parent node → verify its children become root nodes (no crash).
4. Test AI generation (with and without API key):
   - With key: verify nodes are populated from company data + free text, preview shown before confirm.
   - Without key: verify offline stub returns 5 sensible nodes.
5. Test with 0 nodes → verify "Organigramme non renseigné" placeholder shown.
6. Open an old existing report → verify it loads without error.
7. Export PDF → verify org chart renders cleanly.

- [ ] **Step 3: Commit walkthrough**

```bash
git add -A
git commit -m "feat(organigramme): complete implementation — form editor, AI generation, SVG chart"
```
