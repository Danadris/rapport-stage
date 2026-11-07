import { AlignCenter, AlignLeft, AlignRight, GripVertical, Layers, MoreHorizontal, RotateCw, FlipHorizontal, Trash2, ImagePlus, Type } from 'lucide-react'
import { useCallback, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { SectionImage } from '../../types'
import type { ParagraphDrag } from './paragraphDrag'
import { useAnchoredPanel } from '../../hooks/useAnchoredPanel'
import { clampFreePos, measureFreeBounds, useRescuedY, visibleCopySlice } from './freePlacement'
import type { MoveTarget } from './moveTargets'
import { readFileAsDataUrl } from '../../lib/imageRuntime'

/**
 * The caption under an image: an inline editor when the image is editable,
 * plain text when it is not. The floating figure and the flowed one show the
 * same caption, so it lives here once — only its backdrop differs (the free
 * figure floats over the page, the flowed one sits on the document).
 */
function FigureCaption({
  caption,
  open,
  onUpdate,
  className,
}: {
  caption?: string
  open: boolean
  onUpdate?: (patch: Partial<SectionImage>) => void
  className: string
}) {
  if (!caption && !open) return null
  return (
    <p className={className}>
      {onUpdate ? (
        <input
          type="text"
          defaultValue={caption ?? ''}
          placeholder="Ajouter une légende…"
          onBlur={(e) => onUpdate({ caption: e.target.value.trim() })}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-full bg-transparent text-center text-[11px] leading-snug text-neutral-500 italic outline-none placeholder:text-neutral-300"
        />
      ) : (
        caption
      )}
    </p>
  )
}

interface FigureProps {
  img: SectionImage
  onUpdate?: (patch: Partial<SectionImage>) => void
  isDragging?: boolean
  moveTargets?: MoveTarget[]
  onMoveImage?: (toSection: string, toBlockIndex: number) => void
  onRemove?: () => void
  /** The document's shared drag: an image moves with the same gesture as a paragraph. */
  drag?: ParagraphDrag
  /** Where the image was dropped, when the drag belongs to this image. */
  onImageDrop?: (target: { sectionKey: string; index: number }) => void
}

export function Figure({ img, onUpdate, isDragging, moveTargets, onMoveImage, onRemove, drag, onImageDrop }: FigureProps) {
  const sizeW = img.width ?? (img.size === 'S' ? 190 : img.size === 'M' ? 280 : 420)
  const [hovered, setHovered] = useState(false)
  // Explicit toggle so the toolbar is reachable by tap, not just mouse hover —
  // hover alone never fires reliably on touch devices.
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const figRef = useRef<HTMLElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isFree = img.positioning === 'free'
  const toolbarVisible = hovered || toolbarOpen
  const [widthText, setWidthText] = useState<string | null>(null)
  const [captionOpen, setCaptionOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  // The toolbar is one wide row anchored to a figure that may sit anywhere on
  // the page, including flush against an edge. Absolute placement inside the
  // figure keeps it out of the print pipeline and out of MeasuredPages'
  // per-window duplication; useAnchoredPanel then clamps it to the page box so
  // `overflow: hidden` can never cut it off.
  const toolbarStyle = useAnchoredPanel({ open: toolbarVisible, anchorRef: figRef, panelRef: toolbarRef })

  const imgTransform = [
    img.rotate ? `rotate(${img.rotate}deg)` : '',
    img.flip ? 'scaleX(-1)' : '',
  ].filter(Boolean).join(' ') || undefined

  const dragActive = useRef(false)
  const dragOffset = useRef({ dx: 0, dy: 0 })
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null)
  // A figure stored outside every page — what the pre-clamp drag could leave
  // behind — is rendered on no page at all: invisible, so it cannot be hovered,
  // opened or dragged back. Pull it onto the last page for display. Display
  // only: the stored position is rewritten by the next drag, never by this, so
  // nothing touches the document or the undo history on its own.
  const rescuedY = useRescuedY(figRef, () => {
      if (!isFree || localPos) return null
      const figure = figRef.current
      if (!figure) return null
      // The figure's own size counts (an image that decodes late, a caption that
      // opens, the width field), so the figure is observed for resizes and the
      // slice is read on each one instead of guessing when it goes stale.
      const slice = visibleCopySlice(figure)
      const pages = Number(figure.closest('[data-pages]')?.getAttribute('data-pages') ?? 1)
      const docH = pages * (slice ? slice.bottom - slice.top : 0)
      const figH = figure.offsetHeight
      const y = img.y ?? 200
      return y + figH <= 0 ? 0 : y >= docH ? Math.max(0, docH - figH) : null
    })
  const freeX = localPos?.x ?? img.x ?? 100
  const freeY = localPos?.y ?? rescuedY ?? img.y ?? 200

  // Pointer Events (not mouse events) so free-positioning drag also works with touch.
  const handleFreePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!onUpdate || !isFree || !figRef.current) return
    event.preventDefault()
    event.stopPropagation()

    const figure = figRef.current
    const page = (figure.closest('[data-doc-copy]') ?? figure.closest('.bg-white')) as HTMLElement | null
    if (!page) return

    const bounds = measureFreeBounds(figure, page)
    // Snapping happens on grab, not on drop: a figure left hanging off the page
    // comes back the moment it is touched, and the drag offset is measured from
    // where the figure actually is, so it never jumps under the pointer.
    const start = clampFreePos(freeX, freeY, bounds, sizeW)
    if (start.x !== freeX || start.y !== freeY) setLocalPos(start)

    const pageRect = page.getBoundingClientRect()
    const scale = pageRect.width / Math.max(1, page.clientWidth)

    dragActive.current = true
    dragOffset.current = {
      dx: (event.clientX - pageRect.left) / scale - start.x,
      dy: (event.clientY - pageRect.top) / scale - start.y,
    }

    const pointerId = event.pointerId
    const targetEl = event.currentTarget
    targetEl.setPointerCapture?.(pointerId)

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (!dragActive.current) return
      const currentPageRect = page.getBoundingClientRect()
      const currentScale = currentPageRect.width / Math.max(1, page.clientWidth)
      const x = (moveEvent.clientX - currentPageRect.left) / currentScale
      const y = (moveEvent.clientY - currentPageRect.top) / currentScale

      setLocalPos(clampFreePos(x - dragOffset.current.dx, y - dragOffset.current.dy, bounds, sizeW))
    }

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      dragActive.current = false
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      targetEl.releasePointerCapture?.(pointerId)

      const currentPageRect = page.getBoundingClientRect()
      const currentScale = currentPageRect.width / Math.max(1, page.clientWidth)
      const x = (upEvent.clientX - currentPageRect.left) / currentScale
      const y = (upEvent.clientY - currentPageRect.top) / currentScale

      const end = clampFreePos(x - dragOffset.current.dx, y - dragOffset.current.dy, bounds, sizeW)
      onUpdate({ x: end.x, y: end.y })
      setLocalPos(null)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }, [onUpdate, isFree, freeX, freeY, sizeW])

  const toggleFree = () => {
    if (!onUpdate) return

    if (isFree) {
      onUpdate({ positioning: 'flow' })
      return
    }

    // Free position starts where the flowed figure sits, pulled inside the page
    // so an image on the last line of a section never begins life off-page.
    let x = 100
    let y = 200
    const figure = figRef.current
    if (figure) {
      const page = (figure.closest('[data-doc-copy]') ?? figure.closest('.bg-white')) as HTMLElement | null
      if (page) {
        const pageRect = page.getBoundingClientRect()
        const figureRect = figure.getBoundingClientRect()
        const scale = pageRect.width / Math.max(1, page.clientWidth)
        const start = clampFreePos(
          (figureRect.left - pageRect.left) / scale,
          (figureRect.top - pageRect.top) / scale,
          measureFreeBounds(figure, page),
          sizeW,
        )
        x = start.x
        y = start.y
      }
    }
    onUpdate({ positioning: 'free', x, y })
  }

  const handleMoveSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    e.target.value = ''
    if (!val || !onMoveImage) return
    const sepIdx = val.indexOf('::')
    const sectionKey = val.slice(0, sepIdx)
    const blockIndex = Number(val.slice(sepIdx + 2))
    onMoveImage(sectionKey, blockIndex)
    setToolbarOpen(false)
  }

  // Always-visible affordance — replaces the old hover-only reveal, which left every
  // control below completely unreachable on touch screens (no hover state to trigger it).
  const toggleButton = onUpdate && (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setToolbarOpen((v) => !v) }}
      title="Options de l'image"
      className={`absolute z-50 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-colors print:hidden ${
        toolbarVisible
          ? 'border-blue-300 bg-blue-50 text-blue-600 opacity-100'
          : 'border-neutral-300 bg-white/85 text-neutral-500 opacity-70 hover:opacity-100'
      }`}
      style={{ top: 8, left: 8 }}
    >
      <MoreHorizontal size={14} />
    </button>
  )

  const toolbar = onUpdate && toolbarVisible && (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex flex-wrap items-center gap-0.5 rounded-md border border-neutral-300 bg-white/95 px-1 py-1 shadow-md backdrop-blur-sm print:hidden"
      style={toolbarStyle}
      onMouseEnter={() => setHovered(true)}
    >
      <button
        type="button"
        title={isFree ? 'Revenir au mode intégré (avec habillage du texte)' : 'Flotter au-dessus du texte (Mode libre)'}
        onClick={toggleFree}
        className={`flex h-7 w-7 items-center justify-center rounded text-[12px] transition-colors ${
          isFree ? 'bg-violet-100 text-violet-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
      >
        <Layers size={13} />
      </button>
      <span className="mx-1 h-4 w-px bg-neutral-300" />
      {!isFree &&
        ([
          ['left', AlignLeft, 'Gauche'] as const,
          ['center', AlignCenter, 'Centre'] as const,
          ['right', AlignRight, 'Droite'] as const,
        ]).map(([side, Icon, label]) => (
          <button
            key={side}
            type="button"
            title={label}
            onClick={() => onUpdate({ side })}
            className={`flex h-7 w-7 items-center justify-center rounded text-[12px] transition-colors ${
              img.side === side ? 'bg-blue-100 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <Icon size={13} />
          </button>
        ))}
      {!isFree && <span className="mx-1 h-4 w-px bg-neutral-300" />}
      {(['S', 'M', 'L'] as const).map((size) => (
        <button
          key={size}
          type="button"
          title={size === 'S' ? 'Petite' : size === 'M' ? 'Moyenne' : 'Grande'}
          onClick={() => onUpdate({ size, width: undefined })}
          className={`h-7 rounded px-1.5 font-mono text-[11px] font-medium transition-colors ${
            img.size === size && img.width === undefined ? 'bg-blue-100 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          {size}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-neutral-300" />
      <button
        type="button"
        onPointerDown={(e) => {
          if (!drag || !onImageDrop) return
          e.preventDefault()
          e.stopPropagation()
          e.currentTarget.setPointerCapture?.(e.pointerId)
          // The shared drag carries the image id, so the whole document knows
          // what is held — and the auto-scroll comes with it.
          drag.start(`image:${img.id}`, `image:${img.id}`, e.clientX, e.clientY)
        }}
        onPointerMove={(e) => drag?.move(e.clientX, e.clientY)}
        onPointerUp={() => {
          if (!drag || drag.drag?.blockKey !== `image:${img.id}`) return
          if (drag.drop && drag.drop.sectionKey !== `image:${img.id}`) {
            onImageDrop?.({ sectionKey: drag.drop.sectionKey, index: drag.drop.index })
          }
          drag.end()
        }}
        className="hidden h-7 w-6 touch-none cursor-grab items-center justify-center text-neutral-400 hover:text-neutral-700 active:cursor-grabbing sm:flex"
        title="Glisser pour déplacer l'image"
      >
        <GripVertical size={14} />
      </button>
      {moveTargets && moveTargets.length > 0 && onMoveImage && (
        <select
          value=""
          onChange={handleMoveSelect}
          title="Déplacer vers une autre section"
          className="h-8 w-32 max-w-none rounded border border-neutral-300 bg-white px-1 text-[11px] text-neutral-600 sm:h-7 sm:w-24"
        >
          <option value="">Déplacer…</option>
          {moveTargets.map((t) => (
            <option key={`${t.sectionKey}::${t.blockIndex}`} value={`${t.sectionKey}::${t.blockIndex}`}>
              {t.label}
            </option>
          ))}
        </select>
      )}
      <span className="mx-1 h-4 w-px bg-neutral-300" />
      <button
        type="button"
        title="Pivoter à 90°"
        onClick={() => onUpdate?.({ rotate: ((img.rotate ?? 0) + 90) % 360 })}
        className="flex h-7 w-7 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <RotateCw size={13} />
      </button>
      <button
        type="button"
        title="Miroir horizontal"
        onClick={() => onUpdate?.({ flip: !img.flip })}
        className={`flex h-7 w-7 items-center justify-center rounded ${img.flip ? 'bg-blue-100 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
      >
        <FlipHorizontal size={13} />
      </button>
      <button
        type="button"
        title="Remplacer l'image"
        onClick={() => fileRef.current?.click()}
        className="flex h-7 w-7 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <ImagePlus size={13} />
      </button>
      <button
        type="button"
        title="Légende"
        onClick={() => setCaptionOpen((v) => !v)}
        className={`flex h-7 w-7 items-center justify-center rounded ${img.caption || captionOpen ? 'bg-blue-100 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
      >
        <Type size={12} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f || !onUpdate) return
          void readFileAsDataUrl(f)
            .then((dataUrl) => onUpdate({ dataUrl }))
            .catch(() => {
              // A file the browser cannot read changes nothing.
            })
        }}
      />
      <span className="mx-1 h-4 w-px bg-neutral-300" />
      <input
        type="number"
        min={80}
        max={794}
        title="Largeur exacte (px), Entrée pour valider"
        value={widthText ?? sizeW}
        onChange={(e) => setWidthText(e.target.value)}
        onBlur={() => {
          if (widthText !== null) {
            const n = parseInt(widthText, 10)
            if (!Number.isNaN(n) && n >= 80 && n <= 794) onUpdate?.({ width: n })
          }
          setWidthText(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const n = parseInt(widthText ?? String(sizeW), 10)
            if (!Number.isNaN(n) && n >= 80 && n <= 794) onUpdate?.({ width: n })
            setWidthText(null)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className="h-7 w-14 rounded border border-neutral-300 bg-white px-1 font-mono text-[11px] text-neutral-600"
      />
      {onRemove && (
        <button
          type="button"
          title="Supprimer l'image"
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )

  if (isFree) {
    return (
      <figure
        ref={figRef as RefObject<HTMLElement>}
        className="absolute z-20 print:relative"
        style={{
          left: freeX,
          top: freeY,
          width: sizeW,
          opacity: isDragging ? 0.4 : 1,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {toggleButton}
        {toolbar}
        <div
          onPointerDown={handleFreePointerDown}
          className="cursor-move touch-none select-none"
          title="Glisser pour déplacer"
        >
          <img
            src={img.dataUrl}
            alt={img.caption ?? ''}
            className="w-full rounded-sm shadow-md ring-2 ring-violet-400/60"
            draggable={false}
            style={imgTransform ? { transform: imgTransform } : undefined}
          />
        </div>
        <FigureCaption
          caption={img.caption}
          open={captionOpen}
          onUpdate={onUpdate}
          className="mt-1.5 bg-white/80 text-center text-[11px] leading-snug text-neutral-500 italic"
        />
      </figure>
    )
  }

  const floatClass =
    img.side === 'center'
      ? 'my-4 mx-auto clear-both'
      : img.side === 'right'
        ? 'mb-3 mt-1 float-right ml-4'
        : 'mb-3 mt-1 float-left mr-4'

  return (
    <figure
      ref={figRef as RefObject<HTMLElement>}
      className={`${floatClass} relative print:static`}
      style={{ width: sizeW, opacity: isDragging ? 0.4 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {toggleButton}
      {toolbar}
      <img
        src={img.dataUrl}
        alt={img.caption ?? ''}
        className={`h-auto w-full rounded-sm ${onUpdate ? 'ring-transparent transition-all hover:ring-2 hover:ring-blue-400/60' : ''}`}
        style={imgTransform ? { transform: imgTransform } : undefined}
      />
      <FigureCaption
        caption={img.caption}
        open={captionOpen}
        onUpdate={onUpdate}
        className="mt-1.5 text-center text-[11px] leading-snug text-neutral-500 italic"
      />
    </figure>
  )
}
