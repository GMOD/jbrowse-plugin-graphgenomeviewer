import { ROW_HEIGHT_PX } from './rowSpacing'
import { isBackbone } from '../anchoredNodes'

import type { Graph, GraphNode, LayoutResult, NodeSegment } from '../types'

// Reference-ordered layered layout: x is reference ORDER, not bp. Backbone
// segments take increasing layers by stable offset, every other node the layer
// between the anchors it hangs off, and a node is as wide as the log of its bp,
// so a SNP allele gets the same room as a 10 kb segment and a bubble reads as a
// lens rather than a bar under a line. y is a lane in screen px with the
// reference pinned at lane 0 (docs/layout-experiments.md, experiment 3).

const GUTTER = 12
const LANE_PX = ROW_HEIGHT_PX

function nodeWidth(node: GraphNode) {
  return 10 + 8 * Math.log2(1 + node.length)
}

function compare<T extends string | number>(a: T, b: T) {
  return a < b ? -1 : a > b ? 1 : 0
}

// Every node id in reference order: backbone by stable offset, an off-reference
// node just past the nearest backbone node that reaches it (BFS over the edges
// as undirected), nodes no backbone reaches last. Name breaks ties, so the
// order is a strict total order and the same graph always gets the same one.
export function referenceOrder(graph: Graph) {
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const adjacent = new Map<string, string[]>()
  for (const e of graph.edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) {
      continue
    }
    ;(adjacent.get(e.from) ?? adjacent.set(e.from, []).get(e.from)!).push(e.to)
    ;(adjacent.get(e.to) ?? adjacent.set(e.to, []).get(e.to)!).push(e.from)
  }
  const key = new Map<string, number>()
  const queue: string[] = []
  for (const n of graph.nodes) {
    if (isBackbone(n)) {
      key.set(n.id, n.stable.start)
      queue.push(n.id)
    }
  }
  // the queue grows while the loop walks it, which for-of follows
  for (const id of queue) {
    for (const nb of adjacent.get(id) ?? []) {
      if (!key.has(nb)) {
        key.set(nb, key.get(id)! + 0.5)
        queue.push(nb)
      }
    }
  }
  return graph.nodes
    .map(n => n.id)
    .sort(
      (a, b) =>
        compare(key.get(a) ?? Infinity, key.get(b) ?? Infinity) ||
        compare(byId.get(a)!.name, byId.get(b)!.name) ||
        compare(a, b),
    )
}

export function orderedLayout(graph: Graph): LayoutResult | undefined {
  if (!graph.nodes.some(isBackbone)) {
    return undefined
  }
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const order = referenceOrder(graph)
  const key = new Map(order.map((id, i) => [id, i]))
  const isRef = (id: string) => isBackbone(byId.get(id)!)

  // Every edge directed from lower reference key to higher, so the graph is
  // acyclic by construction and no cycle-removal heuristic can misplace the
  // reference.
  const preds = new Map<string, string[]>(order.map(id => [id, []]))
  const succs = new Map<string, string[]>(order.map(id => [id, []]))
  const link = (a: string, b: string) => {
    preds.get(b)!.push(a)
    succs.get(a)!.push(b)
  }
  for (const e of graph.edges) {
    if (e.from === e.to || !key.has(e.from) || !key.has(e.to)) {
      continue
    }
    if (key.get(e.from)! < key.get(e.to)!) {
      link(e.from, e.to)
    } else {
      link(e.to, e.from)
    }
  }
  // The backbone chained by virtual edges, so the reference stays monotone even
  // where adjacent segments are not linked inside the cut.
  const backbone = order.filter(isRef)
  for (let i = 1; i < backbone.length; i++) {
    link(backbone[i - 1]!, backbone[i]!)
  }

  // Longest-path layering; the key order is a topological order of this DAG.
  const layer = new Map<string, number>()
  for (const id of order) {
    let l = 0
    for (const p of preds.get(id)!) {
      l = Math.max(l, layer.get(p)! + 1)
    }
    layer.set(id, l)
  }
  // Then each allele slides right to centre between the layer its predecessors
  // force and the one its successors allow, so a short allele sits in the
  // middle of its bubble rather than hugging the left anchor.
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]!
    const s = succs.get(id)!
    if (isRef(id) || s.length === 0) {
      continue
    }
    let minSucc = Infinity
    for (const t of s) {
      minSucc = Math.min(minSucc, layer.get(t)!)
    }
    const lo = layer.get(id)!
    const hi = Math.max(lo, minSucc - 1)
    layer.set(id, Math.floor((lo + hi) / 2))
  }

  const layers: string[][] = []
  for (const id of order) {
    ;(layers[layer.get(id)!] ??= []).push(id)
  }

  const layerWidth = layers.map(ids => {
    let w = 0
    for (const id of ids) {
      w = Math.max(w, nodeWidth(byId.get(id)!))
    }
    return w
  })
  const layerX: number[] = []
  let x = 0
  for (let l = 0; l < layers.length; l++) {
    layerX[l] = x
    x += layerWidth[l]! + GUTTER
  }

  // y: sweep the layers left to right, each allele at the barycenter of its
  // placed predecessors, then at the nearest FREE lane to it. Lane 0 is the
  // reference line and stays reserved even in a layer with no backbone node,
  // or an allele between two backbone segments reads as reference.
  const y = new Map<string, number>()
  for (const ids of layers) {
    const free: { id: string; ideal: number }[] = []
    for (const id of ids) {
      if (isRef(id)) {
        y.set(id, 0)
        continue
      }
      const placed = preds.get(id)!.filter(p => y.has(p))
      let ideal = 0
      for (const p of placed) {
        ideal += y.get(p)! / placed.length
      }
      // a node straight off the backbone wants to leave it, not sit on it
      free.push({ id, ideal: ideal === 0 ? LANE_PX : ideal })
    }
    free.sort((a, b) => a.ideal - b.ideal)
    const taken = new Set([0])
    for (const { id, ideal } of free) {
      let lane = Math.round(ideal / LANE_PX)
      if (lane === 0) {
        lane = ideal >= 0 ? 1 : -1
      }
      for (let d = 1; taken.has(lane); d++) {
        if (!taken.has(lane + d)) {
          lane += d
        } else if (!taken.has(lane - d)) {
          lane -= d
        }
      }
      taken.add(lane)
      y.set(id, lane * LANE_PX)
    }
  }

  const nodePositions: Record<string, NodeSegment[]> = {}
  for (const n of graph.nodes) {
    const l = layer.get(n.id)!
    const w = nodeWidth(n)
    const cx = layerX[l]! + layerWidth[l]! / 2
    const ny = y.get(n.id)!
    nodePositions[n.id] = [
      { x: cx - w / 2, y: ny },
      { x: cx + w / 2, y: ny },
    ]
  }
  return { nodePositions, referenceAxis: false, pixelRows: true }
}
