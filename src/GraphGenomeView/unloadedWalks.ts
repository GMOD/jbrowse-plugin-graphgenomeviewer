import { rowsNeedingRoutes } from '@jbrowse/bandage-core/layout/walkRowLinks'

import { EXPAND_NAMED_MAX } from '../GetSubgraph'

import type { WalkRow } from '@jbrowse/bandage-core/layout/walkRows'
import type { Graph } from '@jbrowse/bandage-core/types'

// A row counts the steps it holds that the cut did not load, its walk's
// pieces and its departures' alike
export const holdsUnloaded = (row: Pick<WalkRow, 'abridgedSteps'>) =>
  (row.abridgedSteps ?? 0) > 0

/**
 * The walks holding steps the cut did not load, each with its sample: a
 * path that counts them or steps through a run of them, since a path counts
 * only its own pieces, and a row that counts them
 */
export function unloadedWalks(graph: Graph | undefined, rows: WalkRow[] = []) {
  const placeholders = new Set(
    (graph?.nodes ?? []).filter(n => n.placeholder).map(n => n.id),
  )
  const walks = new Map<string, string | undefined>()
  for (const p of graph?.paths ?? []) {
    if (
      (p.abridgedSteps ?? 0) > 0 ||
      p.nodeIds.some(id => placeholders.has(id))
    ) {
      walks.set(p.name, p.sample)
    }
  }
  for (const row of rows) {
    if (holdsUnloaded(row)) {
      walks.set(row.name, row.sample)
    }
  }
  return walks
}

// The walks of the rows that ribbons, shared blocks and the shared order
// leave out, while few enough to read whole as a short list of names is
export function routesToLoad(rows: WalkRow[]) {
  return rowsNeedingRoutes(rows) <= EXPAND_NAMED_MAX
    ? rows.filter(row => (row.unloadedBp ?? 0) > 0).map(row => row.name)
    : []
}

// Why those rows stay out, where they are too many to read whole
export function routesLeftOut(rows: WalkRow[]) {
  const n = rowsNeedingRoutes(rows)
  return n > EXPAND_NAMED_MAX
    ? `${n} haplotypes are left out of this comparison: their full routes through this region are not read yet, and at most ${EXPAND_NAMED_MAX} are read at once. Choose up to ${EXPAND_NAMED_MAX} samples under Samples to compare them.`
    : undefined
}
