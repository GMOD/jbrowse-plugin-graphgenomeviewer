import type { StableCoordinate } from '../gfa-core/index'

export interface GraphNode {
  id: string
  name: string
  length: number
  depth: number
  // where this segment sits on a stable sequence: stated per-segment by rGFA's
  // SN/SO/SR, derived from the P/W lines otherwise (pathAnchoring.ts)
  stable?: StableCoordinate
  // every assembly whose P/W record visits this segment, sorted. This is
  // carriage, and only a path GFA can state it: rGFA's SR is build order, so
  // there the most a segment says is which assembly first contributed it.
  samples?: string[]
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

// One P or W record, named the way a coordinate is named: the range suffix
// `odgi extract` appends (`K12#1#chr:1004500-1004961`) split off into `start`,
// so `name` is a stable sequence and `start` is where this path begins on it.
export interface PathOrigin {
  name: string
  sample: string
  start: number
  // bp the path covers, summed over its steps
  length: number
}

// One visit a path makes to one segment. A path may visit the same segment more
// than once (a collapsed repeat), so this is a list per segment, not a value.
export interface PathVisit {
  path: string
  sample: string
  // offset on `path`'s own sequence, from walking the path's steps
  start: number
  // how this path reads the segment, which is not how another path may read it
  strand: '+' | '-'
}

export interface Graph {
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  paths?: GraphPath[]
  // The paths that could put this graph on a reference axis, in file order, and
  // every segment visit they make. Absent for a GFA with no P/W records — an
  // rGFA, where the segments carry their own coordinates instead.
  anchorPaths?: PathOrigin[]
  pathVisits?: Map<string, PathVisit[]>
  // Where the nodes' `stable` came from. 'tags' is rGFA's SN/SO/SR; 'paths' is
  // derived, and the only one that can be re-derived against a different
  // reference path. Absent when nothing anchors the graph at all.
  anchoredBy?: 'tags' | 'paths'
  // the path `anchoredBy: 'paths'` put on x
  referencePath?: string
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
  // Set by the layouts whose x is reference bp, so the fit can be taken from
  // the region the cut was made for rather than from how far the drawing
  // happens to reach. An allele anchored far outside the window is a fact
  // about the graph, not a reason to redraw the window at 6% of the frame —
  // see layoutBounds.
  referenceAxis?: boolean
}
