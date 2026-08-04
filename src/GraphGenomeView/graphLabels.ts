import { deletionArcCurves } from './deletionEdges'
import { curveBounds, curveMidpoint } from './util/geometry'

import type { DeletionEdge } from './deletionEdges'
import type { AlleleDeletion, NodeSegment } from './types'
import type { BezierCurve } from './util/geometry'

// What to write on the drawing, and where. Bandage labels a node with its name,
// its length or its depth; a segment id means nothing to a reader of a pangenome
// ("s462766"), so the label here is the one fact that carries the story — how
// much sequence the alternative is worth. A node says its length, a deletion arc
// says what it skips.
//
// **Every length written here is positive, and a deletion says it is one.**
// A deletion arc used to be labelled "−94.2 kb", and a review read that as the
// node's sequence length being negative, which is the only thing a bare signed
// number beside a graph can mean. "skips 94.2 kb" replaced it and left a reader
// asking 94.2 kb of what; "skips 94.2 kb of reference" answered that and still
// drew "it is sort of unclear what 'skips X bp of reference' means. is there any
// better wording?" on a third round. So the label now names the event rather
// than describing the arc's mechanics: "94.2 kb deletion" is the term a reader
// already has for reference sequence a haplotype does not carry, and against the
// reference is what a deletion is measured from by default.
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

// A deletion clearing that floor still need not be able to CARRY its label: the
// text is a fixed 26 characters however small the event's arc is, so at the LPA
// KIV-2 locus `skips 27.7 kb of reference` came out four times the width of the
// arc it was centred on, reading as a caption dropped on the bubble beside it
// rather than as that arc's name (`pangenome/hprc_lpa_kiv2`, reviewed
// 2026-07-31).
//
// A node in the same position simply loses its label, and that is right for a
// node — the tube is still drawn, still coloured, still hoverable, and the graph
// is full of them. It is wrong for a deletion, which is one dashed curve
// standing for sequence that is not in the picture at all: dropped, nothing
// tells a reader the arc is an event rather than another link.
//
// So the label moves off the arc instead and takes a leader line with it. It is
// displaced along the direction the arc bows — which is the side the bulge was
// drawn INTO, so it is the open side by construction — far enough that its box
// clears the curve, and the leader states the association the proximity no
// longer does.
const LEADER_GAP_PX = 8

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

// Slide a value into [lo, hi], leaving it alone when the range is empty — a box
// wider than the canvas has nowhere to fit, and pinning it to one edge is worse
// than the overflow.
function clamp(v: number, lo: number, hi: number) {
  return hi < lo ? v : Math.min(Math.max(v, lo), hi)
}

function overlaps(a: Box, b: Box) {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  )
}

// A displaced label's tether, in the same screen pixels the label is placed in.
// Both ends are computed here rather than in the component, because the label's
// end is the point where its own box meets the line — geometry the placement
// already has and the painter would have to rederive. It stops at the box edge
// rather than at the centre because the label's background is translucent, so a
// line run under it shows through the text.
export interface Leader {
  arcX: number
  arcY: number
  labelX: number
  labelY: number
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
  // present only on a label that had to move off the thing it names
  leader?: Leader
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

// Which way the arc bows, as a unit vector: its chord's midpoint towards its
// apex. A deletion's bulge is perpendicular to the chord by construction, so
// this points away from the backbone the arc leaves and rejoins — the side the
// curve was opened into, and the side with room in it. Scale and translate are a
// similarity transform, so a direction in layout units is the same direction on
// screen and needs no conversion.
function arcOutward(curves: BezierCurve[], apex: { x: number; y: number }) {
  const first = curves[0]!
  const last = curves[curves.length - 1]!
  const dx = apex.x - (first.x0 + last.x1) / 2
  const dy = apex.y - (first.y0 + last.y1) / 2
  const len = Math.hypot(dx, dy)
  // A curve with no bow has no outward side; up is as good as any, and this is
  // unreachable for a deletion, whose bulge is what gives it extent at all.
  return len === 0 ? { x: 0, y: -1 } : { x: dx / len, y: dy / len }
}

// How far the box's own boundary is from its centre in a given direction — the
// support function of an axis-aligned rectangle. Displacing a label by this plus
// a gap puts its near EDGE that gap away from the point, whatever angle the
// leader leaves at, which a single radius cannot do for a box six times wider
// than it is tall.
function boxSupport(box: Box, dir: { x: number; y: number }) {
  return (
    (Math.abs(dir.x) * (box.right - box.left)) / 2 +
    (Math.abs(dir.y) * (box.bottom - box.top)) / 2
  )
}

// Where a ray along `dir` through the box's centre crosses the box, again from
// the centre — which is where a leader coming in along that ray has to stop.
//
// This is not `boxSupport`, and the difference is the whole leader: support is
// the distance to the supporting line perpendicular to `dir`, which a box six
// times wider than it is tall touches at a corner, so a diagonal approach hits
// the box's real edge four or five times sooner. Stopping the line at the
// support distance drew an 8px stub at the arc with 50px of white between it and
// the text it was supposed to tie to.
function boxRayCrossing(box: Box, dir: { x: number; y: number }) {
  const halfW = (box.right - box.left) / 2
  const halfH = (box.bottom - box.top) / 2
  return Math.min(
    dir.x === 0 ? Infinity : halfW / Math.abs(dir.x),
    dir.y === 0 ? Infinity : halfH / Math.abs(dir.y),
  )
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
  alleleDeletions,
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
  // Deletions the layout found that carry a segment, so `deletions` above
  // cannot: empty under a layout drawn at sequence scale, where a node's own
  // length IS what its drawn extent means. See AlleleDeletion.
  alleleDeletions?: AlleleDeletion[]
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
        const text = `${formatBp(deletion.bp)} deletion`
        const box = labelBox(text, 0, 0)
        const arcX = apex.x * scale + translateX
        const arcY = apex.y * scale + translateY
        // The node rule, applied to an arc: a label wider than twice what it
        // names is a label with an arc attached. Under it the label stays
        // centred on the curve, which is what every arc big enough to hold its
        // own name already does.
        const fits =
          extent * scale >= (box.right - box.left) / MAX_LABEL_OVERHANG
        // Displaced by the SUPPORT distance, so the whole box clears the arc
        // whatever angle it leaves at, then the leader is stopped at the box's
        // real edge along the same ray.
        const bow = arcOutward(curves, apex)
        const offset = boxSupport(box, bow) + LEADER_GAP_PX
        const halfW = (box.right - box.left) / 2
        const halfH = (box.bottom - box.top) / 2
        // ...and then slid back into the frame if that put it outside one. A
        // tethered label chooses where it goes, and the cull below keeps any box
        // merely OVERLAPPING the canvas, so displacing blind is how the MHC force
        // layout came out with a clipped `…ips 1.5 kb of reference` against its
        // left edge. Sliding beats dropping and beats picking the arc's other
        // side: the leader is redrawn to wherever the words ended up, so it stays
        // unambiguous however far along the edge they had to move.
        const x = fits
          ? arcX
          : clamp(arcX + bow.x * offset, halfW, width - halfW)
        const y = fits
          ? arcY
          : clamp(arcY + bow.y * offset, halfH, height - halfH)
        // Recomputed from where the label ACTUALLY sits, not from the bow, or
        // the line points off at the position the label would have had.
        const away = Math.hypot(x - arcX, y - arcY)
        const dir = { x: (x - arcX) / away, y: (y - arcY) / away }
        candidates.push({
          key: `del:${deletion.edgeIndex}`,
          text,
          x,
          y,
          kind: 'deletion',
          leader:
            fits || away === 0
              ? undefined
              : {
                  arcX,
                  arcY,
                  labelX: x - dir.x * boxRayCrossing(box, dir),
                  labelY: y - dir.y * boxRayCrossing(box, dir),
                },
        })
      }
    }
  }

  // Segment-carrying deletions, next: the arcs above and these are the same
  // event and are said in the same words, so they queue together ahead of the
  // node lengths and biggest-first among themselves.
  //
  // A run's label rides the middle of what the layout DREW for it, which is the
  // reference the allele replaces, and it has to fit that extent by the same
  // factor-of-two rule a node label does — so the sliver a 2 bp skip occupies in
  // a base-level graph carries nothing, and the 7.1 kb one CFT073 leaves in the
  // E. coli pggb graph carries `7.0 kb deletion`.
  //
  // The nodes it covers are then barred from labelling themselves. Their length
  // is a true fact and the wrong one to print here: `93 bp` written across a bar
  // drawn 7.1 kb wide is read as the bar's size, which is the misreading this
  // whole label exists to fix. It stays in the tooltip and the details panel.
  const labelledByDeletion = new Set<string>()
  const alleleRuns = [...(alleleDeletions ?? [])].sort((a, b) => b.bp - a.bp)
  for (const run of alleleRuns) {
    const points = run.nodeIds.flatMap(id => nodePositions[id] ?? [])
    if (points.length === 0) {
      continue
    }
    // ON SCREEN, not in layout units, and that is the whole subtlety here. A
    // run drawn over the reference it replaces can be far wider than the window
    // — the E. coli one starts 7 kb before the left edge — so its true midpoint
    // is nowhere, and a label placed there is culled for being off-canvas and
    // the bar goes unnamed. The visible slice is what a reader has, so the
    // label rides the middle of that, and the fit test asks whether the words
    // fit what is SHOWN rather than what is drawn.
    const left = Math.min(...points.map(p => p.x)) * scale + translateX
    const right = Math.max(...points.map(p => p.x)) * scale + translateX
    const top = Math.min(...points.map(p => p.y)) * scale + translateY
    const bottom = Math.max(...points.map(p => p.y)) * scale + translateY
    const shownLeft = Math.max(left, 0)
    const shownRight = Math.min(right, width)
    const shownTop = Math.max(top, 0)
    const shownBottom = Math.min(bottom, height)
    if (shownRight < shownLeft || shownBottom < shownTop) {
      continue
    }
    const extent = Math.max(shownRight - shownLeft, shownBottom - shownTop)
    const text = `${formatBp(run.bp)} deletion`
    const box = labelBox(text, 0, 0)
    const halfW = (box.right - box.left) / 2
    const halfH = (box.bottom - box.top) / 2
    if (extent >= (halfW * 2) / MAX_LABEL_OVERHANG) {
      for (const id of run.nodeIds) {
        labelledByDeletion.add(id)
      }
      candidates.push({
        key: `alleledel:${run.nodeIds.join(',')}`,
        text,
        x: clamp((shownLeft + shownRight) / 2, halfW, width - halfW),
        y: clamp((shownTop + shownBottom) / 2, halfH, height - halfH),
        kind: 'deletion',
      })
    }
  }

  // Biggest allele first: in a crowd, the label that survives should be the one
  // carrying the most sequence, not whichever node the layout happened to emit
  // first.
  const nodes = Object.entries(nodePositions)
    .filter(
      ([id, segments]) =>
        segments.length > 0 &&
        nodeLengths.has(id) &&
        !labelledByDeletion.has(id),
    )
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
