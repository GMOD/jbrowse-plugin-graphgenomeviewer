import { rowsNeedingRoutes } from '@jbrowse/bandage-core/layout/walkRowLinks'

import { EXPAND_NAMED_MAX } from '../GetSubgraph'

import type { WalkRow } from '@jbrowse/bandage-core/layout/walkRows'
import type { Graph } from '@jbrowse/bandage-core/types'

/**
 * The walks holding steps the cut did not fetch: a path that counts them or
 * steps through a run of them, since a path counts only its own pieces
 */
export function unloadedWalks(graph: Graph | undefined) {
  const placeholders = new Set(
    (graph?.nodes ?? []).filter(n => n.placeholder).map(n => n.id),
  )
  return new Set(
    (graph?.paths ?? [])
      .filter(
        p =>
          (p.abridgedSteps ?? 0) > 0 ||
          p.nodeIds.some(id => placeholders.has(id)),
      )
      .map(p => p.name),
  )
}

// The walks a tube map fetches the nodes of: every one holding steps not
// fetched, while it shows few enough haplotypes to fetch them all
export function tubeMapWalksToLoad(graph: Graph | undefined) {
  const haplotypes = new Set(
    (graph?.paths ?? []).map(p => `${p.sample}#${p.haplotype}`),
  )
  return haplotypes.size <= EXPAND_NAMED_MAX
    ? Array.from(unloadedWalks(graph))
    : []
}

// Why a tube map's boxes stay "nodes not shown": it shows more haplotypes
// than it fetches the nodes of
export function tubeMapNote(graph: Graph | undefined) {
  return unloadedWalks(graph).size > 0 && tubeMapWalksToLoad(graph).length === 0
    ? `Node-level detail is fetched for at most ${EXPAND_NAMED_MAX} haplotypes at a time: load ${EXPAND_NAMED_MAX} or fewer to see it`
    : undefined
}

// The walks of the rows that ribbons, shared blocks and the shared order
// leave out, while few enough to fetch whole as a short list of names is
export function routesToLoad(rows: WalkRow[]) {
  return rowsNeedingRoutes(rows) <= EXPAND_NAMED_MAX
    ? rows.filter(row => rowsNeedingRoutes([row]) > 0).map(row => row.name)
    : []
}

const rowsText = (n: number) => `${n} row${n === 1 ? '' : 's'}`

// What happens to those rows, in the walk-row key's words: fetched while few
// enough, else left out, and how to bring them in
export function routesNote(rows: WalkRow[]) {
  const n = rowsNeedingRoutes(rows)
  return n === 0
    ? undefined
    : n <= EXPAND_NAMED_MAX
      ? `Fetching node-level detail for ${rowsText(n)}`
      : `Leaves out ${rowsText(n)}: node-level detail is fetched for at most ${EXPAND_NAMED_MAX} at a time. Choose up to ${EXPAND_NAMED_MAX} samples under Samples to include them.`
}
