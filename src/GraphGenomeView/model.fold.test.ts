import { readFileSync } from 'node:fs'

import { layoutEngine } from '@jbrowse/bandage-core/layoutEngines'
import { NO_FOLD } from '@jbrowse/bandage-core/levelOfDetail'

import { mockRpcCall } from './modelTestMocks'
import { createAnchoredModel } from './modelTestSupport'

import type { GraphPaneModel } from './model'
import type { Fold } from '@jbrowse/bandage-core/levelOfDetail'
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

// chr1:27,851,829-27,856,000 laid out by the reference, with node lengths
// written, as the canvas draws it at the fit
async function drawnGap571() {
  mockRpcCall.mockImplementation(
    (_session: unknown, method: string, request: EngineRequest) =>
      method === 'GraphComputeLayout'
        ? layoutEngine(request)
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
  )
  const model = createAnchoredModel({ layers: { lengths: true } })
  model.setWidth(1200)
  await model.loadGFA(GAP571, 'gap571')
  model.setLegendSize({ width: 150, height: 60 })
  model.zoomToFit()
  draw(model)
  return model
}

// the canvas's batch, with `fold` in place of the fold it made
function draw(model: GraphPaneModel, fold?: Fold) {
  const { batch, viewportBounds } = model.buildDrawing(undefined, false)!
  model.setGeometryMetrics(0, fold ? { ...batch, collapsed: fold } : batch, {
    scale: model.scale,
    bounds: viewportBounds,
  })
}

test('the labels are laid out without the nodes the drawing on the canvas folds', async () => {
  const model = await drawnGap571()
  expect(model.drawnFold?.nodes.size).toBeGreaterThan(0)
  const [label] = model.overlayLabels.sizes
  expect(label).toBeDefined()
  draw(model, { ...NO_FOLD, nodes: new Set([label!.node]) })
  expect(model.overlayLabels.sizes.map(l => l.node)).not.toContain(label!.node)
})
