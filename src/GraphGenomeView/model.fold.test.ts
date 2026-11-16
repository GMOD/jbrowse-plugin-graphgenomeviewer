import { readFileSync } from 'node:fs'

import { layoutEngine } from '@jbrowse/bandage-core/layoutEngines'
import { NO_FOLD } from '@jbrowse/bandage-core/levelOfDetail'
import { nodeInk } from '@jbrowse/bandage-core/nodeWidths'
import { getSnapshot } from '@jbrowse/mobx-state-tree'

import { mockRpcCall } from './modelTestMocks'
import { createAnchoredModel, fakeRenderer } from './modelTestSupport'
import stateModelFactory from './viewModel'

import type { GraphLayers } from './graphLayers'
import type { GraphPaneModel } from './model'
import type { MenuItem } from './modelTestSupport'
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
async function drawnGap571(layers: GraphLayers = { lengths: true }) {
  mockRpcCall.mockImplementation(
    (_session: unknown, method: string, request: EngineRequest) =>
      method === 'GraphComputeLayout'
        ? layoutEngine(request)
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
  )
  const model = createAnchoredModel({ layers })
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

// a halo along nothing drawn, or along reference the fold draws as one even
// stroke, marks a site the drawing leaves out
function haloOnFold(model: GraphPaneModel) {
  const fold = model.drawnFold
  return (halo: { nodeIds: string[] }) =>
    halo.nodeIds.some(id => fold?.nodes.has(id)) ||
    halo.nodeIds.every(id => fold?.within.has(id))
}

test('a bubble is ringed along its drawn nodes, and not at all where the drawing folds it whole, until a zoom draws it again', async () => {
  const model = await drawnGap571({ bubbles: true })
  const onFold = haloOnFold(model)
  expect(model.drawnFold?.sites.length).toBeGreaterThan(0)
  expect(model.bubbleHalos.filter(onFold)).toEqual([])
  expect(model.overlayLabels.ticks.map(t => t.item).filter(onFold)).toEqual([])
  expect(model.bubbleHalos.length).toBeLessThan(model.bubbles.length)
  while (model.drawnFold?.sites.length) {
    model.zoom(2, 600, 200)
    draw(model)
  }
  expect(model.bubbleHalos).toHaveLength(model.bubbles.length)
})

test('a node the drawing folds is not lit as selected, nor ringed from the walk strip', async () => {
  const model = await drawnGap571()
  const folded = [...model.drawnFold!.nodes][0]!
  const drawn = model.graph!.nodes.find(n => !model.folded!.has(n.id))!.id
  const highlights = vi.fn()
  const renderer = { ...fakeRenderer(), setNodeHighlights: highlights }
  model.setSelectedNode(folded)
  model.applySelection(renderer)
  expect(highlights).toHaveBeenLastCalledWith(new Map())
  model.setSelectedNode(drawn)
  model.applySelection(renderer)
  expect([...highlights.mock.lastCall![0].keys()]).toEqual([drawn])
  model.setStripHover({ row: 'GRCh38', offset: 0 })
  model.setHoveredNode(folded)
  expect(model.walkStripLocator).toBeUndefined()
  model.setHoveredNode(drawn)
  expect(model.walkStripLocator).toBeDefined()
})

test('a node inside a run of folded sites is hit and outlined as wide as the run draws it', async () => {
  const model = await drawnGap571()
  const through = [...model.drawnFold!.through.keys()]
  const own = nodeInk(
    model.drawnGraph,
    model.nodeById,
    model.contigThickness,
    model.nodeWidth,
  )
  const widened = through.filter(
    id => model.nodeInk.halfWidthPx(id) !== own.halfWidthPx(id),
  )
  expect(widened.length).toBeGreaterThan(0)
  const drawn = nodeInk(
    model.drawnGraph,
    model.nodeById,
    model.contigThickness,
    model.nodeWidth,
    0,
    model.drawnFold!.through,
  )
  for (const id of through) {
    expect(model.nodeInk.halfWidthPx(id)).toBe(drawn.halfWidthPx(id))
  }
})

test('Show small sites, off by default, draws every node and skip and keys nothing as not drawn, on screen and in the SVG, and is saved with the session', async () => {
  const model = await drawnGap571()
  const item = () =>
    (model.showMenuItems() as MenuItem[]).find(
      i => i.label === 'Show small sites',
    )!
  expect(item().checked).toBe(false)
  expect(model.drawnFold?.sites.length).toBeGreaterThan(0)
  expect(model.graphKey.map(s => s.id)).toContain('too-small')
  expect(model.figure()).toMatch(/under \d+ bp not drawn/)
  item().onClick!()
  draw(model)
  expect(item().checked).toBe(true)
  expect(model.drawnFold?.sites).toEqual([])
  expect(model.graphKey.map(s => s.id)).not.toContain('too-small')
  expect(model.figure()).not.toMatch(/not drawn/)
  const snapshot = getSnapshot(model)
  expect(snapshot.layers).toEqual({ lengths: true, smallSites: true })
  expect(stateModelFactory().create(snapshot).smallSites).toBe('nodes')
})
