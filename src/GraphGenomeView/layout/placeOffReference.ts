import { projectAlleles } from '../../alleleProjection/projectAlleles'

import type { Graph, NodeSegment } from '../types'

// Where off-reference segments go on a reference x axis. Shared by the two
// row-structured layouts, which differ only in what a row means (stable rank
// vs contributing assembly); how far along the reference a segment reaches is
// the same question in both, and answering it twice is how they drifted.
//
// The rule: a segment occupies the reference its allele replaces, never its own
// sequence length. x is reference bp — the axis the backbone declares and the
// linear view beside it is drawn on — so an insertion, which consumes no
// reference, must not advance along it. Both layouts used to advance by
// sequence length, which made every off-reference x a false statement about
// reference position and, on a 1 kb window holding a 100 kb allele, drew 101x
// the window so that zoom-to-fit rendered the reference at 1% of the frame.
//
// Magnitude is the cost. An axis of reference coordinates has no way to state
// how much sequence an insertion adds, so it is not stated here: it is in the
// node tooltip, and drawn to scale in the allele-inventory track, where a CIGAR
// gives the alignments display a channel for length that is not the x axis.

interface PlaceArgs {
  graph: Graph
  // visibility floor in bp. Node thickness is a constant number of screen
  // pixels, so a segment occupying a sub-percent slice of the window draws
  // wider than it is long and reads as a dot on a stalk. A pure insertion
  // occupies exactly zero reference, so without a floor it would not draw.
  minSpan: number
  // y for a segment, which is the whole of what the two layouts disagree about
  rowY: (node: Graph['nodes'][number]) => number
  // the backbone, already placed at its declared offsets. Mutated in place, and
  // read for the branch points the unanchored walk below starts from.
  positions: Record<string, NodeSegment[]>
}

export function placeOffReference({
  graph,
  minSpan,
  rowY,
  positions,
}: PlaceArgs) {
  const { alleles } = projectAlleles(graph)
  const byId = new Map(graph.nodes.map(n => [n.id, n]))

  for (const allele of alleles) {
    const drawn = Math.max(allele.refSpan, minSpan)
    // A node sits where it sits *within* the allele: its bp offset from the
    // entry, scaled so the run's longest path fills the reference the allele
    // replaces. So a bubble path occupies the reference exactly once however
    // many segments it is built from, and two parallel branches share the x
    // range rather than queue up after each other — they are alternatives over
    // the same interval, not consecutive sequence.
    //
    // Offsets are measured over the graph rather than over nodeIds' order (see
    // runOffsets). Concatenating in traversal order put graph neighbours 26 kb
    // apart on a 27 kb allele, and the edges spanning those gaps crossed as a
    // long X. A run of all zero-length segments has no distances to scale by;
    // splitting evenly beats 0/0, which wrote NaN into every position after it.
    //
    // Where the floor widens a run past the reference it replaces, the overhang
    // hangs off the right, so the run can end past the rank-0 segment it
    // rejoins and its exit edge runs backwards. That is handled where it shows,
    // in computeEdgeCurves, which sizes each control point by how far the other
    // endpoint lies along its own tangent — a backwards edge gets a straight
    // leader rather than the loop that read as a crossed bowtie.
    const scale = allele.pathLength > 0 ? drawn / allele.pathLength : 0
    allele.nodeIds.forEach((nodeId, i) => {
      const node = byId.get(nodeId)
      if (node) {
        const offset = allele.nodeOffsets[i]!
        const even = drawn / allele.nodeIds.length
        // both ends from the offset rather than start-plus-width, so two nodes
        // the sweep placed end to end land on exactly the same x instead of on
        // two roundings of it
        const at = (bp: number) => allele.start + bp * scale
        const y = rowY(node)
        positions[nodeId] = scale
          ? [
              { x: at(offset), y },
              { x: at(offset + node.length), y },
            ]
          : [
              { x: allele.start + i * even, y },
              { x: allele.start + (i + 1) * even, y },
            ]
      }
    })
  }

  // A run that reaches the edge of the fetched subgraph has only one backbone
  // anchor, so no reference span can be stated for it. That is the normal case
  // at a window boundary, not an error, and dropping it is indistinguishable
  // from the layout being broken — the sample-rows layout did drop them.
  //
  // They get the floor each, chained from wherever they branch: the only honest
  // claim available is "attaches here and continues past the edge", and a floor
  // keeps a chain of them bounded by the window instead of by their sequence.
  const neighbors = new Map<string, string[]>()
  for (const edge of graph.edges) {
    neighbors.set(edge.from, [...(neighbors.get(edge.from) ?? []), edge.to])
    neighbors.set(edge.to, [...(neighbors.get(edge.to) ?? []), edge.from])
  }
  // Read forward while appending, so this is a BFS with an O(1) dequeue rather
  // than a quadratic shift() over what ends up being every node in the run.
  const queue = Object.keys(positions)
  for (const fromId of queue) {
    const fromEnd = positions[fromId]!.at(-1)!.x
    for (const nextId of neighbors.get(fromId) ?? []) {
      const next = byId.get(nextId)
      if (next && !(nextId in positions)) {
        const y = rowY(next)
        positions[nextId] = [
          { x: fromEnd, y },
          { x: fromEnd + minSpan, y },
        ]
        queue.push(nextId)
      }
    }
  }
}
