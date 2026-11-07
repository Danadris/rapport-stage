import { describe, it, expect } from 'vitest'
import { blockKeyFor, materializeSteps, moveBlock } from './blockModel'
import { WIZARD_STEPS } from '../data/sections'
import { createRapport } from './demo'
import type { Rapport } from '../types'

function baseRapport(): Rapport {
  const r = createRapport()
  r.sections = {
    introduction: { presentationBreve: 'Intro texte', objectifsIntro: 'Intro objectifs' },
    deroulement: { departements: 'Fournil, boutique', tachesConfiees: 'Petrir 200 baguettes' },
    taches: { missionsDetaillees: '30 entremets' },
  }
  return r
}

describe('blockKeyFor', () => {
  it('prefers id when present', () => {
    expect(blockKeyFor({ id: 'abc' }, 3)).toBe('abc')
  })
  it('returns paragraphes for merged blocks', () => {
    expect(blockKeyFor({ paragraphes: ['a'] }, 0)).toBe('paragraphes')
  })
  it('returns editPath.field when no id', () => {
    expect(blockKeyFor({ editPath: { field: 'taches:missionsDetaillees' } }, 2)).toBe('taches:missionsDetaillees')
  })
  it('falls back to b<index>', () => {
    expect(blockKeyFor({}, 5)).toBe('b5')
  })
  it('id wins over paragraphes', () => {
    expect(blockKeyFor({ id: 'x', paragraphes: ['a'] }, 1)).toBe('x')
  })
})

describe('materializeSteps', () => {
  it('mirrors the official plan length', () => {
    expect(materializeSteps().length).toBe(WIZARD_STEPS.length)
  })
  it('copies fields shallowly (no shared refs)', () => {
    const a = materializeSteps()
    a[2].fields[0].label = 'MUTATED'
    expect(WIZARD_STEPS[2].fields[0].label).not.toBe('MUTATED')
  })
})

describe('moveBlock refusals', () => {
  it('returns null for same section', () => {
    const r = baseRapport()
    expect(moveBlock(r, 'contexte', 'contexte:rechercheStage', 'contexte', 0, [], [])).toBeNull()
  })
  it('returns null for empty section', () => {
    const r = baseRapport()
    expect(moveBlock(r, '', 'x', 'contexte', 0, [], [])).toBeNull()
    expect(moveBlock(r, 'contexte', 'x', '', 0, [], [])).toBeNull()
  })
  it('returns null when target is a fixed-kind section (presentation)', () => {
    const r = baseRapport()
    expect(moveBlock(r, 'deroulement', 'deroulement:departements', 'presentation', 0, ['deroulement:departements'], [])).toBeNull()
  })
  it('returns null when target is activites', () => {
    const r = baseRapport()
    expect(moveBlock(r, 'deroulement', 'deroulement:departements', 'activites', 0, ['deroulement:departements'], [])).toBeNull()
  })
  it('returns null when target is organigramme', () => {
    const r = baseRapport()
    expect(moveBlock(r, 'deroulement', 'deroulement:departements', 'organigramme', 0, ['deroulement:departements'], [])).toBeNull()
  })
  it('returns null for a free block id that does not exist', () => {
    const r = baseRapport()
    expect(moveBlock(r, 'contexte', 'text:nope', 'objectifs', 0, [], [])).toBeNull()
  })
})

describe('moveBlock free paragraphs (text:<id>)', () => {
  function rWithText() {
    const r = baseRapport()
    r.textBlocks = {
      introduction: [{ id: 't1', text: 'Libre un' }, { id: 't2', text: 'Libre deux' }],
    }
    return r
  }
  it('moves the text and removes it from source', () => {
    const r = rWithText()
    const next = moveBlock(r, 'introduction', 'text:t1', 'contexte', 1, ['text:t1', 'text:t2'], [])
    expect(next).not.toBeNull()
    expect(next!.textBlocks?.introduction?.map((b) => b.id)).toEqual(['t2'])
    expect(next!.textBlocks?.contexte?.map((b) => b.id)).toEqual(['t1'])
    expect(next!.textBlocks?.contexte?.[0].text).toBe('Libre un')
  })
  it('writes blockOrder for both sections', () => {
    const r = rWithText()
    const next = moveBlock(r, 'introduction', 'text:t1', 'contexte', 0, ['text:t1', 'text:t2'], [])
    // free keys keep their text: prefix (afterMoveKey leaves them unchanged)
    expect(next!.blockOrder?.introduction).toEqual(['text:t2'])
    expect(next!.blockOrder?.contexte).toEqual(['text:t1'])
  })
  it('clamps insertion index', () => {
    const r = rWithText()
    const next = moveBlock(r, 'introduction', 'text:t2', 'contexte', 99, ['text:t1', 'text:t2'], [])
    expect(next!.textBlocks?.contexte?.length).toBe(1)
  })
})

describe('moveBlock plan paragraphs', () => {
  it('moves text with the block (no loss)', () => {
    const r = baseRapport()
    const next = moveBlock(r, 'deroulement', 'deroulement:departements', 'taches', 0, ['deroulement:departements', 'deroulement:tachesConfiees'], [])
    expect(next).not.toBeNull()
    expect(next!.sections.taches?.departements).toBe('Fournil, boutique')
    expect(next!.sections.deroulement?.departements).toBeUndefined()
  })
  it('creates customSteps on first move', () => {
    const r = baseRapport()
    expect(r.customSteps).toBeUndefined()
    const next = moveBlock(r, 'deroulement', 'deroulement:departements', 'taches', 0, ['deroulement:departements', 'deroulement:tachesConfiees'], [])
    expect(next!.customSteps).toBeDefined()
    expect(next!.customSteps!.length).toBe(WIZARD_STEPS.length)
  })
  it('removes the field from the source step', () => {
    const r = baseRapport()
    const next = moveBlock(r, 'deroulement', 'deroulement:departements', 'taches', 0, ['deroulement:departements', 'deroulement:tachesConfiees'], [])
    const src = next!.customSteps!.find((s) => s.id === 'deroulement')
    const dst = next!.customSteps!.find((s) => s.id === 'taches')
    // field id is the bare field id after the move (departements), not section:field
    expect(src?.fields.some((f) => f.id === 'departements')).toBe(false)
    expect(dst?.fields.some((f) => f.id === 'departements')).toBe(true)
  })
  it('records the after-move key in blockOrder (field id without section prefix)', () => {
    const r = baseRapport()
    const next = moveBlock(r, 'deroulement', 'deroulement:departements', 'taches', 0, ['deroulement:departements', 'deroulement:tachesConfiees'], [])
    expect(next!.blockOrder?.taches).toContain('departements')
    expect(next!.blockOrder?.deroulement).toEqual(['tachesConfiees'])
  })
  it('moved merged paragraph becomes fusion-<a>-<b>', () => {
    const r = baseRapport()
    // remerciements is a merged paragraph (paragraphes) with fieldIds [personnes, raisons]
    const next = moveBlock(r, 'remerciements', 'paragraphes', 'contexte', 0, ['paragraphes'], [])
    expect(next).not.toBeNull()
    const fused = next!.customSteps!.find((s) => s.id === 'contexte')!.fields.find((f) => f.id.startsWith('fusion-'))
    expect(fused).toBeDefined()
    expect(fused!.id).toBe('fusion-personnes-raisons')
  })
  it('original rapport is untouched (pure)', () => {
    const r = baseRapport()
    const before = JSON.stringify(r.sections)
    moveBlock(r, 'contexte', 'contexte:rechercheStage', 'objectifs', 0, ['contexte:rechercheStage'], [])
    expect(JSON.stringify(r.sections)).toBe(before)
  })
})
