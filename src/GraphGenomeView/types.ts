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
  overlap: number
  pathIds?: string[]
}

export interface GraphPath {
  name: string
  nodeIds: string[]
  // parallel to nodeIds: whether the path reads that segment reverse-strand.
  // Only PG-SGD needs it, to keep a node from being drawn backwards relative to
  // the path walking through it.
  reverse?: boolean[]
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

export const COLOR_SCHEMES = [
  'uniform',
  'random',
  'rainbow',
  'depth',
  'node-length',
  'stable-rank',
  'grey',
] as const

export type ColorScheme = (typeof COLOR_SCHEMES)[number]
