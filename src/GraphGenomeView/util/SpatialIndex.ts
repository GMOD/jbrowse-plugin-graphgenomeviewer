import { computeEdgeCurves } from './geometry'
import { bypassedPoints } from '../deletionEdges'

import type { Graph, NodeSegment } from '../types'
import type { AxisScale, BezierCurve } from './geometry'

interface CellEntry {
  nodeId: string
  segmentIdx: number
}

// A uniform grid only performs when its cells are about the size of the things
// in them: too large and every query scans a crowd, too small and every item is
// stamped into hundreds of cells. World units here are whatever the layout uses,
// and the two differ by orders of magnitude — the force layout's are screen-ish
// (nodes ~8 units long), while the reference-anchored layouts put x in bp, so a
// 100 kb window is 100,000 units wide. A fixed 50 was tuned for the first and
// left the second stamping each edge into hundreds of cells: measured 7.2 ms to
// index 800 bp-scale edges, against 2.8 ms for 8,000 screen-scale ones.
//
// So the size is derived from the mean extent of the items being indexed.
const FALLBACK_CELL_SIZE = 50

function meanExtentCellSize(extentTotal: number, count: number) {
  return count > 0 ? Math.max(1, extentTotal / count) : FALLBACK_CELL_SIZE
}

function getOrCreateCell<T>(
  cells: Map<number, Map<number, T[]>>,
  cx: number,
  cy: number,
) {
  let row = cells.get(cx)
  if (!row) {
    row = new Map()
    cells.set(cx, row)
  }
  let cell = row.get(cy)
  if (!cell) {
    cell = []
    row.set(cy, cell)
  }
  return cell
}

function addToGrid<T>(
  cells: Map<number, Map<number, T[]>>,
  cellSize: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  entry: T,
) {
  const cx0 = Math.floor(minX / cellSize)
  const cx1 = Math.floor(maxX / cellSize)
  const cy0 = Math.floor(minY / cellSize)
  const cy1 = Math.floor(maxY / cellSize)
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      getOrCreateCell(cells, cx, cy).push(entry)
    }
  }
}

// The radius is per axis because the two axes need not be in the same units: a
// row layout's x is bp and its y is screen px, so the same 5 px of slack is
// hundreds of bp one way and 5 the other. Passing the x radius on both axes
// would sweep every row in the band into the candidate set.
function queryGrid<T>(
  cells: Map<number, Map<number, T[]>>,
  cellSize: number,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
): T[] {
  const cx0 = Math.floor((x - radiusX) / cellSize)
  const cx1 = Math.floor((x + radiusX) / cellSize)
  const cy0 = Math.floor((y - radiusY) / cellSize)
  const cy1 = Math.floor((y + radiusY) / cellSize)
  const results: T[] = []
  const seen = new Set<T>()
  for (let cx = cx0; cx <= cx1; cx++) {
    const row = cells.get(cx)
    if (row) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const cell = row.get(cy)
        if (cell) {
          for (const entry of cell) {
            if (!seen.has(entry)) {
              seen.add(entry)
              results.push(entry)
            }
          }
        }
      }
    }
  }
  return results
}

export class SpatialIndex {
  private cellSize: number
  private cells = new Map<number, Map<number, CellEntry[]>>()

  constructor(
    nodePositions: Record<string, NodeSegment[]>,
    cellSize?: number,
  ) {
    // Segment boxes are collected first so the cell size can come from their
    // mean extent; the grid itself needs the size up front.
    const boxes: {
      entry: CellEntry
      minX: number
      minY: number
      maxX: number
      maxY: number
    }[] = []
    let extentTotal = 0
    for (const [nodeId, segments] of Object.entries(nodePositions)) {
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i]!
        const next = segments[i + 1]!
        const minX = Math.min(seg.x, next.x)
        const minY = Math.min(seg.y, next.y)
        const maxX = Math.max(seg.x, next.x)
        const maxY = Math.max(seg.y, next.y)
        extentTotal += maxX - minX + (maxY - minY)
        boxes.push({ entry: { nodeId, segmentIdx: i }, minX, minY, maxX, maxY })
      }
    }

    this.cellSize = cellSize ?? meanExtentCellSize(extentTotal, boxes.length)
    for (const b of boxes) {
      addToGrid(
        this.cells,
        this.cellSize,
        b.minX,
        b.minY,
        b.maxX,
        b.maxY,
        b.entry,
      )
    }
  }

  query(x: number, y: number, radiusX: number, radiusY = radiusX) {
    return queryGrid(this.cells, this.cellSize, x, y, radiusX, radiusY)
  }
}

export class EdgeSpatialIndex {
  private cellSize: number
  private cells = new Map<number, Map<number, number[]>>()
  // Base curves (offset 0) by edge index — retained here because we already
  // compute them to derive each edge's bbox. findHoveredEdge reuses them on
  // every mousemove; path-offset variants translate them (pure translation).
  private edgeCurves = new Map<number, BezierCurve[]>()

  constructor(
    nodePositions: Record<string, NodeSegment[]>,
    graph: Graph,
    drawPaths: boolean,
    // The transform the curves indexed here were drawn under, so hit detection
    // tests the shape on screen. See AxisScale.
    axis: AxisScale,
    cellSize?: number,
    // Bypassed backbone ids per deletion edge, i.e. what GeometryBuilder is
    // given. Without it a deletion is indexed and hit-tested on the STRAIGHT
    // chord between its endpoints while it is drawn as an arc bowed off that
    // chord, so the shape on screen is not hoverable and the empty space where
    // the chord runs is — and the tutorial tells the reader to hover it for the
    // interval and the bp. Bowing is part of the drawn geometry, so it has to be
    // part of the geometry hit detection uses.
    deletions?: Map<number, string[]>,
  ) {
    const boxes: {
      ei: number
      minX: number
      minY: number
      maxX: number
      maxY: number
    }[] = []
    let extentTotal = 0
    for (let ei = 0; ei < graph.edges.length; ei++) {
      const edge = graph.edges[ei]!
      const fromSegments = nodePositions[edge.from]
      const toSegments = nodePositions[edge.to]
      if (fromSegments?.length && toSegments?.length) {
        const isSelfLoop = edge.from === edge.to
        const bypassed = deletions?.get(ei)
        const curves = computeEdgeCurves(
          fromSegments,
          toSegments,
          isSelfLoop,
          0,
          0,
          axis,
          bypassed ? bypassedPoints(nodePositions, bypassed) : [],
        )
        this.edgeCurves.set(ei, curves)

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const c of curves) {
          minX = Math.min(minX, c.x0, c.cx0, c.cx1, c.x1)
          maxX = Math.max(maxX, c.x0, c.cx0, c.cx1, c.x1)
          minY = Math.min(minY, c.y0, c.cy0, c.cy1, c.y1)
          maxY = Math.max(maxY, c.y0, c.cy0, c.cy1, c.y1)
        }

        const numPaths = edge.pathIds?.length ?? 0
        if (drawPaths && numPaths > 0) {
          const padding = ((numPaths - 1) / 2) * 3
          minX -= padding
          minY -= padding
          maxX += padding
          maxY += padding
        }

        extentTotal += maxX - minX + (maxY - minY)
        boxes.push({ ei, minX, minY, maxX, maxY })
      }
    }

    this.cellSize = cellSize ?? meanExtentCellSize(extentTotal, boxes.length)
    for (const b of boxes) {
      addToGrid(
        this.cells,
        this.cellSize,
        b.minX,
        b.minY,
        b.maxX,
        b.maxY,
        b.ei,
      )
    }
  }

  getCurves(ei: number) {
    return this.edgeCurves.get(ei)
  }

  query(x: number, y: number, radiusX: number, radiusY = radiusX) {
    return queryGrid(this.cells, this.cellSize, x, y, radiusX, radiusY)
  }
}
