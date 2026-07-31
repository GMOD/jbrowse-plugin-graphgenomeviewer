import type { NodeSegment } from '../types'

export function projectLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  distance: number,
): [number, number] {
  const d = Math.hypot(y2 - y1, x2 - x1)
  if (d === 0) {
    return [x2, y2]
  }
  const vx = (x2 - x1) / d
  const vy = (y2 - y1) / d
  return [x2 + distance * vx, y2 + distance * vy]
}

export interface BezierCurve {
  x0: number
  y0: number
  cx0: number
  cy0: number
  cx1: number
  cy1: number
  x1: number
  y1: number
}

export function translateCurves(
  curves: BezierCurve[],
  dx: number,
  dy: number,
): BezierCurve[] {
  const out: BezierCurve[] = new Array(curves.length)
  for (let i = 0; i < curves.length; i++) {
    const c = curves[i]!
    out[i] = {
      x0: c.x0 + dx,
      y0: c.y0 + dy,
      cx0: c.cx0 + dx,
      cy0: c.cy0 + dy,
      cx1: c.cx1 + dx,
      cy1: c.cy1 + dy,
      x1: c.x1 + dx,
      y1: c.y1 + dy,
    }
  }
  return out
}

type Side = 'start' | 'end'

// The attachment point, and the point just inside the node from it — which is
// what gives the outward tangent, so a curve leaves along the node it leaves
// rather than straight at its partner.
function attachment(segments: NodeSegment[], side: Side) {
  const last = segments.length - 1
  return side === 'end'
    ? { at: segments[last]!, inward: segments[last - 1] }
    : { at: segments[0]!, inward: segments[1] }
}

// Ceilings on how far a control point runs along its own node's direction: a
// fraction of the separation the curve has to cover, so endpoints that nearly
// touch cannot fold the cubic back over itself, and an absolute cap so a
// graph-wide edge does not sprout a huge hook.
const TANGENT_SPAN_FACTOR = 0.5
const MAX_TANGENT = 80

// Which drawn end of each node the edge joins.
//
// A link states the orientation it reads each segment in, but a node is drawn
// in whatever direction its layout placed it — reference-forward on the
// anchored rows, run-sweep order off them, arbitrary under FMMM — and nothing
// records that direction, so the strands cannot be turned into drawn ends. What
// the drawing itself says is which ends face each other, so that is what is
// read: each node attaches at whichever of its two ends is nearer the OTHER
// node's drawn span, with the forward reading (leave the from-node's end, enter
// the to-node's start) winning a tie.
//
// Nearer to the span, not to the other attachment point. A bubble's two nodes
// usually overlap in x, and there the distances to a point differ by a hair
// that says nothing — enough to hang a node's entry and exit edges off the same
// end, which draws them crossed. Overlapping spans give both ends distance 0,
// i.e. a tie, and the tie is what keeps such a bubble forward. What survives is
// the case the rule is for: `L s381 - s2087 +` then `L s2087 + s378 -` is
// NCTC86 crossing its locus right to left, and joining last-point to
// first-point regardless drew the second link 7 kb backwards across the segment
// it rejoins — the long X in pangenome/rgfa_subgraph_launch. There the spans do
// not overlap and the far end loses by 7 kb. Pinned by bubbleCrossing.test.ts.
function spanOf(segments: NodeSegment[]) {
  let min = Infinity
  let max = -Infinity
  for (const s of segments) {
    min = Math.min(min, s.x)
    max = Math.max(max, s.x)
  }
  return { min, max }
}

function distanceToSpan(x: number, span: { min: number; max: number }) {
  return Math.max(0, span.min - x, x - span.max)
}

function facingSide(
  segments: NodeSegment[],
  other: { min: number; max: number },
  tieBreak: Side,
): Side {
  const startGap = distanceToSpan(segments[0]!.x, other)
  const endGap = distanceToSpan(segments[segments.length - 1]!.x, other)
  return startGap === endGap ? tieBreak : startGap < endGap ? 'start' : 'end'
}

function facingSides(fromSegments: NodeSegment[], toSegments: NodeSegment[]) {
  return {
    from: facingSide(fromSegments, spanOf(toSegments), 'end'),
    to: facingSide(toSegments, spanOf(fromSegments), 'start'),
  }
}

export function computeEdgeCurves(
  fromSegments: NodeSegment[],
  toSegments: NodeSegment[],
  isSelfLoop: boolean,
  offsetX: number,
  offsetY: number,
  scale: number,
  // Perpendicular displacement of the CONTROL points only, in layout units, so
  // the curve bows away from the straight line between its endpoints while
  // staying attached to both. Used to draw a deletion as an arc with real
  // extent: topologically a deletion is a bubble whose reference arm is a long
  // node and whose own arm is a bare link, so at the engine's 5-unit edge length
  // it collapses into a stub at a joint and the one event a graph shows better
  // than a linear view is invisible. Bowing it by the drawn length of the
  // backbone it bypasses makes the two arms comparable, which is what a reader
  // has to see to read it as an alternative route.
  bulge = 0,
): BezierCurve[] {
  const sides = isSelfLoop
    ? { from: 'end' as Side, to: 'start' as Side }
    : facingSides(fromSegments, toSegments)
  const fromAttach = attachment(fromSegments, sides.from)
  const toAttach = attachment(toSegments, sides.to)
  const fromEnd = fromAttach.at
  const toStart = toAttach.at

  const p1x = fromEnd.x + offsetX
  const p1y = fromEnd.y + offsetY
  const p2x = toStart.x + offsetX
  const p2y = toStart.y + offsetY

  if (isSelfLoop) {
    let segDirX = 1
    let segDirY = 0
    if (fromAttach.inward) {
      const dx = fromEnd.x - fromAttach.inward.x
      const dy = fromEnd.y - fromAttach.inward.y
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        segDirX = dx / len
        segDirY = dy / len
      }
    }

    const ext = Math.min(50, 50 * scale)
    const perpX = -segDirY
    const perpY = segDirX
    const midX = (fromEnd.x + toStart.x) / 2 + offsetX + perpX * ext
    const midY = (fromEnd.y + toStart.y) / 2 + offsetY + perpY * ext
    const cp1x = p1x + segDirX * ext
    const cp1y = p1y + segDirY * ext
    const cp2x = p2x - segDirX * ext
    const cp2y = p2y - segDirY * ext

    return [
      {
        x0: p1x,
        y0: p1y,
        cx0: cp1x,
        cy0: cp1y,
        cx1: cp1x + perpX * ext,
        cy1: cp1y + perpY * ext,
        x1: midX,
        y1: midY,
      },
      {
        x0: midX,
        y0: midY,
        cx0: cp2x + perpX * ext,
        cy0: cp2y + perpY * ext,
        cx1: cp2x,
        cy1: cp2y,
        x1: p2x,
        y1: p2y,
      },
    ]
  } else {
    // The point just inside each node from where the edge attaches, so
    // projectLine extends OUTWARD from the node. A node drawn as a single point
    // has no direction of its own; mirroring the chord through the attachment
    // leaves it pointing at its partner, i.e. a straight leader.
    const fromPrev = fromAttach.inward ?? {
      x: fromEnd.x - (toStart.x - fromEnd.x),
      y: fromEnd.y - (toStart.y - fromEnd.y),
    }
    const toNext = toAttach.inward ?? {
      x: toStart.x - (fromEnd.x - toStart.x),
      y: toStart.y - (fromEnd.y - toStart.y),
    }

    const dist = Math.hypot(p2x - p1x, p2y - p1y)
    // Each control point leaves along its OWN node's direction, so the tangent
    // extension may only run as far as the other endpoint actually lies in that
    // direction. Sizing it by the whole separation instead cannot work on an
    // anchored layout, where the separation is mostly the row drop: both edges
    // of a bubble then leave sideways and come back, and the pair draws as a
    // crossed bowtie rather than as a bubble (pinned by bubbleCrossing.test.ts,
    // which fails on 17 of the pggb subgraph's alleles under a flat
    // `dist * 0.35`). Projecting the separation onto the tangent is rotation
    // invariant, so a force-directed layout, whose edges do run along their
    // nodes, is unchanged; and it is clamped at 0, so an edge that doubles back
    // gets a straight leader instead of a loop.
    const tangentProj = (
      prev: { x: number; y: number },
      at: { x: number; y: number },
      towardX: number,
      towardY: number,
    ) => {
      const dx = at.x - prev.x
      const dy = at.y - prev.y
      const len = Math.hypot(dx, dy)
      const along = len === 0 ? 0 : (towardX * dx + towardY * dy) / len
      return Math.max(
        0,
        Math.min(dist * TANGENT_SPAN_FACTOR, MAX_TANGENT, along * 0.5),
      )
    }
    const towardToX = toStart.x - fromEnd.x
    const towardToY = toStart.y - fromEnd.y
    const [cx1, cy1] = projectLine(
      fromPrev.x,
      fromPrev.y,
      fromEnd.x,
      fromEnd.y,
      tangentProj(fromPrev, fromEnd, towardToX, towardToY),
    )
    const [cx2, cy2] = projectLine(
      toNext.x,
      toNext.y,
      toStart.x,
      toStart.y,
      tangentProj(toNext, toStart, -towardToX, -towardToY),
    )

    // Perpendicular to the chord, so the bow is symmetric about it, and spread
    // the two control points APART along it by the same amount. Perpendicular
    // alone draws a hairpin whenever the bulge exceeds the chord — which is the
    // normal case for a deletion, whose endpoints the simulation leaves adjacent
    // however much reference it skips — and a hairpin reads as a stray line
    // rather than as a route. The along-chord spread opens it into an arch.
    const chordLen = dist === 0 ? 1 : dist
    const ux = (p2x - p1x) / chordLen
    const uy = (p2y - p1y) / chordLen
    const bulgeX = -uy * bulge
    const bulgeY = ux * bulge
    const spreadX = ux * bulge
    const spreadY = uy * bulge

    return [
      {
        x0: p1x,
        y0: p1y,
        cx0: cx1 + offsetX + bulgeX - spreadX,
        cy0: cy1 + offsetY + bulgeY - spreadY,
        cx1: cx2 + offsetX + bulgeX + spreadX,
        cy1: cy2 + offsetY + bulgeY + spreadY,
        x1: p2x,
        y1: p2y,
      },
    ]
  }
}
