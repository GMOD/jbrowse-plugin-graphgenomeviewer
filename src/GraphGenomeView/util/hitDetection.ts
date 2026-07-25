import { EdgeSpatialIndex, SpatialIndex } from './SpatialIndex'
import { translateCurves } from './geometry'

import type { Graph, NodeSegment } from '../types'
import type { BezierCurve } from './geometry'

export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1)
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export function distanceToCubicBezier(
  px: number,
  py: number,
  x1: number,
  y1: number,
  cx1: number,
  cy1: number,
  cx2: number,
  cy2: number,
  x2: number,
  y2: number,
) {
  let minDist = Infinity
  const samples = 20
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const u = 1 - t
    const bx =
      u * u * u * x1 +
      3 * u * u * t * cx1 +
      3 * u * t * t * cx2 +
      t * t * t * x2
    const by =
      u * u * u * y1 +
      3 * u * u * t * cy1 +
      3 * u * t * t * cy2 +
      t * t * t * y2
    const dist = Math.hypot(px - bx, py - by)
    if (dist < minDist) {
      minDist = dist
    }
  }
  return minDist
}

function distanceToBezierCurve(px: number, py: number, c: BezierCurve) {
  return distanceToCubicBezier(
    px,
    py,
    c.x0,
    c.y0,
    c.cx0,
    c.cy0,
    c.cx1,
    c.cy1,
    c.x1,
    c.y1,
  )
}

function distanceToEdgeCurves(px: number, py: number, curves: BezierCurve[]) {
  let minDist = Infinity
  for (const c of curves) {
    const d = distanceToBezierCurve(px, py, c)
    if (d < minDist) {
      minDist = d
    }
  }
  return minDist
}

// Indexes are cached against the layout they were built from, in a WeakMap
// rather than a module-level slot. A single slot meant two graph views in one
// session evicted each other's index on alternating mousemoves, and held the last
// graph's positions alive for as long as the tab lived. Keyed this way each view
// keeps its own, and an entry becomes collectable when its layout is replaced.
//
// `version` still has to be compared: a node drag mutates the position objects in
// place, so the identity of `nodePositions` cannot report that it changed.
const nodeCache = new WeakMap<
  Record<string, NodeSegment[]>,
  { version: number; index: SpatialIndex }
>()

function getSpatialIndex(
  nodePositions: Record<string, NodeSegment[]>,
  version: number,
) {
  const cached = nodeCache.get(nodePositions)
  if (cached?.version === version) {
    return cached.index
  }
  const index = new SpatialIndex(nodePositions)
  nodeCache.set(nodePositions, { version, index })
  return index
}

const edgeCache = new WeakMap<
  Record<string, NodeSegment[]>,
  {
    graph: Graph
    drawPaths: boolean
    scale: number
    version: number
    index: EdgeSpatialIndex
  }
>()

function getEdgeSpatialIndex(
  nodePositions: Record<string, NodeSegment[]>,
  graph: Graph,
  drawPaths: boolean,
  scale: number,
  version: number,
) {
  const cached = edgeCache.get(nodePositions)
  if (
    cached?.graph === graph &&
    cached.drawPaths === drawPaths &&
    cached.scale === scale &&
    cached.version === version
  ) {
    return cached.index
  }
  const index = new EdgeSpatialIndex(nodePositions, graph, drawPaths, scale)
  edgeCache.set(nodePositions, { graph, drawPaths, scale, version, index })
  return index
}

export function findHoveredNode(
  nodePositions: Record<string, NodeSegment[]>,
  graphX: number,
  graphY: number,
  scale: number,
  version = 0,
) {
  const nodeThreshold = 5 / scale
  const index = getSpatialIndex(nodePositions, version)
  const candidates = index.query(graphX, graphY, nodeThreshold)

  // The nearest candidate, not the first one inside the threshold. The threshold
  // is in world units (5 screen px), so when zoomed out it covers several nodes
  // at once and "first" meant whichever the grid happened to visit first — the
  // cursor could sit on one node and highlight its neighbour.
  let hovered: string | null = null
  let best = nodeThreshold
  for (const { nodeId, segmentIdx } of candidates) {
    const segments = nodePositions[nodeId]!
    const dist = distanceToSegment(
      graphX,
      graphY,
      segments[segmentIdx]!.x,
      segments[segmentIdx]!.y,
      segments[segmentIdx + 1]!.x,
      segments[segmentIdx + 1]!.y,
    )
    if (dist < best) {
      best = dist
      hovered = nodeId
    }
  }
  return hovered
}

export function findHoveredEdge(
  nodePositions: Record<string, NodeSegment[]>,
  graph: Graph,
  graphX: number,
  graphY: number,
  scale: number,
  drawPaths: boolean,
  version = 0,
) {
  const edgeThreshold = 10 / scale
  const edgeIndex = getEdgeSpatialIndex(
    nodePositions,
    graph,
    drawPaths,
    scale,
    version,
  )
  const candidates = edgeIndex.query(graphX, graphY, edgeThreshold)

  // Nearest, not first — same reason as findHoveredNode.
  let hovered: number | null = null
  let best = edgeThreshold
  for (const edgeIdx of candidates) {
    const edge = graph.edges[edgeIdx]!
    const fromSegments = nodePositions[edge.from]
    const toSegments = nodePositions[edge.to]
    if (!fromSegments?.length || !toSegments?.length) {
      continue
    }

    const numPaths = edge.pathIds?.length ?? 0
    const baseCurves = edgeIndex.getCurves(edgeIdx)
    if (!baseCurves) {
      continue
    }
    let dist: number

    if (!drawPaths || numPaths === 0) {
      dist = distanceToEdgeCurves(graphX, graphY, baseCurves)
    } else {
      const fromEnd = fromSegments[fromSegments.length - 1]!
      const toStart = toSegments[0]!
      const edgeDx = toStart.x - fromEnd.x
      const edgeDy = toStart.y - fromEnd.y
      const len = Math.hypot(edgeDx, edgeDy)
      if (len === 0) {
        continue
      }

      const perpX = -edgeDy / len
      const perpY = edgeDx / len
      const offsetDist = 3

      let minDist = Infinity
      for (let pathIdx = 0; pathIdx < numPaths; pathIdx++) {
        const pathOffset = (pathIdx - (numPaths - 1) / 2) * offsetDist
        const curves =
          pathOffset === 0
            ? baseCurves
            : translateCurves(
                baseCurves,
                perpX * pathOffset,
                perpY * pathOffset,
              )
        const d = distanceToEdgeCurves(graphX, graphY, curves)
        if (d < minDist) {
          minDist = d
        }
      }
      dist = minDist
    }

    if (dist < best) {
      best = dist
      hovered = edgeIdx
    }
  }
  return hovered
}
