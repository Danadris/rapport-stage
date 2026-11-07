import type { MaterielItem } from '../../types'
import { Page } from './Page'
import { MATERIEL_PART_KEY } from '../../lib/reportDocument'
import { TITLE_COLOR } from './tokens'

export function MaterielPage({
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
      <h2 className="text-center font-bold" style={{ color: TITLE_COLOR, fontSize: 'var(--doc-title-size)' }}>
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
