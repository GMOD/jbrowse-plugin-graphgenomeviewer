import type { StableCoordinate } from '../gfa-core/index'

export interface GraphNode {
  id: string
  name: string
  length: number
  depth: number
  // set only for rGFA, where the segment states its own reference coordinate
  stable?: StableCoordinate
}

export interface GraphEdge {
  from: string
  to: string
  pathIds?: string[]
}

export interface GraphPath {
  name: string
  nodeIds: string[]
  // set for W records, which state the assembly they walk; P records do not
  sample?: string
  haplotype?: number
  contig?: string
}

export interface Graph {
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  paths?: GraphPath[]
}

export interface NodeSegment {
  x: number
  y: number
}

// A row a layout drew, named, in the same graph y coordinates as
// `nodePositions`. Emitted by the layout that positioned the rows rather than
// recomputed by the renderer, so a label cannot end up naming a row the layout
// put somewhere else. Absent for layouts with no row structure (FMMM).
export interface RowLabel {
  label: string
  y: number
}

export interface LayoutResult {
  nodePositions: Record<string, NodeSegment[]>
  rowLabels?: RowLabel[]
}
