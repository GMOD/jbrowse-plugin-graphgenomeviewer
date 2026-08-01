import { placeOffReference } from './placeOffReference'
import { rowSpacing as rowSpacingFor } from './rowSpacing'
import { parsePanSN } from '../../alleleProjection/projectAlleles'
import {
  backboneNodes,
  isOffReference,
  referenceSpan,
} from '../anchoredNodes'

import type { Graph, LayoutResult, NodeSegment, RowLabel } from '../types'

// One row per contributing assembly, x on the reference.
//
// The anchored layout rows by *rank*, which is a property of the graph's
// construction order rather than of any sample: at an HPRC locus rank 1 holds
// alleles from dozens of different haplotypes, so a row there means nothing
// biological. This layout rows by the assembly each allele came from, so a row
// is one sample and reading across it says what that sample does to the
// reference: a deletion leaves the row empty across the span it removes, and an
// insertion is a mark at the point it attaches. Insertion *size* is deliberately
// not on this axis — see placeOffReference.
//
// Positions come from `projectAlleles`, which derives them from the stable
// coordinates and the L-lines alone. rGFA has no W/P records to consult, so
// anything requiring walks could not run on the format the graph tracks read.
//
// What a row means differs with where the coordinates came from, and the
// difference is not cosmetic. On rGFA a segment's SN names the assembly that
// *first contributed* it (SR is build order), so a row is first-seen
// attribution. On a path-anchored graph it names an assembly that actually
// carries the segment. Carriage is a set, though, and a row here is one node's
// one position: where several assemblies carry a segment, it draws on the row
// of the first path in the file that visits it, and `GraphNode.samples` holds
// the rest. Drawing a segment once per carrier needs the layout to emit more
// nodes than the graph has, which the renderer keys by node id and cannot do.

// Visibility floor, in window-span fraction. Node thickness is a constant
// number of screen pixels, so an allele occupying a sub-percent slice of the
// window draws wider than it is long and reads as a dot rather than a bar. A
// pure insertion occupies exactly zero, so without this it would not draw at
// all.
const MIN_ALLELE_SPAN_FRACTION = 0.015

// Every assembly with a segment in this subgraph, sorted so rows keep their
// order across pans. Taken from the nodes rather than from the projection's
// per-allele attribution: a bubble path can mix assemblies, and a segment
// belongs on the row of the assembly its own stable name gives it, not on the
// row of whichever contributor happens to dominate the run it sits in.
//
// Read off the same field `rowY` places by, so every row that exists has nodes
// on it and every node lands on a row that exists.
function contributingSamples(graph: Graph) {
  const samples = new Set<string>()
  for (const node of graph.nodes) {
    if (isOffReference(node)) {
      samples.add(parsePanSN(node.stable.refName).sample)
    }
  }
  return [...samples].sort()
}

export function sampleRowLayout(
  graph: Graph,
  region?: { start: number; end: number },
): LayoutResult | undefined {
  const backbone = backboneNodes(graph)
  const samples = contributingSamples(graph)
  if (backbone.length === 0 || samples.length === 0) {
    return undefined
  }
  const span = referenceSpan(backbone, region)
  // backbone row plus one per sample
  const rowSpacing = rowSpacingFor(span, samples.length + 1)
  const minAlleleSpan = span * MIN_ALLELE_SPAN_FRACTION

  // The backbone keeps row 0 and every sample gets a row below it, in the
  // order projectAlleles reports (sorted), so rows don't reshuffle on pan.
  const rowOf = new Map(samples.map((s, i) => [s, i + 1]))
  const nodePositions: Record<string, NodeSegment[]> = {}

  for (const node of backbone) {
    const { start } = node.stable
    nodePositions[node.id] = [
      { x: start, y: 0 },
      { x: start + node.length, y: 0 },
    ]
  }

  placeOffReference({
    graph,
    minSpan: minAlleleSpan,
    rowY: node =>
      (rowOf.get(parsePanSN(node.stable!.refName).sample) ?? samples.length + 1) *
      rowSpacing,
    positions: nodePositions,
  })

  // Built from the same `rowOf` map that placed the alleles, so a label cannot
  // name a row the layout put somewhere else. Row 0 is the backbone, named for
  // the assembly it comes from rather than "reference", because on this layout
  // that name is one of the samples and reads as a peer of the rows below it.
  const referenceSample = parsePanSN(backbone[0]!.stable.refName).sample
  const rowLabels: RowLabel[] = [
    { label: referenceSample, y: 0 },
    ...samples.map(sample => ({
      label: sample,
      y: rowOf.get(sample)! * rowSpacing,
    })),
  ]

  return { nodePositions, rowLabels, referenceAxis: true }
}
