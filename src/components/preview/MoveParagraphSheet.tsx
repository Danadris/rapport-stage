import { X, ArrowUp, ArrowDown } from 'lucide-react'

export interface MoveSheetTarget {
  key: string
  label: string
}

export function MoveParagraphSheet({
  open,
  blockLabel,
  fromKey,
  targets,
  onPick,
  onClose,
}: {
  open: boolean
  blockLabel: string
  fromKey: string
  targets: MoveSheetTarget[]
  onPick: (toSection: string, position: 'start' | 'end') => void
  onClose: () => void
}) {
  if (!open) return null
  const others = targets.filter((t) => t.key !== fromKey)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Déplacer le paragraphe"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 print:hidden"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-paper shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Déplacer hors de la section</p>
            <p className="truncate text-[11px] text-faint">
              « {blockLabel} »
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-4 pt-3 text-[11px] leading-relaxed text-muted">
          Le texte suit le paragraphe — rien n'est perdu. Choisissez la section, puis le début ou la fin.
        </p>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {others.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-faint">
              Aucune autre section de texte disponible.
            </p>
          ) : (
            others.map((t) => (
              <div
                key={t.key}
                className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-cream"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{t.label}</span>
                <button
                  type="button"
                  onClick={() => onPick(t.key, 'start')}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12px] text-muted transition-colors hover:border-gold-deep/40 hover:text-ink"
                >
                  <ArrowUp size={13} />
                  Début
                </button>
                <button
                  type="button"
                  onClick={() => onPick(t.key, 'end')}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12px] text-muted transition-colors hover:border-gold-deep/40 hover:text-ink"
                >
                  <ArrowDown size={13} />
                  Fin
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-line bg-white py-2 text-[13px] text-muted hover:text-ink"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
