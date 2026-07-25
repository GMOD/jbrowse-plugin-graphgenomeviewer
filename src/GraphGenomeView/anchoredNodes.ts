import type { Graph, GraphNode } from './types'
import type { StableCoordinate } from '../gfa-core/index'

// A node whose stable coordinate is known to be present. rGFA states SN/SO/SR on
// every segment, so the anchored layouts and the allele projection all work with
// nodes whose `stable` is a fact rather than an optional — narrowing once here
// keeps them from asserting it at every use.
export type AnchoredNode = GraphNode & { stable: StableCoordinate }

// rGFA's stable rank: 0 is the reference backbone, higher ranks are the sequence
// that diverges from it.
export const REFERENCE_RANK = 0

export function isAnchored(node: GraphNode): node is AnchoredNode {
  return node.stable !== undefined
}

// Narrows to AnchoredNode so `filter` yields nodes whose coordinate is a fact.
// Only use it on nodes that may be unanchored: negating a type predicate on an
// AnchoredNode narrows the other branch to `never`, which is not what "off the
// backbone" means. Where a node is already anchored, compare the rank directly.
export function isBackbone(node: GraphNode): node is AnchoredNode {
  return node.stable?.rank === REFERENCE_RANK
}

export function backboneNodes(graph: Graph) {
  return graph.nodes.filter(isBackbone)
}

// bp the backbone covers in this subgraph. Both anchored layouts scale their row
// spacing and their minimum drawn allele length off it.
//
// A fold rather than Math.max(...starts): the subgraph path is capped at 100 kb
// but a whole-file GFA import is not, and spreading a backbone of more than
// ~130k segments into an argument list throws RangeError.
export function backboneSpan(backbone: AnchoredNode[]) {
  let min = Infinity
  let max = -Infinity
  for (const node of backbone) {
    min = Math.min(min, node.stable.start)
    max = Math.max(max, node.stable.start + node.length)
  }
  return max - min
}
