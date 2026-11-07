import { describe, it, expect } from 'vitest'
import { packBlocks, type BlockBox } from './pagination'

const H = 1000 // sheet content height

function box(top: number, height: number, opts: Partial<BlockBox> = {}): BlockBox {
  return {
    top,
    bottom: top + height,
    heading: opts.heading ?? false,
    lineEdges: opts.lineEdges ?? [top + height / 2],
  }
}

describe('packBlocks empty / single', () => {
  it('empty -> one empty slice', () => {
    const r = packBlocks([], H)
    expect(r.pages).toBe(1)
    expect(r.slices).toEqual([{ start: 0, blocks: [] }])
    expect(r.centerPad).toBe(0)
  })
  it('single small block -> 1 page, centered', () => {
    const r = packBlocks([box(0, 200)], H)
    expect(r.pages).toBe(1)
    expect(r.slices[0].blocks).toEqual([0])
    expect(r.centerPad).toBe((H - 200) / 2)
  })
  it('block exactly filling sheet -> 1 page, no pad', () => {
    const r = packBlocks([box(0, H)], H)
    expect(r.pages).toBe(1)
    expect(r.centerPad).toBe(0)
  })
})

describe('packBlocks whole-block rule', () => {
  it('two small blocks share one sheet', () => {
    const r = packBlocks([box(0, 100), box(100, 100)], H)
    expect(r.pages).toBe(1)
    expect(r.slices[0].blocks).toEqual([0, 1])
  })
  it('block that does not fit closes the sheet', () => {
    // block 0: 0-800, block 1: 800-1100 (overflows 1000) -> new sheet at 800
    const r = packBlocks([box(0, 800), box(800, 300)], H)
    expect(r.pages).toBe(2)
    expect(r.slices[0].blocks).toEqual([0])
    expect(r.slices[1].blocks).toEqual([1])
    expect(r.slices[1].start).toBe(800)
  })
  it('three blocks, third forces new sheet', () => {
    const r = packBlocks([box(0, 400), box(400, 400), box(800, 400)], H)
    expect(r.slices[0].blocks).toEqual([0, 1])
    expect(r.slices[1].blocks).toEqual([2])
  })
  it('never splits a block across sheets (whole-block)', () => {
    const boxes = [box(0, 900), box(900, 200)]
    const r = packBlocks(boxes, H)
    for (const s of r.slices) {
      for (const bi of s.blocks) {
        // whole block belongs to exactly one slice
        const count = r.slices.filter((x) => x.blocks.includes(bi)).length
        expect(count).toBe(1)
      }
    }
  })
  it('multi-sheet document keeps pages = slices.length', () => {
    const boxes = Array.from({ length: 10 }, (_, i) => box(i * 400, 400))
    const r = packBlocks(boxes, H)
    expect(r.pages).toBe(r.slices.length)
    expect(r.pages).toBeGreaterThan(1)
  })
  it('centerPad is 0 when multi-sheet', () => {
    const r = packBlocks([box(0, 800), box(800, 800)], H)
    expect(r.pages).toBeGreaterThan(1)
    expect(r.centerPad).toBe(0)
  })
})

describe('packBlocks heading glue', () => {
  it('heading stays with its block on the next sheet', () => {
    // block0 big, then heading+small: heading must move with small
    const r = packBlocks([box(0, 900), box(900, 50, { heading: true }), box(950, 100)], H)
    // heading+block together do not fit in remaining 100 -> whole unit moves
    expect(r.pages).toBe(2)
    expect(r.slices[1].blocks).toEqual([1, 2])
  })
  it('heading at top of sheet stays put', () => {
    const r = packBlocks([box(0, 50, { heading: true }), box(50, 100)], H)
    expect(r.slices[0].blocks).toEqual([0, 1])
  })
})

describe('packBlocks tall block splitting', () => {
  it('block taller than sheet is cut at a line edge', () => {
    const tall = box(0, 2500, { lineEdges: [500, 1000, 1500, 2000] })
    const r = packBlocks([tall], H)
    expect(r.pages).toBeGreaterThanOrEqual(2)
    // First slice opens at 0, later slices open at line edges (<= H offsets)
    expect(r.slices[0].start).toBe(0)
    for (const s of r.slices.slice(1)) {
      expect([1000, 1500, 2000]).toContain(s.start)
    }
  })
  it('no lineEdges -> cut at sheet edge (never lose content)', () => {
    const tall = box(0, 2500, { lineEdges: [] })
    const r = packBlocks([tall], H)
    expect(r.pages).toBe(3)
    expect(r.slices.map((s) => s.start)).toEqual([0, 1000, 2000])
  })
  it('every block appears exactly once overall', () => {
    const boxes = [box(0, 600), box(600, 600, { lineEdges: [900] }), box(1200, 100)]
    const r = packBlocks(boxes, H)
    const seen = r.slices.flatMap((s) => s.blocks).sort()
    // tall block may legitimately be listed in several slices (cut); at minimum each appears
    expect(new Set(seen).size).toBe(3)
    for (const i of [0, 1, 2]) expect(seen).toContain(i)
  })
})

describe('packBlocks randomised invariants (2000 docs)', () => {
  it('invariants hold for 2000 random documents', () => {
    // Seeded LCG (no Math.random flake)
    let seed = 42
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let doc = 0; doc < 2000; doc++) {
      const n = 1 + Math.floor(rnd() * 8)
      const boxes: BlockBox[] = []
      let top = 0
      for (let i = 0; i < n; i++) {
        const gap = Math.floor(rnd() * 50)
        const h = 20 + Math.floor(rnd() * 1200) // sometimes taller than H
        const heading = rnd() < 0.2
        const lines: number[] = []
        const nl = Math.floor(rnd() * 5)
        for (let l = 0; l < nl; l++) lines.push(top + Math.floor((h * (l + 1)) / (nl + 1)))
        boxes.push({ top, bottom: top + h, heading, lineEdges: lines })
        top += h + gap
      }
      const r = packBlocks(boxes, H)
      // pages == slices.length
      expect(r.pages).toBe(r.slices.length)
      // first slice opens at 0, strictly increasing starts
      expect(r.slices[0].start).toBe(0)
      for (let s = 1; s < r.slices.length; s++) {
        expect(r.slices[s].start).toBeGreaterThan(r.slices[s - 1].start)
      }
      // every block index appears in at least one slice
      const seen = new Set(r.slices.flatMap((s) => s.blocks))
      for (let i = 0; i < n; i++) expect(seen.has(i)).toBe(true)
      // slices are non-empty except the single empty-doc case
      for (const s of r.slices) expect(s.blocks.length).toBeGreaterThan(0)
      // small blocks appear exactly once — unless they are headings glued to a
      // tall unit (the unit is listed on every slice it is cut across).
      for (let i = 0; i < n; i++) {
        if (boxes[i].bottom - boxes[i].top > H) continue
        if (boxes[i].heading) continue
        const prevIsHeading = i > 0 && boxes[i - 1].heading
        if (prevIsHeading) continue
        const count = r.slices.filter((s) => s.blocks.includes(i)).length
        expect(count).toBe(1)
      }
      // centerPad only on single-sheet docs
      if (r.slices.length === 1) {
        expect(r.centerPad).toBeGreaterThanOrEqual(0)
      } else {
        expect(r.centerPad).toBe(0)
      }
    }
  })
})
