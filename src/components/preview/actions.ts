import type { Couverture, FicheTechnique, Organigramme, RapportStyle, SectionImage, TextBlock } from '../../types'

/**
 * What a page of the report can be asked to do, and the shape of a text edit.
 *
 * One interface rather than a prop per capability: these callbacks travel
 * WorkspacePage -> PreviewPane -> PreviewA4 -> PartContent, and a prop per
 * capability meant every new feature grew three signatures to keep in step.
 *
 * Every field is optional, so a preview drawn without one simply omits the
 * corresponding control rather than breaking.
 */
export interface PreviewActions {
  onEdit?: EditHandler
  onCoverChange?: (patch: Partial<Couverture>) => void
  onStyleChange?: (patch: Partial<RapportStyle>) => void
  onOrganigrammeChange?: (key: string, next: Organigramme) => void
  onTextBlocksChange?: (sectionKey: string, blocks: TextBlock[]) => void
  onBlockOrderChange?: (sectionKey: string, order: string[]) => void
  /** Moves a paragraph to another section, carrying its text with it. */
  onBlockMove?: (
    fromSection: string,
    blockKey: string,
    toSection: string,
    index: number,
    sourceKeys: string[],
    targetKeys: string[],
  ) => void
  /** Undo the last change — used by the delete toast's "Annuler" button. */
  onUndo?: () => void
  /** Called after any delete so the assembler can show a toast. */
  onDeleted?: () => void
  onImagesChange?: (sectionId: string, imgs: SectionImage[]) => void
  onFicheChange?: (ficheId: string, patch: Partial<FicheTechnique>) => void
  onTitleEdit?: (field: string, value: string) => void
}

/** An inline text edit: which object it belongs to, the field, and the new value. */
export type EditHandler = (
  source: 'entreprise' | 'section' | 'couverture',
  field: string,
  value: string,
) => void
