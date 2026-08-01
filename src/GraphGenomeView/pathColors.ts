import { pathOrigin } from './pathAnchoring'

import type { GraphPath } from './types'

// Deterministic colour from a string (djb2-style hash to an HSL hue). Fine for
// the `random` node scheme, where a collision between two of thousands of nodes
// means nothing. NOT what the path ribbons use: see pathHueAt.
export function nameHue(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash % 360)
}

// Ribbon hues are spread evenly over the wheel by position in the path list,
// not hashed from the path name. A hash draws from the wheel at random, and at
// five paths two of them landing on the same hue is common rather than
// unlucky: `Sakai#1#chr:1983339-1983535` and `NCTC86#1#chr:1709109-1710286`
// hash 26 degrees apart, which is two purples and a legend that cannot be read
// off the drawing. Evenly spaced, the worst case is the best available.
//
// The cost is that a path's colour depends on how many paths there are, so it
// moves when the cut changes. That is what the legend is for, and it is the
// same trade the Bandage demo this was ported from made.
export function pathHueAt(index: number, count: number) {
  return (index * 360) / count
}

export const PATH_SATURATION = 0.7
export const PATH_LIGHTNESS = 0.5

export function pathCssColor(index: number, count: number) {
  return `hsl(${pathHueAt(index, count)}, ${PATH_SATURATION * 100}%, ${
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
    color: pathCssColor(i, paths.length),
  }))
}
