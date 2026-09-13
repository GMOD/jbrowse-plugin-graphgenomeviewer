import { bubbleSegmentIds, classifyBubble } from './classifyBubble'
import { isBackbone } from '../anchoredNodes'

import type { BubbleKind } from './classifyBubble'
import type { MinigraphBubble } from '../../MinigraphBubbleAdapter/bubbleLine'
import type { Graph, NodeSegment } from '../types'

// A bubble drawn over the graph itself: a wide translucent stroke along the
// nodes inside it, in layout coordinates, so the same halo follows the nodes
// through the force layout's loops as through the ordered layout's lenses. The
// two backbone nodes a bubble hangs between are not inside it, and are left
// out so neighbouring halos do not touch.
export interface BubbleHalo {
  bubble: MinigraphBubble
  kind: BubbleKind
  label: string
  // an SVG path in layout units; a drawing transform puts it on screen
  path: string
  // where the label goes: the highest point of the halo, in layout units
  top: NodeSegment
  // how far the bubble's nodes spread, in layout units, so a label can be
  // placed on a node of the bubble rather than on the whole drawing
  members: number
}

export function bubbleHalos(
  graph: Graph,
  bubbles: MinigraphBubble[],
  positions: Record<string, NodeSegment[]>,
): BubbleHalo[] {
  const idByName = new Map(graph.nodes.map(n => [n.name, n]))
  const halos: BubbleHalo[] = []
  for (const bubble of bubbles) {
    const parts: string[] = []
    let top: NodeSegment | undefined
    let members = 0
    for (const name of bubbleSegmentIds(bubble)) {
      const node = idByName.get(name)
      const line = node && positions[node.id]
      if (
        !node ||
        !line?.length ||
        (isBackbone(node) &&
          (node.stable.start < bubble.start || node.stable.start >= bubble.end))
      ) {
        continue
      }
      members++
      parts.push(
        line
          .map((p, i) => `${i ? 'L' : 'M'}${round(p.x)},${round(p.y)}`)
          .join(''),
      )
      if (line.length === 1) {
        parts.push(`L${round(line[0]!.x)},${round(line[0]!.y)}`)
      }
      for (const p of line) {
        if (!top || p.y < top.y) {
          top = p
        }
      }
    }
    if (!top) {
      continue
    }
    halos.push({
      bubble,
      ...classifyBubble(bubble),
      path: parts.join(''),
      top,
      members,
    })
  }
  return halos
}

function round(v: number) {
  return Math.round(v * 100) / 100
}
