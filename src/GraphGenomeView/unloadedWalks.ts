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
