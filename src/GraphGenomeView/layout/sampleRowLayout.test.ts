import { readFileSync } from 'fs'

import { sampleRowLayout } from './sampleRowLayout'
import { parseGFA } from '../../gfa-core/index'
import { convertGFAToGraph } from '../gfa/gfaConverter'
import { anchorGraph } from '../pathAnchoring'

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
  const { rowLabels } = sampleRowLayout(ecoliGraph())!
  expect(rowLabels!.map(r => r.label)).toEqual([
    'K12',
    'CFT073',
    'NCTC86',
    'Sakai',
  ])
})

// A label that names a row the layout put elsewhere is worse than no label, so
// this checks the two against each other rather than against a fixed number.
test('each row label sits at the y its own samples were drawn at', () => {
  const graph = ecoliGraph()
  const { nodePositions, rowLabels } = sampleRowLayout(graph)!
  const labelY = new Map(rowLabels!.map(r => [r.label, r.y]))
  for (const node of graph.nodes) {
    const position = nodePositions[node.id]
    if (position && node.stable) {
      const sample = node.stable.refName.split('#')[0]!
      expect(labelY.get(sample)).toBe(position[0]!.y)
    }
  }
})

// x on this layout is reference bp, so an allele may only occupy the reference
// it replaces. An insertion replaces none, and drawing it at its own sequence
// length put a 113 kb E. coli allele across coordinates it does not own and
// collapsed zoom-to-fit to 1%.
test('a pure insertion does not advance along the reference axis', () => {
  const gfa =
    'H\tVN:Z:1.0\n' +
    'S\ts1\t*\tLN:i:500\tSN:Z:K12#1#chr\tSO:i:0\tSR:i:0\n' +
    'S\ts2\t*\tLN:i:500\tSN:Z:K12#1#chr\tSO:i:500\tSR:i:0\n' +
    'S\ta1\t*\tLN:i:100000\tSN:Z:Sakai#1#chr\tSO:i:0\tSR:i:1\n' +
    'L\ts1\t+\ta1\t+\t0M\n' +
    'L\ta1\t+\ts2\t+\t0M\n'
  const graph = convertGFAToGraph(parseGFA(gfa), 'insertion')

  const { nodePositions } = sampleRowLayout(graph)!

  // the 100 kb allele draws as a marker at its anchor, at the 1.5% visibility
  // floor of the 1000 bp window, not at 100000
  // node ids carry a strand suffix; the segment is a1
  const [left, right] = nodePositions['a1+']!
  expect(right!.x - left!.x).toBe(15)

  // so nothing is drawn outside the window the backbone defines, give or take
  // that marker
  const xs = Object.values(nodePositions).flatMap(segs => segs.map(s => s.x))
  expect(Math.max(...xs)).toBeLessThanOrEqual(1015)
})

// The other side of the same rule: a deletion does consume reference, so it
// keeps its true width and the row reads as empty across exactly that span.
test('a deletion draws at its true reference width', () => {
  const gfa =
    'H\tVN:Z:1.0\n' +
    'S\ts1\t*\tLN:i:500\tSN:Z:K12#1#chr\tSO:i:0\tSR:i:0\n' +
    'S\ts2\t*\tLN:i:500\tSN:Z:K12#1#chr\tSO:i:500\tSR:i:0\n' +
    'S\ts3\t*\tLN:i:500\tSN:Z:K12#1#chr\tSO:i:1000\tSR:i:0\n' +
    'S\ta1\t*\tLN:i:100\tSN:Z:Sakai#1#chr\tSO:i:0\tSR:i:1\n' +
    'L\ts1\t+\ta1\t+\t0M\n' +
    'L\ta1\t+\ts3\t+\t0M\n'
  const graph = convertGFAToGraph(parseGFA(gfa), 'deletion')

  const { nodePositions } = sampleRowLayout(graph)!

  // 100 bp of sequence replacing s2's 500 bp of reference: it spans the
  // reference it replaces, not the sequence it carries
  const [left, right] = nodePositions['a1+']!
  expect(right!.x - left!.x).toBe(500)
})

// A pggb GFA tags no segment with a coordinate, so until its paths are walked
// there is no backbone to row against and inventing one would be inventing an
// axis.
test('declines a graph with no rank-0 backbone rather than inventing one', () => {
  expect(sampleRowLayout(pggbGraph())).toBeUndefined()
})

// Walked, the same graph rows exactly like the rGFA one — and better: a row
// here is a strain that carries the allele, where rGFA's is the strain that
// first contributed it.
test('a pggb graph rows once its paths are walked', () => {
  const graph = anchorGraph(pggbGraph(), 'K12')
  const { nodePositions, rowLabels } = sampleRowLayout(graph)!

  expect(rowLabels!.map(r => r.label)).toEqual([
    'K12',
    'CFT073',
    'IAI39',
    'NCTC86',
    'Sakai',
  ])
  // every node drawn, and every one of them on the row its own stable name
  // names — no node stranded off the rows the labels claim
  expect(Object.keys(nodePositions)).toHaveLength(graph.nodes.length)
  const labelY = new Map(rowLabels!.map(r => [r.label, r.y]))
  for (const node of graph.nodes) {
    const sample = node.stable!.refName.split('#')[0]!
    expect(nodePositions[node.id]![0]!.y).toBe(labelY.get(sample))
  }
})

// The drawn width of an allele's segments is apportioned by their share of the
// run's total length, so a run that is all zero-length segments divided 0 by 0
// and wrote NaN into every position downstream of it.
test('a zero-length allele gets finite positions', () => {
  const gfa =
    'H\tVN:Z:1.0\n' +
    'S\ts1\t*\tLN:i:100\tSN:Z:K12#1#chr\tSO:i:0\tSR:i:0\n' +
    'S\ts2\t*\tLN:i:100\tSN:Z:K12#1#chr\tSO:i:100\tSR:i:0\n' +
    'S\ta1\t*\tLN:i:0\tSN:Z:Sakai#1#chr\tSO:i:0\tSR:i:1\n' +
    'L\ts1\t+\ta1\t+\t0M\n' +
    'L\ta1\t+\ts2\t+\t0M\n'
  const graph = convertGFAToGraph(parseGFA(gfa), 'zero')

  const { nodePositions } = sampleRowLayout(graph)!

  for (const segments of Object.values(nodePositions)) {
    for (const { x, y } of segments) {
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
    }
  }
})
