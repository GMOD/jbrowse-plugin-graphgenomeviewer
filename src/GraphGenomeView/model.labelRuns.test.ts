import { readConfObject } from '@jbrowse/core/configuration'
import { reaction } from 'mobx'

import { legendSections } from './legendSections'
import { mockRpcCall, mockSession } from './modelTestMocks'
import { fakeRenderer } from './modelTestSupport'
import stateModelFactory from './viewModel'

import type { LabelLayoutSource } from '@jbrowse/bandage-core/labelLayout'

const runs = vi.hoisted(() => ({ onLaidOutGraph: 0 }))

vi.mock(import('@jbrowse/bandage-core/labelLayout'), async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    layoutLabels: (m: LabelLayoutSource) => {
      runs.onLaidOutGraph += m.nodePositions ? 1 : 0
      return actual.layoutLabels(m)
    },
  }
})
vi.mock('@jbrowse/core/util', async () =>
  (await import('./modelTestMocks')).coreUtilMock(),
)
vi.mock(import('@jbrowse/core/configuration'), async importOriginal =>
  (await import('./modelTestMocks')).configurationMock(await importOriginal()),
)
vi.mock('@jbrowse/core/util/io', async () =>
  (await import('./modelTestMocks')).ioMock(),
)

// GRCh38 walks r1 r2 r3 over chr1:1000-1030 and a haplotype walks r1, a node
// of its own and r3, from 5000 on its contig CM1. The reference's genes and the
// haplotype's arrive after the drawing, as they do over the network.
const GFA = [
  'S\tr1\tAAAAAAAAAA',
  'S\tr2\tCCCCCCCCCC',
  'S\tr3\tGGGGGGGGGG',
  'S\th0\tTTTTTTTTTT',
  'L\tr1\t+\tr2\t+\t0M',
  'L\tr2\t+\tr3\t+\t0M',
  'L\tr1\t+\th0\t+\t0M',
  'L\th0\t+\tr3\t+\t0M',
  'W\tGRCh38\t0\tchr1\t1000\t1030\t>r1>r2>r3',
  'W\tHG00097\t1\tCM1\t5000\t5030\t>r1>h0>r3',
  '',
].join('\n')

const gene = (name: string, refName: string, start: number, end: number) => ({
  type: 'gene',
  name,
  refName,
  start,
  end,
  strand: 1,
  subfeatures: [{ type: 'exon', start, end }],
})

const later = <T>(value: T, ms: number) =>
  new Promise<T>(resolve =>
    setTimeout(() => {
      resolve(value)
    }, ms),
  )

const bySlot = (obj: Record<string, unknown>, key?: unknown) => obj[String(key)]
const adapterOnly = (obj: Record<string, unknown>, key?: unknown) =>
  key === 'adapter' ? obj.adapter : undefined

beforeEach(() => {
  runs.onLaidOutGraph = 0
  vi.mocked(readConfObject).mockImplementation(bySlot)
  mockSession.assemblyNames = ['hg38', 'HG00097']
  mockSession.tracks = [
    { trackId: 'graph', assemblyNames: [], adapter: {} },
    {
      trackId: 'refseq',
      name: 'RefSeq genes',
      assemblyNames: ['hg38'],
      adapter: { type: 'Gff3TabixAdapter', which: 'hg38' },
    },
    {
      trackId: 'HG00097_genes',
      name: 'HG00097 genes',
      assemblyNames: ['HG00097'],
      adapter: { type: 'Gff3TabixAdapter', which: 'HG00097' },
    },
  ]
  mockRpcCall.mockReset()
  mockRpcCall.mockImplementation(
    (
      _sid: unknown,
      method: string,
      args: { adapterConfig?: { which?: string } },
    ) =>
      method === 'GetSubgraph'
        ? Promise.resolve(GFA)
        : method === 'CoreGetFeatures'
          ? args.adapterConfig?.which === 'hg38'
            ? later([gene('CFH', 'chr1', 1005, 1025)], 20)
            : later([gene('CFHR3', 'CM1', 5011, 5019)], 40)
          : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
  )
})

afterEach(() => {
  vi.mocked(readConfObject).mockImplementation(adapterOnly)
  mockSession.tracks = []
  mockSession.assemblyNames = []
})

type Model = ReturnType<ReturnType<typeof stateModelFactory>['create']>

// What the page's key does: it tells the model how to say what it draws,
// and once the browser has laid it out measures it, a 15 px line per row and
// heading
function measureKeyAsDrawn(model: Model) {
  model.setKeyShapeOf(() => JSON.stringify(legendSections(model)))
  return reaction(
    () => model.keyShape,
    shape => {
      const lines = legendSections(model).reduce(
        (sum, section) => sum + section.rows.length + (section.heading ? 1 : 0),
        0,
      )
      setTimeout(() => {
        model.setLegendSize({ width: 220, height: lines * 15 }, shape)
      }, 1)
    },
    { fireImmediately: true },
  )
}

function picture(model: Model, labels: Model['overlayLabels']) {
  return {
    canvasHeight: model.canvasHeight,
    legendSize: model.legendSize,
    transform: [model.scale, model.translateX, model.translateY],
    chips: labels.genes.map(({ text, x, y }) => [text, x, y]),
    sizes: labels.sizes.map(({ text, x, y }) => [text, x, y]),
    bubbles: labels.bubbles.map(({ text, x, y }) => [text, x, y]),
  }
}

async function settledView() {
  const model = stateModelFactory().create({
    type: 'GraphGenomeView',
    layoutMode: 'auto',
    loadedTrackId: 'graph',
  })
  model.setWidth(1200)
  model.startRenderingBackend(fakeRenderer())
  const labels: unknown[] = []
  const stopLabels = reaction(
    () => model.overlayLabels,
    layout => labels.push(layout),
    { fireImmediately: true },
  )
  const stopKey = measureKeyAsDrawn(model)
  await model.cutSubgraph(
    {},
    { refName: 'chr1', assemblyName: 'hg38', start: 1000, end: 1030 },
  )
  await vi.waitFor(() => {
    expect(model.genePins).toHaveLength(2)
  })
  await later(undefined, 100)
  const settled = {
    model,
    runs: runs.onLaidOutGraph,
    labels: model.overlayLabels,
  }
  stopLabels()
  stopKey()
  return settled
}

test('a settled view lays its labels out once on the laid-out graph', async () => {
  const { model, runs, labels } = await settledView()
  expect(runs).toBe(1)
  // the picture the labels laid out again until nothing moved settled on
  expect(picture(model, labels)).toEqual({
    canvasHeight: 160,
    legendSize: { width: 220, height: 120 },
    transform: [26.446666666666665, -26312.066666666666, 70],
    chips: [
      ['CFH', 531.2999999999993, 56],
      ['CFHR3', 531.2999999999993, 114],
    ],
    sizes: [],
    bubbles: [],
  })
})
