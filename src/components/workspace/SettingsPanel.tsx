import type { Rapport, RapportStyle } from '../../types'

export function SettingsPanel({
  style,
  patchStyle,
  zoom,
  setZoom,
}: {
  style?: Rapport['style']
  patchStyle: (patch: Partial<RapportStyle>) => void
  zoom: number
  setZoom: (zoom: number) => void
}) {
  return (
            <div className="border-b border-line bg-cream/98 px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-4 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Couleur</label>
                    <input type="color" value={style?.primaryColor || '#2f5496'} onChange={(e) => patchStyle({ primaryColor: e.target.value })} className="h-8 w-full cursor-pointer rounded border border-line bg-transparent p-0.5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Alignement</label>
                    <select value={style?.textAlign || 'justify'} onChange={(e) => patchStyle({ textAlign: e.target.value as 'left' | 'center' | 'justify' })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value="left">Gauche</option>
                      <option value="center">Centré</option>
                      <option value="justify">Justifié</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Police titres</label>
                    <select value={style?.titleFont || 'Georgia, "Times New Roman", serif'} onChange={(e) => patchStyle({ titleFont: e.target.value })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value='Georgia, "Times New Roman", serif'>Georgia</option>
                      <option value='"Geist Sans", ui-sans-serif, system-ui, sans-serif'>Geist</option>
                      <option value='"Geist Mono", ui-monospace, monospace'>Mono</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Police texte</label>
                    <select value={style?.bodyFont || '"Geist Sans", ui-sans-serif, system-ui, sans-serif'} onChange={(e) => patchStyle({ bodyFont: e.target.value })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value='"Geist Sans", ui-sans-serif, system-ui, sans-serif'>Geist</option>
                      <option value='Georgia, "Times New Roman", serif'>Georgia</option>
                      <option value='"Geist Mono", ui-monospace, monospace'>Mono</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Taille titres</label>
                    <select value={style?.titleSize || 17} onChange={(e) => patchStyle({ titleSize: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      {[14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Sous-titres</label>
                    <select value={style?.subtitleSize || 14} onChange={(e) => patchStyle({ subtitleSize: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      {[11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Taille texte</label>
                    <select value={style?.bodySize || 13} onChange={(e) => patchStyle({ bodySize: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Interligne</label>
                    <select value={style?.lineSpacing || 1.85} onChange={(e) => patchStyle({ lineSpacing: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value={1}>Simple</option>
                      <option value={1.5}>1.5</option>
                      <option value={1.85}>1.85</option>
                      <option value={2}>Double</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Marges</label>
                    <select value={style?.margins || 'normal'} onChange={(e) => patchStyle({ margins: e.target.value as 'narrow' | 'normal' | 'wide' })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value="narrow">Étroites</option>
                      <option value="normal">Normales</option>
                      <option value="wide">Larges</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Ruban bleu : {style?.coverRibbonWidth ?? 104}px
                      </label>
                      {(style?.coverRibbonWidth ?? 104) !== 104 && (
                        <button
                          type="button"
                          onClick={() => patchStyle({ coverRibbonWidth: 104 })}
                          title="Réinitialiser à 104px"
                          className="text-[9px] text-muted hover:text-ink underline cursor-pointer"
                        >
                          Défaut
                        </button>
                      )}
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="140"
                      step="2"
                      value={style?.coverRibbonWidth ?? 104}
                      onChange={(e) => patchStyle({ coverRibbonWidth: Number(e.target.value) })}
                      className="h-8 w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Bandeau orange : {style?.coverBannerPadding ?? 16}px
                      </label>
                      {(style?.coverBannerPadding ?? 16) !== 16 && (
                        <button
                          type="button"
                          onClick={() => patchStyle({ coverBannerPadding: 16 })}
                          title="Réinitialiser à 16px"
                          className="text-[9px] text-muted hover:text-ink underline cursor-pointer"
                        >
                          Défaut
                        </button>
                      )}
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="28"
                      step="2"
                      value={style?.coverBannerPadding ?? 16}
                      onChange={(e) => patchStyle({ coverBannerPadding: Number(e.target.value) })}
                      className="h-8 w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex-col gap-1 hidden md:flex">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Zoom : {zoom}%</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="50" max="150" step="10" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom de l’aperçu" className="h-8 w-full" />
                      <button
                        type="button"
                        onClick={() => setZoom(100)}
                        disabled={zoom === 100}
                        title="Revenir à 100%"
                        className="shrink-0 rounded border border-line bg-paper px-1.5 text-[10px] text-muted hover:text-ink disabled:opacity-30"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                </div>
  )
}
