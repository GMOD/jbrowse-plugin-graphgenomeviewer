// What a drawing adds over its nodes and edges, as a config or session lists
// them:
// - `paths`: a ribbon per walk
// - `bubbles`: a halo along each bubble's nodes, with a label that opens it.
//   Off by default, since on a base-level cut every SNP's halo is a blob
// - `deletions`: an edge for each walk that skips reference
// - `genes`: the session's genes, exons along the nodes that carry them
// - `referenceStrip`: reference segments at their bp, over a drawing in its
//   own coordinates inside a linear view
// - `walkStrip`: walk rows under a node layout, linked to the drawing
export type GraphLayer =
  'paths' | 'bubbles' | 'deletions' | 'genes' | 'referenceStrip' | 'walkStrip'

export const DEFAULT_LAYERS: GraphLayer[] = [
  'deletions',
  'genes',
  'referenceStrip',
]

export function layersOf(layers: unknown) {
  return new Set(Array.isArray(layers) ? layers : DEFAULT_LAYERS)
}

export function withLayer(layers: unknown, layer: GraphLayer, on: boolean) {
  const next = layersOf(layers)
  if (on) {
    next.add(layer)
  } else {
    next.delete(layer)
  }
  return [...next] as GraphLayer[]
}
