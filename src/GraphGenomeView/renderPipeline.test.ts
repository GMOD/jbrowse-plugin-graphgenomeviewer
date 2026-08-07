import stateModelFactory from './model'

import type { RenderBatch, Renderer } from './renderer/types'

const mockRpcCall = vi.fn()
const mockSession = {
  tracks: [] as { trackId: string; [key: string]: unknown }[],
  rpcManager: { call: mockRpcCall },
  assemblyNames: [] as string[],
  views: [] as unknown[],
  addView() {
    return { id: 'view-1' }
  },
}

vi.mock('@jbrowse/core/util', () => ({
  getSession: () => mockSession,
  isSessionModelWithWidgets: () => false,
  parseLocString: () => ({}),
  getEnv: () => ({}),
  useWidthSetter: () => {},
  measureText: () => 0,
  IntervalTree: class {},
  checkStopToken: () => false,
  getSnapshot: () => ({}),
  applySnapshot: () => {},
  objectHash: () => '',
}))

// Partial, not wholesale: core modules pulled in transitively (BaseFeatureWidget's
// config schema) call ConfigurationSchema at module-eval time.
vi.mock(import('@jbrowse/core/configuration'), async importOriginal => ({
  ...(await importOriginal()),
  readConfObject: vi.fn(),
}))

const GFA = 'H\tVN:Z:1.0\nS\t1\tACGT\nS\t2\tGGCC\nL\t1\t+\t2\t+\t0M\n'

// A layout whose extent dwarfs the pane, which is what every real force layout
// produces: bandageAutoScale sizes a drawing in tens of thousands of FMMM units
// and zoom-to-fit is what brings it on screen.
const WIDE_LAYOUT = {
  nodePositions: {
    '1+': [
      { x: 0, y: 0 },
      { x: 40000, y: 0 },
    ],
    '1-': [
      { x: 0, y: 30000 },
      { x: 40000, y: 30000 },
    ],
    '2+': [
      { x: 50000, y: 0 },
      { x: 90000, y: 0 },
    ],
    '2-': [
      { x: 50000, y: 30000 },
      { x: 90000, y: 30000 },
    ],
  },
}

function fakeRenderer(uploads: RenderBatch[]) {
  const renderer: Renderer = {
    resize: () => {},
    uploadGeometry: (batch: RenderBatch) => {
      uploads.push(batch)
    },
    updateTransform: () => {},
    render: () => {},
    updateSubBatchColors: () => {},
    setEdgeHighlight: () => {},
    destroy: () => {},
  } as unknown as Renderer
  return renderer
}

// Regression: a graph whose layout is much larger than the pane drew a blank
// canvas on the whole-file import path. buildGeometry culls to a viewport
// derived from the *current* transform, read untracked, so the build that runs
// before zoom-to-fit lands sees a pane-sized window of a 90,000-unit drawing
// and discards every node. Whether anything rebuilt afterwards decided whether
// the user saw the graph or an empty white pane, and on the 4,749-node HPRC
// chrM pggb graph they saw the pane.
test('a layout larger than the pane still uploads geometry', async () => {
  mockRpcCall.mockImplementation((_id: string, method: string) =>
    method === 'GraphComputeLayout'
      ? Promise.resolve({ result: WIDE_LAYOUT, duration: 5 })
      : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
  )
  const model = stateModelFactory().create({ type: 'GraphGenomeView' })
  const uploads: RenderBatch[] = []
  // The mount order the app actually has: the canvas is rendered only once
  // `hasGraph` is true, so the graph and its layout exist *before* any autorun
  // is installed, and the width lands after the canvas is measured.
  await model.loadGFA(GFA, 'wide')
  model.startRenderingBackend(fakeRenderer(uploads))
  model.setWidth(1000)
  // past the pan/zoom debounce, so any rebuild it would have scheduled has run
  await new Promise(resolve => setTimeout(resolve, 400))

  expect(uploads.length).toBeGreaterThan(0)
  expect(uploads.at(-1)!.nodes.vertexCount).toBeGreaterThan(0)
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function drawnModel() {
  mockRpcCall.mockImplementation((_id: string, method: string) =>
    method === 'GraphComputeLayout'
      ? Promise.resolve({ result: WIDE_LAYOUT, duration: 5 })
      : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
  )
  const model = stateModelFactory().create({ type: 'GraphGenomeView' })
  await model.loadGFA(GFA, 'wide')
  model.startRenderingBackend(fakeRenderer([]))
  model.setWidth(1000)
  // past the zoom-to-fit autorun and the pan/zoom debounce, so the transform
  // has stopped moving on its own before a test moves it
  await sleep(400)
  return model
}

// jbrowse-components' `installClearHoverOnViewportChange` rule, on this view's
// own three axes. A hover is set by a mousemove; a wheel zoom, a toolbar zoom
// and a pan all move the drawing under a stationary cursor and fire no pointer
// event, so without this the tooltip goes on naming a node that has moved away
// and `hoverHighlight` goes on publishing its span to the paired linear view.
test('a zoom drops a hover the pointer can no longer be over', async () => {
  const model = await drawnModel()
  model.setHoveredNode('1+')
  model.setHoveredEdge(0)
  model.setSelectedNode('1+')

  model.zoom(1.5, 100, 100)

  expect(model.hoveredNode).toBeNull()
  expect(model.hoveredEdge).toBeNull()
  // A click is a choice, and the content moving does not unmake it.
  expect(model.selectedNode).toBe('1+')
})

test('a pan drops it too', async () => {
  const model = await drawnModel()
  model.setHoveredNode('1+')
  model.setTransform(model.scale, model.translateX + 40, model.translateY)
  expect(model.hoveredNode).toBeNull()
})

// The two signals name different events and are read by different consumers:
// `viewportDirty` says the window onto the drawing moved, `positionsVersion`
// says the drawing itself did. Conflating them rebuilt a 12k-edge hit index on
// the first mousemove after every pan, for an index that is in layout units and
// had not changed.
test('a pan moves the viewport signal and a node drag moves the positions one', async () => {
  const model = await drawnModel()
  const dirty = model.viewportDirty
  const positions = model.positionsVersion

  model.setTransform(model.scale, model.translateX + 40, model.translateY)
  await sleep(300)
  expect(model.viewportDirty).toBeGreaterThan(dirty)
  expect(model.positionsVersion).toBe(positions)

  model.moveNode('1+', 10, 10)
  await sleep(100)
  expect(model.positionsVersion).toBe(positions + 1)
})
