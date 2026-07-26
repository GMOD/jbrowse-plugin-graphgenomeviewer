import { placeOffReference } from './placeOffReference'
import { backboneNodes, backboneSpan } from '../anchoredNodes'

import type { Graph, LayoutResult, NodeSegment, RowLabel } from '../types'

// Layout for rGFA, where the graph states its own backbone instead of leaving a
// force simulation to find one. Every segment carries SN/SO/SR (gfatools
// doc/rGFA.md), so both axes come from the file:
//
//   x  reference bp, for every segment. Rank-0 segments sit at the offset they
//      declare; an off-reference segment cannot use its own SO, which is an
//      offset on a different stable sequence, so it takes the slice of the
//      reference its allele replaces (placeOffReference).
//   y  one row per stable rank *present in this subgraph*, the way lh3's own
//      rGFA viewer (VRPG) does it: rank 0 is the reference line, higher ranks
//      below it in order.
//
// Row spacing is the one free parameter, in bp so it tracks the x axis.
const ROW_SPACING_SPAN_FRACTION = 0.05

// Floor on the drawn span of an *off-reference* node, as a fraction of the
// window. Node thickness is a constant number of screen pixels, so at a 50 kb
// window the median 349 bp allele came out ~9 px long against a ~12 px thick
// tube — wider than it was long, drawing as a dot on a stalk rather than the
// second arc of a bubble.
//
// Rank-0 nodes keep the exact offsets they declare, so the reference axis — the
// whole reason to prefer this layout over FMMM — is untouched by the floor.
const MIN_OFF_REFERENCE_SPAN_FRACTION = 0.015

// Rank is a property of the whole graph, not of the window being drawn: HPRC's
// minigraph graph ranks up to 89, but an MHC window holds only ranks
// 0/1/3/6/14/23. Indexing rows by raw rank would leave 17 of 24 rows empty and
// zoom-to-fit would shrink the drawing to fit that void (measured: 0.3% scale).
// So rows are the ranks actually present, in rank order — identical to the raw
// rank whenever the window happens to hold a contiguous run from 0.
function rankRows(graph: Graph) {
  const present = new Set<number>()
  for (const node of graph.nodes) {
    if (node.stable) {
      present.add(node.stable.rank)
    }
  }
  return new Map([...present].sort((a, b) => a - b).map((r, i) => [r, i]))
}

export function anchoredLayout(graph: Graph): LayoutResult | undefined {
  const backbone = backboneNodes(graph)
  if (backbone.length === 0) {
    return undefined
  }

  const span = backboneSpan(backbone)
  const rowSpacing = span * ROW_SPACING_SPAN_FRACTION
  const rows = rankRows(graph)

  const nodePositions: Record<string, NodeSegment[]> = {}
  for (const node of backbone) {
    const y = (rows.get(0) ?? 0) * rowSpacing
    nodePositions[node.id] = [
      { x: node.stable.start, y },
      { x: node.stable.start + node.length, y },
    ]
  }

  placeOffReference({
    graph,
    minSpan: span * MIN_OFF_REFERENCE_SPAN_FRACTION,
    rowY: node => (rows.get(node.stable?.rank ?? 1) ?? rows.size) * rowSpacing,
    positions: nodePositions,
  })

  // Named from the same `rows` map that placed every node, so the axis and the
  // drawing cannot disagree. Rank 0 is spelled out: "the reference" is what a
  // reader needs, and "Rank 0" alone reads as an ordinal with no meaning.
  const rowLabels: RowLabel[] = [...rows].map(([rank, row]) => ({
    label: rank === 0 ? 'Reference (rank 0)' : `Rank ${rank}`,
    y: row * rowSpacing,
  }))

  return { nodePositions, rowLabels }
}
