import type { Graph } from '../types'

// The graph inside one bubble: the segments the bubble row names, with the
// links among them. The row's list includes the two backbone segments the
// bubble hangs between, so the cut keeps its anchors and every layout that
// needs a backbone still has one. Paths are dropped rather than sliced, since
// a bubble cut is a look inside, not a new document.
export function bubbleSubgraph(graph: Graph, segmentIds: string[]): Graph {
  const keep = new Set(segmentIds)
  const nodes = graph.nodes.filter(n => keep.has(n.name))
  const ids = new Set(nodes.map(n => n.id))
  return {
    name: graph.name,
    nodes,
    edges: graph.edges.filter(e => ids.has(e.from) && ids.has(e.to)),
    anchoredBy: graph.anchoredBy,
    referencePath: graph.referencePath,
  }
}
