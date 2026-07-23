import { readFileSync } from 'fs'

import { parsePanSN, projectAlleles } from './projectAlleles'
import { convertGFAToGraph } from '../GraphGenomeView/gfa/gfaConverter'
import { parseGFA } from '../gfa-core/index'


// The real four-strain minigraph slice, not invented coordinates: K12 is the
// rank-0 backbone, Sakai/CFT073/NCTC86 contribute ranks 1-3.
function ecoliGraph() {
  const gfa = readFileSync(
    require.resolve('../../test_data/ecoli_rgfa_slice.gfa'),
    'utf8',
  )
  return convertGFAToGraph(parseGFA(gfa), 'ecoli')
}

test('rGFA carries no walks, so the projection cannot depend on them', () => {
  const graph = ecoliGraph()
  expect(graph.paths ?? []).toHaveLength(0)
  expect(projectAlleles(graph).alleles.length).toBeGreaterThan(0)
})

test('attributes alleles to contributing assemblies, never to genotypes', () => {
  const { samples, attribution } = projectAlleles(ecoliGraph())
  expect(attribution).toBe('source-assembly')
  // K12 is the backbone, so it is never an allele source
  expect(samples).not.toContain('K12')
  expect(samples).toEqual(['CFT073', 'NCTC86', 'Sakai'])
})

test('anchors alleles on the reference and states a span for each', () => {
  const { alleles } = projectAlleles(ecoliGraph())
  for (const allele of alleles) {
    expect(allele.refName).toBe('K12#1#chr')
    expect(allele.refSpan).toBeGreaterThanOrEqual(0)
    expect(allele.end).toBeGreaterThanOrEqual(allele.start)
    expect(allele.altLength).toBeGreaterThan(0)
    expect(allele.delta).toBe(allele.altLength - allele.refSpan)
  }
})

// The naive per-segment version produced refSpan -22067 here by taking whichever
// anchor it saw last; a negative span must never be emitted.
test('declines to state a span rather than emitting a backwards one', () => {
  const { alleles, unanchored } = projectAlleles(ecoliGraph())
  expect(alleles.every(a => a.refSpan >= 0)).toBe(true)
  expect(unanchored).toBeGreaterThan(0)
})

test('classification follows the sign of altLength - refSpan', () => {
  const { alleles } = projectAlleles(ecoliGraph())
  for (const a of alleles) {
    const expected =
      a.delta > 0 ? 'insertion' : a.delta < 0 ? 'deletion' : 'substitution'
    expect(a.kind).toBe(expected)
  }
  expect(alleles.some(a => a.kind === 'insertion')).toBe(true)
  expect(alleles.some(a => a.kind === 'deletion')).toBe(true)
})

test('chains multi-segment bubble paths into one allele', () => {
  const { alleles } = projectAlleles(ecoliGraph())
  const multi = alleles.filter(a => a.segmentIds.length > 1)
  expect(multi.length).toBeGreaterThan(0)
  for (const a of multi) {
    expect(a.altLength).toBeGreaterThan(0)
  }
})

test('parsePanSN reads sample and haplotype, tolerating bare contig names', () => {
  expect(parsePanSN('HG01433.2#2#CM086507.1')).toEqual({
    sample: 'HG01433.2',
    haplotype: 2,
  })
  expect(parsePanSN('K12#1#chr')).toEqual({ sample: 'K12', haplotype: 1 })
  expect(parsePanSN('chr1')).toEqual({ sample: 'chr1', haplotype: undefined })
})

test('an empty graph projects to nothing rather than throwing', () => {
  const empty = projectAlleles({ name: 'empty', nodes: [], edges: [] })
  expect(empty.alleles).toEqual([])
  expect(empty.samples).toEqual([])
})
