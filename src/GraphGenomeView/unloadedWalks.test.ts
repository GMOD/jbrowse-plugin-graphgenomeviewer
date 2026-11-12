import {
  routesLeftOut,
  routesToLoad,
  tubeMapWalksToLoad,
} from './unloadedWalks'
import { EXPAND_NAMED_MAX } from '../GetSubgraph'

import type { WalkRow } from '@jbrowse/bandage-core/layout/walkRows'
import type { Graph } from '@jbrowse/bandage-core/types'

const rowOf = (name: string, unloadedBp?: number): WalkRow => ({
  name,
  label: name,
  sample: name,
  bp: 1000,
  offReferenceBp: 0,
  gapBp: 0,
  complete: true,
  runs: [],
  ...(unloadedBp === undefined ? {} : { unloadedBp, abridgedSteps: 40 }),
})

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => rowOf(`S${i}#1#c`, 500))

test('a few compared rows with steps not fetched are fetched whole, and nothing is said', () => {
  const compared = [rowOf('A#1#c'), rowOf('B#1#c', 500), rowOf('C#1#c', 20)]
  expect(routesToLoad(compared)).toEqual(['B#1#c', 'C#1#c'])
  expect(routesLeftOut(compared)).toBeUndefined()
})

test('as many as the limit are still fetched whole', () => {
  expect(routesToLoad(rows(EXPAND_NAMED_MAX))).toHaveLength(EXPAND_NAMED_MAX)
  expect(routesLeftOut(rows(EXPAND_NAMED_MAX))).toBeUndefined()
})

test('more than that are left out, and the note says how many and why', () => {
  const many = rows(EXPAND_NAMED_MAX + 1)
  expect(routesToLoad(many)).toEqual([])
  expect(routesLeftOut(many)).toBe(
    `Leaves out ${EXPAND_NAMED_MAX + 1} rows: node-level detail is fetched for at most ${EXPAND_NAMED_MAX} at a time. Choose up to ${EXPAND_NAMED_MAX} samples under Samples to include them.`,
  )
})

test('rows with every step fetched need nothing', () => {
  expect(routesToLoad([rowOf('A#1#c')])).toEqual([])
  expect(routesLeftOut([rowOf('A#1#c')])).toBeUndefined()
})

// a graph of `n` haplotypes' walks, the first stepping through a placeholder
function graphOf(n: number): Graph {
  return {
    name: 'g',
    nodes: [
      { id: 's1', name: 's1', length: 10, depth: 1 },
      { id: 'p', name: 'p', length: 300, depth: 1, placeholder: true },
    ],
    edges: [],
    paths: Array.from({ length: n }, (_, i) => ({
      name: `S${i}#1#c`,
      sample: `S${i}`,
      haplotype: 1,
      nodeIds: i === 0 ? ['s1', 'p'] : ['s1'],
    })),
  }
}

test('a tube map fetches the nodes of the walks it shows, up to the limit', () => {
  expect(tubeMapWalksToLoad(graphOf(EXPAND_NAMED_MAX))).toEqual(['S0#1#c'])
  expect(tubeMapWalksToLoad(graphOf(EXPAND_NAMED_MAX + 1))).toEqual([])
})
