import { deletionBulge } from './deletionEdges'

import type { DeletionEdge } from './deletionEdges'
import type { NodeSegment } from './types'

// What to write on the drawing, and where. Bandage labels a node with its name,
// its length or its depth; a segment id means nothing to a reader of a pangenome
// ("s462766"), so the label here is the one fact that carries the story — how
// much sequence the alternative is worth. A node says its length, a deletion arc
// says what it removes.
//
// Only what fits gets a label. The threshold is in SCREEN pixels rather than in
// layout units, because whether a label is legible depends on the zoom and not
// on the graph: at a wide view the same node is a speck, and a drawing carrying
// one label per speck is less readable than one carrying none. This is why there
// is no "show labels" toggle — the labels manage themselves, and a control whose
// only job is to undo a bad default is a bad default.

// Below this, a node's own drawn length cannot hold its text.
const MIN_NODE_LABEL_PX = 46
// A deletion is worth saying even when its arc is small, because the arc is the
// only thing on screen that represents it; but not when it is a dot.
const MIN_DELETION_LABEL_PX = 26

// Where the cubic drawn by computeEdgeCurves reaches at its furthest from the
// chord. Both control points sit `bulge` off it, so the curve peaks at 3/4 of
// that — enough that a label placed here sits on the arc rather than inside it.
const BEZIER_APEX_FRACTION = 0.75

export interface GraphLabel {
  key: string
  text: string
  // layout units; the caller applies the same transform the canvas draws with
  x: number
  y: number
  kind: 'node' | 'deletion'
}

// bp in the unit that reads. Deliberately coarse: a label is a glance, and
// "12,345 bp" costs twice the width of "12 kb" to say the same thing at the
// scale a pangenome allele lives at.
export function formatBp(bp: number) {
  if (bp >= 1_000_000) {
    return `${+(bp / 1_000_000).toFixed(1)} Mb`
  }
  return bp >= 1000 ? `${+(bp / 1000).toFixed(1)} kb` : `${bp} bp`
}

function drawnLength(segments: NodeSegment[]) {
  let total = 0
  for (let i = 1; i < segments.length; i++) {
    const a = segments[i - 1]!
    const b = segments[i]!
    total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return total
}

function midpoint(segments: NodeSegment[]) {
  const mid = segments[Math.floor(segments.length / 2)]!
  return { x: mid.x, y: mid.y }
}

export function graphLabels({
  nodePositions,
  nodeLengths,
  deletions,
  scale,
}: {
  nodePositions: Record<string, NodeSegment[]>
  // bp per node id, so this module never has to know what a GraphNode is
  nodeLengths: Map<string, number>
  deletions: DeletionEdge[]
  scale: number
}): GraphLabel[] {
  const labels: GraphLabel[] = []

  for (const [id, segments] of Object.entries(nodePositions)) {
    const bp = nodeLengths.get(id)
    if (bp !== undefined && segments.length > 0) {
      if (drawnLength(segments) * scale >= MIN_NODE_LABEL_PX) {
        const { x, y } = midpoint(segments)
        labels.push({
          key: `node:${id}`,
          text: formatBp(bp),
          x,
          y,
          kind: 'node',
        })
      }
    }
  }

  for (const deletion of deletions) {
    const bulge = deletionBulge(nodePositions, deletion.bypassed)
    if (bulge * scale >= MIN_DELETION_LABEL_PX) {
      // the arc's own apex, so the label rides the curve rather than sitting on
      // the backbone the deletion routes around
      const ends = deletion.bypassed
        .map(id => nodePositions[id])
        .filter(segs => segs !== undefined && segs.length > 0)
      const first = ends[0]?.[0]
      const lastSegs = ends[ends.length - 1]
      const last = lastSegs?.[lastSegs.length - 1]
      if (first && last) {
        const dx = last.x - first.x
        const dy = last.y - first.y
        const len = Math.hypot(dx, dy) || 1
        labels.push({
          key: `del:${deletion.edgeIndex}`,
          text: `−${formatBp(deletion.bp)}`,
          x:
            (first.x + last.x) / 2 + (-dy / len) * bulge * BEZIER_APEX_FRACTION,
          y: (first.y + last.y) / 2 + (dx / len) * bulge * BEZIER_APEX_FRACTION,
          kind: 'deletion',
        })
      }
    }
  }

  return labels
}
