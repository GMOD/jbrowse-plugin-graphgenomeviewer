import { isBackbone } from '../GraphGenomeView/anchoredNodes'

import type { GraphNode } from '../GraphGenomeView/types'

// What a LinearGenomeView writes to `session.hovered` on every mousemove (see
// LinearGenomeViewContainer): the bp under the cursor, plus the feature under it
// if the topmost track had one. Nothing names the source VIEW, so a graph view
// filters by whether the position falls in the region it was cut from — but the
// position does name the source ASSEMBLY, and that turns out to be the half
// that matters.
export interface LgvHover {
  refName: string
  coord: number
  // The assembly the hovered view is showing. `hoverPosition` is a
  // `PxToBpResult`, i.e. the displayed region the pointer landed in spread flat,
  // so this is that region's own `assemblyName`.
  //
  // Read because refName alone does not identify a locus in a session holding
  // several assemblies, which is every session these graphs are launched in. A
  // PanSN name reduces to a bare contig — the E. coli pangenome loads five
  // strains each with one refName `chr`, and HPRC's hg38 and a GenArk haplotype
  // both call it `chr6` — so a synteny stack's rows all answer to the same
  // name at unrelated coordinates. Without this the hover on ANY row lit up a
  // node in the graph, and the node then published its own reference interval
  // back into every linear view.
  //
  // Optional because the channel is typed `unknown` and read structurally: a
  // hover that states no assembly is taken at its word rather than dropped.
  assemblyName?: string
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
    const { refName, coord, assemblyName } = hovered.hoverPosition
    if (typeof refName === 'string' && typeof coord === 'number') {
      const feature = hovered.hoverFeature
      const name = isFeatureLike(feature) ? feature.get('name') : undefined
      result = {
        refName,
        coord,
        assemblyName:
          typeof assemblyName === 'string' ? assemblyName : undefined,
        featureName: typeof name === 'string' ? name : undefined,
      }
    }
  }
  return result
}

// Whether a hover is one this graph can answer: the same assembly, the same
// stable sequence, and inside the window the cut was made for.
//
// The assembly is checked FIRST and is the whole reason this is not just a
// coordinate test. See LgvHover.assemblyName: a graph cut from K12 and a
// synteny row on Sakai both call their sequence `chr`, so on refName and
// coordinate alone every row of the stack matched and the graph highlighted a
// K12 node at Sakai's offset. A hover that names no assembly still passes,
// which is what a hand-written channel writer and the older LGVs get.
export function hoverInRegion(
  hover: LgvHover,
  region: { refName: string; assemblyName: string; start: number; end: number },
) {
  return (
    (hover.assemblyName === undefined ||
      hover.assemblyName === region.assemblyName) &&
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
