import { routesLeftOut, routesToLoad } from './unloadedWalks'
import { EXPAND_NAMED_MAX } from '../GetSubgraph'

import type { WalkRow } from '@jbrowse/bandage-core/layout/walkRows'

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

test('a few compared rows with steps not read are read whole, and nothing is said', () => {
  const compared = [rowOf('A#1#c'), rowOf('B#1#c', 500), rowOf('C#1#c', 20)]
  expect(routesToLoad(compared)).toEqual(['B#1#c', 'C#1#c'])
  expect(routesLeftOut(compared)).toBeUndefined()
})

test('as many as a list of names reads are still read whole', () => {
  expect(routesToLoad(rows(EXPAND_NAMED_MAX))).toHaveLength(EXPAND_NAMED_MAX)
  expect(routesLeftOut(rows(EXPAND_NAMED_MAX))).toBeUndefined()
})

test('more than that are left out, and the note says how many and why', () => {
  const many = rows(EXPAND_NAMED_MAX + 1)
  expect(routesToLoad(many)).toEqual([])
  expect(routesLeftOut(many)).toBe(
    `${EXPAND_NAMED_MAX + 1} haplotypes are left out of this comparison: their full routes through this region are not read yet, and at most ${EXPAND_NAMED_MAX} are read at once. Choose up to ${EXPAND_NAMED_MAX} samples under Samples to compare them.`,
  )
})

test('rows with every step read need nothing', () => {
  expect(routesToLoad([rowOf('A#1#c')])).toEqual([])
  expect(routesLeftOut([rowOf('A#1#c')])).toBeUndefined()
})
