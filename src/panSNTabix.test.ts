import { buildRefNameLookup, resolveRefName } from './panSNTabix.ts'

// The reason both tabix graph adapters need this at all: a graph's stable
// sequences are usually PanSN while the assembly asking for them uses the bare
// contig, and a session may hold the same sample as one assembly or as two.
test('a PanSN stable name resolves under its sample and under its haplotype', () => {
  const lookup = buildRefNameLookup([
    'GRCh38#0#chr6',
    'NA20809#2#CM094351.1',
    'chrM',
  ])
  expect(resolveRefName(lookup, 'GRCh38', 'chr6')).toBe('GRCh38#0#chr6')
  expect(resolveRefName(lookup, 'GRCh38#0', 'chr6')).toBe('GRCh38#0#chr6')
  expect(resolveRefName(lookup, 'NA20809#2', 'CM094351.1')).toBe(
    'NA20809#2#CM094351.1',
  )
  expect(resolveRefName(lookup, 'NA20809', 'CM094351.1')).toBe(
    'NA20809#2#CM094351.1',
  )
  expect(resolveRefName(lookup, 'hg38', 'chrM')).toBe('chrM')
  expect(resolveRefName(lookup, 'NA20809#1', 'CM094351.1')).toBeUndefined()
})
