import { isBackbone } from './anchoredNodes'
import { computeEdgeCurves } from './util/geometry'

import type { Graph } from './types'

// A deletion is the one kind of variation this view could not draw, and the
// reason is structural rather than cosmetic: extra sequence is a *node*, so it
// gets a tube, a colour and a hover. Missing sequence is an **edge** — a link
// from one backbone segment to another that is not its neighbour — and every
// edge in the drawing was painted the same grey, so the graph said nothing about
// the events a linear view is worst at.
//
// It needs no new data. Both endpoints of such an edge carry rGFA coordinates on
// the same stable sequence, so the bp the haplotype skips is the gap between
// them, and the whole classification is arithmetic on SN/SO plus the segment
// lengths already parsed. `agent-docs/reference/PANGENOME_GRAPHS.md` in
// jbrowse-components measured what this finds on the hosted HPRC graph: 8
// deletions in the 200 kb MHC class II window against 78 attributed alleles, 1
// in the 70 kb C4 window.
//
// Two things this deliberately does not do:
//
//   - it does not attribute the deletion to a haplotype. A backbone-to-backbone
//     skip has GRCh38 at both ends, so there is no `SN` naming a donor, and the
//     same reference note records why: a deletion only carries a donor when it
//     also carries novel sequence, and then it is not a clean deletion any more.
//   - it does not treat a same-position link as a deletion. Adjacent backbone
//     segments abut (gap 0) and a substitution's flanks can overlap by the
//     aligned bases, so only a positive gap counts.

// A skip has to clear this to be drawn as a deletion. minigraph's SV-resolution
// graph does not record anything smaller than tens of bp, so this is not a
// biological threshold but a guard against calling a rounding artifact a
// deletion — abutting segments are the common case and they must not light up.
const MIN_DELETION_BP = 1

export interface DeletionEdge {
  // index into graph.edges, which is what the renderer keys its curve ranges by
  edgeIndex: number
  // the edge's own endpoints, so anything that needs the arc as it is DRAWN can
  // rebuild it (deletionArcCurves) instead of approximating it from `bypassed`
  from: string
  to: string
  refName: string
  start: number
  end: number
  bp: number
  // Backbone node ids whose reference interval lies inside the skipped span:
  // the route a haplotype taking this edge does NOT take. A drawing sizes the
  // deletion's arc off their drawn length so the two arms of the bubble are
  // comparable; nothing else can supply that, because in a force layout the
  // edge's own endpoints are wherever the simulation put them.
  bypassed: string[]
}

// How far a deletion's arc bows out, in layout units: a fraction of the drawn
// length of the backbone it bypasses. Shared by the geometry that draws the arc
// and the overlay that labels it, so the label cannot drift off the curve.
export const DELETION_BULGE_FRACTION = 0.35

export function deletionBulge(
  nodePositions: Record<string, { x: number; y: number }[]>,
  bypassed: string[],
) {
  return (
    DELETION_BULGE_FRACTION *
    bypassed.reduce((total, id) => {
      const segs = nodePositions[id]
      const first = segs?.[0]
      const last = segs?.[segs.length - 1]
      return first && last
        ? total + Math.hypot(last.x - first.x, last.y - first.y)
        : total
    }, 0)
  )
}

// The deletion's arc exactly as the renderer draws it, for anything that has to
// agree with the drawing: the label that rides it, and hit detection.
//
// This exists because the label used to be placed at an apex derived from the
// BYPASSED nodes while the curve was drawn between the EDGE's endpoints. In an
// anchored layout the bypassed run lies between the endpoints, so the two agreed
// and the divergence was invisible; under FMMM the endpoints are wherever the
// simulation left them and the bypassed run is elsewhere, so the words and the
// arc they named came out in different corners of the drawing
// (`pangenome/hprc_cfhr_deletion`, reviewed 2026-07-31). One function is the fix:
// a second derivation of the same curve is a second thing to keep in step.
export function deletionArcCurves(
  nodePositions: Record<string, { x: number; y: number }[]>,
  deletion: DeletionEdge,
  scale: number,
) {
  const from = nodePositions[deletion.from]
  const to = nodePositions[deletion.to]
  return from?.length && to?.length
    ? computeEdgeCurves(
        from,
        to,
        deletion.from === deletion.to,
        0,
        0,
        scale,
        deletionBulge(nodePositions, deletion.bypassed),
      )
    : undefined
}

// Every edge that skips reference sequence, in graph.edges order.
export function deletionEdges(graph: Graph): DeletionEdge[] {
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const backbone = graph.nodes.filter(isBackbone)
  const found: DeletionEdge[] = []
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    const edge = graph.edges[edgeIndex]!
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (
      from !== undefined &&
      to !== undefined &&
      isBackbone(from) &&
      isBackbone(to) &&
      from.stable.refName === to.stable.refName
    ) {
      // A GFA states a link in either orientation and single-node mode collapses
      // both onto one node, so which endpoint is upstream comes from the
      // coordinates rather than from from/to.
      const [left, right] =
        from.stable.start <= to.stable.start ? [from, to] : [to, from]
      const start = left.stable.start + left.length
      const end = right.stable.start
      const bp = end - start
      if (bp >= MIN_DELETION_BP) {
        const refName = left.stable.refName
        found.push({
          edgeIndex,
          from: edge.from,
          to: edge.to,
          refName,
          start,
          end,
          bp,
          bypassed: backbone
            .filter(
              n =>
                n.stable.refName === refName &&
                n.stable.start >= start &&
                n.stable.start + n.length <= end,
            )
            .map(n => n.id),
        })
      }
    }
  }
  return found
}
