import { useRef, useState, useLayoutEffect, Fragment } from 'react'
import type { FicheTechnique, MaterielItem, Rapport, SectionImage } from '../types'
import { usePageNumbers } from '../hooks/usePageNumbers'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { EditableText } from './preview/EditableText'
import { Figure } from './preview/Figure'
import {
  buildReportParts,
  buildSommaireEntries,
  formatPeriodeLabel,
  groupReportParts,
  isFicheTechniqueKey,
  MATERIEL_PART_KEY,
  type ReportPart,
  type ReportSubSection,
  type ReportSubSubSection,
  type SommaireEntry,
} from '../lib/reportDocument'

import logo from '../assets/ifmbp-logo-official.png'
import { OrgChart } from './preview/OrgChart'
import { FicheTechniquePage } from './preview/FicheTechniquePage'
import type { Organigramme } from '../types'

const INSTITUT_FR = 'Instituts de Formation aux Métiers de la Boulangerie et la Pâtisserie'
const INSTITUT_AR = 'مـعـهـد الـتـكـويـن فـي مهن الخبازة والحلويات بالدار البيضاء'
const BLEU = 'var(--doc-color)'

function MaterielPage({
  items,
  startPageNum,
  headerLogo,
}: {
  items: MaterielItem[]
  startPageNum?: number
  headerLogo?: string | null
}) {
  const visibleItems = items.filter((item) => item.nom.trim() || item.utilisation.trim() || item.imageDataUrl)
  const photoSize = (size?: 'S' | 'M' | 'L') =>
    ({ S: 'h-16 w-20', M: 'h-20 w-24', L: 'h-28 w-36' })[size ?? 'M']

  return (
    <Page data-part={MATERIEL_PART_KEY} startPageNum={startPageNum} headerLogo={headerLogo}>
      <h2 className="text-center font-bold" style={{ color: BLEU, fontSize: 'var(--doc-title-size)' }}>
        Matériel utilisé
      </h2>
      <div className="mt-8 border-t border-[#d8cdbc]">
        {visibleItems.map((item, i) => (
          <div key={item.id} className="flex items-center gap-5 border-b border-[#e5dac8] py-4">
            {item.imageDataUrl ? (
              <div className={`flex ${photoSize(item.size)} shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#d8cdbc] bg-[#fbf7ef]`}>
                <img src={item.imageDataUrl} alt={item.nom} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9bda8] bg-[#f6f0e5]">
                <span className="text-[13px] font-semibold text-[#8a765d]">{i + 1}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug text-[#2f2a24]">{item.nom || 'Matériel'}</p>
              {item.utilisation.trim() && (
                <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#5d4d3b]">
                  {item.utilisation}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Page>
  )
}

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  startPageNum?: number
  headerLogo?: string | null
}

function Page({ children, className, style, startPageNum, headerLogo, ...rest }: PageProps) {
  const [pages, setPages] = useState(1)
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(() => {
      if (ref.current) {
        setPages(Math.max(1, Math.ceil((ref.current.offsetHeight || 1123) / 1123)))
      }
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      {...rest}
      style={{ ...style, fontFamily: 'var(--doc-body-font)', paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
      className={`a4-page relative mx-auto flex min-h-[1123px] w-[794px] flex-col bg-white py-[80px] text-[#1f1d1a] shadow-[0_2px_16px_rgba(61,56,50,0.14)] print:shadow-none [&_h1,&_h2,&_h3]:!font-[family-name:var(--doc-title-font)] ${className ?? ''}`}
    >
      <div className="my-auto w-full">
        {children}
      </div>
      {startPageNum !== undefined &&
        Array.from({ length: pages }).map((_, i) => (
          <Fragment key={i}>
            <div
              className="absolute left-0 right-0 flex items-center justify-between"
              style={{ top: `${i * 1123 + 40}px`, paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
            >
              <img src={logo} alt="IFMBP" className="h-12 max-w-[150px] object-contain opacity-80" />
              {headerLogo ? (
                <img src={headerLogo} alt="Entreprise" className="h-12 max-w-[150px] object-contain opacity-80" />
              ) : <div />}
            </div>
            <div
              className="absolute left-0 right-0 text-center text-[12px] text-neutral-500"
              style={{ top: `${(i + 1) * 1123 - 40}px` }}
            >
              - {startPageNum + i} -
            </div>
          </Fragment>
        ))}
    </div>
  )
}

function CoverPage({ rapport, periodeLabel }: { rapport: Rapport; periodeLabel: string }) {
  const c = rapport.couverture
  const e = rapport.entreprise
  return (
    <div data-part="couverture" className="a4-page mx-auto flex h-[1123px] w-[794px] overflow-hidden bg-white text-[#1f1d1a] shadow-[0_2px_16px_rgba(61,56,50,0.14)] print:h-[297mm] print:w-[210mm] print:shadow-none [&_span]:!font-[family-name:var(--doc-title-font)] [&_p.text-\[16px\]]:!font-[family-name:var(--doc-title-font)]" style={{ fontFamily: 'var(--doc-body-font)' }}>
      <div className="flex w-[104px] shrink-0 items-center justify-center bg-[#4472c4]">
        <span className="block rotate-180 whitespace-nowrap text-[48px] font-bold tracking-wide text-white [writing-mode:vertical-rl]">
          Rapport de stage : {periodeLabel}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-10 pt-9">
        <div className="flex items-start justify-between gap-6">
          <img src={logo} alt="IFMBP" className="h-20 w-auto object-contain" />
          <div className={`flex h-[88px] w-[128px] shrink-0 items-center justify-center bg-white ${e.logoDataUrl ? '' : 'border-[3px] border-[#4472c4] p-1.5'}`}>
            {e.logoDataUrl ? (
              <img src={e.logoDataUrl} alt="Logo entreprise" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[10px] text-neutral-400">Logo entreprise</span>
            )}
          </div>
        </div>

        <div className="mt-auto border border-neutral-700 px-6 py-3 text-center">
          <p className="text-[11px] font-bold leading-snug">{INSTITUT_FR}</p>
          <p dir="rtl" lang="ar" className="mt-1 text-[16px] font-bold leading-relaxed">
            {INSTITUT_AR}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-5">
          <div className="text-center">
            <p className="text-[13.5px]">Objectif de stage :</p>
            <p className="mt-1 text-[13.5px] font-semibold">{c.objectifStage || '…'}</p>
          </div>

          <div className="text-center">
            <p className="text-[13.5px]">Période de stage :</p>
            <p className="mt-1 text-[13.5px] font-semibold">
              {c.periodeDebut ? `du ${new Date(c.periodeDebut).toLocaleDateString('fr-FR')}` : 'du …'} au{' '}
              {c.periodeFin ? new Date(c.periodeFin).toLocaleDateString('fr-FR') : '…'}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[13.5px]">Entreprise d'accueil :</p>
            <p className="mt-1 text-[13.5px] font-semibold">{e.nom || 'Nom de lentreprise'}</p>
          </div>
        </div>

        <div className={`mt-auto mb-6 flex h-[270px] shrink-0 items-center justify-center bg-white ${c.photoActivite ? '' : 'border-[3px] border-[#4472c4] p-1.5'}`}>
          {c.photoActivite ? (
            <img
              src={c.photoActivite}
              alt="Photo de l'entreprise"
              className={
                (c.photoActiviteFit ?? 'contain') === 'cover'
                  ? 'h-full w-full object-cover'
                  : 'max-h-full max-w-full object-contain'
              }
            />
          ) : (
            <span className="text-xs text-neutral-400">Photo de l'activité de l'entreprise</span>
          )}
        </div>

        <div className="-mx-10 bg-[#ed7d31] px-10 py-6 text-white">
          <p className="text-center text-[14px] font-semibold">Rapport réalisé par :</p>
          <p className="mt-1.5 text-center text-[14px] font-bold">{c.nomStagiaire || 'Nom et prénom'}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-8">
            <div>
              <p className="text-[13.5px] font-semibold">Tuteur pédagogique :</p>
              <p className="mt-1 text-[13.5px] font-bold">{c.tuteurPedagogique || 'Nom et prénom'}</p>
            </div>
            <div>
              <p className="text-[13.5px] font-semibold">Tuteur industriel :</p>
              <p className="mt-1 text-[13.5px] font-bold">{c.tuteurIndustriel || 'Nom et prénom'}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[13.5px] font-semibold">
              Membre de jury{c.membresJury.length > 0 ? ` : ${c.membresJury.length}` : ' :'}
            </p>
            {c.membresJury.length > 0 ? (
              c.membresJury.map((m) => (
                <p key={m} className="mt-1 text-[13.5px]">
                  {m}
                </p>
              ))
            ) : (
              <p className="mt-1 text-[13.5px]">M. XXXXXXX / Mme XXXXXXX</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type EditHandler = (source: 'entreprise' | 'section', field: string, value: string) => void

// Drag state shared across all sections — stored in a ref passed down
interface DragState {
  imgId: string
  fromSection: string
}

// A place an image can be moved to — used by the touch-friendly "Move to…" picker,
// which is the fallback for the native drag-and-drop grip handle (that never fires on touch).
interface MoveTarget {
  sectionKey: string
  blockIndex: number
  label: string
}

function computeMoveTargets(parts: ReportPart[]): MoveTarget[] {
  const targets: MoveTarget[] = []
  for (const part of parts) {
    if (part.key === 'organigramme' || part.isOrganigramme) continue
    const blockTitles: (string | undefined)[] = []
    if (part.paragraphes && part.paragraphes.length > 0) blockTitles.push(undefined)
    for (const ss of part.sousSections ?? []) blockTitles.push(ss.titre)
    if (blockTitles.length === 0) blockTitles.push(undefined)
    const sectionLabel = part.titre && part.titre.trim() !== '' ? part.titre : part.key
    blockTitles.forEach((t, bi) => {
      const label = t && t.trim() !== '' ? `${sectionLabel} — ${t}` : sectionLabel
      targets.push({ sectionKey: part.key, blockIndex: bi, label })
    })
  }
  return targets
}

function PartContent({ part, images, onEdit, onImagesChange, onCrossMove, dragState, setDragState, onDragEnd, organigramme, organigrammes, primaryColor, moveTargets, onMoveImage }: { 
  part: ReportPart
  images: SectionImage[]
  onEdit?: EditHandler
  onImagesChange?: (imgs: SectionImage[]) => void
  onCrossMove?: (targetBlockIndex: number) => void
  dragState?: DragState | null
  setDragState?: (state: DragState | null) => void
  onDragEnd?: () => void
  organigramme?: Organigramme
  organigrammes?: Record<string, Organigramme>
  primaryColor?: string
  moveTargets?: MoveTarget[]
  onMoveImage?: (imgId: string, fromSection: string, toSection: string, toBlockIndex: number) => void
}) {
  const [dropOverBlock, setDropOverBlock] = useState<number | null>(null)

  const getOrg = (key?: string) => {
    if (key && organigrammes?.[key]?.nodes?.length) return organigrammes[key]
    if (part.key && organigrammes?.[part.key]?.nodes?.length) return organigrammes[part.key]
    return organigramme
  }

  if (part.key === 'organigramme' || part.isOrganigramme) {
    const orgData = getOrg(part.key)
    return (
      <div data-part-content={part.key}>
        {part.titre && part.titre.trim() !== '' && (
          <h2 className="text-center font-bold" style={{ color: BLEU, fontSize: 'var(--doc-title-size)' }}>
            {part.titre}
          </h2>
        )}
        <div className="mt-8">
          <OrgChart nodes={orgData?.nodes ?? []} primaryColor={primaryColor} />
        </div>
      </div>
    )
  }

  type RenderBlock = Partial<ReportSubSection> & { paragraphes?: string[] }

  const blocks: RenderBlock[] = []
  if (part.paragraphes && part.paragraphes.length > 0) blocks.push({ paragraphes: part.paragraphes })
  for (const ss of part.sousSections ?? []) blocks.push(ss)

  const hasContent = blocks.some(
    (b) =>
      (b.paragraphes !== undefined && b.paragraphes.length > 0) ||
      (b.texte !== undefined && b.texte.trim() !== '') ||
      b.isOrganigramme ||
      (b.items?.some((item) => item.texte.trim() !== '' || item.isOrganigramme) ?? false),
  )

  const handleParagraphsSave = (newText: string) => {
    if (!onEdit || !part.editPath) return
    const { stepId, fieldIds } = part.editPath
    onEdit('section', `${stepId}:${fieldIds[0]}`, newText)
  }


  const handleUpdate = (id: string, patch: Partial<SectionImage>) => {
    if (!onImagesChange) return
    onImagesChange(images.map((img) => (img.id === id ? { ...img, ...patch } : img)))
  }

  const handleImgDragStart = (e: React.DragEvent, imgId: string) => {
    setDragState?.({ imgId, fromSection: part.key })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleImgDragEnd = () => onDragEnd?.()

  const handleDropOnBlock = (e: React.DragEvent, bi: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDropOverBlock(null)
    if (!dragState) return
    const { imgId, fromSection } = dragState
    if (fromSection === part.key) {
      if (!onImagesChange) return
      const moved = images.find((i) => i.id === imgId)
      if (!moved) return
      const otherImages = images.filter((i) => i.id !== imgId)
      onImagesChange([...otherImages, { ...moved, blockIndex: bi }])
      setDragState?.(null)
    } else {
      onCrossMove?.(bi)
    }
  }

  return (
    <div data-part-content={part.key}>
      {/* Level 1: unnumbered — omit entirely if empty */}
      {part.titre && part.titre.trim() !== '' && (
        <h2 className="text-center font-bold" style={{ color: BLEU, fontSize: 'var(--doc-title-size)' }}>
          {part.titre}
        </h2>
      )}
      <div className="mt-5">
        {blocks.map((b, bi) => {
          // If blockIndex is undefined, we assume it's attached to the block matching its array index (for backward compatibility)
          const blockImages = images.filter((img) => (img.blockIndex ?? images.indexOf(img)) === bi)
          const blockItems = (b as any).items as ReportSubSubSection[] | undefined

          return (
            <div
              key={bi}
              className={bi > 0 ? 'mt-7' : ''}
              onDragOver={(e) => { if (dragState) { e.preventDefault(); setDropOverBlock(bi) } }}
              onDragLeave={() => setDropOverBlock(null)}
              onDrop={(e) => handleDropOnBlock(e, bi)}
              style={dropOverBlock === bi ? { outline: '2px dashed #3b82f6', outlineOffset: '4px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.03)' } : { padding: '2px 0' }}
            >
              {/* Level 2: numbered (1., 2., ...) — omit entirely if empty */}
              {b.titre && b.titre.trim() !== '' && (
                <h3 className="font-semibold" style={{ color: BLEU, fontSize: 'var(--doc-subtitle-size)' }}>
                  {(b as any).numero !== undefined ? `${(b as any).numero}. ${b.titre}` : b.titre}
                </h3>
              )}
              {(b as any).isOrganigramme ? (
                <div className="mt-4">
                  <OrgChart nodes={getOrg((b as any).id)?.nodes ?? []} primaryColor={primaryColor} />
                </div>
              ) : (
                <div className="flow-root">
                  {blockImages.map((img) => (
                    <Figure
                      key={img.id}
                      img={img}
                      onUpdate={onImagesChange ? (patch) => handleUpdate(img.id, patch) : undefined}
                      onDragStart={(e) => handleImgDragStart(e, img.id)}
                      onDragEnd={handleImgDragEnd}
                      isDragging={dragState?.imgId === img.id}
                      moveTargets={moveTargets}
                      onMoveImage={onMoveImage ? (toSection, toBlockIndex) => onMoveImage(img.id, part.key, toSection, toBlockIndex) : undefined}
                    />
                  ))}
                  {b.paragraphes ? (
                    <div className="space-y-3.5" style={{ fontSize: 'var(--doc-body-size)', lineHeight: 'var(--doc-line-spacing)', textAlign: 'var(--doc-text-align)' as any }}>
                      <EditableText
                        text={b.paragraphes.join('\n\n')}
                        placeholder="Cliquez ici pour rédiger..."
                        onSave={onEdit ? handleParagraphsSave : undefined}
                        className="whitespace-pre-wrap"
                      />
                    </div>
                  ) : b.texte && b.texte.trim() !== '' ? (
                    <EditableText
                      text={b.texte}
                      placeholder="Cliquez ici pour rédiger..."
                      onSave={onEdit && b.editPath ? (v) => onEdit(b.editPath!.source, b.editPath!.field, v) : undefined}
                      className={`${b.titre && b.titre.trim() !== '' ? 'mt-2.5' : ''} whitespace-pre-wrap`}
                      style={{ fontSize: 'var(--doc-body-size)', lineHeight: 'var(--doc-line-spacing)', textAlign: 'var(--doc-text-align)' as any }}
                    />
                  ) : onEdit && b.editPath ? (
                    <EditableText
                      text=""
                      placeholder="Cliquez ici pour rédiger..."
                      onSave={(v) => onEdit(b.editPath!.source, b.editPath!.field, v)}
                      className="mt-2"
                      style={{ fontSize: 'var(--doc-body-size)' }}
                    />
                  ) : null}
                </div>
              )}

              {/* Level 3: a/, b/, c/ — omit heading if title empty */}
              {blockItems && blockItems.length > 0 && (
                <div className="mt-4 space-y-4">
                  {blockItems.map((item) => (
                    <div key={item.id} className="pl-4 border-l-2 border-line/40">
                      {/* Level 3 heading: "a/ Titre" — omit if titre is empty */}
                      {item.titre && item.titre.trim() !== '' && (
                        <h4
                          className="font-semibold text-ink"
                          style={{ fontSize: 'var(--doc-body-size)', fontFamily: 'var(--doc-title-font)' }}
                        >
                          <span style={{ color: BLEU, marginRight: '0.375rem' }}>{item.prefix || 'a/'}</span>
                          {item.titre}
                        </h4>
                      )}
                      {item.isOrganigramme ? (
                        <div className="mt-2">
                          <OrgChart nodes={getOrg(item.id)?.nodes ?? []} primaryColor={primaryColor} />
                        </div>
                      ) : (
                        item.texte && item.texte.trim() !== '' ? (
                          <EditableText
                            text={item.texte}
                            placeholder="Cliquez ici pour rédiger..."
                            onSave={onEdit && item.editPath ? (v) => onEdit(item.editPath!.source, item.editPath!.field, v) : undefined}
                            className={`${item.titre && item.titre.trim() !== '' ? 'mt-1.5' : ''} whitespace-pre-wrap`}
                            style={{ fontSize: 'var(--doc-body-size)', lineHeight: 'var(--doc-line-spacing)', textAlign: 'var(--doc-text-align)' as any }}
                          />
                        ) : onEdit && item.editPath ? (
                          <EditableText
                            text=""
                            placeholder="Cliquez ici pour rédiger..."
                            onSave={(v) => onEdit(item.editPath!.source, item.editPath!.field, v)}
                            className="mt-1"
                            style={{ fontSize: 'var(--doc-body-size)' }}
                          />
                        ) : null
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {images.slice(Math.max(1, blocks.length)).map((img) => (
          <Figure
            key={img.id}
            img={{ ...img, side: img.side ?? 'center' }}
            onUpdate={onImagesChange ? (patch) => handleUpdate(img.id, patch) : undefined}
            onDragStart={(e) => handleImgDragStart(e, img.id)}
            onDragEnd={handleImgDragEnd}
            isDragging={dragState?.imgId === img.id}
            moveTargets={moveTargets}
            onMoveImage={onMoveImage ? (toSection, toBlockIndex) => onMoveImage(img.id, part.key, toSection, toBlockIndex) : undefined}
          />
        ))}
      </div>
      {!hasContent && part.sousSections && part.sousSections.length === 0 && (
        <div className="mt-8 text-center text-sm italic text-neutral-400">Section vide</div>
      )}
    </div>
  )
}

function SommaireContent({ entries }: { entries: SommaireEntry[] }) {
  return (
    <>
      <h2 className="text-center text-[20px] font-bold" style={{ color: BLEU }}>
        Sommaire
      </h2>
      <div className="mx-auto mt-10 max-w-[470px] space-y-2">
        {entries.map((e) => (
          <div key={`${e.label}-${e.sub ? 's' : 'm'}`} className={`flex items-baseline gap-2 ${e.sub ? 'pl-7' : ''}`}>
            <span
              className={`whitespace-nowrap ${
                e.sub ? 'text-[12.5px] text-neutral-500' : 'text-[13px] font-semibold'
              }`}
            >
              {e.label}
            </span>
            <span className="grow border-b border-dotted border-neutral-400" />
            <span className="font-mono text-[12px] text-neutral-500">{e.page ?? '—'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Sommaire({ entries, startPageNum, headerLogo, ...rest }: { entries: SommaireEntry[]; startPageNum?: number; headerLogo?: string | null } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Page data-part="sommaire" startPageNum={startPageNum} headerLogo={headerLogo} {...rest}>
      <SommaireContent entries={entries} />
    </Page>
  )
}

export function PreviewA4({
  rapport,
  onEdit,
  onImagesChange,
  onFicheChange,
}: {
  rapport: Rapport
  onEdit?: EditHandler
  onImagesChange?: (sectionId: string, imgs: SectionImage[]) => void
  onFicheChange?: (ficheId: string, patch: Partial<FicheTechnique>) => void
}) {
  const c = rapport.couverture
  const parts = buildReportParts(rapport)
  const imagesBySection = rapport.images ?? {}
  const stackRef = useRef<HTMLDivElement>(null)
  const numbers = usePageNumbers(stackRef)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const { activeId: bgRemovingId, error: bgError, removeBackground } = useBackgroundRemoval()

  const [remerciements, ...mainParts] = parts
  const entries = buildSommaireEntries(parts, numbers)

  const marginsMap = { narrow: '56px', normal: '94px', wide: '120px' }
  const marginVal = marginsMap[rapport.style?.margins || 'normal']

  const styleVars = {
    '--doc-color': rapport.style?.primaryColor || '#2f5496',
    '--doc-title-font': rapport.style?.titleFont || 'Georgia, "Times New Roman", serif',
    '--doc-body-font': rapport.style?.bodyFont || '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
    '--doc-title-size': `${rapport.style?.titleSize || 17}px`,
    '--doc-subtitle-size': `${rapport.style?.subtitleSize || 14}px`,
    '--doc-body-size': `${rapport.style?.bodySize || 13}px`,
    '--doc-line-spacing': `${rapport.style?.lineSpacing || 1.85}`,
    '--doc-margins': marginVal,
    '--doc-text-align': rapport.style?.textAlign || 'justify',
  } as React.CSSProperties

  // Cross-section image move: called by PartPage when a drag from another section is dropped here
  const handleCrossMove = (toSection: string, targetBlockIndex: number) => {
    if (!dragState || !onImagesChange) return
    const { imgId, fromSection } = dragState
    if (fromSection === toSection) return
    const fromImgs = imagesBySection[fromSection] ?? []
    const movedImg = fromImgs.find((i) => i.id === imgId)
    if (!movedImg) return
    onImagesChange(fromSection, fromImgs.filter((i) => i.id !== imgId))
    const toImgs = imagesBySection[toSection] ?? []
    const updatedImg = { ...movedImg, blockIndex: targetBlockIndex }
    onImagesChange(toSection, [...toImgs, updatedImg])
    setDragState(null)
  }

  // Touch-friendly equivalent of the drag above — the grip handle's native HTML5
  // drag-and-drop never fires on touch devices, so this "Move to…" picker (a plain
  // <select>) calls the same underlying move directly, without needing dragState.
  const moveTargets = computeMoveTargets(parts)
  const moveImageToTarget = (imgId: string, fromSection: string, toSection: string, toBlockIndex: number) => {
    if (!onImagesChange) return
    const fromImgs = imagesBySection[fromSection] ?? []
    const movedImg = fromImgs.find((i) => i.id === imgId)
    if (!movedImg) return
    const updatedImg = { ...movedImg, blockIndex: toBlockIndex }
    if (fromSection === toSection) {
      onImagesChange(toSection, [...fromImgs.filter((i) => i.id !== imgId), updatedImg])
    } else {
      onImagesChange(fromSection, fromImgs.filter((i) => i.id !== imgId))
      const toImgs = imagesBySection[toSection] ?? []
      onImagesChange(toSection, [...toImgs, updatedImg])
    }
  }

  const makeImagesChange = (sectionId: string) =>
    onImagesChange ? (imgs: SectionImage[]) => onImagesChange(sectionId, imgs) : undefined

  const makeOnDragEnd = () => setDragState(null)

  const groupedParts = groupReportParts(mainParts, rapport.pageBreaks)

  // Shared renderer used by every part, so editing (click-to-type, image drag, ...)
  // behaves identically wherever the part is shown.
  const partContent = (p: ReportPart) => (
    <PartContent
      part={p}
      images={imagesBySection[p.key] ?? []}
      onEdit={onEdit}
      onImagesChange={makeImagesChange(p.key)}
      onCrossMove={(bi) => handleCrossMove(p.key, bi)}
      dragState={dragState}
      setDragState={setDragState}
      onDragEnd={makeOnDragEnd}
      organigramme={rapport.organigramme}
      organigrammes={rapport.organigrammes}
      primaryColor={rapport.style?.primaryColor}
      moveTargets={moveTargets}
      onMoveImage={moveImageToTarget}
    />
  )

  return (
    // Continuous vertical document: page blocks stack top to bottom. Blocks grow
    // (min-height 1123) so no content is ever hidden or cut off on screen, while
    // print keeps exact A4 pagination. Page numbers come from the real block
    // heights, so the sommaire stays accurate.
    <div ref={stackRef} style={styleVars} className="space-y-10 print:space-y-0">
      <CoverPage rapport={rapport} periodeLabel={formatPeriodeLabel(c.periodeNumero)} />
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
              const replacePhoto = onImagesChange
                ? (dataUrl: string) => {
                    const nextPhoto: SectionImage = currentPhoto
                      ? { ...currentPhoto, dataUrl }
                      : { id: crypto.randomUUID(), dataUrl, side: 'right', size: 'M' }
                    onImagesChange(p.key, [nextPhoto])
                  }
                : undefined
              const removePhoto = onImagesChange ? () => onImagesChange(p.key, []) : undefined
              const removePhotoBg = currentPhoto && onImagesChange
                ? () => {
                    void removeBackground(currentPhoto.id, currentPhoto.dataUrl, (dataUrl) => {
                      onImagesChange(p.key, [{ ...currentPhoto, dataUrl }])
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
                    onChange={onFicheChange ? (patch) => onFicheChange(fiche.id, patch) : undefined}
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
  )
}
