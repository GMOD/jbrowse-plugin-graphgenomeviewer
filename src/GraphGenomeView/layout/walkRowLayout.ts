import { ROW_HEIGHT_PX } from './rowSpacing'
import { walkRows } from './walkRows'
import { backboneNodes } from '../anchoredNodes'

import type { Graph, LayoutResult, NodeSegment, RowLabel } from '../types'

// The reference walk as the backbone on row 0, at its bp, and a row per other
// walk below it. The rows themselves are not nodes: a node the renderer draws
// once cannot sit on nine rows, so WalkRowsOverlay draws each walk's bar from
// `walkRows`, and this layout only reserves the rows and states how far the
// bars reach so the fit and the pane height include them.
// The fit leaves this much past the longest bar for its readout and the legend.
const READOUT_ROOM = 1.3

export function walkRowLayout(
  graph: Graph,
  region?: { start: number; end: number },
): LayoutResult | undefined {
  const backbone = backboneNodes(graph)
  const walks = walkRows(graph, region)
  if (backbone.length === 0 || !walks) {
    return undefined
  }
  const nodePositions: Record<string, NodeSegment[]> = {}
  for (const node of backbone) {
    const { start } = node.stable
    nodePositions[node.id] = [
      { x: start, y: 0 },
      { x: start + node.length, y: 0 },
    ]
  }
  const rowLabels: RowLabel[] = [
    { label: walks.reference.label, y: 0 },
    ...walks.rows.map((row, i) => ({
      label: row.label,
      y: (i + 1) * ROW_HEIGHT_PX,
    })),
  ]
  const longest = Math.max(walks.reference.bp, ...walks.rows.map(r => r.bp))
  return {
    nodePositions,
    rowLabels,
    referenceAxis: true,
    pixelRows: true,
    extent: {
      maxX: walks.origin + longest * READOUT_ROOM,
      maxY: walks.rows.length * ROW_HEIGHT_PX,
    },
  }
}
