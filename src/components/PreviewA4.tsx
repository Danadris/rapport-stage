import { useEffect, useRef, useState, Fragment } from 'react'
import type { Rapport, SectionImage } from '../types'
import { usePageNumbers } from '../hooks/usePageNumbers'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { WIZARD_STEPS } from '../data/sections'
import {
  buildReportParts,
  buildSommaireEntries,
  formatPeriodeLabel,
  groupReportParts,
  isFicheTechniqueKey,
  MATERIEL_PART_KEY,
  type ReportPart,
} from '../lib/reportDocument'
import { useParagraphDrag } from './preview/paragraphDrag'
import { DOC_ACCENT, TEXT_SIZES } from '../lib/reportDocument'
import { IfmbpLogoContext, IFMBP_LOGO } from './preview/ifmbpLogo'
import { CoverPage } from './preview/CoverPage'
import { Page } from './preview/Page'
import { PartContent } from './preview/SectionContent'
import { computeMoveTargets } from './preview/moveTargets'
import { Sommaire } from './preview/Sommaire'
import { MaterielPage } from './preview/MaterielPage'
import { FicheTechniquePage } from './preview/FicheTechniquePage'
import type { PreviewActions } from './preview/actions'

export type { PreviewActions }

/**
 * The report, as one continuous document.
 *
 * This file is the assembler: it builds the parts, owns the document-wide state
 * (page numbers, the one paragraph drag, image drag) and hands each part to a
 * renderer. Everything else lives beside its own concern:
 *
 *   preview/Page.tsx        one A4 window, paginated like print
 *   preview/CoverPage.tsx   the cover, its furniture and its inline controls
 *   preview/SectionContent.tsx  a text section: paragraphs, images, org chart,
 *                           free paragraphs, reordering and moving across
 *   preview/Sommaire.tsx    the table of contents
 */
export function PreviewA4({ rapport, actions }: {
  rapport: Rapport
  actions: PreviewActions
}) {
  const c = rapport.couverture
  const parts = buildReportParts(rapport)
  const imagesBySection = rapport.images ?? {}
  const stackRef = useRef<HTMLDivElement>(null)
  const numbers = usePageNumbers(stackRef)
  // One drag for the whole document: a paragraph starts in one section and can
  // land in another, so neither section owns it.
  const paragraphDrag = useParagraphDrag()
  const { activeId: bgRemovingId, error: bgError, removeBackground } = useBackgroundRemoval()

  const [remerciements, ...mainParts] = parts
  const entries = buildSommaireEntries(parts, numbers)

  const [deletedTick, setDeletedTick] = useState<string | null>(null)
  useEffect(() => {
    if (!deletedTick) return
    const t = setTimeout(() => setDeletedTick(null), 6000)
    return () => clearTimeout(t)
  }, [deletedTick])

  const notifyDeleted = () => setDeletedTick(String(Date.now()))
  const wrappedActions: PreviewActions = {
    ...actions,
    onDeleted: notifyDeleted,
  }

  const marginsMap = { narrow: '56px', normal: '94px', wide: '120px' }
  const marginVal = marginsMap[rapport.style?.margins || 'normal']

  // A heading's colour is the accent unless the report picks its own for that
  // level — a document that never touches it keeps the single-colour look it has
  // always had.
  const accent = rapport.style?.primaryColor || DOC_ACCENT

  const styleVars = {
    '--doc-color': accent,
    '--doc-title-color': rapport.style?.titleColor || accent,
    '--doc-subtitle-color': rapport.style?.subtitleColor || accent,
    '--doc-title-font': rapport.style?.titleFont || 'Georgia, "Times New Roman", serif',
    '--doc-body-font': rapport.style?.bodyFont || '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
    '--doc-title-size': `${rapport.style?.titleSize || TEXT_SIZES.title.fallback}px`,
    '--doc-subtitle-size': `${rapport.style?.subtitleSize || TEXT_SIZES.subtitle.fallback}px`,
    '--doc-body-size': `${rapport.style?.bodySize || TEXT_SIZES.body.fallback}px`,
    '--doc-line-spacing': `${rapport.style?.lineSpacing || 1.85}`,
    '--doc-margins': marginVal,
    '--doc-text-align': rapport.style?.textAlign || 'justify',
  } as React.CSSProperties

  // Touch-friendly equivalent of the drag above — the grip handle's native HTML5
  // drag-and-drop never fires on touch devices, so this "Move to…" picker (a plain
  // <select>) calls the same underlying move directly, without needing dragState.
  const moveTargets = computeMoveTargets(parts)
  // Other sections a paragraph can be sent to — the picker's fallback for a drag
  // that needs a grip, a scroll and a release on a small screen.
  // Only sections that render their paragraphs from the plan's fields: the
  // others (presentation, activités, organigramme, fiches) have fixed content and
  // would swallow a paragraph without showing it.
  const textSteps = (rapport.customSteps ?? WIZARD_STEPS).filter((st) => st.kind === 'notes')
  const sectionTargets = textSteps.map((st) => {
    const part = parts.find((p) => p.key === st.id)
    return { key: st.id, label: part?.titre?.trim() || st.titre }
  })
  const moveImageToTarget = (imgId: string, fromSection: string, toSection: string, toBlockIndex: number) => {
    if (!actions.onImagesChange) return
    const fromImgs = imagesBySection[fromSection] ?? []
    const movedImg = fromImgs.find((i) => i.id === imgId)
    if (!movedImg) return
    const updatedImg = { ...movedImg, blockIndex: toBlockIndex }
    if (fromSection === toSection) {
      actions.onImagesChange(toSection, [...fromImgs.filter((i) => i.id !== imgId), updatedImg])
    } else {
      actions.onImagesChange(fromSection, fromImgs.filter((i) => i.id !== imgId))
      const toImgs = imagesBySection[toSection] ?? []
      actions.onImagesChange(toSection, [...toImgs, updatedImg])
    }
  }

  const makeImagesChange = (sectionId: string) =>
    actions.onImagesChange ? (imgs: SectionImage[]) => actions.onImagesChange!(sectionId, imgs) : undefined


  const groupedParts = groupReportParts(mainParts, rapport.pageBreaks)

  // Shared renderer used by every part, so editing (click-to-type, image drag, ...)
  // behaves identically wherever the part is shown.
  const partContent = (p: ReportPart) => (
    <PartContent
      part={p}
      images={imagesBySection[p.key] ?? []}
      onImagesChange={makeImagesChange(p.key)}
      actions={wrappedActions}
      organigramme={rapport.organigramme}
      organigrammes={rapport.organigrammes}
      primaryColor={rapport.style?.primaryColor}
      moveTargets={moveTargets}
      sectionTargets={sectionTargets}
      parts={parts}
      onMoveImage={moveImageToTarget}
      textBlocks={rapport.textBlocks?.[p.key] ?? []}
      blockOrder={rapport.blockOrder?.[p.key]}
      drag={paragraphDrag}
    />
  )

  // A report can replace the institute's logo from the cover page; the cover and
  // every page header then draw that one.
  const ifmbpLogo = rapport.style?.ifmbpLogo || IFMBP_LOGO

  // Continuous vertical document: page blocks stack top to bottom. Blocks grow
  // (min-height 1123) so no content is ever hidden or cut off on screen, while
  // print keeps exact A4 pagination. Page numbers come from the real block
  // heights, so the sommaire stays accurate.
  return (
    <IfmbpLogoContext.Provider value={ifmbpLogo}>
      <div ref={stackRef} style={styleVars} className="space-y-10 print:space-y-0">
        <CoverPage
          rapport={rapport}
          periodeLabel={formatPeriodeLabel(c.periodeNumero)}
          actions={wrappedActions}
        />
        <Page
          data-part="remerciements"
          startPageNum={numbers['remerciements'] ? numbers['remerciements'] : undefined}
          headerLogo={rapport.entreprise.logoDataUrl}
        >
          {partContent(remerciements)}
        </Page>
        <Sommaire
          entries={entries}
          startPageNum={numbers['sommaire'] ? numbers['sommaire'] : undefined}
          headerLogo={rapport.entreprise.logoDataUrl}
        />
        {groupedParts.map((group, groupIdx) => {
          // Fiches techniques always render standalone on their own page, even if
          // a (legacy) page-break flag merged them into a shared group.
          const materialParts = group.filter((p) => p.key === MATERIEL_PART_KEY)
          const fiches = group.filter((p) => isFicheTechniqueKey(p.key))
          const rest = group.filter((p) => !isFicheTechniqueKey(p.key) && p.key !== MATERIEL_PART_KEY)
          return (
            <Fragment key={groupIdx}>
              {rest.length > 0 && (
                <Page
                  data-part={rest[0].key}
                  startPageNum={numbers[rest[0].key] ? numbers[rest[0].key] : undefined}
                  headerLogo={rapport.entreprise.logoDataUrl}
                >
                  {rest.map((p, pIdx) => (
                    <div key={p.key} className={pIdx > 0 ? 'mt-16 pt-8 border-t border-neutral-100' : ''}>
                      {partContent(p)}
                    </div>
                  ))}
                </Page>
              )}
              {materialParts.length > 0 && (
                <MaterielPage
                  items={rapport.materiels ?? []}
                  startPageNum={numbers[MATERIEL_PART_KEY]}
                  headerLogo={rapport.entreprise.logoDataUrl}
                />
              )}
              {fiches.map((p) => {
                const fiche = (rapport.ficheTechniques ?? []).find((f) => `fiche-technique-${f.id}` === p.key)
                if (!fiche) return null
                const allFiches = (rapport.ficheTechniques ?? []).filter((f) => f.nom.trim() !== '')
                const ficheImages = imagesBySection[p.key] ?? []
                const currentPhoto = ficheImages[0]
                const replacePhoto = actions.onImagesChange
                  ? (dataUrl: string) => {
                      const nextPhoto: SectionImage = currentPhoto
                        ? { ...currentPhoto, dataUrl }
                        : { id: crypto.randomUUID(), dataUrl, side: 'right', size: 'M' }
                      actions.onImagesChange?.(p.key, [nextPhoto])
                    }
                  : undefined
                const removePhoto = actions.onImagesChange ? () => actions.onImagesChange?.(p.key, []) : undefined
                const removePhotoBg = currentPhoto && actions.onImagesChange
                  ? () => {
                      void removeBackground(currentPhoto.id, currentPhoto.dataUrl, (dataUrl) => {
                        actions.onImagesChange?.(p.key, [{ ...currentPhoto, dataUrl }])
                      })
                    }
                  : undefined
                return (
                  <div key={p.key}>
                    <FicheTechniquePage
                      fiche={fiche}
                      ficheIndex={allFiches.findIndex((f) => f.id === fiche.id)}
                      startPageNum={numbers[p.key]}
                      headerLogo={rapport.entreprise.logoDataUrl}
                      primaryColor={rapport.style?.primaryColor}
                      photoDataUrl={currentPhoto?.dataUrl}
                      photoSize={currentPhoto?.size}
                      onChange={actions.onFicheChange ? (patch) => actions.onFicheChange?.(fiche.id, patch) : undefined}
                      onPhotoChange={replacePhoto}
                      onPhotoRemove={removePhoto}
                      onPhotoRemoveBg={removePhotoBg}
                      bgRemoving={bgRemovingId === currentPhoto?.id}
                      bgError={bgRemovingId === currentPhoto?.id ? null : bgError}
                    />
                  </div>
                )
              })}
            </Fragment>
          )
        })}
      </div>
      {deletedTick && actions.onUndo && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-ink px-4 py-2.5 text-white shadow-lg print:hidden">
          <span className="text-[12px]">Élément supprimé.</span>
          <button
            type="button"
            onClick={() => { actions.onUndo?.(); setDeletedTick(null) }}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-white/20"
          >
            Annuler
          </button>
        </div>
      )}
    </IfmbpLogoContext.Provider>
  )
}
