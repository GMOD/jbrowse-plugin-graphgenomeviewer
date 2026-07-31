import { deletionArcCurves } from './deletionEdges'
import { curveBounds, curveMidpoint } from './util/geometry'

import type { DeletionEdge } from './deletionEdges'
import type { NodeSegment } from './types'

// What to write on the drawing, and where. Bandage labels a node with its name,
// its length or its depth; a segment id means nothing to a reader of a pangenome
// ("s462766"), so the label here is the one fact that carries the story — how
// much sequence the alternative is worth. A node says its length, a deletion arc
// says what it skips.
//
// **Every length written here is positive, and a deletion names what it skips.**
// A deletion arc used to be labelled "−94.2 kb", and a review read that as the
// node's sequence length being negative, which is the only thing a bare signed
// number beside a graph can mean. The arc removes reference sequence rather than
// carrying negative sequence, so the label says the verb. It also says WHAT is
// skipped: "skips 94.2 kb" left a reader asking 94.2 kb of what (second review,
// "unclear to me what 'skips' refers to. is it something missing from
// reference?"), and the answer is the reference, which the label now states.
//
// **Two rules decide which labels there are, and both are about the drawing
// rather than about a threshold on the graph.**
//
// A label has to fit the node it names, within a factor of two: past that it is
// a label with a node attached rather than a node with a label. The rule used to
// be a flat minimum drawn length (46 screen px) regardless of how long the text
// was, which reads as arbitrary from the outside — review asked why some nodes
// state a length and others do not, and nothing in the picture could answer it.
// Measured against the text, the answer is in the picture: the node is shorter
// than the words.
//
// And a label is dropped when its box would overlap one already placed. Labels
// go biggest-sequence-first, so what survives a crowd is the allele that
// matters; this is also what fixes labels printing on top of each other ("−10
// kb3.2 kb" in the amylase figure).
//
// Between them they hold at both ends of the scale a pangenome graph spans: 63
// kb-scale nodes at the amylase locus nearly all carry a length, and a 154-node
// base-level pggb graph of 1-100 bp segments carries almost none — where every
// label would have said "1 bp" and covered the segment it named.
//
// Collision is measured in SCREEN pixels, because that is where the text has its
// size: the same two labels clear each other zoomed in and collide zoomed out,
// so a wide view sheds labels on its own. This is why there is no "show labels"
// toggle — a control whose only job is to undo a bad default is a bad default.

// A deletion is worth saying even when its arc is small, because the arc is the
// only thing on screen that represents it; but not when it is a dot.
//
// Measured on the arc's DRAWN EXTENT (the larger side of its bounds, in screen
// px), not on its bulge. Bulge is in whatever units the layout works in: under
// FMMM it is a fraction of the bypassed nodes' drawn length at the engine's own
// scale, and in an anchored layout it is a fraction of their length in bp. The
// same deletion therefore cleared this in one layout and not the other, which is
// how `pangenome/hprc_cfhr_deletion` lost the labels on its 2.2 kb and 9.3 kb
// arcs by changing nothing but the layout. Extent is what a reader sees either
// way, and it is the same quantity the node rule below uses.
const MIN_DELETION_LABEL_PX = 26

// The label's own box, for collision. Mirrors GraphCanvas's nodeLabelStyle:
// 10px text in 3px of horizontal padding, on a 13px line. Character width is an
// average rather than a measurement — placement runs on every pan and zoom, and
// a canvas text metric per candidate costs more than the occasional
// half-character of slack is worth.
const LABEL_CHAR_PX = 5.7
const LABEL_PAD_PX = 6
const LABEL_HEIGHT_PX = 13
// Breathing room, so two labels that merely touch still read as two.
const LABEL_GAP_PX = 3
// How much wider than its node a label may be before it is the label that is
// being drawn rather than the node.
const MAX_LABEL_OVERHANG = 2

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

function labelBox(text: string, screenX: number, screenY: number): Box {
  // translate(-50%, -50%) in the style, so the anchor is the box's centre
  const halfW = (text.length * LABEL_CHAR_PX + LABEL_PAD_PX + LABEL_GAP_PX) / 2
  const halfH = (LABEL_HEIGHT_PX + LABEL_GAP_PX) / 2
  return {
    left: screenX - halfW,
    right: screenX + halfW,
    top: screenY - halfH,
    bottom: screenY + halfH,
  }
}

// The box a row label occupies, from the same metrics RowLabels renders with
// (11px text, 4px of horizontal padding, a 16px line, centred on its row). Lives
// here rather than in the component so the two halves of the collision test
// cannot drift apart.
export function rowLabelBox(text: string, screenY: number): Box {
  return {
    left: 6,
    right: 6 + text.length * 6.2 + 8 + LABEL_GAP_PX,
    top: screenY - 8 - LABEL_GAP_PX / 2,
    bottom: screenY + 8 + LABEL_GAP_PX / 2,
  }
}

function overlaps(a: Box, b: Box) {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  )
}

export interface GraphLabel {
  key: string
  text: string
  // screen pixels, already through the transform the canvas draws with: the
  // collision test needs them anyway, and returning layout units would have the
  // caller redo the arithmetic that decided which labels there are
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

function midpoint(segments: NodeSegment[]) {
  const mid = segments[Math.floor(segments.length / 2)]!
  return { x: mid.x, y: mid.y }
}

// The node's own extent along its polyline, in layout units — what the label has
// to fit inside, and what the caller scales into screen px.
function drawnLength(segments: NodeSegment[]) {
  let total = 0
  for (let i = 1; i < segments.length; i++) {
    const a = segments[i - 1]!
    const b = segments[i]!
    total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return total
}

export function graphLabels({
  nodePositions,
  nodeLengths,
  deletions,
  scale,
  translateX,
  translateY,
  width,
  height,
  reserved,
}: {
  nodePositions: Record<string, NodeSegment[]>
  // bp per node id, so this module never has to know what a GraphNode is
  nodeLengths: Map<string, number>
  deletions: DeletionEdge[]
  scale: number
  translateX: number
  translateY: number
  width: number
  height: number
  // Screen-space boxes already occupied by something this module did not draw —
  // the row labels of a row-structured layout. They sit in the same overlay and
  // are opaque, so a node label under one is not "behind" it, it is gone: a
  // label of "17 bp" against the left edge of an anchored layout came out as a
  // stray "bp" beside `Reference (rank 0)`. Feeding them into the same collision
  // pass moves that label instead of clipping it.
  reserved?: Box[]
}): GraphLabel[] {
  // Deletions first, so an arc keeps its label against the nodes around it: the
  // arc is the only thing in the drawing that represents sequence which is not
  // there, and a reader who cannot read it has no other route to it.
  const candidates: GraphLabel[] = []
  for (const deletion of [...deletions].sort((a, b) => b.bp - a.bp)) {
    const curves = deletionArcCurves(nodePositions, deletion, scale)
    const apex = curves ? curveMidpoint(curves) : undefined
    if (curves && apex) {
      const { minX, minY, maxX, maxY } = curveBounds(curves)
      const extent = Math.max(maxX - minX, maxY - minY)
      if (extent * scale >= MIN_DELETION_LABEL_PX) {
        candidates.push({
          key: `del:${deletion.edgeIndex}`,
          text: `skips ${formatBp(deletion.bp)} of reference`,
          x: apex.x * scale + translateX,
          y: apex.y * scale + translateY,
          kind: 'deletion',
        })
      }
    }
  }

  // Biggest allele first: in a crowd, the label that survives should be the one
  // carrying the most sequence, not whichever node the layout happened to emit
  // first.
  const nodes = Object.entries(nodePositions)
    .filter(([id, segments]) => segments.length > 0 && nodeLengths.has(id))
    .sort(([a], [b]) => nodeLengths.get(b)! - nodeLengths.get(a)!)
  for (const [id, segments] of nodes) {
    const { x, y } = midpoint(segments)
    const text = formatBp(nodeLengths.get(id)!)
    const box = labelBox(text, 0, 0)
    if (
      drawnLength(segments) * scale >=
      (box.right - box.left) / MAX_LABEL_OVERHANG
    ) {
      candidates.push({
        key: `node:${id}`,
        text,
        x: x * scale + translateX,
        y: y * scale + translateY,
        kind: 'node',
      })
    }
  }

  const placed: Box[] = [...(reserved ?? [])]
  const labels: GraphLabel[] = []
  for (const label of candidates) {
    const box = labelBox(label.text, label.x, label.y)
    // Culled before the collision test, so a label outside the canvas cannot
    // hold a box against one inside it.
    const onScreen =
      box.right > 0 && box.left < width && box.bottom > 0 && box.top < height
    if (onScreen && !placed.some(p => overlaps(p, box))) {
      placed.push(box)
      labels.push(label)
    }
  }
  return labels
}
