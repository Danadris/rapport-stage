import { describe, it, expect } from 'vitest'
import { buildTree, assignPositions, collectNodes, collectEdges, layoutList } from './orgLayout'
import type { OrgNode } from '../../types'

const nodes = (rows: Array<[string, string, string?]>) =>
  rows.map(([id, title, parentId]) => ({ id, title, name: `Name ${id}`, parentId }) as OrgNode)

describe('orgLayout', () => {
  it('buildTree roots orphans and self-parents', () => {
    const roots = buildTree(nodes([['a', 'Dir'], ['b', 'Chef', 'a'], ['c', 'Orphan', 'missing'], ['d', 'Self', 'd']]))
    expect(roots.map((r) => r.node.id).sort()).toEqual(['a', 'c', 'd'])
    expect(roots.find((r) => r.node.id === 'a')!.children.map((c) => c.node.id)).toEqual(['b'])
  })
  it('assignPositions gives every node a position, children below parents (vertical)', () => {
    const roots = buildTree(nodes([['a', 'Dir'], ['b', 'Chef', 'a'], ['c', 'Boulanger', 'b']]))
    assignPositions(roots, 'vertical')
    const all = collectNodes(roots)
    expect(all.length).toBe(3)
    const byId = new Map(all.map((t) => [t.node.id, t]))
    expect(byId.get('b')!.y).toBeGreaterThan(byId.get('a')!.y)
    expect(byId.get('c')!.y).toBeGreaterThan(byId.get('b')!.y)
  })
  it('horizontal: children to the right', () => {
    const roots = buildTree(nodes([['a', 'Dir'], ['b', 'Chef', 'a']]))
    assignPositions(roots, 'horizontal')
    const byId = new Map(collectNodes(roots).map((t) => [t.node.id, t]))
    expect(byId.get('b')!.x).toBeGreaterThan(byId.get('a')!.x)
  })
  it('collectEdges: one edge per parent-child link', () => {
    const roots = buildTree(nodes([['a', 'Dir'], ['b', 'Chef', 'a'], ['c', 'Boulanger', 'a']]))
    assignPositions(roots, 'vertical')
    expect(collectEdges(roots, 'vertical').length).toBe(2)
  })
  it('layoutList is depth-first', () => {
    const roots = buildTree(nodes([['a', 'Dir'], ['b', 'Chef', 'a'], ['c', 'Boulanger', 'b'], ['d', 'Boutique', 'a']]))
    const { rows } = layoutList(roots)
    expect(rows.map((r) => r.node.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 1])
  })
})
