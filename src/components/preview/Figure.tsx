import { AlignCenter, AlignLeft, AlignRight, GripVertical, Layers, MoreHorizontal } from 'lucide-react'
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { SectionImage } from '../../types'

interface MoveTarget {
  sectionKey: string
  blockIndex: number
  label: string
}

interface FigureProps {
  img: SectionImage
  onUpdate?: (patch: Partial<SectionImage>) => void
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDragEnd?: (event: DragEvent<HTMLElement>) => void
  isDragging?: boolean
  moveTargets?: MoveTarget[]
  onMoveImage?: (toSection: string, toBlockIndex: number) => void
}

export function Figure({ img, onUpdate, onDragStart, onDragEnd, isDragging, moveTargets, onMoveImage }: FigureProps) {
  const sizeW = img.size === 'S' ? 190 : img.size === 'M' ? 280 : 420
  const sizeClass = img.size === 'S' ? 'w-[190px]' : img.size === 'M' ? 'w-[280px]' : 'w-[420px]'
  const [hovered, setHovered] = useState(false)
  // Explicit toggle so the toolbar is reachable by tap, not just mouse hover —
  // hover alone never fires reliably on touch devices.
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const figRef = useRef<HTMLElement>(null)
  const isFree = img.positioning === 'free'
  const toolbarVisible = hovered || toolbarOpen

  const dragActive = useRef(false)
  const dragOffset = useRef({ dx: 0, dy: 0 })
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null)

  // Pointer Events (not mouse events) so free-positioning drag also works with touch.
  const handleFreePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!onUpdate || !isFree || !figRef.current) return
    event.preventDefault()
    event.stopPropagation()

    const page = figRef.current.closest('.bg-white') as HTMLElement | null
    if (!page) return

    const pageRect = page.getBoundingClientRect()
    const scale = pageRect.width / 794
    const currentX = localPos?.x ?? img.x ?? 100
    const currentY = localPos?.y ?? img.y ?? 200

    dragActive.current = true
    dragOffset.current = {
      dx: (event.clientX - pageRect.left) / scale - currentX,
      dy: (event.clientY - pageRect.top) / scale - currentY,
    }

    const pointerId = event.pointerId
    const targetEl = event.currentTarget
    targetEl.setPointerCapture?.(pointerId)

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (!dragActive.current) return
      const currentPageRect = page.getBoundingClientRect()
      const currentScale = currentPageRect.width / 794
      const x = (moveEvent.clientX - currentPageRect.left) / currentScale
      const y = (moveEvent.clientY - currentPageRect.top) / currentScale

      setLocalPos({
        x: Math.round(Math.max(0, Math.min(794 - sizeW, x - dragOffset.current.dx))),
        y: Math.round(Math.max(0, y - dragOffset.current.dy)),
      })
    }

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      dragActive.current = false
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      targetEl.releasePointerCapture?.(pointerId)

      const currentPageRect = page.getBoundingClientRect()
      const currentScale = currentPageRect.width / 794
      const x = (upEvent.clientX - currentPageRect.left) / currentScale
      const y = (upEvent.clientY - currentPageRect.top) / currentScale

      onUpdate({
        x: Math.round(Math.max(0, Math.min(794 - sizeW, x - dragOffset.current.dx))),
        y: Math.round(Math.max(0, y - dragOffset.current.dy)),
      })
      setLocalPos(null)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }, [onUpdate, isFree, localPos?.x, localPos?.y, img.x, img.y, sizeW])

  const toggleFree = () => {
    if (!onUpdate) return

    if (isFree) {
      onUpdate({ positioning: 'flow' })
      return
    }

    let x = 100
    let y = 200
    if (figRef.current) {
      const page = figRef.current.closest('.bg-white') as HTMLElement | null
      if (page) {
        const pageRect = page.getBoundingClientRect()
        const figureRect = figRef.current.getBoundingClientRect()
        x = Math.max(0, figureRect.left - pageRect.left)
        y = Math.max(80, figureRect.top - pageRect.top)
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
      className={`absolute z-50 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors print:hidden ${
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
      className="absolute z-50 flex items-center gap-0.5 rounded-md border border-neutral-300 bg-white/95 px-1 py-1 shadow-md backdrop-blur-sm print:hidden"
      style={{ top: 8, right: 8 }}
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
          onClick={() => onUpdate({ size })}
          className={`h-7 rounded px-1.5 font-mono text-[11px] font-medium transition-colors ${
            img.size === size ? 'bg-blue-100 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
        >
          {size}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-neutral-300" />
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="hidden h-7 w-6 cursor-grab items-center justify-center text-neutral-400 hover:text-neutral-700 active:cursor-grabbing sm:flex"
        title="Déplacer vers une autre section (glisser)"
      >
        <GripVertical size={14} />
      </div>
      {moveTargets && moveTargets.length > 0 && onMoveImage && (
        <select
          value=""
          onChange={handleMoveSelect}
          title="Déplacer vers une autre section"
          className="h-7 max-w-[112px] rounded border border-neutral-300 bg-white px-1 text-[10px] text-neutral-600"
        >
          <option value="">Déplacer…</option>
          {moveTargets.map((t) => (
            <option key={`${t.sectionKey}::${t.blockIndex}`} value={`${t.sectionKey}::${t.blockIndex}`}>
              {t.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )

  if (isFree) {
    return (
      <figure
        ref={figRef as RefObject<HTMLElement>}
        className="absolute z-20 print:static print:relative"
        style={{
          left: localPos?.x ?? img.x ?? 100,
          top: localPos?.y ?? img.y ?? 200,
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
          />
        </div>
        {img.caption && (
          <figcaption className="mt-1.5 bg-white/80 text-center text-[11px] leading-snug text-neutral-500 italic">
            {img.caption}
          </figcaption>
        )}
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
      className={`${floatClass} ${sizeClass} relative print:static`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {toggleButton}
      {toolbar}
      <img
        src={img.dataUrl}
        alt={img.caption ?? ''}
        className={`w-full rounded-sm ${onUpdate ? 'ring-transparent transition-all hover:ring-2 hover:ring-blue-400/60' : ''}`}
      />
      {img.caption && (
        <figcaption className="mt-1.5 text-center text-[11px] leading-snug text-neutral-500 italic">
          {img.caption}
        </figcaption>
      )}
    </figure>
  )
}
