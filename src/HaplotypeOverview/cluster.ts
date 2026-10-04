import { OVERVIEW_REFERENCE, OVERVIEW_VARIANT } from '@gmod/gbz-base'
import { clusterData } from '@gmod/hclust'

import { clusterableRows } from './draw'

import type { HaplotypeOverviewData } from '../GetHaplotypeOverview'

type OverviewRows = Pick<
  HaplotypeOverviewData,
  'rows' | 'pinned' | 'reference' | 'bins' | 'cells'
>

// One row of values per haplotype over the bins overlapping [start, end): 1
// where it diverges, 0 where it is reference-like. An absent or partial cell
// takes the bin's mean over the rows that have a class there, as the variant
// display's clustering imputes a no-call, so a contig gap adds no distance.
// Bins every row agrees on add none either and are left out.
export function divergenceMatrix(
  data: OverviewRows,
  rows: number[],
  start: number,
  end: number,
) {
  const stride = data.rows.length
  const columns: Float32Array[] = []
  data.bins.forEach((bin, b) => {
    if (bin.end <= start || bin.start >= end) {
      return
    }
    const column = new Float32Array(rows.length)
    let called = 0
    let diverging = 0
    rows.forEach((row, i) => {
      const klass = data.cells[b * stride + row]! & 3
      if (klass === OVERVIEW_VARIANT) {
        column[i] = 1
        called++
        diverging++
      } else if (klass === OVERVIEW_REFERENCE) {
        called++
      } else {
        column[i] = Number.NaN
      }
    })
    if (diverging === 0 || diverging === called) {
      return
    }
    const mean = diverging / called
    for (let i = 0; i < column.length; i++) {
      if (Number.isNaN(column[i])) {
        column[i] = mean
      }
    }
    columns.push(column)
  })
  return rows.map((_, i) => Float32Array.from(columns, column => column[i]!))
}

// The clusterable rows' names in the order average-linkage clustering of
// their divergence over [start, end) puts them, as the variant display's
// "Cluster rows by genotype" orders samples. Undefined when there are fewer
// than two rows to order.
export async function clusterOverviewRows(
  data: OverviewRows,
  start: number,
  end: number,
  signal?: AbortSignal,
) {
  const rows = clusterableRows(data)
  if (rows.length < 2) {
    return undefined
  }
  const names = rows.map(row => data.rows[row]!)
  const { order } = await clusterData({
    data: divergenceMatrix(data, rows, start, end),
    sampleLabels: names,
    signal,
  })
  return order.map(i => names[i]!)
}
