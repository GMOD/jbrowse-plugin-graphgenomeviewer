import { stableCoordinate } from '../../gfa-core/index'

import type { GFAGraph, GFANode } from '../../gfa-core/index'
import type { Graph, GraphEdge, GraphNode, GraphPath } from '../types'

// Single pass over every reference a GFA makes to a segment, collecting the two
// things the drawn graph needs from them.
//
// `canonical` is the one orientation each segment is drawn in, which is what
// Bandage calls single-node mode. A segment is the same sequence read either
// way (`L 1 + 2 +` is the same edge as `L 2 - 1 -`), so `1+` and `1-` are one
// node, not two: drawing both doubles every segment, and since the L lines only
// wire one of the pair, the other copy has no edges at all and scatters loose
// across the layout. Links carry the topology, so their orientation wins; a
// segment only paths mention takes the orientation they walk it in.
//
// `traversals` is how many paths cross each segment. Assembly GFAs carry read
// depth in a dp/RC/FC/KC tag, but a pangenome GFA (odgi, vg) carries none —
// there the meaningful depth is how many samples go through the segment, i.e.
// core versus accessory sequence.
function surveySegments(gfaGraph: GFAGraph) {
  const canonical = new Map<string, '+' | '-'>()
  const traversals = new Map<string, number>()
  function claim(id: string, strand: '+' | '-') {
    if (!canonical.has(id)) {
      canonical.set(id, strand)
    }
  }
  function traverse(id: string, strand: '+' | '-') {
    claim(id, strand)
    traversals.set(id, (traversals.get(id) ?? 0) + 1)
  }
  for (const link of gfaGraph.links) {
    claim(link.source, link.strand1 === '-' ? '-' : '+')
    claim(link.target, link.strand2 === '-' ? '-' : '+')
  }
  for (const gfaPath of gfaGraph.paths) {
    for (const segment of gfaPath.path.split(',')) {
      traverse(segment.slice(0, -1), segment.endsWith('-') ? '-' : '+')
    }
  }
  for (const walk of gfaGraph.walks) {
    for (const seg of walk.segments) {
      traverse(seg.id, seg.strand === '-' ? '-' : '+')
    }
  }
  return { canonical, traversals }
}

function makeNode(
  gfaNode: GFANode,
  strand: '+' | '-',
  depth: number,
): GraphNode {
  return {
    id: `${gfaNode.id}${strand}`,
    name: gfaNode.id,
    length: gfaNode.length,
    depth,
    stable: stableCoordinate(gfaNode),
  }
}

export function convertGFAToGraph(gfaGraph: GFAGraph, name = 'Imported GFA') {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const { canonical, traversals } = surveySegments(gfaGraph)
  // segments no link, path, or walk mentions are drawn forward-strand
  const nodeId = (segmentId: string) =>
    `${segmentId}${canonical.get(segmentId) ?? '+'}`

  for (const gfaNode of gfaGraph.nodes) {
    const dp =
      gfaNode.tags.dp ?? gfaNode.tags.RC ?? gfaNode.tags.FC ?? gfaNode.tags.KC
    const depth =
      typeof dp === 'number' && dp > 0
        ? dp
        : Math.max(traversals.get(gfaNode.id) ?? 1, 1)

    nodes.push(makeNode(gfaNode, canonical.get(gfaNode.id) ?? '+', depth))
  }

  for (const link of gfaGraph.links) {
    edges.push({ from: nodeId(link.source), to: nodeId(link.target) })
  }

  const paths: GraphPath[] = []
  const edgeToPathsMap = new Map<string, Set<string>>()

  // A path that walks the graph on the reverse strand visits an edge's nodes in
  // the opposite order to the L line that declared it, so the key is unordered.
  const edgeKey = (a: string, b: string) => [a, b].sort().join('--')

  function recordPathEdges(nodeIds: string[], name: string) {
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const key = edgeKey(nodeIds[i]!, nodeIds[i + 1]!)
      if (!edgeToPathsMap.has(key)) {
        edgeToPathsMap.set(key, new Set())
      }
      edgeToPathsMap.get(key)!.add(name)
    }
  }

  for (const gfaPath of gfaGraph.paths) {
    // path segments arrive as `<id><strand>`; the node they land on is the
    // segment's canonical orientation, whichever way this path reads it
    const nodeIds = gfaPath.path
      .split(',')
      .map(segment => nodeId(segment.slice(0, -1)))
    paths.push({ name: gfaPath.name, nodeIds } satisfies GraphPath)
    recordPathEdges(nodeIds, gfaPath.name)
  }

  for (const walk of gfaGraph.walks) {
    const nodeIds = walk.segments.map(seg => nodeId(seg.id))
    const name = `${walk.sample}#${walk.haplotype}`
    paths.push({
      name,
      nodeIds,
      sample: walk.sample,
      haplotype: walk.haplotype,
      contig: walk.contig,
    } satisfies GraphPath)
    recordPathEdges(nodeIds, name)
  }

  for (const edge of edges) {
    const pathIds = edgeToPathsMap.get(edgeKey(edge.from, edge.to))
    if (pathIds && pathIds.size > 0) {
      edge.pathIds = [...pathIds]
    }
  }

  return {
    name,
    nodes,
    edges,
    paths: paths.length > 0 ? paths : undefined,
  } satisfies Graph
}
