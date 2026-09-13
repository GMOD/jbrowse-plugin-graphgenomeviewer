import { orderedLayout, referenceOrder } from './orderedLayout'
import { ROW_HEIGHT_PX } from './rowSpacing'
import { parseGFA } from '../../gfa-core/index'
import { convertGFAToGraph } from '../gfa/gfaConverter'

// chr1 runs v1->v2->v3->v4; two single-segment alleles, a1 (foo) and a2 (bar),
// each replace v3 between the same anchors, so they share a layer and have to
// take different lanes. The file lists the L-lines in reference direction.
const BUBBLE = `S\tv1\tAAAAA\tLN:i:5\tSN:Z:chr1\tSO:i:0\tSR:i:0
S\tv2\tCCC\tLN:i:3\tSN:Z:chr1\tSO:i:5\tSR:i:0
S\tv3\tGG\tLN:i:2\tSN:Z:chr1\tSO:i:8\tSR:i:0
S\tv4\tTTTTTTT\tLN:i:7\tSN:Z:chr1\tSO:i:10\tSR:i:0
S\ta1\tAC\tLN:i:2\tSN:Z:foo\tSO:i:8\tSR:i:1
S\ta2\tT\tLN:i:1\tSN:Z:bar\tSO:i:8\tSR:i:2
L\tv1\t+\tv2\t+\t0M
L\tv2\t+\tv3\t+\t0M
L\tv3\t+\tv4\t+\t0M
L\tv2\t+\ta1\t+\t0M
L\ta1\t+\tv4\t+\t0M
L\tv2\t+\ta2\t+\t0M
L\ta2\t+\tv4\t+\t0M`

const BACKBONE = ['v1+', 'v2+', 'v3+', 'v4+']

function graphOf(gfa: string) {
  return convertGFAToGraph(parseGFA(gfa))
}

function layout(gfa: string) {
  return orderedLayout(graphOf(gfa))!.nodePositions
}

const centre = (seg: { x: number }[]) => (seg[0]!.x + seg.at(-1)!.x) / 2

test('backbone x strictly increases in reference order', () => {
  const pos = layout(BUBBLE)
  const xs = BACKBONE.map(id => centre(pos[id]!))
  for (let i = 1; i < xs.length; i++) {
    expect(xs[i]!).toBeGreaterThan(xs[i - 1]!)
  }
})

test('no two nodes share a layer and a lane', () => {
  const pos = layout(BUBBLE)
  const cells = Object.values(pos).map(seg => `${centre(seg)},${seg[0]!.y}`)
  expect(new Set(cells).size).toBe(cells.length)
})

test('the backbone holds lane 0 and nothing else does', () => {
  const pos = layout(BUBBLE)
  for (const id of BACKBONE) {
    expect(pos[id]!.every(p => p.y === 0)).toBe(true)
  }
  expect(pos['a1+']![0]!.y).not.toBe(0)
  expect(pos['a2+']![0]!.y).not.toBe(0)
})

test('every edge runs left to right', () => {
  const graph = graphOf(BUBBLE)
  const pos = orderedLayout(graph)!.nodePositions
  for (const { from, to } of graph.edges) {
    expect(centre(pos[from]!)).toBeLessThan(centre(pos[to]!))
  }
})

test("a bubble's two alleles share a layer on different lanes", () => {
  const pos = layout(BUBBLE)
  const a1 = pos['a1+']!
  const a2 = pos['a2+']!
  expect(centre(a1)).toBe(centre(a2))
  expect(a1[0]!.y).not.toBe(a2[0]!.y)
  // both one or more lane pitches off the reference line
  expect(Math.abs(a1[0]!.y) % ROW_HEIGHT_PX).toBe(0)
  expect(Math.abs(a2[0]!.y)).toBeGreaterThanOrEqual(ROW_HEIGHT_PX)
})

test('an allele sits between its anchors, not under one of them', () => {
  const pos = layout(BUBBLE)
  expect(centre(pos['a1+']!)).toBeGreaterThan(centre(pos['v2+']!))
  expect(centre(pos['a1+']!)).toBeLessThan(centre(pos['v4+']!))
})

test('a node is a two-point polyline as wide as the log of its bp', () => {
  const pos = layout(BUBBLE)
  const seg = pos['v4+']!
  expect(seg).toHaveLength(2)
  expect(seg[1]!.x - seg[0]!.x).toBeCloseTo(10 + 8 * Math.log2(8), 5)
})

test('x is order, and y a lane pitch in screen px', () => {
  const result = orderedLayout(graphOf(BUBBLE))!
  expect(result.referenceAxis).toBe(false)
  expect(result.pixelRows).toBe(true)
  expect(result.rowLabels).toBeUndefined()
  expect(result.alleleDeletions).toBeUndefined()
})

test('a graph without a backbone gets no ordered layout', () => {
  const plain = `S\t1\tACGT
S\t2\tGGCC
L\t1\t+\t2\t+\t0M`
  expect(orderedLayout(graphOf(plain))).toBeUndefined()
})

test('the same graph always gets the same drawing', () => {
  const graph = graphOf(BUBBLE)
  expect(orderedLayout(graph)).toEqual(orderedLayout(graph))
  expect(referenceOrder(graph)).toEqual(referenceOrder(graphOf(BUBBLE)))
})

test('reference order is backbone by offset, alleles just past their anchor', () => {
  expect(referenceOrder(graphOf(BUBBLE))).toEqual([
    'v1+',
    'v2+',
    'a1+',
    'a2+',
    'v3+',
    'v4+',
  ])
})
