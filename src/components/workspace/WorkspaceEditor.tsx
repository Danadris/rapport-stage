import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '../ui'
import { CouvertureStep } from '../steps/CouvertureStep'
import { EntrepriseStep } from '../steps/EntrepriseStep'
import { EntrepriseFieldsStep, type EntFieldDef } from '../steps/EntrepriseFieldsStep'
import { OrganigrammeStep } from '../steps/OrganigrammeStep'
import { FicheTechniqueStep } from '../steps/FicheTechniqueStep'
import { NotesStep } from '../steps/NotesStep'
import { cx } from '../../lib/cx'
import { EditionGuide } from './EditionGuide'
import type { Entreprise, FicheTechnique, MaterielItem, Organigramme, Rapport, SectionImage, WizardStep } from '../../types'

const PRESENTATION_FIELDS: EntFieldDef[] = [
  { key: 'organismeAccueil', label: "Organisme d'accueil", placeholder: "Nature de l'établissement, effectif…" },
  { key: 'historique', label: "Historique de l'entreprise", placeholder: 'Fondation, évolution, repères marquants…', long: true },
  { key: 'secteurActivite', label: "Secteur d'activité", placeholder: 'Boulangerie-pâtisserie artisanale…' },
  { key: 'missionsValeurs', label: 'Missions et valeurs', placeholder: "Savoir-faire, engagement qualité, esprit d'équipe…", long: true },
]
const ACTIVITES_FIELDS: EntFieldDef[] = [
  { key: 'activitesPrincipales', label: 'Activités principales', placeholder: 'Pains courants, viennoiserie, commandes spéciales…', long: true },
  { key: 'equipements', label: 'Équipements utilisés', placeholder: 'Fours, pétrins, chambres de fermentation…', long: true },
  { key: 'technologies', label: 'Technologies employées', placeholder: 'HACCP, gestion des commandes…' },
]

export function WorkspaceEditor({
  rapport,
  step,
  prev,
  next,
  setStepId,
  setRapportWithHistory,
  patchCouverture,
  patchEntreprise,
  patchOrganigramme,
  patchFicheTechniques,
  patchMateriels,
  setFicheImages,
  setNote,
  setGeneratedNote,
  setImages,
  handleToggleStepKind,
  handleFieldOrganigrammeChange,
  handleToggleFieldMode,
  handleAddSubSection,
  handleDeleteSubSection,
  handleRenameSubSection,
  handleAddLevel3Item,
  handleDeleteLevel3Item,
  clearSection,
}: {
  rapport: Rapport
  step: WizardStep
  prev?: WizardStep
  next?: WizardStep
  setStepId: (id: string) => void
  setRapportWithHistory: (updater: Rapport | ((prev: Rapport | null) => Rapport | null), options?: { isTextKeystroke?: boolean }) => void
  patchCouverture: (patch: Partial<Rapport['couverture']>) => void
  patchEntreprise: (patch: Partial<Entreprise>) => void
  patchOrganigramme: (organigramme: Organigramme, key?: string) => void
  patchFicheTechniques: (fiches: FicheTechnique[]) => void
  patchMateriels: (materiels: MaterielItem[]) => void
  setFicheImages: (ficheId: string, imgs: SectionImage[]) => void
  setNote: (fieldId: string, value: string) => void
  setGeneratedNote: (fieldId: string, value: string) => void
  setImages: (sectionId: string, imgs: SectionImage[]) => void
  handleToggleStepKind: (stepId: string, kind: 'notes' | 'organigramme') => void
  handleFieldOrganigrammeChange: (fieldId: string, org: Organigramme) => void
  handleToggleFieldMode: (stepId: string, fieldId: string, isOrg: boolean) => void
  handleAddSubSection: (stepId: string) => void
  handleDeleteSubSection: (stepId: string, fieldId: string) => void
  handleRenameSubSection: (stepId: string, fieldId: string, newLabel: string) => void
  handleAddLevel3Item: (stepId: string, parentFieldId: string) => void
  handleDeleteLevel3Item: (stepId: string, fieldId: string) => void
  clearSection: () => void
}) {
  return (
    <>
            <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-10 md:py-8">
              <EditionGuide />
              <p className="mb-7 text-sm leading-relaxed text-muted">{step.consigne}</p>
              {/* The organigramme format switch makes sense only for the section
                  that IS the organigramme — showing it on every custom step made
                  the 🏢 Organigramme button appear in Introduction, Contexte de
                  stage, etc. It is therefore only rendered for steps whose title
                  is (or whose format already is) the organigramme. */}
              {rapport.customSteps &&
                step.id.startsWith('custom-') &&
                (step.kind === 'organigramme' || step.titre.toLowerCase().includes('organigramme')) && (
                <div className="mb-6 flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-2.5 shadow-xs">
                  <span className="text-xs font-medium text-muted">Format de cette section :</span>
                  <div className="flex gap-1 rounded-lg bg-cream p-1 border border-line/60">
                    <button
                      type="button"
                      onClick={() => handleToggleStepKind(step.id, 'notes')}
                      className={cx(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        step.kind === 'notes' ? "bg-paper text-ink shadow-xs" : "text-muted hover:text-ink"
                      )}
                    >
                      📝 Texte rédigé
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStepKind(step.id, 'organigramme')}
                      className={cx(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        step.kind === 'organigramme' ? "bg-paper text-gold-deep shadow-xs font-semibold" : "text-muted hover:text-ink"
                      )}
                    >
                      🏢 Organigramme
                    </button>
                  </div>
                </div>
              )}
              {step.kind === 'couverture' && (
                <CouvertureStep value={rapport.couverture} onChange={patchCouverture} />
              )}
              {step.kind === 'entreprise' && (
                <EntrepriseStep value={rapport.entreprise} onChange={patchEntreprise} />
              )}
              {step.kind === 'presentation' && (
                <EntrepriseFieldsStep
                  fields={PRESENTATION_FIELDS}
                  value={rapport.entreprise}
                  onChange={patchEntreprise}
                  images={rapport.images?.[step.id] ?? []}
                  onImagesChange={(imgs) => setImages(step.id, imgs)}
                />
              )}
              {step.kind === 'organigramme' && (
                <OrganigrammeStep
                  value={(rapport.organigrammes && rapport.organigrammes[step.id]) ?? rapport.organigramme ?? { nodes: [] }}
                  onChange={(val) => patchOrganigramme(val, step.id)}
                  entreprise={rapport.entreprise}
                />
              )}
              {step.kind === 'fiche-technique' && (
                <FicheTechniqueStep
                  fiches={rapport.ficheTechniques ?? []}
                  onChange={patchFicheTechniques}
                  materiels={rapport.materiels ?? []}
                  onMaterielsChange={patchMateriels}
                  getImages={(ficheId) => rapport.images?.[`fiche-technique-${ficheId}`] ?? []}
                  onImagesChange={setFicheImages}
                  entreprise={rapport.entreprise}
                />
              )}
              {step.kind === 'activites' && (
                <EntrepriseFieldsStep
                  fields={ACTIVITES_FIELDS}
                  value={rapport.entreprise}
                  onChange={patchEntreprise}
                  images={rapport.images?.[step.id] ?? []}
                  onImagesChange={(imgs) => setImages(step.id, imgs)}
                />
              )}
              {step.kind === 'notes' && (
                <NotesStep
                  stepId={step.id}
                  stepTitle={step.titre}
                  fields={step.fields}
                  values={rapport.sections[step.id] ?? {}}
                  generatedValues={rapport.sectionsGenerated?.[step.id] ?? {}}
                  onChange={setNote}
                  onGenerate={setGeneratedNote}
                  images={rapport.images?.[step.id] ?? []}
                  onImagesChange={(imgs) => setImages(step.id, imgs)}
                  isCustom
                  onAddSubSection={() => handleAddSubSection(step.id)}
                  onDeleteSubSection={(fieldId) => handleDeleteSubSection(step.id, fieldId)}
                  onRenameSubSection={(fieldId, newTitle) => handleRenameSubSection(step.id, fieldId, newTitle)}
                  onAddLevel3Item={(parentFieldId) => handleAddLevel3Item(step.id, parentFieldId)}
                  onDeleteLevel3Item={(fieldId) => handleDeleteLevel3Item(step.id, fieldId)}
                  organigramme={rapport.organigramme}
                  organigrammes={rapport.organigrammes}
                  onOrganigrammeChange={handleFieldOrganigrammeChange}
                  onToggleFieldMode={(fieldId, isOrg) => handleToggleFieldMode(step.id, fieldId, isOrg)}
                  entreprise={rapport.entreprise}
                />
              )}
              {step.kind !== 'couverture' && step.id !== 'remerciements' && step.id !== 'sommaire' && (
                <div className="mt-8 flex items-center justify-end border-t border-line/50 pt-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted hover:text-ink transition-colors">
                    <input
                      type="checkbox"
                      checked={rapport.pageBreaks?.[step.id] ?? true}
                      onChange={(e) => {
                        const val = e.target.checked
                        setRapportWithHistory((prev) => {
                          if (!prev) return prev
                          return { ...prev, pageBreaks: { ...(prev.pageBreaks || {}), [step.id]: val }, updatedAt: Date.now() }
                        })
                      }}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-gold-deep focus:ring-gold-deep"
                    />
                    <span className="font-medium">Commencer sur une nouvelle page</span>
                  </label>
                </div>
              )}
            </div>
            <div
              className="sticky bottom-0 flex items-center justify-between border-t border-line bg-cream/90 px-4 md:px-10 pt-3 backdrop-blur-sm"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <Button size="sm" disabled={!prev} onClick={() => prev && setStepId(prev.id)}>
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">{prev ? prev.titre : 'Début'}</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSection} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Réinitialiser la section">
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Réinitialiser</span>
              </Button>
              <Button size="sm" variant="primary" disabled={!next} onClick={() => next && setStepId(next.id)}>
                <span className="hidden sm:inline">{next ? next.titre : 'Fin'}</span>
                <ArrowRight size={14} />
              </Button>
            </div>
    </>
  )
}
