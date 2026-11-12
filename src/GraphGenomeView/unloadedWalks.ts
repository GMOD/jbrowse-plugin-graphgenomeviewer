import type { WalkRow } from '@jbrowse/bandage-core/layout/walkRows'
import type { Graph } from '@jbrowse/bandage-core/types'

// A row holds steps the cut did not load where it counts them or draws a run
// of them; a piece that reaches the row only through a departure or a gap
// has a run and no count
export const holdsUnloaded = (
  row: Pick<WalkRow, 'abridgedSteps' | 'unloadedBp'>,
) => (row.abridgedSteps ?? 0) > 0 || (row.unloadedBp ?? 0) > 0

/**
 * The walks holding steps the cut did not load, each with its sample: a
 * path that counts them or steps through a run of them, and a row that
 * holds them
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
