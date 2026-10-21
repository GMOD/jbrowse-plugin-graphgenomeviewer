import PluginManager from '@jbrowse/core/PluginManager'
import { formsCut } from '@jbrowse/graph-walks'
import { firstValueFrom } from 'rxjs'
import { toArray } from 'rxjs/operators'

import Adapter from './WalkFormsAdapter.ts'
import configSchema from './configSchema.ts'
import WalkFormsAdapterF from './index.ts'

import type * as GraphWalks from '@jbrowse/graph-walks'

vi.mock('@jbrowse/graph-walks', async importOriginal => {
  const actual = await importOriginal<typeof GraphWalks>()
  return { ...actual, formsCut: vi.fn(actual.formsCut) }
})

// Four walks over a 3.6 kb reference of six 600 bp nodes, in 1 kb chunks
// (RgfaTabixAdapter/walkFiles.test.ts builds on the same file):
//   W GRCh38  0 chr1 >1>2>3>4>5>6
//   W HG002   1 chr1 >1>2>7>4>5>6   7 (550 bp) replaces 3
//   W HG002   2 chr1 >1>2>3>4>8>6   8 (20 bp) replaces 5
//   W HG00097 1 chr1 >1>2>3>4>5>6
const walks =
  require.resolve('../RgfaTabixAdapter/test_data/walks5_header.GRCh38.walks.bed.gz')

const local = (path: string) => ({
  localPath: path,
  locationType: 'LocalPathLocation',
})

// Each test pins its own window, since the cut cache outlives an adapter
function makeAdapter(slots: Record<string, unknown>) {
  return new Adapter(
    configSchema.create({
      walksLocation: local(walks),
      walksIndex: { location: local(`${walks}.tbi`) },
      ...slots,
    }),
  )
}

const pinned = (start: number) => ({ refName: 'chr1', start, end: 3600 })

const region = (start: number, end: number, refName = 'chr1') => ({
  refName,
  assemblyName: 'hg38',
  start,
  end,
})

const featuresOf = (adapter: Adapter, query = region(0, 3600)) =>
  firstValueFrom(adapter.getFeatures(query).pipe(toArray()))

test('registers the adapter type', () => {
  const pm = new PluginManager()
  WalkFormsAdapterF(pm)
  pm.createPluggableElements()
  expect(pm.getAdapterType('WalkFormsAdapter').name).toBe('WalkFormsAdapter')
})

test('names the reference sample contigs as the assembly does', async () => {
  expect(await makeAdapter({ pinned: pinned(0) }).getRefNames()).toEqual([
    'chr1',
  ])
})

test('one source per form, labelled by share and change', async () => {
  const adapter = makeAdapter({ pinned: pinned(1) })
  expect(await adapter.getSourcesAndWarnings()).toEqual({
    sources: [
      { name: 'F1', label: '33% · reference', haplotypes: 1 },
      { name: 'F2', label: '33% · 600 bp repl', haplotypes: 1 },
      { name: 'F3', label: '33% · 580 bp del', haplotypes: 1 },
    ],
    warnings: [],
  })
})

test('features are the pinned window changes, with a genotype per form', async () => {
  const features = await featuresOf(makeAdapter({ pinned: pinned(2) }))
  expect(
    features.map(f => ({
      start: f.get('start'),
      end: f.get('end'),
      consequence: f.get('consequence'),
      svType: f.get('svType'),
      type: f.get('type'),
      genotypes: f.get('genotypes'),
    })),
  ).toEqual([
    {
      start: 1200,
      end: 1800,
      consequence: 'loss',
      svType: 'CPX',
      type: 'complex_substitution',
      genotypes: { F1: '0', F2: '1', F3: '0' },
    },
    {
      start: 2400,
      end: 3000,
      consequence: 'loss',
      svType: 'DEL',
      type: 'deletion',
      genotypes: { F1: '0', F2: '0', F3: '1' },
    },
  ])
})

test('a query outside the pinned window draws nothing', async () => {
  const adapter = makeAdapter({ pinned: pinned(3) })
  expect(await featuresOf(adapter, region(1900, 2300))).toEqual([])
  expect(await featuresOf(adapter, region(0, 3600, 'chr2'))).toEqual([])
  expect(await featuresOf(adapter, region(2900, 3600))).toHaveLength(1)
})

test('a floor change regroups the cut without cutting again', async () => {
  vi.mocked(formsCut).mockClear()
  const fine = makeAdapter({ pinned: pinned(4), floorBp: 50 })
  const coarse = makeAdapter({ pinned: pinned(4), floorBp: 1000 })
  expect((await fine.getSourcesAndWarnings()).sources).toHaveLength(3)
  expect((await coarse.getSourcesAndWarnings()).sources).toEqual([
    { name: 'F1', label: '100% · reference', haplotypes: 3 },
  ])
  expect(await featuresOf(coarse)).toEqual([])
  expect(formsCut).toHaveBeenCalledTimes(1)
})

test('exclude leaves samples out of every form', async () => {
  const adapter = makeAdapter({ pinned: pinned(5), exclude: ['HG002'] })
  expect((await adapter.getSourcesAndWarnings()).sources).toEqual([
    { name: 'F1', label: '100% · reference', haplotypes: 1 },
  ])
})

test('maxForms gives the smaller forms one empty row', async () => {
  const adapter = makeAdapter({ pinned: pinned(6), maxForms: 1 })
  const { sources, warnings } = await adapter.getSourcesAndWarnings()
  expect(sources.map(s => s.label)).toEqual([
    '33% · reference',
    'other forms · 67%',
  ])
  expect(warnings).toHaveLength(1)
  expect(await featuresOf(adapter)).toEqual([])
})

test('a pinned window past walkByteBudget says so, without a zoom-in notice', async () => {
  const error = await makeAdapter({ pinned: pinned(7), walkByteBudget: 1 })
    .getSourcesAndWarnings()
    .catch((e: unknown) => e)
  expect(error).toBeInstanceOf(Error)
  expect(error).not.toHaveProperty('regionTooLarge')
  expect(`${error}`).toMatch(
    /^Error: The pinned window chr1:8-3,600 is too large to cut for structural forms: .*walkByteBudget, 0\.0 MB\. .*Raise walkByteBudget$/,
  )
})

test('an adapter with no pinned window says so', async () => {
  await expect(makeAdapter({}).getSourcesAndWarnings()).rejects.toThrow(
    /needs `pinned`/,
  )
})
