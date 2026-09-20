import { isBackbone } from '../anchoredNodes'
import { layerGraph } from '../layout/orderedLayout'

import type {
  BubbleRoute,
  MinigraphBubble,
} from '../../MinigraphBubbleAdapter/bubbleLine'
import type { AnchoredNode } from '../anchoredNodes'
import type { Graph, GraphNode } from '../types'

// Bubbles from the graph alone, off the layered order the ordered layout draws:
// a backbone node whose layer holds nothing else and that no edge jumps over is
// a bubble boundary, and whatever lies between two consecutive boundaries is a
// bubble. Needs a reference, not an index, so it works on a GBZ cut, a pggb
// file and the inside of a popped superbubble alike.
//
// Route statistics come from the walks when the graph has paths (exact, and
// immune to a repeat array whose copies the layer order cannot direct), and
// from a DP over the layered DAG otherwise. A reversed stretch comes out as one
// bubble whose interior runs against the reference, not as an inversion flag.

// gfatools' int32 clamp, so a derived count reads the same as an indexed one
const SATURATE = 2147483647

interface Routes {
  min: number
  max: number
  n: number
}

export function bubblesFromGraph(graph: Graph): MinigraphBubble[] {
  if (!graph.nodes.some(isBackbone)) {
    return []
  }
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const { layers, layerOf } = layerGraph(graph)
  const spanned = new Uint8Array(layers.length)
  // successors as a set: a repeat's back edge is the same DAG edge as its
  // forward one, and counting it twice doubles every route through the copy
  const succ = new Map<string, Set<string>>()
  const linked = new Set<string>()
  for (const e of graph.edges) {
    const a = layerOf.get(e.from)
    const b = layerOf.get(e.to)
    if (a === undefined || b === undefined || a === b) {
      continue
    }
    linked.add(`${e.from}>${e.to}`).add(`${e.to}>${e.from}`)
    const [lo, hi] = a < b ? [a, b] : [b, a]
    for (let l = lo + 1; l < hi; l++) {
      spanned[l] = 1
    }
    const [from, to] = a < b ? [e.from, e.to] : [e.to, e.from]
    ;(succ.get(from) ?? succ.set(from, new Set()).get(from)!).add(to)
  }
  // Boundaries are nodes: every backbone node alone in an unspanned layer, plus
  // the window's first and last backbone node whatever their layers hold, since
  // a repeat array whose copies reach the last backbone node leaves no unspanned
  // layer after it and would otherwise never close.
  const backbone = graph.nodes
    .filter(isBackbone)
    .sort((a, b) => a.stable.start - b.stable.start)
  const boundaryLayer = new Map<AnchoredNode, number>()
  layers.forEach((ids, l) => {
    const node = byId.get(ids[0]!)!
    if (ids.length === 1 && isBackbone(node) && !spanned[l]) {
      boundaryLayer.set(node, l)
    }
  })
  for (const node of [backbone[0]!, backbone.at(-1)!]) {
    boundaryLayer.set(node, layerOf.get(node.id)!)
  }
  const boundaries = [...boundaryLayer.entries()].sort(
    ([a, la], [b, lb]) => la - lb || a.stable.start - b.stable.start,
  )
  const walkIndex = graph.paths?.map(p => {
    const at = new Map<string, number>()
    p.nodeIds.forEach((id, i) => {
      if (!at.has(id)) {
        at.set(id, i)
      }
    })
    return at
  })

  const bubbles: MinigraphBubble[] = []
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const [start, l0] = boundaries[i]!
    const [end, l1] = boundaries[i + 1]!
    const interior = layers
      .slice(l0, l1 + 1)
      .flat()
      .filter(id => id !== start.id && id !== end.id)
    if (interior.length === 0) {
      continue
    }

    const best = new Map<string, Routes>([[start.id, { min: 0, max: 0, n: 1 }]])
    for (const id of [start.id, ...interior]) {
      const cur = best.get(id)
      if (!cur) {
        continue
      }
      for (const t of succ.get(id) ?? []) {
        const tl = layerOf.get(t)!
        if (tl > l1 || (tl <= l0 && t !== end.id)) {
          continue
        }
        const add = t === end.id ? 0 : byId.get(t)!.length
        const prev = best.get(t)
        best.set(t, {
          min: Math.min(prev?.min ?? Infinity, cur.min + add),
          max: Math.max(prev?.max ?? -Infinity, cur.max + add),
          n: Math.min(SATURATE, cur.n + (prev?.n ?? 0)),
        })
      }
    }
    const walked =
      walkIndex && walkRoutes(graph, byId, walkIndex, start.id, end.id)
    const routes = walked ?? best.get(end.id) ?? { min: 0, max: 0, n: 0 }
    // A walk that enters the bubble and never reaches its other end left the
    // cut: a GBZ cut of a repeat array at 1 kb of context splits each
    // haplotype's walk into pieces, and the routes seen are then a floor.
    const walksLeave = walked !== undefined && walked.left > 0

    const refStart = start.stable.start + start.length
    const refEnd = end.stable.start
    // The reference route exists in the cut only if every backbone pair inside
    // is linked; a flank the hop reached from an allele is not.
    const chain = [
      start.id,
      ...interior.filter(id => isBackbone(byId.get(id)!)),
      end.id,
    ]
    const chainBroken = chain.some(
      (id, k) => k > 0 && !linked.has(`${chain[k - 1]}>${id}`),
    )
    const partial = chainBroken || walksLeave
    const fallback = chainBroken && !walked
    bubbles.push({
      refName: start.stable.refName,
      start: refStart,
      end: refEnd,
      segmentCount: interior.length + 2,
      pathCount: routes.n,
      // a real inversion test needs each walk's direction relative to the
      // reference; the first visit's strand is just whichever path anchored the
      // node
      inversion: false,
      shortestAlleleLength: fallback ? refEnd - refStart : routes.min,
      longestAlleleLength: fallback ? refEnd - refStart : routes.max,
      segments: [start, ...interior.map(id => byId.get(id)!), end]
        .map(n => n.name)
        .join(','),
      shortestAllele: undefined,
      longestAllele: undefined,
      partial,
      routes: walked?.routes,
    })
  }
  return bubbles
}

// For every walk that passes both boundary nodes, the bp between them and the
// step sequence, so routes are distinct sequences and lengths are the true
// haplotype lengths. `left` counts the walks that pass one boundary and end
// before the other.
//
// `byId` is the caller's: this runs once per bubble, and a map of every node
// built here made the whole pass quadratic, seven seconds at 15k nodes.
function walkRoutes(
  graph: Graph,
  byId: Map<string, GraphNode>,
  walkIndex: Map<string, number>[],
  startId: string,
  endId: string,
): (Routes & { left: number; routes: BubbleRoute[] }) | undefined {
  const seen = new Map<string, BubbleRoute>()
  let min = Infinity
  let max = -Infinity
  let left = 0
  graph.paths!.forEach((p, k) => {
    const i0 = walkIndex[k]!.get(startId)
    const i1 = walkIndex[k]!.get(endId)
    if (i0 === undefined || i1 === undefined) {
      if (i0 !== undefined || i1 !== undefined) {
        left++
      }
      return
    }
    // Start to end, whichever way the walk crosses: a contig on the reverse
    // strand takes the same route, and read end-first it keyed as a second one.
    const steps = p.nodeIds.slice(Math.min(i0, i1) + 1, Math.max(i0, i1))
    if (i1 < i0) {
      steps.reverse()
    }
    let bp = 0
    for (const id of steps) {
      bp += byId.get(id)?.length ?? 0
    }
    const key = steps.join(',')
    const route = seen.get(key) ?? { steps, bp, walks: [] }
    route.walks.push(p.name)
    seen.set(key, route)
    min = Math.min(min, bp)
    max = Math.max(max, bp)
  })
  return seen.size || left
    ? { min, max, n: seen.size, left, routes: [...seen.values()] }
    : undefined
}
