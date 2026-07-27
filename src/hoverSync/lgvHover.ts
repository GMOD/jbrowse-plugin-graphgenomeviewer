import { isBackbone } from '../GraphGenomeView/anchoredNodes'

import type { GraphNode } from '../GraphGenomeView/types'

// What a LinearGenomeView writes to `session.hovered` on every mousemove (see
// LinearGenomeViewContainer): the bp under the cursor, plus the feature under it
// if the topmost track had one. Neither field names the source view, so a graph
// view filters by whether the position falls inside the region it was cut from.
export interface LgvHover {
  refName: string
  coord: number
  featureName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

interface FeatureLike {
  get: (key: string) => unknown
}

function isFeatureLike(value: unknown): value is FeatureLike {
  return isRecord(value) && typeof value.get === 'function'
}

// `hovered` is typed `unknown` on the session by design — it is a shared channel
// every view writes its own shape to — so this reads the LGV's shape out of it
// structurally rather than asserting a type onto it.
export function readLgvHover(hovered: unknown): LgvHover | undefined {
  let result: LgvHover | undefined
  if (isRecord(hovered) && isRecord(hovered.hoverPosition)) {
    const { refName, coord } = hovered.hoverPosition
    if (typeof refName === 'string' && typeof coord === 'number') {
      const feature = hovered.hoverFeature
      const name = isFeatureLike(feature) ? feature.get('name') : undefined
      result = {
        refName,
        coord,
        featureName: typeof name === 'string' ? name : undefined,
      }
    }
  }
  return result
}

export function hoverInRegion(
  hover: LgvHover,
  region: { refName: string; start: number; end: number },
) {
  return (
    hover.refName === region.refName &&
    hover.coord >= region.start &&
    hover.coord <= region.end
  )
}

// The graph node a linear-view hover points at.
//
// The feature under the cursor is the exact answer when the graph's own segments
// track is what's hovered: an RgfaTabixAdapter feature's name is the segment id,
// which is `GraphNode.name` (`GraphNode.id` carries a strand suffix, so the
// match has to be on name). Any other track — genes, bubbles — supplies only a
// coordinate, which still identifies the backbone segment covering it: the
// backbone tiles the reference exactly once, whether rGFA's rank 0 declared it
// or a reference path's own steps did.
export function nodeForLgvHover({
  hover,
  nodes,
}: {
  hover: LgvHover
  nodes: GraphNode[]
}) {
  let byName: string | undefined
  let byCoord: string | undefined
  for (const node of nodes) {
    if (node.name === hover.featureName) {
      byName = node.id
    } else if (
      byCoord === undefined &&
      isBackbone(node) &&
      hover.coord >= node.stable.start &&
      hover.coord < node.stable.start + node.length
    ) {
      byCoord = node.id
    }
  }
  // An exact segment match wins over the coordinate it happens to sit at.
  return byName ?? byCoord ?? null
}
