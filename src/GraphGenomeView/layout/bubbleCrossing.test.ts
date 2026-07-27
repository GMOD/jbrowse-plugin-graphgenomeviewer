import { readFileSync } from 'fs'

import { anchoredLayout } from './anchoredLayout'
import { parseGFA } from '../../gfa-core/index'
import { convertGFAToGraph } from '../gfa/gfaConverter'
import { anchorGraph } from '../pathAnchoring'
import { computeEdgeCurves } from '../util/geometry'

import type { Graph, NodeSegment } from '../types'
import type { BezierCurve } from '../util/geometry'

// A bubble is drawn by two edges: the one entering an off-reference node and
// the one leaving it. Those two are the only pair a reader reads as one shape,
// so a crossing between them is a drawing artifact rather than the graph
// genuinely branching, and it is checkable without looking at a picture.
//
// It was not hypothetical: every allele narrower than the visibility floor drew
// as a crossed bowtie, which is what a review of pangenome/local_subgraph
// called "the bezier curves to rank 1 are weird".

function gfa(name: string) {
  return readFileSync(require.resolve(`../../../test_data/${name}`), 'utf8')
}

function sample(c: BezierCurve, t: number) {
  const u = 1 - t
  return {
    x:
      u ** 3 * c.x0 +
      3 * u * u * t * c.cx0 +
      3 * u * t * t * c.cx1 +
      t ** 3 * c.x1,
    y:
      u ** 3 * c.y0 +
      3 * u * u * t * c.cy0 +
      3 * u * t * t * c.cy1 +
      t ** 3 * c.y1,
  }
}

// Tessellate a curve list into one polyline, finely enough that a crossing
// cannot slip between two samples at the scale these are drawn.
function polyline(curves: BezierCurve[]) {
  const pts: { x: number; y: number }[] = []
  for (const c of curves) {
    for (let i = 0; i <= 64; i++) {
      pts.push(sample(c, i / 64))
    }
  }
  return pts
}

interface Point { x: number; y: number }

// Proper (non-touching) segment intersection. Touching is excluded on purpose:
// an entry and an exit edge legitimately share a backbone point when the allele
// they wrap is a pure insertion.
function segmentsCross(a1: Point, a2: Point, b1: Point, b2: Point) {
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = cross(b1, b2, a1)
  const d2 = cross(b1, b2, a2)
  const d3 = cross(a1, a2, b1)
  const d4 = cross(a1, a2, b2)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function polylinesCross(a: Point[], b: Point[]) {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsCross(a[i - 1]!, a[i]!, b[j - 1]!, b[j]!)) {
        return true
      }
    }
  }
  return false
}

function crossingBubbles(
  graph: Graph,
  positions: Record<string, NodeSegment[]>,
) {
  const curvesFor = (from: string, to: string) => {
    const f = positions[from]
    const t = positions[to]
    return f && t ? computeEdgeCurves(f, t, from === to, 0, 0, 1) : undefined
  }
  const crossing: string[] = []
  let checked = 0
  for (const node of graph.nodes) {
    const pos = positions[node.id]
    // y 0 is the backbone row; only an off-reference node has a bubble
    if (pos && pos[0]!.y !== 0) {
      const entry = graph.edges.find(
        e => e.to === node.id && e.from !== node.id,
      )
      const exit = graph.edges.find(e => e.from === node.id && e.to !== node.id)
      const ec = entry ? curvesFor(entry.from, entry.to) : undefined
      const xc = exit ? curvesFor(exit.from, exit.to) : undefined
      if (ec && xc) {
        checked++
        if (polylinesCross(polyline(ec), polyline(xc))) {
          crossing.push(node.id)
        }
      }
    }
  }
  return { crossing, checked }
}

test('no bubble crosses itself on the pggb subgraph', () => {
  const graph = anchorGraph(
    convertGFAToGraph(parseGFA(gfa('ecoli_pggb_subgraph.gfa'))),
    'K12',
  )
  const { crossing, checked } = crossingBubbles(
    graph,
    anchoredLayout(graph)!.nodePositions,
  )
  // so the assertion below cannot pass by checking nothing
  expect(checked).toBeGreaterThan(5)
  expect(crossing).toEqual([])
})

// Deliberately only the pggb subgraph. The rGFA slice fails the same check, for
// an unrelated reason this change does not touch: projectAlleles splits a
// multi-rank run into separate alleles, so a rank-2 segment can be placed
// megabases from the rank-1 segments it attaches to, and the two edges spanning
// that gap cross whatever shape they are drawn in. Visible as the single long X
// in the pangenome/rgfa_subgraph_launch figure.
