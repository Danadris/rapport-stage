import { useState } from 'react'
import { Plus, Trash2, Sparkles, ChevronDown, ChevronUp, AlertCircle, Check, Eye } from 'lucide-react'
import type { Entreprise, Organigramme, OrgNode } from '../../types'
import { Button, Input, Textarea } from '../ui'
import { genererOrganigramme } from '../../lib/ai'
import { OrgChart } from '../preview/OrgChart'

interface OrganigrammeStepProps {
  value: Organigramme
  onChange: (val: Organigramme) => void
  entreprise: Entreprise
}

export function OrganigrammeStep({ value, onChange, entreprise }: OrganigrammeStepProps) {
  const nodes = value.nodes ?? []

  const [aiOpen, setAiOpen] = useState(false)
  const [freeText, setFreeText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiPreviewNodes, setAiPreviewNodes] = useState<OrgNode[] | null>(null)
  const [showLivePreview, setShowLivePreview] = useState(false)

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
    // If a node is deleted, children become roots (or re-attach to deleted node's parent)
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
        setAiError('Aucun poste généré. Veuillez réessayer ou ajouter des détails.')
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur lors de la génération IA')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyAiNodes = () => {
    if (aiPreviewNodes) {
      onChange({ nodes: aiPreviewNodes })
      setAiPreviewNodes(null)
      setAiOpen(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── AI Generator Card ── */}
      <div className="rounded-xl border border-line bg-gradient-to-br from-paper to-gold-soft/20 p-5 shadow-xs transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-soft text-gold-deep">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Générer l'organigramme avec l'IA</h3>
              <p className="text-xs text-muted">
                Créez une hiérarchie réaliste en un clic à partir des infos de l'entreprise.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="flex items-center gap-1 text-xs font-medium text-gold-deep hover:text-ink transition-colors p-1"
          >
            {aiOpen ? (
              <>
                Masquer <ChevronUp size={14} />
              </>
            ) : (
              <>
                Configurer <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {aiOpen && (
          <div className="mt-4 space-y-4 border-t border-line/60 pt-4">
            {companyContext && (
              <div className="rounded-lg bg-paper/80 p-3 text-xs text-muted border border-line/40">
                <span className="font-semibold text-ink block mb-1">Données détectées :</span>
                <p className="whitespace-pre-line line-clamp-3">{companyContext}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Précisez ou décrivez la structure (optionnel) :
              </label>
              <Textarea
                rows={3}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Ex : Équipe de 8 personnes. Directeur : M. Benali. Chef de production : M. Youssef avec 4 boulangers. Boutique : 2 vendeuses."
              />
            </div>

            {aiError && (
              <div className="flex items-center gap-2 text-xs text-danger">
                <AlertCircle size={14} />
                <span>{aiError}</span>
              </div>
            )}

            {/* AI Preview before applying */}
            {aiPreviewNodes && (
              <div className="rounded-lg border border-gold/40 bg-gold-soft/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gold-deep flex items-center gap-1.5">
                    <Check size={14} /> {aiPreviewNodes.length} postes générés par l'IA :
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleApplyAiNodes}>
                      Remplacer l'organigramme
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAiPreviewNodes(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-line/30 text-xs">
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

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
              >
                <Sparkles size={14} className={isGenerating ? 'animate-spin text-gold-deep' : 'text-gold-deep'} />
                {isGenerating ? 'Génération en cours...' : "Générer l'organigramme"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Node List & Form ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Postes et Hiérarchie</h3>
            <p className="text-xs text-muted">
              Définissez les postes de l'entreprise et désignez leur supérieur hiérarchique direct.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="text-xs text-muted hover:text-ink"
            >
              <Eye size={14} className="mr-1" />
              {showLivePreview ? 'Masquer aperçu' : 'Voir aperçu'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleAddNode}>
              <Plus size={14} className="mr-1 text-gold-deep" />
              Ajouter un poste
            </Button>
          </div>
        </div>

        {showLivePreview && nodes.length > 0 && (
          <div className="rounded-xl border border-line bg-paper p-4 shadow-inner">
            <span className="text-xs font-semibold text-muted block mb-2 text-center uppercase tracking-wider">
              Aperçu en direct
            </span>
            <OrgChart nodes={nodes} />
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-cream/50 p-8 text-center">
            <p className="text-sm text-muted mb-3">Aucun poste pour le moment.</p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleAddNode}>
                <Plus size={14} className="mr-1" /> Ajouter manuellement
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setAiOpen(true); void handleGenerateAI() }}>
                <Sparkles size={14} className="mr-1" /> Générer avec l'IA
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {nodes.map((node, index) => {
              // Valid parents: any other node that is not self
              const candidateParents = nodes.filter((n) => n.id !== node.id)

              return (
                <div
                  key={node.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-lg border border-line bg-paper p-3 transition-colors hover:border-line-strong"
                >
                  <span className="hidden sm:inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-[11px] font-mono font-bold text-faint">
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
                      <option value="">★ Aucun (Direction / Racine)</option>
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
                      <Trash2 size={15} />
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
              <Plus size={14} className="mr-1.5 text-gold-deep" />
              Ajouter un poste supplémentaire
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
