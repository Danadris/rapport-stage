import { Page } from './Page'
import { TITLE_COLOR } from './tokens'
import type { SommaireEntry } from '../../lib/reportDocument'

function SommaireContent({ entries }: { entries: SommaireEntry[] }) {
  return (
    <>
      <h2 className="text-center text-[20px] font-bold" style={{ color: TITLE_COLOR }}>
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

export function Sommaire({ entries, startPageNum, headerLogo, ...rest }: {
  entries: SommaireEntry[]
  startPageNum?: number
  headerLogo?: string | null
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Page data-part="sommaire" startPageNum={startPageNum} headerLogo={headerLogo} {...rest}>
      <SommaireContent entries={entries} />
    </Page>
  )
}
