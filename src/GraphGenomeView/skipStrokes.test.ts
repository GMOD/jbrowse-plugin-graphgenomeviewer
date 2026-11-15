import { readFileSync } from 'node:fs'

import { layoutEngine } from '@jbrowse/bandage-core/layoutEngines'
import { curvePointAt } from '@jbrowse/bandage-core/util/geometry'

import { mockRpcCall } from './modelTestMocks'
import { createAnchoredModel, createModel } from './modelTestSupport'

import type { EngineRequest } from '@jbrowse/bandage-core/pipeline'

vi.mock('@jbrowse/core/util', async () =>
  (await import('./modelTestMocks')).coreUtilMock(),
)
vi.mock(import('@jbrowse/core/configuration'), async importOriginal =>
  (await import('./modelTestMocks')).configurationMock(await importOriginal()),
)
vi.mock('@jbrowse/core/util/io', async () =>
  (await import('./modelTestMocks')).ioMock(),
)

const GAP571 = readFileSync(
  require.resolve('../../test_data/hprc2/hprc_gap571.gfa'),
  'utf8',
)

// a dashed skip holds a dash, a gap and a dash at the fewest, each 11 px
const THREE_DASHES_PX = 33

const layouts = [
  {
    layout: 'the stress engine',
    create: () => {
      const model = createModel()
      model.setLayoutEngine('stress')
      return model
    },
  },
  { layout: 'the reference-anchored layout', create: createAnchoredModel },
]

// At chr1:27,853,000-27,855,000 HG02055's 50 bp skip and the 1 and 2 bp
// skips drew as solid black darts on the backbone: two or three dashes of a
// heavy stroke, a few px each, under a head
test.each(layouts)(
  'at the 571 bp gap under $layout, a skip is one plain stroke with no head until its span on screen holds three dashes',
  async ({ create }) => {
    mockRpcCall.mockImplementation(
      (_session: unknown, method: string, request: EngineRequest) =>
        method === 'GraphComputeLayout'
          ? layoutEngine(request)
          : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = create()
    model.setWidth(1600)
    await model.loadGFA(GAP571, 'gap571')
    expect(model.deletions.map(d => d.bp).sort((a, b) => a - b)).toEqual([
      1, 2, 50, 571,
    ])
    const plainHalfWidth = model.connectorThickness / 2
    const wrong: string[] = []
    const plain: string[] = []
    const dashed: string[] = []
    for (const scale of [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 6]) {
      for (const { edgeIndex, bp } of model.deletions) {
        const { from } = model.graph!.edges[edgeIndex]!
        const at = model.nodePositions![from]!.at(-1)!
        model.setTransform(scale, 800 - at.x * scale, 200 - at.y * scale)
        const { batch } = model.buildDrawing(undefined, false)!
        const run = batch.edgeCurveRuns.get(edgeIndex)
        const strokes = run
          ? batch.edgeCurves.slice(run.start, run.start + run.count)
          : []
        const heads = batch.arrowRuns.get(edgeIndex)?.count ?? 0
        const first = strokes[0]?.curves[0]
        const last = strokes.at(-1)?.curves.at(-1)
        const a = first && model.toScreen(curvePointAt(first, 0))
        const b = last && model.toScreen(curvePointAt(last, 1))
        const spanPx = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0
        const seen = `${bp} bp at ${scale}`
        const drawn = `${seen}: ${strokes.length} strokes, ${heads} heads, ${spanPx.toFixed(1)} px across`
        if (strokes.length === 1) {
          plain.push(seen)
          if (
            heads > 0 ||
            strokes[0]!.thickness !== plainHalfWidth ||
            spanPx >= THREE_DASHES_PX + 1
          ) {
            wrong.push(drawn)
          }
        } else if (strokes.length > 1) {
          dashed.push(seen)
          if (spanPx < THREE_DASHES_PX - 1) {
            wrong.push(drawn)
          }
        }
      }
    }
    expect(wrong).toEqual([])
    expect(plain).toEqual(
      expect.arrayContaining(['50 bp at 0.25', '2 bp at 1']),
    )
    expect(dashed).toEqual(
      expect.arrayContaining(['50 bp at 3', '571 bp at 0.25']),
    )
  },
)
