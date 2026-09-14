import { useState } from 'react'
import { Plus, Trash2, Sparkles, AlertCircle, CheckCircle2, Eye } from 'lucide-react'
import type { Entreprise, Organigramme, OrgNode } from '../../types'
import { Button, Field, Input, SkeletonRow, Textarea } from '../ui'
import { genererOrganigramme } from '../../lib/ai'
import { OrgChart } from '../preview/OrgChart'

interface OrganigrammeStepProps {
  value: Organigramme
  onChange: (val: Organigramme) => void
  entreprise: Entreprise
}

export function OrganigrammeStep({ value, onChange, entreprise }: OrganigrammeStepProps) {
  const nodes = value.nodes ?? []

  const [freeText, setFreeText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiPreviewNodes, setAiPreviewNodes] = useState<OrgNode[] | null>(null)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Context summary from existing entreprise fields
  const companyContext = [
    entreprise.nom ? `Nom : ${entreprise.nom}` : '',
    entreprise.ville ? `Ville : ${entreprise.ville}` : '',
    entreprise.secteurActivite ? `Secteur : ${entreprise.secteurActivite}` : '',
    entreprise.activitesPrincipales ? `Activités : ${entreprise.activitesPrincipales}` : '',
    entreprise.organismeAccueil ? `Accueil : ${entreprise.organismeAccueil}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const handleAddNode = () => {
    const newNode: OrgNode = {
      id: crypto.randomUUID(),
      title: '',
      name: '',
      parentId: nodes.length > 0 ? nodes[0].id : undefined,
    }
    onChange({ nodes: [...nodes, newNode] })
  }

  const handleUpdateNode = (id: string, patch: Partial<OrgNode>) => {
    onChange({
      nodes: nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })
  }

  const handleDeleteNode = (id: string) => {
    const nodeToDelete = nodes.find((n) => n.id === id)
    const fallbackParentId = nodeToDelete?.parentId

    onChange({
      nodes: nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.parentId === id ? { ...n, parentId: fallbackParentId } : n)),
    })
  }

  const handleGenerateAI = async () => {
    setIsGenerating(true)
    setAiError(null)
    setAiPreviewNodes(null)
    try {
      const generated = await genererOrganigramme(companyContext, freeText)
      if (generated && generated.length > 0) {
        setAiPreviewNodes(generated)
      } else {
        setAiError('Aucun poste généré. Remplissez les champs manuellement ou ajoutez des détails.')
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'La génération automatique a échoué.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyAiNodes = () => {
    if (aiPreviewNodes) {
      onChange({ nodes: aiPreviewNodes })
      setAiPreviewNodes(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Assistance IA Card (Clean artisanal style matching EntrepriseStep) ── */}
      <div className="rounded-xl border border-line bg-paper p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
              <Sparkles size={14} className="text-gold-deep" />
              Génération automatique
            </h4>
            <p className="text-[12px] text-muted mt-0.5">
              Proposer une structure hiérarchique à partir des informations de l'entreprise d'accueil.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[12px] text-faint hover:text-ink transition-colors"
            >
              {showDetails ? 'Masquer les précisions' : 'Ajouter des précisions…'}
            </button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              <Sparkles size={13} className={isGenerating ? 'animate-spin text-gold-deep' : 'text-gold-deep'} />
              {isGenerating ? 'Génération...' : "Générer avec l'IA"}
            </Button>
          </div>
        </div>

        {/* Optional free-text detail input */}
        {showDetails && (
          <div className="mt-4 pt-3 border-t border-line">
            <Field
              label="Précisions sur l'équipe ou les services"
              hint="Optionnel"
              htmlFor="org-freetext"
            >
              <Textarea
                id="org-freetext"
                rows={2}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Ex : Équipe de 8 personnes (fournil, viennoiserie, boutique). Direction : M. Benali."
                className="text-[13px]"
              />
            </Field>
          </div>
        )}

        {/* Loading skeleton */}
        {isGenerating && (
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Error message */}
        {aiError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-[13px] leading-relaxed text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{aiError}</p>
          </div>
        )}

        {/* AI Preview and Confirmation */}
        {aiPreviewNodes && !isGenerating && (
          <div className="mt-4 space-y-3 rounded-lg border border-line bg-cream p-3.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[13px] text-gold-deep font-medium">
                <CheckCircle2 size={15} className="shrink-0" />
                {aiPreviewNodes.length} postes générés
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={handleApplyAiNodes}>
                  Appliquer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAiPreviewNodes(null)}>
                  Annuler
                </Button>
              </div>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-line/40 text-[12px] pr-1">
              {aiPreviewNodes.map((n) => {
                const parent = aiPreviewNodes.find((p) => p.id === n.parentId)
                return (
                  <div key={n.id} className="pt-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink">{n.title}</span>
                      <span className="text-muted ml-2">({n.name})</span>
                    </div>
                    <span className="text-faint text-[11px]">
                      {parent ? `Rapporte à : ${parent.title}` : 'Direction / Racine'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Node List & Form ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[13px] font-semibold text-ink">Postes et hiérarchie</h4>
            <p className="text-[12px] text-muted">
              Renseignez les postes et désignez leur supérieur hiérarchique direct.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="text-xs text-muted hover:text-ink"
            >
              <Eye size={13} className="mr-1" />
              {showLivePreview ? 'Masquer aperçu' : 'Voir aperçu'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleAddNode}>
              <Plus size={13} className="mr-1 text-gold-deep" />
              Ajouter un poste
            </Button>
          </div>
        </div>

        {/* Live preview */}
        {showLivePreview && nodes.length > 0 && (
          <div className="rounded-xl border border-line bg-paper p-4">
            <span className="text-[11px] font-semibold text-faint block mb-2 text-center uppercase tracking-wider">
              Aperçu du schéma
            </span>
            <OrgChart nodes={nodes} />
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-cream/40 p-8 text-center">
            <p className="text-[13px] text-muted mb-3">Aucun poste pour le moment.</p>
            <div className="flex justify-center gap-2.5">
              <Button variant="secondary" size="sm" onClick={handleAddNode}>
                <Plus size={13} className="mr-1" /> Ajouter manuellement
              </Button>
              <Button variant="primary" size="sm" onClick={handleGenerateAI} disabled={isGenerating}>
                <Sparkles size={13} className="mr-1" /> Générer avec l'IA
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {nodes.map((node, index) => {
              const candidateParents = nodes.filter((n) => n.id !== node.id)

              return (
                <div
                  key={node.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-lg border border-line bg-paper p-3 transition-colors hover:border-line-strong"
                >
                  <span className="hidden sm:inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream text-[10px] font-mono font-bold text-faint">
                    {index + 1}
                  </span>

                  {/* Title / Poste */}
                  <div className="flex-1 min-w-[140px]">
                    <label className="sm:hidden text-[11px] font-medium text-faint mb-1 block">Poste</label>
                    <Input
                      value={node.title}
                      onChange={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                      placeholder="Intitulé du poste (ex : Chef de fournil)"
                    />
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-[120px]">
                    <label className="sm:hidden text-[11px] font-medium text-faint mb-1 block">Nom</label>
                    <Input
                      value={node.name}
                      onChange={(e) => handleUpdateNode(node.id, { name: e.target.value })}
                      placeholder="Nom (ex : M. Benali ou —)"
                    />
                  </div>

                  {/* Superior / Reports to */}
                  <div className="flex-1 min-w-[160px]">
                    <label className="sm:hidden text-[11px] font-medium text-faint mb-1 block">Supérieur direct</label>
                    <select
                      value={node.parentId ?? ''}
                      onChange={(e) =>
                        handleUpdateNode(node.id, { parentId: e.target.value || undefined })
                      }
                      className="h-9 w-full rounded-lg border border-line bg-cream/70 px-2.5 text-xs text-ink transition-colors focus:border-gold focus:outline-none"
                    >
                      <option value="">★ Direction / Racine</option>
                      {candidateParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          Rapporte à : {p.title || 'Sans titre'} {p.name ? `(${p.name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delete button */}
                  <div className="flex justify-end sm:justify-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(node.id)}
                      title="Supprimer ce poste"
                      className="rounded-md p-1.5 text-faint hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {nodes.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button variant="secondary" size="sm" onClick={handleAddNode}>
              <Plus size={13} className="mr-1.5 text-gold-deep" />
              Ajouter un poste supplémentaire
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
