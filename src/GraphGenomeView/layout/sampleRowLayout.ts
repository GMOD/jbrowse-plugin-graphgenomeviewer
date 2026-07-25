import { parsePanSN, projectAlleles } from '../../alleleProjection/projectAlleles'
import { backboneNodes, backboneSpan } from '../anchoredNodes'

import type { Graph, LayoutResult, NodeSegment } from '../types'

// One row per contributing assembly, x on the reference.
//
// The anchored layout rows by *rank*, which is a property of the graph's
// construction order rather than of any sample: at an HPRC locus rank 1 holds
// alleles from dozens of different haplotypes, so a row there means nothing
// biological. This layout rows by the assembly each allele came from, so a row
// is one sample and reading across it says what that sample does to the
// reference — an insertion bulges past the span it replaces, a deletion leaves
// the row empty across it.
//
// Positions come from `projectAlleles`, which derives them from SN/SO/SR and
// the L-lines alone. rGFA has no W/P records to consult, so anything requiring
// walks could not run on the format the graph tracks read.

const ROW_SPACING_SPAN_FRACTION = 0.05

// Same floor and same reasoning as the anchored layout: node thickness is a
// constant number of screen pixels, so a sub-percent allele draws wider than it
// is long and reads as a dot rather than a bar. Applied only to alleles, whose
// x is synthesized here; backbone segments keep their declared offsets so the
// reference axis stays exact.
const MIN_ALLELE_SPAN_FRACTION = 0.015

// Every assembly with a segment in this subgraph, sorted so rows keep their
// order across pans. Taken from the nodes rather than from the projection's
// per-allele attribution: a bubble path can mix assemblies, and a segment
// belongs on the row of the assembly its own SN names, not on the row of
// whichever contributor happens to dominate the run it sits in.
function contributingSamples(graph: Graph) {
  const samples = new Set<string>()
  for (const node of graph.nodes) {
    if (node.stable && node.stable.rank > 0) {
      samples.add(parsePanSN(node.stable.refName).sample)
    }
  }
  return [...samples].sort()
}

export function sampleRowLayout(graph: Graph): LayoutResult | undefined {
  const backbone = backboneNodes(graph)
  const samples = contributingSamples(graph)
  if (backbone.length === 0 || samples.length === 0) {
    return undefined
  }
  const { alleles } = projectAlleles(graph)

  const span = backboneSpan(backbone)
  const rowSpacing = span * ROW_SPACING_SPAN_FRACTION
  const minAlleleSpan = span * MIN_ALLELE_SPAN_FRACTION

  // The backbone keeps row 0 and every sample gets a row below it, in the
  // order projectAlleles reports (sorted), so rows don't reshuffle on pan.
  const rowOf = new Map(samples.map((s, i) => [s, i + 1]))
  const nodePositions: Record<string, NodeSegment[]> = {}
  const byId = new Map(graph.nodes.map(n => [n.id, n]))

  for (const node of backbone) {
    const { start } = node.stable
    nodePositions[node.id] = [
      { x: start, y: 0 },
      { x: start + node.length, y: 0 },
    ]
  }

  for (const allele of alleles) {
    const drawn = Math.max(allele.altLength, minAlleleSpan)
    // Segments of a multi-segment allele share the run's reference anchor and
    // are laid end to end across it in proportion to their lengths, so the run
    // occupies exactly the width the allele's own sequence justifies.
    let cursor = allele.start
    for (const nodeId of allele.nodeIds) {
      const node = byId.get(nodeId)
      if (node?.stable) {
        const sample = parsePanSN(node.stable.refName).sample
        const y = (rowOf.get(sample) ?? samples.length + 1) * rowSpacing
        // A run whose segments are all zero-length has no lengths to apportion
        // the drawn width by; splitting it evenly beats 0/0, which put NaN in
        // nodePositions and took the whole layout with it.
        const width =
          allele.altLength > 0
            ? (node.length / allele.altLength) * drawn
            : drawn / allele.nodeIds.length
        nodePositions[nodeId] = [
          { x: cursor, y },
          { x: cursor + width, y },
        ]
        cursor += width
      }
    }
  }

  return { nodePositions }
}

// Rows this layout will draw, for a legend or an axis. Exported so a caller
// labels rows from the same source that positions them.
export function sampleRows(graph: Graph) {
  const backbone = graph.nodes.find(n => n.stable?.rank === 0)
  const reference = backbone
    ? parsePanSN(backbone.stable!.refName).sample
    : 'reference'
  return [reference, ...contributingSamples(graph)]
}
