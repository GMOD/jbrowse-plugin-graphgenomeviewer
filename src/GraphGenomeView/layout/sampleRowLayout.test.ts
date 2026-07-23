import { readFileSync } from 'fs'

import { sampleRowLayout, sampleRows } from './sampleRowLayout'
import { parseGFA } from '../../gfa-core/index'
import { convertGFAToGraph } from '../gfa/gfaConverter'

function ecoliGraph() {
  const gfa = readFileSync(
    require.resolve('../../../test_data/ecoli_rgfa_slice.gfa'),
    'utf8',
  )
  return convertGFAToGraph(parseGFA(gfa), 'ecoli')
}

function pggbGraph() {
  const gfa = readFileSync(
    require.resolve('../../../test_data/ecoli_pggb_subgraph.gfa'),
    'utf8',
  )
  return convertGFAToGraph(parseGFA(gfa), 'pggb')
}

test('rows are the backbone plus one per contributing assembly', () => {
  expect(sampleRows(ecoliGraph())).toEqual([
    'K12',
    'CFT073',
    'NCTC86',
    'Sakai',
  ])
})

test('backbone keeps its declared reference offsets', () => {
  const graph = ecoliGraph()
  const { nodePositions } = sampleRowLayout(graph)!
  for (const node of graph.nodes.filter(n => n.stable?.rank === 0)) {
    const [left, right] = nodePositions[node.id]!
    expect(left!.x).toBe(node.stable!.start)
    expect(right!.x).toBe(node.stable!.start + node.length)
    expect(left!.y).toBe(0)
  }
})

test('every allele of one sample lands on that sample row', () => {
  const graph = ecoliGraph()
  const { nodePositions } = sampleRowLayout(graph)!
  const rows = new Map<string, Set<number>>()
  for (const node of graph.nodes) {
    const position = nodePositions[node.id]
    if (position && node.stable && node.stable.rank > 0) {
      const sample = node.stable.refName.split('#')[0]!
      const set = rows.get(sample) ?? new Set()
      set.add(position[0]!.y)
      rows.set(sample, set)
    }
  }
  expect(rows.size).toBeGreaterThan(1)
  for (const ys of rows.values()) {
    expect(ys.size).toBe(1)
  }
  // and distinct samples occupy distinct rows
  const allY = [...rows.values()].map(s => [...s][0]!)
  expect(new Set(allY).size).toBe(allY.length)
})

test('alleles sit at their reference anchor, not at their SO on another contig', () => {
  const graph = ecoliGraph()
  const { nodePositions } = sampleRowLayout(graph)!
  const backboneStart = Math.min(
    ...graph.nodes.filter(n => n.stable?.rank === 0).map(n => n.stable!.start),
  )
  const backboneEnd = Math.max(
    ...graph.nodes
      .filter(n => n.stable?.rank === 0)
      .map(n => n.stable!.start + n.length),
  )
  for (const node of graph.nodes.filter(n => n.stable && n.stable.rank > 0)) {
    const position = nodePositions[node.id]
    if (position) {
      expect(position[0]!.x).toBeGreaterThanOrEqual(backboneStart)
      expect(position[0]!.x).toBeLessThanOrEqual(backboneEnd)
    }
  }
})

test('declines a graph with no rank-0 backbone rather than inventing one', () => {
  expect(sampleRowLayout(pggbGraph())).toBeUndefined()
})
