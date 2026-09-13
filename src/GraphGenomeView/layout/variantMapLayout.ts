import { backboneNodes } from '../anchoredNodes'

import type { Graph, LayoutResult, NodeSegment } from '../types'

// The reference alone, at its bp, as one line. Everything off the reference is
// left unplaced, so the renderer draws no allele nodes: the variation is drawn
// instead by the bubble overlay as one typed glyph per bubble, from the bubble
// index. Links between placed backbone nodes still draw, which is how a
// deletion keeps its arc.
export function variantMapLayout(graph: Graph): LayoutResult | undefined {
  const backbone = backboneNodes(graph)
  if (backbone.length === 0) {
    return undefined
  }
  const nodePositions: Record<string, NodeSegment[]> = {}
  for (const node of backbone) {
    nodePositions[node.id] = [
      { x: node.stable.start, y: 0 },
      { x: node.stable.start + node.length, y: 0 },
    ]
  }
  return { nodePositions, referenceAxis: true, pixelRows: true }
}
