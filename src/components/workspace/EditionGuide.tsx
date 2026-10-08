import { Info, X } from 'lucide-react'
import { useState } from 'react'

export function EditionGuide() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('rapport-stage-guide-dismissed') === '1'
    } catch {
      return false
    }
  })
  if (hidden) return null
  return (
    <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-gold/30 bg-gold-soft/40 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Info size={16} className="mt-0.5 shrink-0 text-gold-deep" />
        <div className="text-[13px] leading-snug text-muted">
          <p className="text-ink font-semibold">Trois étapes pour chaque section :</p>
          <ol className="mt-1 list-inside list-decimal">
            <li>Remplissez vos notes (petit lexique, exemples proposés).</li>
            <li>Utilisez <strong>Rédiger (IA)</strong> ou composez directement le texte final.</li>
            <li>Vérifiez le rendu dans l'<strong>Aperçu</strong> avant d'exporter le PDF.</li>
          </ol>
        </div>
      </div>
      <button
        aria-label="Fermer ce guide"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-faint hover:text-ink active:text-ink"
        onClick={() => {
          setHidden(true)
          try { localStorage.setItem('rapport-stage-guide-dismissed', '1') } catch {}
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
