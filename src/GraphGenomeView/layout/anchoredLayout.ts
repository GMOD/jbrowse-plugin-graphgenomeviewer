import type { Graph, LayoutResult, NodeSegment } from '../types'

// Layout for rGFA, where the graph states its own backbone instead of leaving a
// force simulation to find one. Every segment carries SN/SO/SR (gfatools
// doc/rGFA.md), so both axes come from the file:
//
//   x  reference bp. Rank-0 segments sit at the offset they declare; segments
//      off the reference are laid end to end from wherever they branch, at
//      their own bp length, because their SO is an offset on a different stable
//      sequence and is not comparable to the reference axis.
//   y  one row per stable rank *present in this subgraph*, the way lh3's own
//      rGFA viewer (VRPG) does it: rank 0 is the reference line, higher ranks
//      below it in order.
//
// Row spacing is the one free parameter, in bp so it tracks the x axis.
const ROW_SPACING_SPAN_FRACTION = 0.05

// Floor on the drawn length of an *off-reference* node, as a fraction of the
// window span. Node length here is bp and node thickness is a constant number
// of screen pixels, so at a 50 kb window the median 349 bp allele came out
// ~9 px long against a ~12 px thick tube — wider than it was long, drawing as a
// dot on a stalk rather than the second arc of a bubble.
//
// This applies only to rank>0 nodes, and that is what makes it safe: their x is
// synthesized here (laid end to end from wherever they branch) because their SO
// is an offset on a different stable sequence. Rank-0 nodes keep the exact
// offsets they declare, so the reference axis — the whole reason to prefer this
// layout over FMMM — is untouched.
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
  const backbone = graph.nodes.filter(n => n.stable?.rank === 0)
  if (backbone.length === 0) {
    return undefined
  }

  const starts = backbone.map(n => n.stable!.start)
  const span =
    Math.max(...backbone.map(n => n.stable!.start + n.length)) -
    Math.min(...starts)
  const rowSpacing = span * ROW_SPACING_SPAN_FRACTION
  const rows = rankRows(graph)

  const neighbors = new Map<string, string[]>()
  function link(a: string, b: string) {
    const existing = neighbors.get(a)
    if (existing) {
      existing.push(b)
    } else {
      neighbors.set(a, [b])
    }
  }
  for (const edge of graph.edges) {
    link(edge.from, edge.to)
    link(edge.to, edge.from)
  }

  const minOffReferenceLength = span * MIN_OFF_REFERENCE_SPAN_FRACTION

  const nodePositions: Record<string, NodeSegment[]> = {}
  function place(id: string, x: number, rank: number, length: number) {
    const y = (rows.get(rank) ?? rows.size) * rowSpacing
    const drawn = rank === 0 ? length : Math.max(length, minOffReferenceLength)
    nodePositions[id] = [
      { x, y },
      { x: x + drawn, y },
    ]
  }

  for (const node of backbone) {
    place(node.id, node.stable!.start, 0, node.length)
  }

  // Walk out from the backbone, each new segment starting where the one it
  // branched from ends, so an insertion occupies its own length in bp (or the
  // floor above, whichever is larger).
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const queue = backbone.map(n => n.id)
  while (queue.length > 0) {
    const fromId = queue.shift()!
    const fromEnd = nodePositions[fromId]!.at(-1)!.x
    for (const nextId of neighbors.get(fromId) ?? []) {
      const next = byId.get(nextId)
      if (next && !(nextId in nodePositions)) {
        place(nextId, fromEnd, next.stable?.rank ?? 1, next.length)
        queue.push(nextId)
      }
    }
  }

  return { nodePositions }
}
