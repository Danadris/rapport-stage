# Refactor Plan — rapport-stage-app

> Goal: Take the audit from **7/10 → 9/10** without rewriting the stack.
> Stack stays React/TS/Vite/Capacitor. No Rust/Go.
> Order matters: each phase is committable alone, never breaks build.
>
> **Status 2026-11-07:** Phase 0 ✅ + Phase 1 ✅ + Phase 2 ✅ + Phase 3 ✅ + Phase 4 ✅ + Phase 5 ✅ + Phase 6 ✅ + Phase 7 ✅ + Phase 8 ✅ done on branch `refactor/adr0002-0003-integration` (13 commits: 9f4f28e, c842b2d, d46f129, cee1a5c, 41cd99c, 2a45616, 71b5c22, 7060666, 923d034, 4990771, 0b6839b, cb065bb, dc7ccd3, 50902f7). Tree clean, `typecheck` + `lint` + `vitest` (53) + `build` + `knip` green, `as any` = 0, main 321kB (gzip 92kB), debug APK 54M verified. Ready for PR.

## Principles

1. **Commit-safe:** every phase = 1-3 small commits, `tsc -b && vite build && oxlint` green after each.
2. **No behavior change** except where noted (migration finish is the only risky change).
3. **Pure first:** extract/test pure functions (`blockModel`, `pagination`, `reportDocument`) before touching React.

---

## Phase 0 — Safety net (30 min, P0)

Uncommitted WIP is the biggest risk right now: 28 modified + 18 untracked files.

- [ ] `git status` → tag current HEAD `git tag pre-refactor-$(date +%F)`
- [ ] Stash or branch: `git checkout -b refactor/adr0002-0003-integration`
- [ ] Commit per-ADR, not all at once:
  - `feat(blocks): ADR-0002 document blocks + preview drag` — `src/lib/blockModel.ts`, `src/components/preview/{actions,moveTargets,paragraphDrag,SectionContent,TextBlockView}.tsx`
  - `feat(pagination): ADR-0003 whole-block sheet fill` — `src/components/preview/pagination.ts`, `MeasuredPages.tsx`, `Page.tsx`
  - `chore: preview refactor` — remaining modified files
  - `docs: ADR-0002, ADR-0003, knip.json`
- [ ] Verify: `npm run build && npm run lint` passes on each commit
- [ ] Push branch, open PR (even solo, PR = review checkpoint)

**Acceptance:** `git status` clean, history matches docs.

---

## Phase 1 — Finish V1 → V3 migration (1-2h, P0, the core fix)

Today `storage.ts` (V1, 227L) + `storageV3.ts` (466L) both live. Delete V1.

**Decision: keep V3** (`idb`, Blob images, indexes). V1 = legacy.

- [ ] 1.1 Migrate remaining readers to V3:
  - `src/pages/HomePage.tsx` — remove V1 fallback, use `storageV3` meta only
  - `src/pages/ParametresPage.tsx` — backup import/export → `backupV3` only
  - `src/hooks/useWorkspacePersistence.ts` — remove dual-write, V3 is primary+only
  - `src/lib/backupV3.ts` — remove `createBackup` fallback, keep `createBackupV3`
  - `src/main.tsx` — keep `migrateV1toV3IfNeeded()` one-time for old users, then delete V1 read path
- [ ] 1.2 Delete `src/lib/storage.ts` entirely (after no imports remain — verify with grep)
- [ ] 1.3 Update `docs/ARCHITECTURE.md` — document only V3 model + one-time migration note
- [ ] 1.4 Move `src/lib/migrationTest.ts` out of prod import (gate behind `import.meta.env.DEV` dynamic import, not unconditional side-effect in `main.tsx`)

**Acceptance:** `grep -r "from.*storage'" src/` → only `storageV3`. One persistence layer, ~300 lines deleted.

**Risk:** Users with V1-only data → mitigated by keeping the one-time migration function. Test: fresh profile + old backup import.

---

## Phase 2 — Type the boundaries (1h, P0)

Kill the 18 `any` casts where untrusted data enters.

- [ ] `src/lib/backupV3.ts:87` — `let parsed: any` → `unknown` + type guards. Reuse `isRapportLike()` pattern from `storage.ts` (or move it to `types.ts`). Same for `Record<string, any[]>` → typed `BackupV3`.
- [ ] `src/components/preview/SectionContent.tsx` — 8× `(b as any)` (lines 434, 502-513). Fix `RenderBlock` type to be `ReportSubSection` with `items/isOrganigramme/id` properly typed instead of casting.
- [ ] `src/lib/ai.ts:154-155,391` — Gemini JSON `(i: any)` → `unknown` + `z.infer` or hand-rolled guard (no new dep needed).
- [ ] `src/lib/bgWorker.ts:3` — `self as any` → `typeof self` + `DedicatedWorkerGlobalScope` type.
- [ ] `src/pages/ParametresPage.tsx:138`, `useWorkspacePersistence.ts:160` — `backupPayload: any` → `ReturnType<typeof createBackupV3>`.

**Acceptance:** `grep -rn "as any" src/` < 5 (only worker + intentional), `tsc --noEmit` strict clean.

---

## Phase 3 — Deduplicate (2h, P1)

Two copy-paste duplications that will drift.

### 3A. `src/lib/reportDocument.ts` (492L)
`buildReportParts()` implements the same 7 sections twice (customSteps branch ~L163-318 vs official branch ~L320-430).

- [ ] Extract `buildSharedSections(rapport)` — build the 7 shared sections once
- [ ] Parameterise by `customSteps ?? WIZARD_STEPS` + `titleOverrides`
- [ ] Result: ~150 lines gone, one place to change section text

### 3B. Backup export (90% identical in 2 places)
- [ ] New `src/lib/exportBackup.ts` — `exportBackup(onStatus: (msg)=>void)`: `createBackupV3 → JSON.stringify → Capacitor Filesystem+Share / blob download`
- [ ] `ParametresPage.tsx` and `useWorkspacePersistence.ts` both call it. Delete ~90 duplicated lines.

**Acceptance:** `reportDocument.ts` < 350L, one `exportBackup` implementation.

---

## Phase 4 — Split the gods (3h, P1)

Targeted splits, not a big-bang refactor.

- [ ] `src/hooks/useWorkspaceSteps.ts` (542L, 30 closures) → 3 hooks:
  - `useCouvertureEntreprise.ts` (patchCouverture, patchEntreprise, patchOrganigramme)
  - `usePlanEditing.ts` (customSteps, moveBlock, add/remove section)
  - `usePreviewEdits.ts` (patchTextBlock, moveParagraph, etc.)
- [ ] `src/components/workspace/WorkspaceEditor.tsx` (221L, 26 props) — group props into typed objects: `couvertureHandlers`, `entrepriseHandlers`, `previewHandlers`. Pass object, not 26 args.
- [ ] `src/pages/WorkspacePage.tsx` (398L) — remove verbatim duplication of 13 props in split/non-split branches. Single `<WorkspaceEditor {...handlers} />`.
- [ ] `src/hooks/useWorkspacePersistence.ts` (243L) — split: `useAutosave.ts` (debounce + IndexedDB) / `useBackupExport.ts` (uses Phase 3B) / `usePdfExport.ts` (wraps `exportPdf.ts`).
- [ ] Decouple wrong-direction deps:
  - `storageV3.ts` imports `progressOf` from UI `data/sections.ts` → move `progressOf` to `lib/` or compute stored `progress` without UI rule
  - `ai.ts` imports `loadSettings` from `storage.ts` → inject `getApiKey: () => string` param instead

**Acceptance:** No file >400L in `hooks/` or `workspace/`. `WorkspaceEditor` props ≤ 5 groups.

---

## Phase 5 — Tests + CI (2h, P1)

The ADRs promise tests that don't exist. Make them real.

- [ ] `npm i -D vitest` + add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc -b"`
- [ ] Commit the 2 suites ADRs describe:
  - `src/lib/blockModel.test.ts` — 30 assertions (moveBlock edge cases)
  - `src/components/preview/pagination.test.ts` — 2000 randomised docs, whole-block rule
  - `src/lib/reportDocument.test.ts` — sommaire + page-break grouping (bonus, after Phase 3)
- [ ] `migrationTest.ts` → keep browser-console version only for manual QA, real tests live in `.test.ts`
- [ ] `.github/workflows/ci.yml` (10 lines): `npm ci && npm run typecheck && npm run lint && npm run test && npm run build`

**Acceptance:** `npm run test` green, CI badge possible.

---

## Phase 6 — Bundle perf (1h, P2)

Current: `dist/assets/index-*.js` 872kB (gzip 218kB), `bgWorker` 871kB, `ort-wasm-simd-threaded` 23.9MB.

- [ ] Dynamic-import heavy deps:
  - `import('@imgly/background-removal')` → only when user clicks "remove background"
  - `import('@google/genai')` → only when AI generate/search clicked
- [ ] `vite.config.ts` — add `manualChunks` for `vendor-ai`, `vendor-bg` + `chunkSizeWarningLimit` is *fixed*, not ignored
- [ ] Verify: main chunk < 400kB, bg/AI chunks lazy

**Acceptance:** Faster first paint, Vite warning gone. No behavior change.

---

## Phase 7 — Docs + hygiene (30 min, P2)

- [ ] Fix drift: README "12 étapes" → 14, `PRODUCT.md` "14 parties" ↔ `sections.ts` 14 entries (01-13 + 11b). Pick one wording, use everywhere.
- [ ] `PRODUCT.md` — add non-goals + scope boundary (currently 26L tone doc only)
- [ ] Track `knip.json` in git, add `"knip": "npx knip"` script. Fix 4 unused exports (`EditHandler, ReportEditPath, Sections, StepKind`) or mark intentional.
- [ ] `docs/superpowers/` — link from `ARCHITECTURE.md` as "Design history" or move out of repo. Don't leave orphaned agent scaffolding.
- [ ] `capacitor.config.ts` — README still says "change appId", but it's already `io.github.dane.rapportstage`. Update README.
- [ ] `.vscode/` — add `extensions.json` (Tailwind, TS) — optional polish

**Acceptance:** Docs match code. `npx knip` clean (or justified ignores).

---

## Phase 8 — God-component polish + release (P3) ✅

- Done: `SectionContent.tsx` 663 → 516L via `SectionShell.tsx` (BlockMoveControls, PartTitle, Removable); `NotesStep.tsx` 602 → 140L via `NoteFields.tsx` (FieldBox/Level3Box/FinalTextCard) + `useAiDraft.ts`
- Deferred deliberately: `OrgChart.tsx` (662L) + `FicheTechniqueStep.tsx` (612L) — internal splits need product decisions, no rush
- Deferred deliberately: `src/lib/` subfolders — 19 flat files is fine at this scale; reorg = ~40 import rewrites for no behavior gain
- Done: debug APK built `android/app/build/outputs/apk/debug/app-debug.apk` (54M, 28s, JDK 21) — release signing per `ANDROID_RELEASE.md` when needed

---

## Sequencing / dependencies

```
Phase 0 (safety)
  → Phase 1 (migration) ─┐
  → Phase 2 (types) ─────┴→ Phase 3 (dedup) → Phase 4 (gods)
  → Phase 5 (tests) — needs 2+3 done first to test clean code
  → Phase 6 (bundle) — independent, can go anytime after Phase 4
  → Phase 7 (docs) — last, documents final state
  → Phase 8 (polish) — opportunistic
```

## Verification after every phase

```bash
npm run typecheck   # tsc -b
npm run lint        # oxlint
npm run test        # vitest (after Phase 5)
npm run build       # vite build
```

## What NOT to do

- Don't rewrite in Rust/Go. No payoff for this use case.
- Don't add a backend/account system. Local-first is the product.
- Don't add Zustand/Redux now — prop drilling is fixed by Phase 4 grouping, not a store.
- Don't split components before deduping — you'd split the copy-paste.

## Effort estimate

| Phase | Time | Risk |
|---|---|---|
| 0 Safety | 0.5h | None |
| 1 Migration | 1-2h | Medium (data loss) |
| 2 Types | 1h | Low |
| 3 Dedup | 2h | Low |
| 4 Gods | 3h | Medium |
| 5 Tests+CI | 2h | Low |
| 6 Bundle | 1h | Low |
| 7 Docs | 0.5h | None |
| 8 Polish | ongoing | Low |
| **Total** | **~11h** | |
