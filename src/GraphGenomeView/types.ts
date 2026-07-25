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

export interface LayoutResult {
  nodePositions: Record<string, NodeSegment[]>
}
