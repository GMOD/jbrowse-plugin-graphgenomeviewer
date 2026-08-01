import { pathOrigin } from './pathAnchoring'

import type { GraphPath } from './types'

// One answer to "what colour is this path", for the ribbons the renderer packs
// into vertex colours and for the DOM swatch that names them. They were two
// answers for as long as there was no legend, and a legend derived from a
// second hash is a legend that lies.
export function pathHue(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash % 360)
}

export const PATH_SATURATION = 0.7
export const PATH_LIGHTNESS = 0.5

export function pathCssColor(name: string) {
  return `hsl(${pathHue(name)}, ${PATH_SATURATION * 100}%, ${
    PATH_LIGHTNESS * 100
  }%)`
}

// A path is named the way its file names it — `K12#1#chr:1004500-1004961` for a
// P record `odgi extract` wrote, `HG00738#1` for a W record — and neither is a
// legend entry. The label is the least of that name which still tells the paths
// apart: the sample where samples are unique, the haplotype too where they are
// not, the whole stable name where even that repeats. Widening it for every row
// rather than only for the colliding ones, because a legend where one entry is
// `HG00738#1` and its neighbour is `HG01071` reads as two kinds of thing.
function labelTiers(name: string) {
  const parts = pathOrigin(name).name.split('#')
  return [parts[0]!, parts.slice(0, 2).join('#'), parts.join('#')]
}

export interface PathLegendEntry {
  name: string
  label: string
  color: string
}

export function pathLegend(paths: GraphPath[]): PathLegendEntry[] {
  const tiers = paths.map(p => labelTiers(p.name))
  const distinct = (i: number) =>
    new Set(tiers.map(t => t[i]!)).size === paths.length
  // The widest tier is the file's own name, so a collision there is a duplicate
  // path in the file and no labelling can separate them.
  const tier = distinct(0) ? 0 : distinct(1) ? 1 : 2
  return paths.map((path, i) => ({
    name: path.name,
    label: tiers[i]![tier]!,
    color: pathCssColor(path.name),
  }))
}
