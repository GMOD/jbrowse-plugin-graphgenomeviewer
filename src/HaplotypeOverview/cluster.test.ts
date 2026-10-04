import { clusterOverviewRows, divergenceMatrix } from './cluster'

import type { HaplotypeOverviewData } from '../GetHaplotypeOverview'

// rows 0-4 are haplotypes, 5 the reference, 0 the track's lane. Each string
// is one row's cells over bins of 100 bp: r reference-like, v diverges, a
// absent, p partial.
function overview(rows: string[], pinned = [0]): HaplotypeOverviewData {
  const code = { a: 0, r: 1, p: 2, v: 3 } as Record<string, number>
  const names = [...rows.map((_, i) => `H${i}.1`), 'GRCh38#0']
  const width = rows[0]!.length
  const cells = new Uint8Array(width * names.length)
  for (let b = 0; b < width; b++) {
    rows.forEach((row, i) => {
      cells[b * names.length + i] = code[row[b]!]!
    })
    cells[b * names.length + rows.length] = 1
  }
  return {
    level: 0,
    bin: 100,
    rows: names,
    pinned,
    reference: [rows.length],
    bins: Array.from({ length: width }, (_, b) => ({
      start: b * 100,
      end: (b + 1) * 100,
      classes: [0, 0, 0, 0],
      excursions: 0,
      variants: 0,
      longestExcursion: 0,
    })),
    cells,
  }
}

test('a bin every called row agrees on is left out, and an absent or partial cell takes the called mean', () => {
  const data = overview(['rrrr', 'vvrr', 'varv', 'vrpr'])
  const matrix = divergenceMatrix(data, [1, 2, 3], 0, 400)
  // bin 0 all diverge, bin 2 all reference-like but one partial: both out
  expect(matrix.map(row => [...row])).toEqual([
    [1, 0],
    [0.5, 1],
    [0, 0],
  ])
})

test('only bins overlapping the window enter the matrix', () => {
  const data = overview(['rrrr', 'vrrv', 'rrrr', 'rrvr'])
  expect(
    divergenceMatrix(data, [1, 2, 3], 0, 150).map(row => [...row]),
  ).toEqual([[1], [0], [0]])
  expect(
    divergenceMatrix(data, [1, 2, 3], 250, 400).map(row => [...row]),
  ).toEqual([
    [0, 1],
    [0, 0],
    [1, 0],
  ])
})

test('rows that diverge in the same bins land side by side, and the lane and the reference stay out', async () => {
  const data = overview(['vvvvvv', 'vvvrrr', 'rrrvvv', 'vvvrrv', 'rrrvvr'])
  const order = await clusterOverviewRows(data, 0, 600)
  expect([...order!].sort()).toEqual(['H1.1', 'H2.1', 'H3.1', 'H4.1'])
  const at = (name: string) => order!.indexOf(name)
  expect(Math.abs(at('H1.1') - at('H3.1'))).toBe(1)
  expect(Math.abs(at('H2.1') - at('H4.1'))).toBe(1)
})

test('fewer than two rows under the lanes have no order to find', async () => {
  expect(await clusterOverviewRows(overview(['vr', 'rv']), 0, 200)).toBe(
    undefined,
  )
})
