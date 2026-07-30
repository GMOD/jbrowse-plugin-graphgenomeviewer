import { brightenAbgr, packAbgr } from './colorBits'
import { referenceMidpoints } from '../referenceSpan'
import { computeEdgeCurves } from '../util/geometry'
import {
  FIELD_OFFSET_F32,
  INSTANCE_STRIDE_BYTES,
  INSTANCE_STRIDE_F32,
} from './shaders/graph.generated'

import type { ColorScheme } from '../colorSchemes'
import type { Graph, GraphNode, NodeSegment } from '../types'
import type {
  EdgeCurveBatch,
  RenderBatch,
  SubBatch,
  VertexRange,
} from './types'
import type { BezierCurve } from '../util/geometry'

// Colors flow through the geometry builder as ABGR-in-u32 (see colorBits.ts).
// That matches the shader's uint color attribute so no repacking happens at
// upload time; CPU-side brighten / recolour utilities operate on the same
// u32 values.
const EDGE_DEFAULT_COLOR = packAbgr(119, 119, 119, 217) // rgb(119,119,119) ~ 0.467, alpha 0.85
const EDGE_PATH_FALLBACK_COLOR = packAbgr(136, 136, 136, 217) // ~0.533, alpha 0.85
// An edge that skips reference sequence: the graph's own statement that some
// haplotype does not carry what the backbone does. Drawn red and thicker than a
// plain link, and unconditionally rather than under a colour scheme, because a
// deletion has no node to colour — nothing else in the drawing can carry it, so
// there is no scheme it could disagree with. See deletionEdges.ts.
const EDGE_DELETION_COLOR = packAbgr(214, 39, 40, 235)
const DELETION_THICKNESS_FACTOR = 2.2

// Half-extent of an arrowhead, in world units before the view transform.
const ARROWHEAD_SIZE = 12

function packNorm(r: number, g: number, b: number, a: number) {
  return packAbgr(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
    Math.round(a * 255),
  )
}

export interface BuildOptions {
  nodePositions: Record<string, NodeSegment[]>
  graph: Graph
  nodeById: Map<string, GraphNode>
  colorScheme: ColorScheme
  contigThickness: number
  connectorThickness: number
  drawPaths: boolean
  scale: number
  linearLayout?: boolean
  viewportBounds?: { minX: number; minY: number; maxX: number; maxY: number }
  // the reference interval the 'reference-position' ramp spans, i.e. the region
  // this subgraph was cut from. Unused by every other scheme.
  colorDomain?: { start: number; end: number }
  // indexes into graph.edges of the links that skip reference sequence, from
  // deletionEdges(). Passed in rather than derived here because the model can
  // hold it against the graph, and because the same set names the hover text.
  deletions?: Set<number>
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return [r + m, g + m, b + m]
}

// Evenly-spaced RGB gradient stops (0-255 per channel).
const DEPTH_GRADIENT = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
] as const

// ranks >= 1, i.e. everything off the reference backbone
const STABLE_RANK_GRADIENT = [
  [237, 137, 44],
  [158, 42, 122],
] as const

const NODE_LENGTH_GRADIENT = [
  [220, 50, 50],
  [50, 120, 220],
] as const

// Sample a piecewise-linear RGB gradient; t is clamped to [0,1].
function sampleGradient(
  stops: readonly (readonly [number, number, number])[],
  t: number,
) {
  const pos = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(pos))
  const f = pos - i
  const a = stops[i]!
  const b = stops[i + 1]!
  return packAbgr(
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    255,
  )
}

// Deterministic color from a string (djb2-style hash → HSL hue).
function hashColor(str: string, alpha: number) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const [r, g, b] = hslToRgb(Math.abs(hash % 360), 0.7, 0.5)
  return packNorm(r, g, b, alpha)
}

// A hue ramp over reference coordinates, which is the one colouring a linear
// track can reproduce exactly: it is a function of two stated numbers and a
// node's reference midpoint, so `hsl(min(300,max(0,(mid-start)/span*300)),70%,50%)`
// in a track's `color` slot paints a segment the colour the graph paints its
// node. Stops at 300 rather than wrapping to 360, so the two ends of the window
// are red and magenta rather than both red.
export const REFERENCE_RAMP_MAX_HUE = 300
const REFERENCE_RAMP_SATURATION = 0.7
const REFERENCE_RAMP_LIGHTNESS = 0.5
// Off-reference segments keep the hue of the reference they replace — that
// correspondence is the whole scheme — but take a paler, softer version of it,
// so a rank row is not painted the same swatch as the backbone above it
// (review: "kind of weird to see the rank 1 having coloring the same as the
// reference"). Rank goes on lightness rather than on a second hue range, which
// would have to mean position and rank at once and could state neither.
const REFERENCE_RAMP_ALT_SATURATION = 0.45
const REFERENCE_RAMP_ALT_LIGHTNESS = 0.72

export interface ReferenceRamp {
  start: number
  span: number
  midpoints: Map<string, number>
}

export interface ColorSchemeRange {
  minDepth: number
  maxDepth: number
  minLength: number
  maxLength: number
  maxRank: number
  nodeCount: number
  referenceRamp?: ReferenceRamp
}

// The domain is stated by the caller — the region the subgraph was cut from —
// rather than measured off the nodes, because a linear view has no way to know
// what the cut reached: segments overrun the region at both edges, so a
// measured domain would shift the hue of every node by an amount the other
// panel cannot compute. With no region (a whole-file import) the drawn extent
// is all there is, and the ramp is then only comparable to itself.
export function computeReferenceRamp(
  graph: Graph,
  domain: { start: number; end: number } | undefined,
): ReferenceRamp {
  const midpoints = referenceMidpoints(graph)
  if (domain && domain.end > domain.start) {
    return {
      start: domain.start,
      span: domain.end - domain.start,
      midpoints,
    }
  }
  let min = Infinity
  let max = -Infinity
  for (const mid of midpoints.values()) {
    min = Math.min(min, mid)
    max = Math.max(max, mid)
  }
  return {
    start: min === Infinity ? 0 : min,
    span: max > min ? max - min : 1,
    midpoints,
  }
}

export function computeColorSchemeRange(graph: Graph) {
  let minDepth = Infinity
  let maxDepth = -Infinity
  let minLength = Infinity
  let maxLength = -Infinity
  let maxRank = 0
  for (const n of graph.nodes) {
    if (n.stable !== undefined && n.stable.rank > maxRank) {
      maxRank = n.stable.rank
    }
    if (n.depth < minDepth) {
      minDepth = n.depth
    }
    if (n.depth > maxDepth) {
      maxDepth = n.depth
    }
    if (n.length < minLength) {
      minLength = n.length
    }
    if (n.length > maxLength) {
      maxLength = n.length
    }
  }
  return {
    minDepth,
    maxDepth,
    minLength,
    maxLength,
    maxRank,
    nodeCount: graph.nodes.length,
  } satisfies ColorSchemeRange
}

export function getNodeColor(
  node: GraphNode,
  nodeIndex: number,
  colorScheme: ColorScheme,
  range: ColorSchemeRange,
) {
  switch (colorScheme) {
    case 'random':
      return hashColor(node.id, 1)

    case 'depth':
      return sampleGradient(
        DEPTH_GRADIENT,
        range.maxDepth > range.minDepth
          ? (node.depth - range.minDepth) / (range.maxDepth - range.minDepth)
          : 0.5,
      )

    case 'node-length':
      return sampleGradient(
        NODE_LENGTH_GRADIENT,
        range.maxLength > range.minLength
          ? (node.length - range.minLength) /
              (range.maxLength - range.minLength)
          : 0.5,
      )

    // rGFA states the backbone rather than leaving it to be inferred: rank 0 is
    // the reference, higher ranks are the sequence that diverges from it. A
    // graph with no SR tags draws every node as unranked.
    case 'stable-rank':
      return node.stable === undefined
        ? packAbgr(160, 160, 160, 255)
        : node.stable.rank === 0
          ? packAbgr(52, 152, 219, 255)
          : sampleGradient(
              STABLE_RANK_GRADIENT,
              range.maxRank > 1
                ? (node.stable.rank - 1) / (range.maxRank - 1)
                : 0,
            )

    // Position on the reference, the one quantity both panels of a
    // graph-over-linear figure can state. A node with no reference position at
    // all — nothing anchored, or an allele whose flanks fell outside the cut —
    // is grey rather than a hue it has not earned.
    case 'reference-position': {
      const ramp = range.referenceRamp
      const mid = ramp?.midpoints.get(node.id)
      if (ramp === undefined || mid === undefined) {
        return packAbgr(160, 160, 160, 255)
      }
      const frac = Math.max(0, Math.min(1, (mid - ramp.start) / ramp.span))
      const offReference = node.stable !== undefined && node.stable.rank > 0
      const [r, g, b] = hslToRgb(
        frac * REFERENCE_RAMP_MAX_HUE,
        offReference
          ? REFERENCE_RAMP_ALT_SATURATION
          : REFERENCE_RAMP_SATURATION,
        offReference ? REFERENCE_RAMP_ALT_LIGHTNESS : REFERENCE_RAMP_LIGHTNESS,
      )
      return packNorm(r, g, b, 1)
    }

    case 'grey':
      return packAbgr(160, 160, 160, 255)

    case 'rainbow': {
      const hue = range.nodeCount > 1 ? (nodeIndex / range.nodeCount) * 360 : 0
      const [r, g, b] = hslToRgb(hue, 0.75, 0.5)
      return packNorm(r, g, b, 1)
    }

    default:
      return packAbgr(52, 152, 219, 255)
  }
}

// A cubic's tangent at t=1 runs from its last control point to its endpoint, so
// an arrowhead's angle needs no tessellation. A control point sitting exactly on
// the endpoint states no direction there; the chord is the only thing left.
//
// Exported for the test that checks it against a numerically differentiated
// curve: arrow angles previously came from the last two tessellated points, and
// this has to reproduce that direction to keep arrowheads pointing along the edge.
export function endTangent(c: BezierCurve) {
  const dx = c.x1 - c.cx1
  const dy = c.y1 - c.cy1
  return Math.hypot(dx, dy) > 0
    ? Math.atan2(dy, dx)
    : Math.atan2(c.y1 - c.y0, c.x1 - c.x0)
}

// Whether any part of a node's polyline falls inside the viewport. Testing the
// *segments* rather than their endpoints is what makes a node wider than the
// window visible: in the reference-anchored layouts x is in bp, so a backbone
// segment routinely spans the whole viewport with both ends outside it, and
// point containment culled exactly the segment the view exists to show.
//
// Segment bounding boxes, not exact line-rect intersection: culling only has to
// avoid dropping something visible, and a diagonal kept by its bbox costs one
// polyline.
function isPolylineInBounds(
  segments: NodeSegment[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  let hit = false
  for (let i = 0; i < segments.length - 1 && !hit; i++) {
    const a = segments[i]!
    const b = segments[i + 1]!
    hit =
      Math.max(a.x, b.x) >= bounds.minX &&
      Math.min(a.x, b.x) <= bounds.maxX &&
      Math.max(a.y, b.y) >= bounds.minY &&
      Math.min(a.y, b.y) <= bounds.maxY
  }
  return hit
}

function isBezierInBounds(
  curves: BezierCurve[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  for (const c of curves) {
    const cMinX = Math.min(c.x0, c.cx0, c.cx1, c.x1)
    const cMaxX = Math.max(c.x0, c.cx0, c.cx1, c.x1)
    const cMinY = Math.min(c.y0, c.cy0, c.cy1, c.y1)
    const cMaxY = Math.max(c.y0, c.cy0, c.cy1, c.y1)
    if (
      cMaxX >= bounds.minX &&
      cMinX <= bounds.maxX &&
      cMaxY >= bounds.minY &&
      cMinY <= bounds.maxY
    ) {
      return true
    }
  }
  return false
}

class MeshBuilder {
  // Grown in-place, freshly allocated when capacity runs out. The final
  // `toSubBatch` slice is already in the shader's interleaved layout, so
  // geometry build is one pass with no stride conversion at the end.
  private capacity = 0
  private vertexF32 = new Float32Array(0)
  private vertexU32 = new Uint32Array(0)
  private colorsU32 = new Uint32Array(0)
  // Indices are a typed buffer rather than a number[] for the same reason as the
  // vertices: a mesh runs to hundreds of thousands of indices, and a JS array
  // pays for growth reallocation twice — once while filling, once converting to
  // the Uint32Array the batch has to expose.
  private indexCapacity = 0
  private indexData = new Uint32Array(0)
  indexCount = 0
  vertexCount = 0

  private grow(needed: number) {
    if (needed > this.capacity) {
      const next = Math.max(
        this.capacity === 0 ? 64 : this.capacity * 2,
        needed,
      )
      const buffer = new ArrayBuffer(next * INSTANCE_STRIDE_BYTES)
      const f32 = new Float32Array(buffer)
      f32.set(
        this.vertexF32.subarray(0, this.vertexCount * INSTANCE_STRIDE_F32),
      )
      this.vertexF32 = f32
      this.vertexU32 = new Uint32Array(buffer)
      const colors = new Uint32Array(next)
      colors.set(this.colorsU32.subarray(0, this.vertexCount))
      this.colorsU32 = colors
      this.capacity = next
    }
  }

  private pushTriangle(a: number, b: number, c: number) {
    if (this.indexCount + 3 > this.indexCapacity) {
      const next = Math.max(
        this.indexCapacity === 0 ? 192 : this.indexCapacity * 2,
        this.indexCount + 3,
      )
      const data = new Uint32Array(next)
      data.set(this.indexData.subarray(0, this.indexCount))
      this.indexData = data
      this.indexCapacity = next
    }
    this.indexData[this.indexCount] = a
    this.indexData[this.indexCount + 1] = b
    this.indexData[this.indexCount + 2] = c
    this.indexCount += 3
  }

  pushVertex(
    x: number,
    y: number,
    nx: number,
    ny: number,
    thickness: number,
    color: number,
    edgeDist: number,
  ) {
    this.grow(this.vertexCount + 1)
    const base = this.vertexCount * INSTANCE_STRIDE_F32
    const {
      position,
      normal,
      thickness: thickOff,
      color: colOff,
      edge_dist,
    } = FIELD_OFFSET_F32

    this.vertexF32[base + position] = x
    this.vertexF32[base + position + 1] = y
    this.vertexF32[base + normal] = nx
    this.vertexF32[base + normal + 1] = ny
    this.vertexF32[base + thickOff] = thickness
    this.vertexU32[base + colOff] = color
    this.vertexF32[base + edge_dist] = edgeDist
    this.colorsU32[this.vertexCount] = color
    this.vertexCount++
  }

  addRoundCap(
    center: { x: number; y: number },
    angle: number,
    startAngleOffset: number,
    thickness: number,
    color: number,
  ) {
    const capSegments = 4
    const centerIdx = this.vertexCount
    const { x, y } = center

    this.pushVertex(x, y, 0, 0, 0, color, 0)

    for (let i = 0; i <= capSegments; i++) {
      const a = angle + startAngleOffset + (Math.PI * i) / capSegments
      this.pushVertex(x, y, Math.cos(a), Math.sin(a), thickness, color, 1)
      if (i > 0) {
        this.pushTriangle(centerIdx, this.vertexCount - 2, this.vertexCount - 1)
      }
    }
  }

  addPolyline(
    points: { x: number; y: number }[],
    thickness: number,
    color: number,
  ) {
    if (points.length < 2) {
      return
    }

    const pointNormals: { nx: number; ny: number }[] = []
    for (let i = 0; i < points.length; i++) {
      let nx = 0
      let ny = 0

      if (i === 0) {
        const dx = points[1]!.x - points[0]!.x
        const dy = points[1]!.y - points[0]!.y
        const len = Math.hypot(dx, dy)
        if (len > 0) {
          nx = -dy / len
          ny = dx / len
        }
      } else if (i === points.length - 1) {
        const dx = points[i]!.x - points[i - 1]!.x
        const dy = points[i]!.y - points[i - 1]!.y
        const len = Math.hypot(dx, dy)
        if (len > 0) {
          nx = -dy / len
          ny = dx / len
        }
      } else {
        const dx1 = points[i]!.x - points[i - 1]!.x
        const dy1 = points[i]!.y - points[i - 1]!.y
        const len1 = Math.hypot(dx1, dy1)
        const dx2 = points[i + 1]!.x - points[i]!.x
        const dy2 = points[i + 1]!.y - points[i]!.y
        const len2 = Math.hypot(dx2, dy2)

        if (len1 > 0 && len2 > 0) {
          const nx1 = -dy1 / len1
          const ny1 = dx1 / len1
          const nx2 = -dy2 / len2
          const ny2 = dx2 / len2
          nx = (nx1 + nx2) / 2
          ny = (ny1 + ny2) / 2
          const dot = nx1 * nx + ny1 * ny
          if (dot > 0.1) {
            nx /= dot
            ny /= dot
          }
        } else if (len1 > 0) {
          nx = -dy1 / len1
          ny = dx1 / len1
        } else if (len2 > 0) {
          nx = -dy2 / len2
          ny = dx2 / len2
        }
      }
      pointNormals.push({ nx, ny })
    }

    const startDx = points[1]!.x - points[0]!.x
    const startDy = points[1]!.y - points[0]!.y
    if (Math.hypot(startDx, startDy) > 0) {
      this.addRoundCap(
        points[0]!,
        Math.atan2(startDy, startDx),
        Math.PI / 2,
        thickness,
        color,
      )
    }

    const stripStart = this.vertexCount
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!
      const n = pointNormals[i]!
      this.pushVertex(p.x, p.y, n.nx, n.ny, thickness, color, 1)
      this.pushVertex(p.x, p.y, -n.nx, -n.ny, thickness, color, -1)
    }

    for (let i = 0; i < points.length - 1; i++) {
      const vi = stripStart + i * 2
      this.pushTriangle(vi, vi + 1, vi + 2)
      this.pushTriangle(vi + 1, vi + 3, vi + 2)
    }

    const lastIdx = points.length - 1
    const endDx = points[lastIdx]!.x - points[lastIdx - 1]!.x
    const endDy = points[lastIdx]!.y - points[lastIdx - 1]!.y
    if (Math.hypot(endDx, endDy) > 0) {
      this.addRoundCap(
        points[lastIdx]!,
        Math.atan2(endDy, endDx),
        -Math.PI / 2,
        thickness,
        color,
      )
    }
  }

  addArrowhead(
    x: number,
    y: number,
    angle: number,
    size: number,
    color: number,
  ) {
    this.pushVertex(x, y, 0, 0, 0, color, 0)
    this.pushVertex(
      x,
      y,
      -Math.cos(angle - 0.5),
      -Math.sin(angle - 0.5),
      size,
      color,
      1,
    )
    this.pushVertex(
      x,
      y,
      -Math.cos(angle + 0.5),
      -Math.sin(angle + 0.5),
      size,
      color,
      1,
    )

    this.pushTriangle(
      this.vertexCount - 3,
      this.vertexCount - 2,
      this.vertexCount - 1,
    )
  }

  toSubBatch(): SubBatch {
    // slice (not subarray) detaches the over-allocated capacity buffer so it
    // can be GC'd once the build finishes. The per-element cost is trivial
    // compared to the build itself.
    const vertexData = this.vertexF32.slice(
      0,
      this.vertexCount * INSTANCE_STRIDE_F32,
    )
    return {
      vertexData,
      vertexDataU32: new Uint32Array(vertexData.buffer),
      colors: this.colorsU32.slice(0, this.vertexCount),
      indices: this.indexData.slice(0, this.indexCount),
      vertexCount: this.vertexCount,
    }
  }
}

export function buildGeometry(options: BuildOptions): RenderBatch {
  const {
    nodePositions,
    graph,
    nodeById,
    colorScheme,
    contigThickness,
    connectorThickness,
    drawPaths,
    scale,
    linearLayout,
    viewportBounds,
    colorDomain,
    deletions,
  } = options

  const nodeMesh = new MeshBuilder()
  const arrowMesh = new MeshBuilder()

  const nodeVertexRanges = new Map<string, VertexRange>()
  const arrowVertexRanges = new Map<number, VertexRange>()
  const edgeCurves: EdgeCurveBatch[] = []
  const edgeCurveRanges = new Map<number, VertexRange>()

  // the ramp costs a neighbour walk per node, so it is built only for the
  // scheme that reads it
  const colorRange = {
    ...computeColorSchemeRange(graph),
    referenceRamp:
      colorScheme === 'reference-position'
        ? computeReferenceRamp(graph, colorDomain)
        : undefined,
  }

  const nodeIndexMap = new Map<string, number>()
  if (colorScheme === 'rainbow') {
    for (let i = 0; i < graph.nodes.length; i++) {
      nodeIndexMap.set(graph.nodes[i]!.id, i)
    }
  }

  const pathColors = new Map<string, number>()
  if (graph.paths) {
    for (const path of graph.paths) {
      pathColors.set(path.name, hashColor(path.name, 0.85))
    }
  }

  const showArrows = scale > (linearLayout ? 1 : 0.1)

  for (let ei = 0; ei < graph.edges.length; ei++) {
    const edge = graph.edges[ei]!
    const fromSegments = nodePositions[edge.from]
    const toSegments = nodePositions[edge.to]
    if (!fromSegments?.length || !toSegments?.length) {
      continue
    }

    const fromEnd = fromSegments[fromSegments.length - 1]!
    const toStart = toSegments[0]!
    const numPaths = edge.pathIds?.length ?? 0
    const isSelfLoop = edge.from === edge.to
    const isDeletion = deletions?.has(ei) ?? false
    const edgeThickness =
      (connectorThickness / 2) * (isDeletion ? DELETION_THICKNESS_FACTOR : 1)

    const buildSingleEdge = (
      offsetX: number,
      offsetY: number,
      color: number,
    ) => {
      const curves = computeEdgeCurves(
        fromSegments,
        toSegments,
        isSelfLoop,
        offsetX,
        offsetY,
        scale,
      )

      if (viewportBounds && !isBezierInBounds(curves, viewportBounds)) {
        return
      }

      edgeCurves.push({ curves, thickness: edgeThickness, color })

      if (showArrows) {
        const last = curves[curves.length - 1]!
        arrowMesh.addArrowhead(
          last.x1,
          last.y1,
          endTangent(last),
          ARROWHEAD_SIZE,
          color,
        )
      }
    }

    const edgeCurveStart = edgeCurves.length
    const arrowStart = arrowMesh.vertexCount

    if (!drawPaths || numPaths === 0) {
      buildSingleEdge(
        0,
        0,
        isDeletion ? EDGE_DELETION_COLOR : EDGE_DEFAULT_COLOR,
      )
    } else {
      const dx = toStart.x - fromEnd.x
      const dy = toStart.y - fromEnd.y
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        const perpX = -dy / len
        const perpY = dx / len
        const offsetDist = 3

        for (let pathIdx = 0; pathIdx < numPaths; pathIdx++) {
          const offset = (pathIdx - (numPaths - 1) / 2) * offsetDist
          const pathId = edge.pathIds![pathIdx]!
          const color = pathColors.get(pathId) ?? EDGE_PATH_FALLBACK_COLOR
          buildSingleEdge(perpX * offset, perpY * offset, color)
        }
      }
    }

    const edgeCurveCount = edgeCurves.length - edgeCurveStart
    if (edgeCurveCount > 0) {
      edgeCurveRanges.set(ei, {
        start: edgeCurveStart,
        count: edgeCurveCount,
      })
    }
    const arrowCount = arrowMesh.vertexCount - arrowStart
    if (arrowCount > 0) {
      arrowVertexRanges.set(ei, { start: arrowStart, count: arrowCount })
    }
  }

  for (const [nodeId, segments] of Object.entries(nodePositions)) {
    const node = nodeById.get(nodeId)
    if (!node) {
      continue
    }

    if (viewportBounds && !isPolylineInBounds(segments, viewportBounds)) {
      continue
    }

    const color = getNodeColor(
      node,
      nodeIndexMap.get(nodeId) ?? 0,
      colorScheme,
      colorRange,
    )
    const nodeThickness = contigThickness / 2

    const startVert = nodeMesh.vertexCount
    nodeMesh.addPolyline(segments, nodeThickness, color)
    const count = nodeMesh.vertexCount - startVert
    if (count > 0) {
      nodeVertexRanges.set(nodeId, { start: startVert, count })
    }
  }

  return {
    nodes: nodeMesh.toSubBatch(),
    arrows: arrowMesh.toSubBatch(),
    nodeVertexRanges,
    arrowVertexRanges,
    edgeCurves,
    edgeCurveRanges,
  }
}

export function brightenColors(
  baseColors: Uint32Array,
  range: VertexRange,
  factor: number,
) {
  const slice = new Uint32Array(range.count)
  for (let v = 0; v < range.count; v++) {
    slice[v] = brightenAbgr(baseColors[range.start + v]!, factor)
  }
  return slice
}

export function extractColorSlice(baseColors: Uint32Array, range: VertexRange) {
  return baseColors.subarray(range.start, range.start + range.count)
}
