import { ArrowLeft, ArrowRight, Download, Eye, PencilLine, Undo2, Redo2, Menu, X, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Stepper } from '../components/Stepper'
import { CouvertureStep } from '../components/steps/CouvertureStep'
import { EntrepriseFieldsStep, type EntFieldDef } from '../components/steps/EntrepriseFieldsStep'
import { EntrepriseStep } from '../components/steps/EntrepriseStep'
import { NotesStep } from '../components/steps/NotesStep'
import { OrganigrammeStep } from '../components/steps/OrganigrammeStep'
import { FicheTechniqueStep } from '../components/steps/FicheTechniqueStep'
import { PreviewA4 } from '../components/PreviewA4'
import { progressOf, stepById, WIZARD_STEPS } from '../data/sections'
import { getRapport, persistRapport } from '../lib/storage'
import { persistReport as persistReportV3, buildReportMeta, buildReportData } from '../lib/storageV3'
import { revokeReportUrls } from '../lib/imageRuntime'
import type { Couverture, Entreprise, Rapport, SectionImage, RapportStyle, Organigramme, FicheTechnique, WizardStep, MaterielItem } from '../types'
import { emptyCouverture } from '../types'
import { Button, Eyebrow, SkeletonRow } from '../components/ui'
import { cx } from '../lib/cx'
import { exportToPdf } from '../lib/exportPdf'

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

export function WorkspacePage() {
  const { id } = useParams()
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [loadedRapportId, setLoadedRapportId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [stepId, setStepId] = useState('couverture')
  const [mode, setMode] = useState<'edition' | 'apercu'>('edition')
  const [zoom, setZoom] = useState(100)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [previewWrapWidth, setPreviewWrapWidth] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fit the A4 preview to the actual preview column width on mobile — the pages
  // are fixed at 794px, so the zoom must track the container (not innerWidth,
  // which includes the sidebar) and must never be floored, or the A4 page
  // overflows the screen instead of fitting it.
  useEffect(() => {
    if (!isMobile) return
    const el = previewWrapRef.current
    if (!el) return
    const measure = () => setPreviewWrapWidth(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])
  const saveTimer = useRef<number | undefined>(undefined)
  const saveSeq = useRef(0)

  const historyRef = useRef<Rapport[]>([])
  const futureRef = useRef<Rapport[]>([])
  const imageLiveUrls = useRef(new Map<string, string>())
  const lastEditTime = useRef(0)
  const loadingRapport = Boolean(id && loadedRapportId !== id)

  // Strips large Base64 binary strings from history snapshots to prevent RAM leaks
  const stripBinaryForHistory = (r: Rapport): Rapport => {
    if (!r.images) return r
    const lightImages: Record<string, SectionImage[]> = {}
    for (const [sectionId, imgs] of Object.entries(r.images)) {
      lightImages[sectionId] = imgs.map((img) => {
        // Cache the live URL so it can be restored on undo/redo
        if (img.dataUrl) imageLiveUrls.current.set(img.id, img.dataUrl)
        return {
          ...img,
          dataUrl: img.dataUrl.startsWith('data:') ? '' : img.dataUrl,
        }
      })
    }
    return { ...r, images: lightImages }
  }

  // Restores live image URLs into a snapshot retrieved from undo/redo
  const restoreLiveImages = (r: Rapport): Rapport => {
    if (!r.images) return r
    const restoredImages: Record<string, SectionImage[]> = {}
    for (const [sectionId, imgs] of Object.entries(r.images)) {
      restoredImages[sectionId] = imgs.map((img) => {
        if (!img.dataUrl && imageLiveUrls.current.has(img.id)) {
          return { ...img, dataUrl: imageLiveUrls.current.get(img.id)! }
        }
        return img
      })
    }
    return { ...r, images: restoredImages }
  }

  const setRapportWithHistory = (
    updater: Rapport | ((prev: Rapport | null) => Rapport | null),
    options?: { isTextKeystroke?: boolean }
  ) => {
    setRapport((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (prev && next && prev !== next) {
        const now = Date.now()
        const isCoalescing = options?.isTextKeystroke && now - lastEditTime.current < 600

        if (!isCoalescing) {
          // Never duplicate large binary data in history
          historyRef.current = [...historyRef.current.slice(-49), stripBinaryForHistory(prev)]
          futureRef.current = []
          setCanUndo(true)
          setCanRedo(false)
        }
        lastEditTime.current = now
        setSaveStatus('saving')
      }
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    if (!id) return

    void getRapport(id)
      .then((found) => {
        if (cancelled) return
        setRapport(found ?? null)
        setLoadedRapportId(id)
        historyRef.current = []
        futureRef.current = []
        setCanUndo(false)
        setCanRedo(false)
        setSaveStatus('saved')
      })
      .catch(() => {
        if (cancelled) return
        setRapport(null)
        setLoadedRapportId(id)
        setSaveStatus('error')
      })

    return () => {
      cancelled = true
      // Revoke active Object URLs when leaving workspace to prevent memory leaks
      revokeReportUrls(id)
    }
  }, [id])

  const undo = () => {
    if (historyRef.current.length === 0) return
    setRapport((prev) => {
      const previousRaw = historyRef.current[historyRef.current.length - 1]
      historyRef.current = historyRef.current.slice(0, -1)
      if (prev) futureRef.current = [stripBinaryForHistory(prev), ...futureRef.current]
      setCanUndo(historyRef.current.length > 0)
      setCanRedo(true)
      setSaveStatus('saving')
      return restoreLiveImages(previousRaw)
    })
  }

  const redo = () => {
    if (futureRef.current.length === 0) return
    setRapport((prev) => {
      const nextRaw = futureRef.current[0]
      futureRef.current = futureRef.current.slice(1)
      if (prev) historyRef.current = [...historyRef.current, stripBinaryForHistory(prev)]
      setCanUndo(true)
      setCanRedo(futureRef.current.length > 0)
      setSaveStatus('saving')
      return restoreLiveImages(nextRaw)
    })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!rapport || loadingRapport || saveStatus !== 'saving') return
    window.clearTimeout(saveTimer.current)
    const seq = ++saveSeq.current
    saveTimer.current = window.setTimeout(() => {
      // V1 save (primary — workspace still loads from V1)
      void persistRapport(rapport)
        .then(() => {
          if (saveSeq.current === seq) setSaveStatus('saved')
        })
        .catch(() => {
          if (saveSeq.current === seq) setSaveStatus('error')
        })

      // V3 dual-write (fire-and-forget, keeps V3 stores in sync)
      try {
        const meta = buildReportMeta(rapport)
        const data = buildReportData(rapport, (rapport.images as any) ?? {})
        void persistReportV3(data, meta).catch(() => {
          // V3 write failure is non-critical during dual-write phase
        })
      } catch {
        // Never let V3 errors affect the V1 save path
      }
    }, 400)
    return () => window.clearTimeout(saveTimer.current)
  }, [rapport, loadingRapport, saveStatus])

  if (!id) return <Navigate to="/" replace />
  if (loadingRapport) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full items-start justify-center px-5 py-12">
        <div className="w-full max-w-4xl space-y-4 rounded-xl border border-line bg-paper p-6">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    )
  }
  if (!rapport) return <Navigate to="/" replace />

  const activeSteps = rapport.customSteps ?? WIZARD_STEPS
  const step = stepById(stepId, activeSteps) ?? activeSteps[0]
  const stepIndex = activeSteps.findIndex((s) => s.id === step.id)
  const prev = activeSteps[stepIndex - 1]
  const next = activeSteps[stepIndex + 1]
  const { ratio } = progressOf(rapport, activeSteps)

  const patchCouverture = (patch: Partial<Couverture>) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, couverture: { ...r.couverture, ...patch }, updatedAt: Date.now() } : r),
      { isTextKeystroke: true },
    )

  const patchEntreprise = (patch: Partial<Entreprise>) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, entreprise: { ...r.entreprise, ...patch }, updatedAt: Date.now() } : r),
      { isTextKeystroke: true },
    )

  const patchOrganigramme = (organigramme: Organigramme, key?: string) =>
    setRapportWithHistory(
      (r) => {
        if (!r) return r
        return {
          ...r,
          organigramme,
          ...(key ? { organigrammes: { ...(r.organigrammes ?? {}), [key]: organigramme } } : {}),
          updatedAt: Date.now(),
        }
      },
    )

  const patchFicheTechniques = (fiches: FicheTechnique[]) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, ficheTechniques: fiches, updatedAt: Date.now() } : r),
    )

  const patchMateriels = (materiels: MaterielItem[]) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, materiels, updatedAt: Date.now() } : r),
    )

  const patchFicheTechnique = (ficheId: string, patch: Partial<FicheTechnique>) =>
    setRapportWithHistory((r) =>
      r
        ? {
            ...r,
            ficheTechniques: (r.ficheTechniques ?? []).map((fiche) =>
              fiche.id === ficheId ? { ...fiche, ...patch } : fiche,
            ),
            updatedAt: Date.now(),
          }
        : r,
    )

  const setFicheImages = (ficheId: string, imgs: SectionImage[]) =>
    setImages(`fiche-technique-${ficheId}`, imgs)

  const patchStyle = (patch: Partial<RapportStyle>) =>
    setRapportWithHistory((r) =>
      r
        ? {
            ...r,
            style: {
              ...(r.style || {
                primaryColor: '#2f5496',
                titleFont: 'Georgia, "Times New Roman", serif',
                bodyFont: '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
              }),
              ...patch,
            },
            updatedAt: Date.now(),
          }
        : r,
    )

  const setNote = (fieldId: string, value: string) =>
    setRapportWithHistory(
      (r) =>
        r
          ? {
              ...r,
              sections: {
                ...r.sections,
                [step.id]: { ...(r.sections[step.id] ?? {}), [fieldId]: value },
              },
              updatedAt: Date.now(),
            }
          : r,
      { isTextKeystroke: true },
    )

  const setGeneratedNote = (fieldId: string, value: string) =>
    setRapportWithHistory((r) =>
      r
        ? {
            ...r,
            sectionsGenerated: {
              ...(r.sectionsGenerated ?? {}),
              [step.id]: { ...(r.sectionsGenerated?.[step.id] ?? {}), [fieldId]: value },
            },
            updatedAt: Date.now(),
          }
        : r,
    )

  /** Copies the official plan into customSteps so the user can edit/add/delete sections. */
  const materializeSteps = (): WizardStep[] =>
    WIZARD_STEPS.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) }))

  const handleAddStep = () => {
    const working = rapport.customSteps ?? materializeSteps()
    const id = crypto.randomUUID()
    const newStep = {
      id: `custom-${id}`,
      numero: String(working.length + 1).padStart(2, '0'),
      titre: `Nouvelle section`,
      sousTitre: 'Section personnalisée',
      consigne: 'Décrivez librement le contenu de cette section.',
      kind: 'notes' as const,
      fields: [
        {
          id: 'contenu',
          label: 'Nouvelle section',
          placeholder: 'Vos notes pour cette section…',
          examples: [],
        },
      ],
    }
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      return { ...r, customSteps: [...steps, newStep], updatedAt: Date.now() }
    })
    setStepId(newStep.id)
  }

  const handleDeleteStep = (stepIdToDelete: string) => {
    const base = rapport.customSteps ?? materializeSteps()
    const stepIdx = base.findIndex(s => s.id === stepIdToDelete)
    if (stepIdx === -1) return
    
    // Redirect if we are deleting the current step
    if (stepIdToDelete === step.id) {
       const prevStep = base[stepIdx - 1]
       if (prevStep) setStepId(prevStep.id)
    }

    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updatedSteps = steps.filter(s => s.id !== stepIdToDelete)
      // Renumber remaining steps (skipping the 2 fixed steps)
      for (let i = 2; i < updatedSteps.length; i++) {
        updatedSteps[i].numero = String(i + 1).padStart(2, '0')
      }
      return { ...r, customSteps: updatedSteps, updatedAt: Date.now() }
    })
  }

  const handleRenameStep = (stepId: string, newTitle: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const isOrg = newTitle.toLowerCase().includes('organigramme')
      const updated = steps.map(s => s.id === stepId ? { 
        ...s, 
        titre: newTitle,
        ...(isOrg ? { kind: 'organigramme' as const } : {}),
      } : s)
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleToggleStepKind = (stepId: string, kind: 'notes' | 'organigramme') => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return {
          ...s,
          kind,
          fields: kind === 'notes' && s.fields.length === 0
            ? [{ id: 'contenu', label: s.titre, placeholder: 'Vos notes pour cette section…', examples: [] }]
            : s.fields,
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleFieldOrganigrammeChange = (fieldId: string, org: Organigramme) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      return {
        ...r,
        organigramme: org,
        organigrammes: {
          ...(r.organigrammes ?? {}),
          [fieldId]: org,
        },
        updatedAt: Date.now(),
      }
    })
  }

  const handleToggleFieldMode = (stepId: string, fieldId: string, isOrg: boolean) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, isOrganigramme: isOrg } : f)
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleAddSubSection = (stepId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        const newFieldId = crypto.randomUUID()
        return {
          ...s,
          fields: [
            ...s.fields,
            {
              id: newFieldId,
              label: 'Nouveau sous-titre',
              placeholder: 'Vos notes pour cette section…',
              examples: [],
            }
          ]
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleDeleteSubSection = (stepId: string, fieldId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId && f.parentId !== fieldId) }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleRenameSubSection = (stepId: string, fieldId: string, newLabel: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const isOrg = newLabel.toLowerCase().includes('organigramme')
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id !== fieldId) return f
            return {
              ...f,
              label: newLabel,
              ...(isOrg ? { isOrganigramme: true } : {}),
            }
          })
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleAddLevel3Item = (stepId: string, parentFieldId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        const children = s.fields.filter(f => f.parentId === parentFieldId)
        const letter = String.fromCharCode(97 + children.length) // a, b, c...
        const prefix = `${letter}/`
        return {
          ...s,
          fields: [
            ...s.fields,
            {
              id: crypto.randomUUID(),
              label: '',
              placeholder: 'Vos notes pour ce point…',
              examples: [],
              parentId: parentFieldId,
              prefix,
            }
          ]
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleDeleteLevel3Item = (stepId: string, fieldId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }


  const setImages = (sectionId: string, imgs: SectionImage[]) =>
    setRapportWithHistory((r) =>
      r ? { ...r, images: { ...(r.images ?? {}), [sectionId]: imgs }, updatedAt: Date.now() } : r,
    )

  const handlePreviewEdit = (source: 'entreprise' | 'section', field: string, value: string) => {
    if (source === 'entreprise') {
      patchEntreprise({ [field]: value } as Partial<Entreprise>)
    } else {
      // field format is "stepId:fieldId"
      const [stepId, fieldId] = field.split(':')
      setRapportWithHistory((r) =>
        r
          ? {
              ...r,
              sectionsGenerated: {
                ...(r.sectionsGenerated ?? {}),
                [stepId]: { ...(r.sectionsGenerated?.[stepId] ?? {}), [fieldId]: value },
              },
              updatedAt: Date.now(),
            }
          : r,
      )
    }
  }

  const clearSection = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider cette section ?")) {
      setRapportWithHistory((r) => {
        if (!r) return r
        const newSections = { ...r.sections }
        delete newSections[step.id]
        const newSectionsGenerated = { ...r.sectionsGenerated }
        if (newSectionsGenerated) delete newSectionsGenerated[step.id]
        const newImages = { ...r.images }
        delete newImages[step.id]
        if (step.kind === 'fiche-technique') {
          for (const key of Object.keys(newImages)) {
            if (key.startsWith('fiche-technique-')) delete newImages[key]
          }
        }

        let newCouverture = r.couverture
        let newEntreprise = r.entreprise
        let newOrganigramme = r.organigramme
        let newFiches = r.ficheTechniques
        let newMateriels = r.materiels

        if (step.kind === 'couverture') {
          newCouverture = emptyCouverture()
        } else if (step.kind === 'entreprise') {
          newEntreprise = {
            ...newEntreprise,
            nom: '',
            ville: '',
            sourceRecherche: null,
            logoDataUrl: undefined,
          }
        } else if (step.kind === 'organigramme') {
          newOrganigramme = { nodes: [] }
        } else if (step.kind === 'fiche-technique') {
          newFiches = []
          newMateriels = []
        } else if (step.kind === 'presentation') {
          newEntreprise = {
            ...newEntreprise,
            organismeAccueil: '',
            historique: '',
            secteurActivite: '',
            missionsValeurs: '',
          }
        } else if (step.kind === 'activites') {
          newEntreprise = {
            ...newEntreprise,
            activitesPrincipales: '',
            equipements: '',
            technologies: '',
          }
        }

        return {
          ...r,
          couverture: newCouverture,
          entreprise: newEntreprise,
          organigramme: newOrganigramme,
          ficheTechniques: newFiches,
          materiels: newMateriels,
          sections: newSections,
          sectionsGenerated: newSectionsGenerated,
          images: newImages,
          updatedAt: Date.now(),
        }
      })
    }
  }

  const handleSelectStep = (id: string) => {
    setStepId(id)
    setIsMobileMenuOpen(false)
    if (mode === 'apercu') {
      setTimeout(() => {
        let targetId = id === 'entreprise' ? 'presentation' : id
        let candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-part="${targetId}"]`))
        if (candidates.length === 0 && id === 'entreprise') {
          targetId = id
          candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-part="${targetId}"]`))
        }
        if (id === 'fiche-technique') {
          candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-part^="fiche-technique-"]`))
        }
        const el = candidates.find((node) => node.offsetParent !== null) ?? candidates[0]
        if (el) {
          // Adjust for the sticky toolbar (top-14 is roughly 56px, plus header is 56px => 112px, offset 120px)
          const y = el.getBoundingClientRect().top + window.scrollY - 120
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
        }
      }, 50)
    }
  }

  const wordCount = (() => {
    if (!rapport) return 0
    const texts: string[] = []
    // entreprise fields
    for (const v of Object.values(rapport.entreprise)) {
      if (typeof v === 'string') texts.push(v)
    }
    // sections
    for (const sec of Object.values(rapport.sections)) {
      for (const v of Object.values(sec)) {
        if (typeof v === 'string') texts.push(v)
      }
    }
    // generated sections
    if (rapport.sectionsGenerated) {
      for (const sec of Object.values(rapport.sectionsGenerated)) {
        for (const v of Object.values(sec)) {
          if (typeof v === 'string') texts.push(v)
        }
      }
    }
    // organigramme
    if (rapport.organigramme?.nodes) {
      for (const n of rapport.organigramme.nodes) {
        if (n.title) texts.push(n.title)
        if (n.name && n.name !== '—') texts.push(n.name)
      }
    }
    return texts.join(' ').split(/\s+/).filter(Boolean).length
  })()

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-[264px] shrink-0 flex-col border-r border-line bg-cream px-3 md:sticky md:top-14 md:z-auto md:h-[calc(100vh-3.5rem)] md:bg-transparent md:flex md:py-2",
          isMobileMenuOpen ? "flex" : "hidden"
        )}
        style={isMobileMenuOpen ? {
          paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        } : undefined}
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-3 md:hidden">
          <Eyebrow>Menu</Eyebrow>
          <button onClick={() => setIsMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center -mr-1.5 text-muted hover:text-ink active:text-ink"><X size={18} /></button>
        </div>
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Progression</Eyebrow>
            <span className="font-mono text-[11px] text-faint">{Math.round(ratio * 100)}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Stepper 
            rapport={rapport} 
            steps={activeSteps} 
            currentId={step.id} 
            onSelect={handleSelectStep}
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col group relative">
        {/* Single sticky wrapper — step nav + style dropdown */}
        <div className="sticky top-14 z-30" data-print-hide>
          {/* Step nav bar */}
          <div className="flex items-center justify-between gap-2 border-b border-line bg-cream/85 px-4 md:px-6 py-3 backdrop-blur-sm">
            <div className="min-w-0 flex items-center gap-2">
              <button className="flex h-10 w-10 shrink-0 items-center justify-center -ml-2 text-muted active:text-ink md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex items-center gap-2">
                <div>
                  <span className="block font-mono text-[10px] tracking-widest text-faint">{step.numero} / {activeSteps.length}</span>
                    <input
                      type="text"
                      value={step.titre}
                      onChange={(e) => handleRenameStep(step.id, e.target.value)}
                      placeholder="Titre de la section (optionnel)"
                      className="truncate text-[14px] sm:text-[15px] font-semibold text-ink bg-transparent focus:outline-none focus:border-b focus:border-gold border-b border-transparent p-0 w-full placeholder:text-faint"
                    />
                </div>
                <span className={cx('mt-3 hidden text-[10px] sm:inline', saveStatus === 'error' ? 'text-danger' : 'text-faint')}>
                  {saveStatus === 'saving' ? 'Enregistrement...' : saveStatus === 'error' ? "Erreur d'enregistrement" : 'Enregistré'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-1">
                <button onClick={undo} disabled={!canUndo} className="rounded p-1.5 text-muted hover:text-ink disabled:opacity-30" title="Annuler (Ctrl+Z)"><Undo2 size={15} /></button>
                <button onClick={redo} disabled={!canRedo} className="rounded p-1.5 text-muted hover:text-ink disabled:opacity-30" title="Rétablir (Ctrl+Y)"><Redo2 size={15} /></button>
              </div>
              
              {/* Style / PDF buttons integrated into nav bar for ALL sizes */}
              {mode === 'apercu' && (
                <div className="flex items-center gap-0.5 sm:gap-2">
                  <span className="hidden md:inline text-[11px] text-muted border-r border-line pr-3 mr-1">{wordCount.toLocaleString('fr-FR')} mots</span>
                  <button
                    onClick={() => setShowSettings(v => !v)}
                    className={cx(
                      'flex h-10 sm:h-auto items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-[13px] transition-colors active:bg-gold-soft/60',
                      showSettings ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink'
                    )}
                    title="Style"
                  >
                    <SlidersHorizontal size={15} />
                    <span className="hidden sm:inline">Style</span>
                  </button>
                  <button onClick={() => void exportToPdf()} className="flex h-10 sm:h-auto items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-[13px] text-muted hover:text-ink active:text-ink active:bg-paper transition-colors" title="PDF">
                    <Download size={15} />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              )}

              <div className="flex shrink-0 rounded-lg border border-line bg-paper p-0.5">
                {(
                  [
                    ['edition', 'Édition', PencilLine],
                    ['apercu', 'Aperçu', Eye],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cx(
                      'flex h-9 sm:h-auto items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-[13px] transition-colors duration-150 active:bg-gold-soft/60',
                      mode === m ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink',
                    )}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Unified Settings panel ── */}
          {mode === 'apercu' && showSettings && (
            <div className="border-b border-line bg-cream/98 px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-4 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Couleur</label>
                    <input type="color" value={rapport.style?.primaryColor || '#2f5496'} onChange={(e) => patchStyle({ primaryColor: e.target.value })} className="h-8 w-full cursor-pointer rounded border border-line bg-transparent p-0.5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Alignement</label>
                    <select value={rapport.style?.textAlign || 'justify'} onChange={(e) => patchStyle({ textAlign: e.target.value as 'left' | 'center' | 'justify' })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value="left">Gauche</option>
                      <option value="center">Centré</option>
                      <option value="justify">Justifié</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Police titres</label>
                    <select value={rapport.style?.titleFont || 'Georgia, "Times New Roman", serif'} onChange={(e) => patchStyle({ titleFont: e.target.value })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value='Georgia, "Times New Roman", serif'>Georgia</option>
                      <option value='"Geist Sans", ui-sans-serif, system-ui, sans-serif'>Geist</option>
                      <option value='"Geist Mono", ui-monospace, monospace'>Mono</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Police texte</label>
                    <select value={rapport.style?.bodyFont || '"Geist Sans", ui-sans-serif, system-ui, sans-serif'} onChange={(e) => patchStyle({ bodyFont: e.target.value })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value='"Geist Sans", ui-sans-serif, system-ui, sans-serif'>Geist</option>
                      <option value='Georgia, "Times New Roman", serif'>Georgia</option>
                      <option value='"Geist Mono", ui-monospace, monospace'>Mono</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Taille titres</label>
                    <select value={rapport.style?.titleSize || 17} onChange={(e) => patchStyle({ titleSize: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      {[14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Sous-titres</label>
                    <select value={rapport.style?.subtitleSize || 14} onChange={(e) => patchStyle({ subtitleSize: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      {[11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Taille texte</label>
                    <select value={rapport.style?.bodySize || 13} onChange={(e) => patchStyle({ bodySize: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Interligne</label>
                    <select value={rapport.style?.lineSpacing || 1.85} onChange={(e) => patchStyle({ lineSpacing: Number(e.target.value) })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value={1}>Simple</option>
                      <option value={1.5}>1.5</option>
                      <option value={1.85}>1.85</option>
                      <option value={2}>Double</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Marges</label>
                    <select value={rapport.style?.margins || 'normal'} onChange={(e) => patchStyle({ margins: e.target.value as 'narrow' | 'normal' | 'wide' })} className="h-8 w-full rounded border border-line bg-paper px-2 text-xs text-ink">
                      <option value="narrow">Étroites</option>
                      <option value="normal">Normales</option>
                      <option value="wide">Larges</option>
                    </select>
                  </div>
                  <div className="flex-col gap-1 hidden md:flex">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">Zoom : {zoom}%</label>
                    <input type="range" min="50" max="150" step="10" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-8 w-full" />
                  </div>
                </div>
              )}
        </div>

        {mode === 'edition' ? (
          <>
            <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-10 md:py-8">
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
        ) : (
          <div className="flex-1 bg-line-strong/60 print:bg-transparent min-w-0 relative">


            {/* ── Preview ─────────────────────────────────────────── */}
            <div ref={previewWrapRef} className={cx('px-2 py-6 md:px-4 md:py-10 print:p-0', isMobile && 'overflow-x-auto')}>
              <div
                style={
                  isMobile
                    ? { '--preview-zoom': Math.min(1, ((previewWrapWidth ?? window.innerWidth) - 16) / 794) } as React.CSSProperties
                    : { '--preview-scale': zoom / 100 } as React.CSSProperties
                }
                className={
                  isMobile
                    ? "print:!block print:![zoom:1] [zoom:var(--preview-zoom)]"
                    : "print:!block print:!transform-none [transform:scale(var(--preview-scale))] origin-top"
                }
              >
                <PreviewA4
                  rapport={rapport}
                  onEdit={handlePreviewEdit}
                  onImagesChange={setImages}
                  onFicheChange={patchFicheTechnique}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
