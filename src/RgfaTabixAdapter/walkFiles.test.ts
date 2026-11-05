import { existsSync } from 'node:fs'

import { TabixIndexedFile } from '@gmod/tabix'
import {
  graphFromTables,
  graphTablesGFA,
} from '@jbrowse/bandage-core/gfa/graphTables'
import { walkRowReadout } from '@jbrowse/bandage-core/layout/walkRowDraw'
import { walkRowsOf } from '@jbrowse/bandage-core/layout/walkRowRuns'
import { readConfObject } from '@jbrowse/core/configuration'
import { WalkReader } from '@jbrowse/graph-walks'
import { firstValueFrom } from 'rxjs'
import { toArray } from 'rxjs/operators'

import Adapter from './RgfaTabixAdapter.ts'
import configSchema from './configSchema.ts'
import { EXPAND_NAMED_MAX } from './walkReader.ts'

import type { WalkCut } from './walkCut.ts'
import type { GraphTables } from '@jbrowse/bandage-core/gfa/graphTables'

// chr22 of HPRC v2.1 Minigraph-Cactus at base level in walk format 6, as
// gfa-to-tabix 3.0's release check built it into gfa-to-tabix's
// target/forms-check/rel3, one walk file per reference. Each test skips where
// its file is absent.
const chr22 = '/home/cdiesh/src/gfa-to-tabix/target/forms-check/rel3/mc22'
const present = (sample: string) =>
  existsSync(`${chr22}.${sample}.walks.bed.gz`)

const fixture = (name: string) =>
  require
    .resolve(`./test_data/${name}.GRCh38.walks.bed.gz`)
    .replace(/\.walks\.bed\.gz$/, '')

// Four walks over a 3.6 kb reference in 1 kb chunks:
//   W GRCh38  0 chr1 >1>2>3>4>5>6
//   W HG002   1 chr1 >1>2>7>4>5>6   7 replaces 3
//   W HG002   2 chr1 >1>2>3>4>8>6   8 replaces 5
//   W HG00097 1 chr1 >1>2>3>4>5>6
const headerPrefix = fixture('walks6_header')

// walks6_header's walks with the reference named as pggb names a P-line,
// GRCh38#chr1
const twoPartPrefix = fixture('walks6_twopart')

// An unchopped graph, node 1 spanning 0-2600 and filed under chunk 0 alone:
//   W GRCh38 0 chr1 >1>2>4
//   W HG002  1 chr1 >1>3>4   3 replaces 2
const maxNodePrefix = fixture('walks6_maxnode')

// Twelve 500 bp reference nodes over chr1:0-6000 in one 10 kb chunk:
//   W GRCh38  0 chr1 >1>2>3>4>5>6>7>8>9>10>11>12
//   W HG002   1 chr1 >1>2>3>20>21>9>10>11>12   20 and 21, 2 kb each, replace 4-8
//   W HG002   2 chr1 >1>2>3>4>5>6>7>8>9>10>11>12
//   W HG003   1 chr1 >1>2>3>22                 the contig ends on 22, 300 bp
const rejoinPrefix = fixture('walks6_rejoin')

// The same graph in 1 kb chunks: HG002#1 leaves the reference in chunk 1000
// for 20 and 21 and rejoins it at 9, in chunk 4000, a departure record
const followPrefix = fixture('walks6_follow')

function makeAdapter(prefix: string, slots = {}) {
  const local = (path: string) => ({
    localPath: path,
    locationType: 'LocalPathLocation',
  })
  return new Adapter(
    configSchema.create({
      walksLocation: local(`${prefix}.walks.bed.gz`),
      walksIndex: { location: local(`${prefix}.walks.bed.gz.tbi`) },
      assemblyNameToPanSN: { hg38: 'GRCh38', hs1: 'CHM13' },
      ...slots,
    }),
  )
}

// a walk-indexed cut's tables as the GFA they stand for
const gfaOf = async (cut: Promise<string | GraphTables>) => {
  const tables = await cut
  return typeof tables === 'string' ? tables : graphTablesGFA(tables)
}

const walkNames = (gfa: string) =>
  gfa
    .split('\n')
    .filter(l => l.startsWith('W\t'))
    .map(l => l.split('\t').slice(1, 4).join('#'))

const window = {
  refName: 'chr22',
  assemblyName: 'hg38',
  start: 20_000_000,
  end: 20_100_000,
}

const chr1 = (start: number, end: number) => ({
  refName: 'chr1',
  assemblyName: 'hg38',
  start,
  end,
})

test.skipIf(!present('GRCh38'))(
  'a walk-indexed cut carries a W line per haplotype',
  async () => {
    const gfa = await gfaOf(
      makeAdapter(`${chr22}.GRCh38`).getSubgraph(window, {
        haplotypes: ['HG002', 'HG00097#2', 'HG00733'],
      }),
    )
    expect(walkNames(gfa)).toContain('GRCh38#0#chr22')
    expect(
      gfa.split('\n').filter(l => l.startsWith('S\t')).length,
    ).toBeGreaterThan(1000)
  },
)

test.skipIf(!present('GRCh38'))(
  'a cut for some haplotypes decodes those and the reference',
  async () => {
    const gfa = await gfaOf(
      makeAdapter(`${chr22}.GRCh38`).getSubgraph(window, {
        haplotypes: ['HG002', 'HG00097#2'],
      }),
    )
    const samples = new Set(
      walkNames(gfa).map(n => n.split('#').slice(0, 2).join('#')),
    )
    expect([...samples].sort()).toEqual([
      'GRCh38#0',
      'HG00097#2',
      'HG002#1',
      'HG002#2',
    ])
  },
)

test.skipIf(!present('CHM13'))(
  'a CHM13 window cuts from its own file',
  async () => {
    const gfa = await gfaOf(
      makeAdapter(`${chr22}.CHM13`).getSubgraph(
        { ...window, assemblyName: 'hs1' },
        { haplotypes: ['HG002'] },
      ),
    )
    expect(walkNames(gfa)).toContain('CHM13#0#chr22')
    expect(walkNames(gfa)).toContain('HG002#1#chr22')
  },
)

test.skipIf(!present('GRCh38'))(
  "chr22's haplotypes come from its walk file's header",
  async () => {
    const names = (await makeAdapter(`${chr22}.GRCh38`).getHaplotypeNames())!
    expect(names).toHaveLength(463)
    expect(names[0]).toBe('CHM13#0')
    expect(names).toContain('HG002#2')
  },
)

test.skipIf(!present('GRCh38'))(
  'the densest chunk is past the step budget for every haplotype',
  async () => {
    const cut = makeAdapter(`${chr22}.GRCh38`, {
      walkByteBudget: 100_000_000,
    }).getSubgraph({
      ...window,
      start: 11_800_000,
      end: 11_864_000,
    })
    await expect(cut).rejects.toMatchObject({
      name: 'NodeLimitError',
      regionTooLarge: true,
      message: expect.stringMatching(/choose fewer haplotypes/),
    })
  },
  60_000,
)

test('walksUri names the walk file and its index', () => {
  const config = configSchema.create({
    walksUri: 'hprc.GRCh38',
    baseUri: 'https://example.com/',
  })
  expect(readConfObject(config, 'walksLocation')).toMatchObject({
    uri: 'hprc.GRCh38.walks.bed.gz',
    baseUri: 'https://example.com/',
  })
  expect(readConfObject(config, ['walksIndex', 'location'])).toMatchObject({
    uri: 'hprc.GRCh38.walks.bed.gz.tbi',
  })
})

test("the haplotypes a walk file's header names", async () => {
  const adapter = makeAdapter(headerPrefix)
  expect(await adapter.getHaplotypeNames()).toEqual([
    'HG00097#1',
    'HG002#1',
    'HG002#2',
  ])
  const gfa = await gfaOf(
    adapter.getSubgraph(chr1(1000, 2600), { haplotypes: ['HG002#1'] }),
  )
  expect(walkNames(gfa)).toEqual(['GRCh38#0#chr1', 'HG002#1#chr1'])
  expect(gfa).toMatch(/^S\t7\t/m)
  expect(gfa).not.toMatch(/^S\t8\t/m)
})

test('a cut asked to expand walks hands the reader their names', async () => {
  const cut = vi.spyOn(WalkReader.prototype, 'cut')
  await makeAdapter(headerPrefix).getSubgraph(chr1(1000, 2600), {
    expand: ['HG002#1#chr1'],
  })
  const expand = cut.mock.calls[0]?.[2]?.expand
  expect(expand?.('HG002#1#chr1')).toBe(true)
  expect(expand?.('HG002#2#chr1')).toBe(false)
  cut.mockRestore()
})

test('walk rows read the haplotypes they name in full', async () => {
  const cut = vi.spyOn(WalkReader.prototype, 'cut')
  await makeAdapter(headerPrefix).getSubgraph(chr1(1000, 2600), {
    haplotypes: ['HG002#1'],
    walkRows: true,
  })
  const expand = cut.mock.calls[0]?.[2]?.expand
  expect(expand?.('HG002#1#chr1')).toBe(true)
  expect(expand?.('HG002#2#chr1')).toBe(false)
  cut.mockRestore()
})

test('walk rows read the samples they show in full under every haplotype', async () => {
  const cut = vi.spyOn(WalkReader.prototype, 'cut')
  await makeAdapter(headerPrefix).getSubgraph(chr1(1000, 2600), {
    haplotypes: [],
    walkRows: true,
    expandSamples: ['HG002'],
  })
  const expand = cut.mock.calls[0]?.[2]?.expand
  expect(expand?.('HG002#1#chr1')).toBe(true)
  expect(expand?.('HG002#2#chr1')).toBe(true)
  expect(expand?.('HG00097#1#chr1')).toBe(false)
  cut.mockRestore()
})

test('a graph layout, every haplotype, or a long list keeps abridged walks', async () => {
  const cut = vi.spyOn(WalkReader.prototype, 'cut')
  const adapter = makeAdapter(headerPrefix)
  const many = Array.from({ length: EXPAND_NAMED_MAX + 1 }, (_, i) => `S${i}#1`)
  await adapter.getSubgraph(chr1(1000, 2600), { haplotypes: ['HG002#1'] })
  await adapter.getSubgraph(chr1(1000, 2600), {
    haplotypes: [],
    walkRows: true,
  })
  await adapter.getSubgraph(chr1(1000, 2600), { walkRows: true })
  await adapter.getSubgraph(chr1(1000, 2600), {
    haplotypes: [...many, 'HG002#1'],
    walkRows: true,
  })
  expect(cut.mock.calls.map(c => c[2]?.expand)).toEqual([
    undefined,
    undefined,
    undefined,
    undefined,
  ])
  cut.mockRestore()
})

test('a cut for some haplotypes keeps a reference walk named without a haplotype', async () => {
  const cut = (await makeAdapter(twoPartPrefix).getSubgraph(chr1(1000, 2600), {
    haplotypes: ['HG002#1'],
  })) as GraphTables
  expect(cut.walks.names).toEqual(['GRCh38#chr1', 'HG002#1#chr1'])
  // the full parse names the walks as the walk rows do
  expect(graphFromTables(cut).paths?.map(p => p.name)).toEqual([
    'GRCh38#chr1',
    'HG002#1#chr1',
  ])
})

test.each(['walks1_header', 'walks5_header'])(
  'an earlier format, %s, is refused with what to rebuild it with',
  async name => {
    const cut = makeAdapter(fixture(name)).getSubgraph(chr1(0, 600))
    await expect(cut).rejects.toMatchObject({
      name: 'WalkFormatError',
      message: expect.stringMatching(/rebuild it with gfa-to-tabix 3.0/),
    })
  },
)

test('a cut over walkByteBudget reads no row', async () => {
  const getLines = vi.spyOn(TabixIndexedFile.prototype, 'getLines')
  const cut = makeAdapter(headerPrefix, { walkByteBudget: 100 }).getSubgraph(
    chr1(1000, 2600),
  )
  await expect(cut).rejects.toMatchObject({
    name: 'NodeLimitError',
    message: expect.stringMatching(/walkByteBudget/),
  })
  expect(getLines).not.toHaveBeenCalled()
  getLines.mockRestore()
})

// tabix-js's getLines spins forever on a NaN end, so these mock it: a
// regression fails here instead of hanging the suite
test('a cut or a feature read over a range that is not finite queries nothing', async () => {
  const getLines = vi
    .spyOn(TabixIndexedFile.prototype, 'getLines')
    .mockResolvedValue()
  const bytes = vi
    .spyOn(TabixIndexedFile.prototype, 'bytesForRegions')
    .mockResolvedValue(0)
  const adapter = makeAdapter(headerPrefix)
  const region = chr1(Number.NaN, 2600)
  await expect(adapter.getSubgraph(region)).rejects.toThrow(
    "GRCh38#0#chr1:NaN-2600 is not a finite range to query the graph's index for",
  )
  await expect(
    firstValueFrom(adapter.getFeatures(region).pipe(toArray())),
  ).rejects.toThrow(/not a finite range/)
  await expect(adapter.getRegionByteSize([region])).rejects.toThrow(
    /not a finite range/,
  )
  expect(getLines).not.toHaveBeenCalled()
  expect(bytes).not.toHaveBeenCalled()
  getLines.mockRestore()
  bytes.mockRestore()
})

test("a node longer than a chunk is read back as far as the header's maxnode reaches", async () => {
  const adapter = makeAdapter(maxNodePrefix)
  const region = chr1(2100, 2500)
  const features = await firstValueFrom(
    adapter.getFeatures(region).pipe(toArray()),
  )
  expect(features.map(f => f.get('name'))).toContain('1')
  const gfa = await gfaOf(adapter.getSubgraph(region))
  expect(gfa).toMatch(/^S\t1\t/m)
  // node 4, 3200-3800, is filed under chunk 3000, past the window's chunks
  expect(gfa).toMatch(/^W\tGRCh38\t0\tchr1\t0\t3200\t>1>2(\t|$)/m)
  expect(walkNames(gfa)).toEqual(['GRCh38#0#chr1', 'HG002#1#chr1'])
})

test("a walk-indexed graph's features are the reference nodes overlapping the window", async () => {
  const features = await firstValueFrom(
    makeAdapter(headerPrefix).getFeatures(chr1(1000, 2300)).pipe(toArray()),
  )
  expect(features.map(f => f.get('name'))).toEqual(['2', '3', '4'])
})

test('the byte gate measures a walk file from the chunk before the window', async () => {
  const bytes = vi.spyOn(TabixIndexedFile.prototype, 'bytesForRegions')
  const size = await makeAdapter(headerPrefix).getRegionByteSize([
    chr1(2100, 2600),
  ])
  expect(size).toBeGreaterThan(0)
  expect(bytes.mock.calls.map(call => call[0])).toEqual([
    [{ refName: 'GRCh38#0#chr1', start: 1000, end: 2600 }],
  ])
  bytes.mockRestore()
})

test('getFeatures reads from the chunk before the window', async () => {
  const getLines = vi.spyOn(TabixIndexedFile.prototype, 'getLines')
  await firstValueFrom(
    makeAdapter(headerPrefix).getFeatures(chr1(2100, 2600)).pipe(toArray()),
  )
  expect(getLines.mock.calls.map(call => call[1])).toEqual([1000])
  getLines.mockRestore()
})

// HG002#1's departure leaves 1500 and rejoins 4000, past the cut's
// stretch, through 4 kb of nodes 20 and 21; HG003#1's contig goes on 300 bp
// off the reference and ends
const partialRows = async (prefix: string) => {
  const cut = (await makeAdapter(prefix).getSubgraph(chr1(1000, 1500), {
    walkRows: true,
  })) as WalkCut
  return walkRowsOf(cut.walkRowRuns!).rows
}

test.each([
  ['in one chunk', rejoinPrefix],
  ['in chunks of its own', followPrefix],
])('a walk leaving the window states its departure, %s', async (_, prefix) => {
  const rows = await partialRows(prefix)
  expect(
    rows.map(({ label, bp, complete, departures }) => ({
      label,
      bp,
      complete,
      departures: departures?.map(d => [
        d.leavePos,
        d.rejoinPos,
        d.hapStart,
        d.ownBp,
      ]),
    })),
  ).toEqual([
    { label: 'HG002#2', bp: 500, complete: true, departures: undefined },
    {
      label: 'HG002#1',
      bp: 500,
      complete: false,
      departures: [[1500, 4000, 1500, 4000]],
    },
    { label: 'HG003#1', bp: 500, complete: false, departures: undefined },
  ])
})

// bandage-core 13.0.0 reads a fragment that ends on the reference as a
// contig that ends there, format 5's meaning; a format 6 fragment always
// ends on it, so both rows read "contig ends inside the window". This fails
// until bandage-core says otherwise, and then wants test in place of fails.
test.fails(
  'a walk that goes on past its last step on the cut is not read as a contig end',
  async () => {
    const rows = await partialRows(rejoinPrefix)
    expect(rows.map(({ label, stop }) => [label, stop?.contigEnds])).toEqual([
      ['HG002#2', undefined],
      ['HG002#1', false],
      ['HG003#1', false],
    ])
  },
)

// gfa-to-tabix --walks --chunk 10 of ten 10 bp reference nodes:
//   W GRCh38 0 chr1 >1>2>3>4>5>6>7>8>9>10
//   W HG002  1 ctg  >1>2>9>10   a departure from 20 to 80, one record
const skipPrefix = fixture('walks6_skip')

// HG002's departure runs under the whole of GRCh38's bar, flanks included
test('a haplotype with no step over the window draws as a stepless row', async () => {
  const cut = (await makeAdapter(skipPrefix).getSubgraph(chr1(31, 60), {
    walkRows: true,
  })) as WalkCut
  const { reference, rows } = walkRowsOf(cut.walkRowRuns!)
  expect(reference.bp).toBe(40)
  expect(
    rows.map(({ label, bp, gapBp, complete }) => ({
      label,
      bp,
      gapBp,
      complete,
    })),
  ).toEqual([{ label: 'HG002#1', bp: 0, gapBp: 40, complete: true }])
  expect(rows[0]!.stepless).toBe(true)
  expect(rows[0]!.runs).toEqual([
    expect.objectContaining({ start: 0, bp: 40, cause: 'departure' }),
  ])
  expect(walkRowReadout(rows[0]!, reference)).toBe(
    'no step on GRCh38 across 60 bp · 0 bp of its own',
  )
})

test("a cut reads the window's chunks and the departure records over its stretch, and no chunk a walk goes on in", async () => {
  const getLines = vi.spyOn(TabixIndexedFile.prototype, 'getLines')
  await makeAdapter(followPrefix).getSubgraph(chr1(1000, 1500), {
    walkRows: true,
  })
  const reads = getLines.mock.calls.map(
    call => `${call[0]}:${call[1]}-${call[2]}`,
  )
  getLines.mockRestore()
  expect(reads.sort()).toEqual([
    'GRCh38#0#chr1:0-1500',
    'GRCh38#0#chr1~departure:0-3000',
  ])
})

// walkRowsGap.test.ts's graph: HG002's contig has W lines 0-2000 >1>2 and
// 3000-5000 >4>5, so its departure record leaves 2000 and rejoins 3000 with
// 1 kb of its own, all between the W lines
test("a gap between a walk's W lines reads as not in the graph, from its departure record", async () => {
  const cut = (await makeAdapter(fixture('walks6_gap')).getSubgraph(
    chr1(1500, 3500),
    { walkRows: true },
  )) as WalkCut
  const { reference, rows } = walkRowsOf(cut.walkRowRuns!)
  expect(rows.map(row => [row.label, walkRowReadout(row, reference)])).toEqual([
    ['HG002#1', '4.0 kb · 1.0 kb not in the graph'],
    ['HG003#1', '4.0 kb'],
  ])
})

test('a cut on a signal already aborted reads no row', async () => {
  const adapter = makeAdapter(headerPrefix)
  await adapter.getHaplotypeNames()
  const getLines = vi.spyOn(TabixIndexedFile.prototype, 'getLines')
  const aborted = new AbortController()
  aborted.abort(new Error('panned away'))
  await expect(
    adapter.getSubgraph(chr1(1000, 2600), { signal: aborted.signal }),
  ).rejects.toThrow()
  expect(getLines).not.toHaveBeenCalled()
  getLines.mockRestore()
})
