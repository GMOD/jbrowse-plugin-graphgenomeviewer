import type { Graph, NodeSegment } from '@jbrowse/bandage-core/types'

type Positions = Record<string, NodeSegment[]>

export interface PaneTransform {
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
}

// Morphs above this many nodes snap instead: each frame rebuilds the
// geometry, which past it no longer fits a frame (GRAPH_SCALE_AND_LOD.md)
export const MORPH_MAX_NODES = 3000
export const MORPH_MS = 350

function arcPrefix(line: NodeSegment[]) {
  const arc = [0]
  for (let i = 1; i < line.length; i++) {
    arc.push(
      arc[i - 1]! +
        Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y),
    )
  }
  return arc
}

// `line` as `count` points spaced evenly along its length
function resample(line: NodeSegment[], count: number): NodeSegment[] {
  if (line.length === 1 || count === 1) {
    return Array.from({ length: count }, () => ({ ...line[0]! }))
  }
  const arc = arcPrefix(line)
  const total = arc.at(-1)!
  const out: NodeSegment[] = []
  let j = 1
  for (let k = 0; k < count; k++) {
    const at = (total * k) / (count - 1)
    while (j < line.length - 1 && arc[j]! < at) {
      j++
    }
    const span = arc[j]! - arc[j - 1]!
    const f = span > 0 ? (at - arc[j - 1]!) / span : 0
    const a = line[j - 1]!
    const b = line[j]!
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
  }
  return out
}

// Where each node of `next` starts a morph from the drawing `prev` left on
// screen: a node both share starts where it was drawn, carried through the
// old transform onto the screen and back through the new one; a node new to
// the drawing starts collapsed on the nearest point of a neighbour that has a
// start; anything else starts where it ends. Each start has its end's point
// count, so a frame is a pointwise blend.
export function morphStarts(
  prev: Positions,
  prevTransform: PaneTransform,
  next: Positions,
  nextTransform: PaneTransform,
  edges: Graph['edges'],
): Positions {
  const toNext = (p: NodeSegment) => ({
    x:
      (p.x * prevTransform.scaleX +
        prevTransform.translateX -
        nextTransform.translateX) /
      nextTransform.scaleX,
    y:
      (p.y * prevTransform.scaleY +
        prevTransform.translateY -
        nextTransform.translateY) /
      nextTransform.scaleY,
  })
  const starts: Positions = {}
  for (const [id, line] of Object.entries(next)) {
    const before = prev[id]
    if (before?.length && line.length) {
      starts[id] = resample(before.map(toNext), line.length)
    }
  }

  const neighbours = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    const list = neighbours.get(a)
    if (list) {
      list.push(b)
    } else {
      neighbours.set(a, [b])
    }
  }
  for (const { from, to } of edges) {
    link(from, to)
    link(to, from)
  }
  const queue = Object.keys(starts)
  for (const id of queue) {
    const from = starts[id]!
    const end = next[id]!
    for (const other of neighbours.get(id) ?? []) {
      const line = next[other]
      if (starts[other] || !line?.length) {
        continue
      }
      const mid = line[Math.floor(line.length / 2)]!
      let best = 0
      let bestDistance = Infinity
      end.forEach((p, k) => {
        const d = (p.x - mid.x) ** 2 + (p.y - mid.y) ** 2
        if (d < bestDistance) {
          bestDistance = d
          best = k
        }
      })
      const anchor = from[best]!
      starts[other] = line.map(() => ({ ...anchor }))
      queue.push(other)
    }
  }
  for (const [id, line] of Object.entries(next)) {
    starts[id] ??= line.map(p => ({ ...p }))
  }
  return starts
}

export function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

// Writes the blend of `starts` and `ends` at `t` into `into` IN PLACE, the
// way a node drag moves positions (settingActions' moveNode)
export function blendInto(
  into: Positions,
  starts: Positions,
  ends: Positions,
  t: number,
) {
  for (const [id, line] of Object.entries(into)) {
    const a = starts[id]
    const b = ends[id]
    if (!a || !b) {
      continue
    }
    line.forEach((p, k) => {
      p.x = t === 1 ? b[k]!.x : a[k]!.x + (b[k]!.x - a[k]!.x) * t
      p.y = t === 1 ? b[k]!.y : a[k]!.y + (b[k]!.y - a[k]!.y) * t
    })
  }
}
