import { applySnapshot, getSnapshot } from '@jbrowse/mobx-state-tree'

import { spreadFor } from './bubbleSpreads'
import {
  PROPORTIONAL_LENGTH,
  bandageAutoScale,
  drawnLengthFor,
  layoutScaling,
} from './layout/drawnScale'
import stateModelFactory, { MAX_GRAPH_REGION_BP, formatSpanBp } from './model'

import type { Graph } from './types'

const mockRpcCall = vi.fn()
// The canonical assembly a name or alias resolves to, which is what
// assemblyManager.assemblyNameMap does: it is keyed by [name, ...aliases].
function canonicalAssembly(name: string) {
  const aliased = mockSession.assemblyAliases[name]
  return mockSession.assemblyNames.includes(name)
    ? name
    : aliased !== undefined && mockSession.assemblyNames.includes(aliased)
      ? aliased
      : undefined
}
const mockSession = {
  tracks: [] as { trackId: string; [key: string]: unknown }[],
  rpcManager: { call: mockRpcCall },
  assemblyNames: [] as string[],
  // alias -> the assembly it names, the half of assemblyManager a graph needs:
  // a node's PanSN sample is the graph's spelling, not necessarily the
  // assembly's
  assemblyAliases: {} as Record<string, string>,
  assemblyManager: {
    has: (name: string) => canonicalAssembly(name) !== undefined,
    get: (name: string) => {
      const canonical = canonicalAssembly(name)
      return canonical === undefined ? undefined : { name: canonical }
    },
  },
  views: [] as unknown[],
  addedViews: [] as [string, Record<string, unknown> | undefined][],
  addView(type: string, snapshot?: Record<string, unknown>) {
    mockSession.addedViews.push([type, snapshot])
    return { id: `view-${mockSession.addedViews.length}` }
  },
}

// Don't use vi.importActual due to circular dependencies
// Instead, manually mock just what we need
vi.mock('@jbrowse/core/util', () => {
  // Return minimal mock that doesn't trigger circular load
  return {
    getSession: () => mockSession,
    isSessionModelWithWidgets: () => false,
    // Add stubs for other potentially imported items
    parseLocString: () => ({}),
    getEnv: () => ({}),
    useWidthSetter: () => {},
    measureText: () => 0,
    IntervalTree: class {},
    // Add other exports that might be needed
    checkStopToken: () => false,
    getSnapshot: () => ({}),
    applySnapshot: () => {},
    objectHash: () => '',
  }
})

// Partial, not wholesale: core modules pulled in transitively (BaseFeatureWidget's
// config schema) call ConfigurationSchema at module-eval time.
vi.mock(import('@jbrowse/core/configuration'), async importOriginal => ({
  ...(await importOriginal()),
  readConfObject: vi.fn((obj: Record<string, unknown>, key: string) =>
    key === 'adapter' ? obj.adapter : undefined,
  ),
}))

const SIMPLE_GFA = 'H\tVN:Z:1.0\nS\t1\tACGT\nS\t2\tGGCC\nL\t1\t+\t2\t+\t0M\n'

const MOCK_LAYOUT = {
  nodePositions: {
    '1+': [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ],
    '1-': [
      { x: 0, y: 5 },
      { x: 5, y: 5 },
    ],
    '2+': [
      { x: 10, y: 0 },
      { x: 15, y: 0 },
    ],
    '2-': [
      { x: 10, y: 5 },
      { x: 15, y: 5 },
    ],
  },
}

function rpcRespond() {
  mockRpcCall.mockImplementation((_sid: unknown, method: string) => {
    if (method === 'GetSubgraph') {
      return Promise.resolve(SIMPLE_GFA)
    }
    if (method === 'GraphComputeLayout') {
      return Promise.resolve({ result: MOCK_LAYOUT, duration: 5 })
    }
    return Promise.reject(new Error(`Unexpected RPC: ${method}`))
  })
}

function createModel() {
  return stateModelFactory().create({ type: 'GraphGenomeView' })
}

// The view defaults to the force layout, so a test about a reference-anchored
// drawing has to select one — the same way the anchored figures do.
function createAnchoredModel() {
  return stateModelFactory().create({
    type: 'GraphGenomeView',
    layoutMode: 'auto',
  })
}

const TEST_REGION = {
  refName: 'chr1',
  assemblyName: 'hg38',
  start: 1000,
  end: 5000,
}

const TEST_TRACK = {
  trackId: 'rgfa-track',
  adapter: { type: 'RgfaTabixAdapter' },
}

describe('loadFromTabixSubgraph state storage', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('stores trackId and region when trackId is provided', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {
        trackId: 'rgfa-track',
      },
    )
    expect(model.loadedTrackId).toBe('rgfa-track')
    expect(model.loadedRegion).toEqual(TEST_REGION)
  })

  test('clears stored params when no trackId given', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {
        trackId: 'rgfa-track',
      },
    )
    expect(model.loadedTrackId).toBe('rgfa-track')

    rpcRespond()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {},
    )
    expect(model.loadedTrackId).toBe('')
    expect(model.loadedRegion).toBeUndefined()
  })
})

describe('loadGFA clears restore params', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('loadGFA clears trackId and region stored by a prior tabix load', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {
        trackId: 'rgfa-track',
      },
    )
    expect(model.loadedTrackId).toBe('rgfa-track')

    rpcRespond()
    await model.loadGFA(SIMPLE_GFA, 'imported')
    expect(model.loadedTrackId).toBe('')
    expect(model.loadedRegion).toBeUndefined()
  })
})

// What the reference-position ramp spans. A file-loaded graph has no
// loadedRegion at all, so without a stated domain the ramp is whatever the file
// happens to contain — which is why a figure pairing a linear track with a
// file-loaded graph states the window instead of measuring it.
describe('rampDomain', () => {
  test('is the cut region when the graph came from a track', async () => {
    rpcRespond()
    mockSession.tracks = [TEST_TRACK]
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      { trackId: 'rgfa-track' },
    )
    expect(model.rampDomain).toEqual(TEST_REGION)
  })

  test('is undefined for a file-loaded graph that states nothing', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(SIMPLE_GFA)
    expect(model.rampDomain).toBeUndefined()
  })

  test('a stated colorDomain survives loading a GFA file, and wins', async () => {
    rpcRespond()
    const model = createModel()
    applySnapshot(model, {
      ...getSnapshot(model),
      colorDomain: { start: 1445000, end: 1474500 },
      loadedRegion: TEST_REGION,
    })
    await model.loadGFA(SIMPLE_GFA)
    expect(model.rampDomain).toEqual({ start: 1445000, end: 1474500 })
  })
})

describe('refetchIfNeeded guard conditions', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('does nothing when no trackId is stored', async () => {
    const model = createModel()
    await model.refetchIfNeeded()
    expect(mockRpcCall).not.toHaveBeenCalled()
  })

  test('does nothing when no region is stored', async () => {
    const model = createModel()
    applySnapshot(model, { ...getSnapshot(model), loadedTrackId: 'rgfa-track' })
    await model.refetchIfNeeded()
    expect(mockRpcCall).not.toHaveBeenCalled()
  })

  test('does nothing when graph is already loaded', async () => {
    rpcRespond()
    const model = createModel()
    mockSession.tracks = [TEST_TRACK]
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {
        trackId: 'rgfa-track',
      },
    )
    expect(model.graph).toBeDefined()

    mockRpcCall.mockReset()
    await model.refetchIfNeeded()
    expect(mockRpcCall).not.toHaveBeenCalled()
  })

  // The launch menu opens a view by writing exactly this snapshot (see
  // launchSubgraph), so the stored-props path is how a launched view — not just
  // a reloaded session — gets its graph.
  test('fetches from the stored track and region', async () => {
    rpcRespond()
    const model = createModel()
    applySnapshot(model, {
      ...getSnapshot(model),
      loadedTrackId: 'rgfa-track',
      loadedRegion: TEST_REGION,
    })
    mockSession.tracks = [TEST_TRACK]

    await model.refetchIfNeeded()

    expect(mockRpcCall).toHaveBeenCalledWith(
      expect.any(String),
      'GetSubgraph',
      expect.objectContaining({
        adapterConfig: { type: 'RgfaTabixAdapter' },
        region: TEST_REGION,
      }),
    )
    expect(model.graph).toBeDefined()
  })

  // subgraphContext rides on the same snapshot as the region, so a session
  // saved with the cut widened restores the graph it was showing rather than
  // the default cut.
  test('passes the stored subgraphContext to the cut', async () => {
    rpcRespond()
    const model = createModel()
    applySnapshot(model, {
      ...getSnapshot(model),
      loadedTrackId: 'rgfa-track',
      loadedRegion: TEST_REGION,
      subgraphContext: 2,
    })
    mockSession.tracks = [TEST_TRACK]

    await model.refetchIfNeeded()

    expect(mockRpcCall).toHaveBeenCalledWith(
      expect.any(String),
      'GetSubgraph',
      expect.objectContaining({ opts: { context: 2 } }),
    )
  })

  // The one difference between the two entry points: widening the cut has to
  // re-cut a graph that is already on screen, which is exactly what
  // refetchIfNeeded declines to do.
  test('reloadSubgraph re-cuts a graph that is already drawn', async () => {
    rpcRespond()
    const model = createModel()
    mockSession.tracks = [TEST_TRACK]
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      { trackId: 'rgfa-track' },
    )

    mockRpcCall.mockClear()
    model.setSubgraphContext(1)
    await model.reloadSubgraph()

    expect(mockRpcCall).toHaveBeenCalledWith(
      expect.any(String),
      'GetSubgraph',
      expect.objectContaining({ opts: { context: 1 } }),
    )
  })

  test('does nothing when stored trackId is not in session tracks', async () => {
    const model = createModel()
    applySnapshot(model, {
      ...getSnapshot(model),
      loadedTrackId: 'missing-track',
      loadedRegion: TEST_REGION,
    })
    mockSession.tracks = []
    await model.refetchIfNeeded()
    expect(mockRpcCall).not.toHaveBeenCalled()
  })
})

describe('performance instrumentation', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('captures fetch and layout timing on a tabix subgraph load', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {
        trackId: 'rgfa-track',
      },
    )
    // GetSubgraph round-trip is timed with performance.now() — a resolved
    // promise still takes a measurable, non-negative amount of time.
    expect(typeof model.lastFetchMs).toBe('number')
    expect(model.lastFetchMs).toBeGreaterThanOrEqual(0)
    // layout duration is passed straight through from the GraphComputeLayout
    // RPC return (mock reports duration: 5)
    expect(model.lastLayoutMs).toBe(5)
  })

  test('captures layout timing on loadGFA', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(SIMPLE_GFA, 'imported')
    expect(model.lastLayoutMs).toBe(5)
  })

  test('clearGraph resets perf metrics', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(SIMPLE_GFA, 'imported')
    expect(model.lastLayoutMs).toBe(5)
    model.clearGraph()
    expect(model.lastFetchMs).toBeUndefined()
    expect(model.lastLayoutMs).toBeUndefined()
    expect(model.lastGeometryMs).toBeUndefined()
    expect(model.lastGeometryVertexCount).toBeUndefined()
  })
})

describe('formatSpanBp', () => {
  test('reports Mb at and above a megabase, kb below it', () => {
    expect(formatSpanBp(MAX_GRAPH_REGION_BP)).toBe('5 Mb')
    expect(formatSpanBp(4_900_000)).toBe('4.9 Mb')
    expect(formatSpanBp(1_000_000)).toBe('1 Mb')
    expect(formatSpanBp(999_999)).toBe('1000 kb')
    expect(formatSpanBp(60_000)).toBe('60 kb')
  })
})

describe('region size cap', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('declines regions over the cap without an RPC call', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'GfaTabixAdapter' },
      { ...TEST_REGION, start: 0, end: MAX_GRAPH_REGION_BP + 1 },
      { trackId: 'rgfa-track' },
    )
    expect(model.graph).toBeUndefined()
    expect(model.error).toBeInstanceOf(Error)
    expect(String(model.error)).toMatch(/zoom in/i)
    expect(mockRpcCall).not.toHaveBeenCalled()
  })

  test('accepts a region exactly at the cap', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'GfaTabixAdapter' },
      { ...TEST_REGION, start: 0, end: MAX_GRAPH_REGION_BP },
      { trackId: 'rgfa-track' },
    )
    expect(model.graph).toBeDefined()
    expect(model.error).toBeUndefined()
  })
})

describe('empty subgraph handling', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('sets an error when the adapter returns no GFA', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GetSubgraph'
        ? Promise.resolve('')
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      { trackId: 'rgfa-track' },
    )
    expect(model.graph).toBeUndefined()
    expect(model.error).toBeInstanceOf(Error)
    expect(String(model.error)).toMatch(/no GFA/i)
    expect(model.isLoading).toBe(false)
    consoleSpy.mockRestore()
  })
})

describe('refetchIfNeeded restore flow', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('fetches the graph when stored params are present', async () => {
    const model = createModel()
    applySnapshot(model, {
      ...getSnapshot(model),
      loadedTrackId: 'rgfa-track',
      loadedRegion: TEST_REGION,
    })
    mockSession.tracks = [TEST_TRACK]
    rpcRespond()

    await model.refetchIfNeeded()

    expect(model.graph).toBeDefined()
    expect(model.graph!.nodes.length).toBeGreaterThan(0)
  })

  test('preserves pan/zoom state after restore', async () => {
    const model = createModel()
    applySnapshot(model, {
      ...getSnapshot(model),
      loadedTrackId: 'rgfa-track',
      loadedRegion: TEST_REGION,
      scale: 3.5,
      translateX: 120,
      translateY: 80,
    })
    mockSession.tracks = [TEST_TRACK]
    rpcRespond()

    await model.refetchIfNeeded()

    expect(model.scale).toBe(3.5)
    expect(model.translateX).toBe(120)
    expect(model.translateY).toBe(80)
  })
})

// rGFA: SN/SO/SR make the graph anchorable, so `auto` lays it out from the file
// and never reaches the WASM engine.
const RGFA =
  'H\tVN:Z:1.0\n' +
  'S\t1\tACGT\tSN:Z:chr\tSO:i:0\tSR:i:0\n' +
  'S\t2\tGGCC\tSN:Z:chr\tSO:i:4\tSR:i:0\n' +
  'S\t3\tTTTT\tSN:Z:alt\tSO:i:0\tSR:i:1\n' +
  'L\t1\t+\t2\t+\t0M\nL\t1\t+\t3\t+\t0M\n'

describe('layoutMode', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  function layoutCalls() {
    return mockRpcCall.mock.calls.filter(c => c[1] === 'GraphComputeLayout')
  }

  test('auto lays an rGFA out from the file, with no layout RPC', async () => {
    rpcRespond()
    const model = createAnchoredModel()
    await model.loadGFA(RGFA, 'rgfa')

    expect(model.canAnchorLayout).toBe(true)
    expect(layoutCalls()).toHaveLength(0)
    expect(model.layoutResult).toBeDefined()
  })

  test('force sends an rGFA to the layout engine instead', async () => {
    rpcRespond()
    const model = createModel()
    model.setLayoutMode('force')
    await model.loadGFA(RGFA, 'rgfa')

    expect(layoutCalls()).toHaveLength(1)
    expect(model.layoutResult).toEqual(MOCK_LAYOUT)
  })

  test('recomputeLayout follows a switch back to auto', async () => {
    rpcRespond()
    const model = createModel()
    model.setLayoutMode('force')
    await model.loadGFA(RGFA, 'rgfa')
    expect(layoutCalls()).toHaveLength(1)

    model.setLayoutMode('auto')
    await model.recomputeLayout()

    // still one — the anchored recompute is local
    expect(layoutCalls()).toHaveLength(1)
    expect(model.layoutResult).not.toEqual(MOCK_LAYOUT)
  })

  test('a plain GFA has no anchored option to offer', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(SIMPLE_GFA, 'plain')

    expect(model.canAnchorLayout).toBe(false)
    expect(layoutCalls()).toHaveLength(1)
  })
})

// pggb/odgi: no segment carries a coordinate, so the only ones in the file are
// in the P line names. One bubble, K12 taking `2` and Sakai taking `3`.
const PGGB_GFA =
  'H\tVN:Z:1.0\n' +
  'S\t1\tAAAAA\n' +
  'S\t2\tC\n' +
  'S\t3\tG\n' +
  'S\t4\tTTTTT\n' +
  'L\t1\t+\t2\t+\t0M\nL\t1\t+\t3\t+\t0M\n' +
  'L\t2\t+\t4\t+\t0M\nL\t3\t+\t4\t+\t0M\n' +
  'P\tK12#1#chr:100-111\t1+,2+,4+\t*\n' +
  'P\tSakai#1#chr:200-211\t1+,3+,4+\t*\n'

describe('reference path', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  function layoutCalls() {
    return mockRpcCall.mock.calls.filter(c => c[1] === 'GraphComputeLayout')
  }

  function backboneStarts(model: ReturnType<typeof createModel>) {
    return model
      .graph!.nodes.filter(n => n.stable?.rank === 0)
      .map(n => `${n.name}@${n.stable!.start}`)
      .sort()
  }

  test('a whole-file pggb import anchors on the first path in the file', async () => {
    rpcRespond()
    const model = createAnchoredModel()
    await model.loadGFA(PGGB_GFA, 'pggb')

    expect(model.activeReferencePath).toBe('K12#1#chr')
    expect(model.canAnchorLayout).toBe(true)
    // laid out from the walk, so the force engine is never reached
    expect(layoutCalls()).toHaveLength(0)
    expect(backboneStarts(model)).toEqual(['1@100', '2@105', '4@106'])
  })

  test('the picker moves the backbone onto another path', async () => {
    rpcRespond()
    const model = createAnchoredModel()
    await model.loadGFA(PGGB_GFA, 'pggb')

    model.setReferencePath('Sakai#1#chr')
    await model.recomputeLayout()

    expect(model.activeReferencePath).toBe('Sakai#1#chr')
    expect(backboneStarts(model)).toEqual(['1@200', '3@205', '4@206'])
    // re-anchored from the recorded walk, not re-parsed and not re-laid-out
    // by the engine
    expect(layoutCalls()).toHaveLength(0)
  })

  // A subgraph cut from a track was cut against one assembly, and that is the
  // one the linear view beside it is showing — so it is the axis to draw,
  // without the user having to say so.
  test('a subgraph anchors on the assembly it was cut against', async () => {
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GetSubgraph'
        ? Promise.resolve(PGGB_GFA)
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = createModel()
    await model.loadFromTabixSubgraph(
      {},
      { refName: 'chr', assemblyName: 'Sakai', start: 200, end: 211 },
      { trackId: 'pggb' },
    )

    expect(model.activeReferencePath).toBe('Sakai#1#chr')
  })

  // An explicit choice outranks the inference, and survives a session reload —
  // otherwise a restored view silently redraws against a different axis.
  test('an explicit choice outranks the region and round-trips', async () => {
    rpcRespond()
    const model = createModel()
    model.setReferencePath('Sakai')
    expect(getSnapshot(model).referencePath).toBe('Sakai')

    await model.loadGFA(PGGB_GFA, 'pggb')
    expect(model.activeReferencePath).toBe('Sakai#1#chr')
  })

  // rGFA states its own coordinates, so a stale or wrong path name must not
  // reach them.
  test('rGFA ignores the setting', async () => {
    rpcRespond()
    const model = createModel()
    model.setReferencePath('alt')
    await model.loadGFA(RGFA, 'rgfa')

    expect(model.activeReferencePath).toBeUndefined()
    expect(backboneStarts(model)).toEqual(['1@0', '2@4'])
  })
})

// A window with no bubbles in it lays every segment out on row 0, and x there is
// reference bp — so a layout at offset 1 kb sat entirely off an 800 px canvas
// while zoomToFit declined to act on it for having no height.
describe('zoomToFit on a layout that is flat in y', () => {
  const RGFA_BACKBONE_ONLY =
    'H\tVN:Z:1.0\n' +
    'S\t1\tACGT\tSN:Z:chr\tSO:i:1000\tSR:i:0\n' +
    'S\t2\tGGCC\tSN:Z:chr\tSO:i:1004\tSR:i:0\n' +
    'L\t1\t+\t2\t+\t0M\n'

  test('fits on x and centers on y', async () => {
    rpcRespond()
    const model = createAnchoredModel()
    await model.loadGFA(RGFA_BACKBONE_ONLY, 'backbone only')

    const ys = Object.values(model.nodePositions!)
      .flat()
      .map(p => p.y)
    expect(new Set(ys).size).toBe(1)

    model.zoomToFit()

    // both ends of the backbone land inside the canvas
    const screenX = (x: number) => x * model.scale + model.translateX
    expect(screenX(1000)).toBeGreaterThanOrEqual(0)
    expect(screenX(1008)).toBeLessThanOrEqual(model.width)
    // and the one row it has sits vertically centered
    expect(model.translateY).toBeCloseTo(model.canvasHeight / 2, 5)
  })
})

// The bp cap bounds the fetch, but cost tracks node count and bp-per-node varies
// by orders of magnitude between graph types, so a dense graph clears the bp cap
// and still swamps the renderer. The import path had no cap of any kind.
describe('node budget', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  function withLimit(limit: number) {
    const model = createModel()
    applySnapshot(model, { ...getSnapshot(model), maxGraphNodes: limit })
    return model
  }

  test('declines a graph over the budget without laying it out', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpcRespond()
    const model = withLimit(1)

    await model.loadGFA(SIMPLE_GFA, 'two nodes')

    expect(model.graph).toBeUndefined()
    expect(String(model.error)).toMatch(/too large to draw/i)
    expect(String(model.error)).toMatch(/2 nodes/)
    // the layout is downstream of the check, so it must not have run
    expect(
      mockRpcCall.mock.calls.filter(c => c[1] === 'GraphComputeLayout'),
    ).toHaveLength(0)
    expect(model.isLoading).toBe(false)
    consoleSpy.mockRestore()
  })

  test('draws the same graph once the budget is raised', async () => {
    rpcRespond()
    const model = withLimit(10)

    await model.loadGFA(SIMPLE_GFA, 'two nodes')

    expect(model.graph).toBeDefined()
    expect(model.error).toBeUndefined()
  })
})

// The zoom floor exists to keep the scale positive, but in a reference-anchored
// layout world units are bp, so fitting a megabase-scale import needs a scale far
// below what reads as a sensible interactive minimum. A 0.001 floor clamped it
// and the graph stayed several screens wide with no way to fit it.
describe('zoomToFit on a megabase-scale layout', () => {
  const WIDE_RGFA =
    'H\tVN:Z:1.0\n' +
    'S\t1\t*\tLN:i:1000000\tSN:Z:chr\tSO:i:0\tSR:i:0\n' +
    'S\t2\t*\tLN:i:1000000\tSN:Z:chr\tSO:i:4000000\tSR:i:0\n' +
    'L\t1\t+\t2\t+\t0M\n'

  test('fits a 5 Mbp span inside the canvas', async () => {
    rpcRespond()
    const model = createAnchoredModel()
    await model.loadGFA(WIDE_RGFA, 'wide')

    model.zoomToFit()

    const screenX = (x: number) => x * model.scale + model.translateX
    expect(screenX(0)).toBeGreaterThanOrEqual(0)
    expect(screenX(5_000_000)).toBeLessThanOrEqual(model.width)
  })
})

// The pane was a fixed 600 px box that the drawing floated in the middle of.
// Row spacing on a reference-anchored layout is a fraction of the reference
// span, so such a layout is wide and flat at every pane width and can never
// fill 600 px: measured on the ecoli slice, 178 px of rows with 211 px of dead
// space above and below, worsening as the pane narrowed.
describe('canvas height follows the drawing', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  // Four ranks over a 3 kb span, so the rows have enough extent to ask for a
  // pane between the floor and the cap — the ordinary case, and the one the
  // ecoli slice is.
  const RGFA_FOUR_RANKS =
    'H\tVN:Z:1.0\n' +
    'S\t1\t*\tLN:i:1000\tSN:Z:chr\tSO:i:0\tSR:i:0\n' +
    'S\t2\t*\tLN:i:1000\tSN:Z:chr\tSO:i:2000\tSR:i:0\n' +
    'S\ta\t*\tLN:i:100\tSN:Z:alt1\tSO:i:0\tSR:i:1\n' +
    'S\tb\t*\tLN:i:100\tSN:Z:alt2\tSO:i:0\tSR:i:2\n' +
    'S\tc\t*\tLN:i:100\tSN:Z:alt3\tSO:i:0\tSR:i:3\n' +
    'L\t1\t+\ta\t+\t0M\nL\ta\t+\t2\t+\t0M\n' +
    'L\t1\t+\tb\t+\t0M\nL\tb\t+\t2\t+\t0M\n' +
    'L\t1\t+\tc\t+\t0M\nL\tc\t+\t2\t+\t0M\n'

  function extent(model: ReturnType<typeof createModel>) {
    const points = Object.values(model.nodePositions!).flat()
    const ys = points.map(p => p.y)
    const xs = points.map(p => p.x)
    return {
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    }
  }

  test('a wide flat layout gets a pane just tall enough for its rows', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(RGFA_FOUR_RANKS, 'four ranks')
    model.zoomToFit()

    expect(model.canvasHeight).toBeLessThan(600)
    // the rows plus one padding gap top and bottom, and nothing else
    expect(extent(model).h * model.scale).toBeCloseTo(
      model.canvasHeight - 80,
      5,
    )
    // which is to say the drawing is not floating in the middle of the pane:
    // the top row sits one padding gap down, not 211 px down
    expect(model.translateY).toBeCloseTo(40, 5)
  })

  // The point is to remove dead space, not to draw the graph smaller: x is what
  // limits the fit either way, so the scale is the one the 600 px pane produced.
  test('the tighter pane draws the graph at the same scale', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(RGFA_FOUR_RANKS, 'four ranks')
    model.zoomToFit()

    expect(model.scale).toBeCloseTo((model.width - 80) / extent(model).w, 10)
  })

  // Shrink-to-fit has to stop somewhere: a two-row window over a few bases wants
  // a ~116 px pane, which leaves nothing to hover in.
  test('a nearly flat layout stops shrinking at the floor', async () => {
    rpcRespond()
    const model = createAnchoredModel()
    await model.loadGFA(RGFA, 'two rows over 8 bp')

    expect(model.canvasHeight).toBe(160)
  })

  // A force-directed layout is roughly as tall as it is wide, so it still wants
  // the whole pane and keeps the one it always had.
  test('a layout as tall as it is wide keeps the full pane', async () => {
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GraphComputeLayout'
        ? Promise.resolve({
            result: {
              nodePositions: {
                '1+': [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              },
            },
            duration: 5,
          })
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = createModel()
    await model.loadGFA(SIMPLE_GFA, 'square')

    expect(model.canvasHeight).toBe(600)
  })

  test('a pane with no layout in it yet is full height', () => {
    expect(createModel().canvasHeight).toBe(600)
  })
})

// hoveredEdge is an index into graph.edges, so it addresses the graph it was set
// against; carrying it across a load pointed the tooltip and the highlight at
// whatever ended up at that index in the new graph.
describe('interaction state across a graph swap', () => {
  test('loading a graph clears hover and selection', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(RGFA, 'first')
    model.setHoveredEdge(0)
    model.setHoveredNode('1+')
    model.setSelectedNode('1+')

    await model.loadGFA(SIMPLE_GFA, 'second')

    expect(model.hoveredEdge).toBeNull()
    expect(model.hoveredNode).toBeNull()
    expect(model.selectedNode).toBeNull()
  })
})

// What a connected linear view draws a band over. The reverse direction (an LGV
// hover selecting a node) is the pure functions in hoverSync/lgvHover.
describe('hoverHighlight', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  async function loadedFromTrack() {
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GetSubgraph'
        ? Promise.resolve(RGFA)
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      TEST_REGION,
      {
        trackId: 'rgfa-track',
      },
    )
    return model
  }

  test('nothing hovered highlights nothing', async () => {
    const model = await loadedFromTrack()
    expect(model.hoverHighlight).toBeUndefined()
  })

  test('a hovered backbone node highlights its own span', async () => {
    const model = await loadedFromTrack()
    model.setHoveredNode('2+')
    expect(model.hoverHighlight).toEqual({
      refName: TEST_REGION.refName,
      assemblyName: TEST_REGION.assemblyName,
      start: 4,
      end: 8,
    })
  })

  // Node 3 is rank 1 on stable sequence `alt`, so its own offset means nothing on
  // chr. It resolves through the backbone it hangs off.
  test('a hovered off-reference allele highlights where it branches', async () => {
    const model = await loadedFromTrack()
    model.setHoveredNode('3+')
    expect(model.hoverHighlight).toMatchObject({ start: 0, end: 4 })
  })

  // A whole-file import has no region, so its stable names need not name anything
  // in a loaded assembly and there is nothing to project onto.
  test('a whole-file import publishes no highlight', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadGFA(RGFA, 'imported')
    model.setHoveredNode('2+')
    expect(model.hoverHighlight).toBeUndefined()
  })
})

// The pggb figure drew as a chain of same-sized bubbles because every node in a
// 400 bp window fell below the engine's minimumNodeLength and clamped to one
// drawn length. Guard the property that actually broke — that node lengths stay
// *proportional* — rather than the constant, which is free to be retuned.
describe('bandageAutoScale', () => {
  function drawnLength(opts: ReturnType<typeof bandageAutoScale>, bp: number) {
    return Math.max(
      (opts.nodeLengthPerMegabase * bp) / 1_000_000,
      opts.minimumNodeLength,
    )
  }

  // the real ecoli_pggb_subgraph: 20 SNP alleles of 1 bp plus 11 longer
  // segments, 545 bp total
  const pggbLengths = [
    ...Array<number>(20).fill(1),
    3,
    5,
    5,
    12,
    14,
    35,
    62,
    73,
    75,
    77,
    164,
  ]
  const graphOf = (lengths: number[]) =>
    ({
      nodes: lengths.map((length, i) => ({ id: `${i}`, name: `${i}`, length })),
      edges: [],
    }) as unknown as Parameters<typeof bandageAutoScale>[0]

  test('a 1 bp SNP allele does not draw the size of a 164 bp segment', () => {
    const opts = bandageAutoScale(graphOf(pggbLengths))
    const ratio = drawnLength(opts, 164) / drawnLength(opts, 1)
    expect(ratio).toBeGreaterThan(10)
  })

  test('scales to the graph rather than using a fixed per-megabase constant', () => {
    // same node count, 1000x longer nodes: the derived scale must fall to
    // compensate, so the drawn sizes stay in the same range
    const small = bandageAutoScale(graphOf(pggbLengths))
    const large = bandageAutoScale(graphOf(pggbLengths.map(l => l * 1000)))
    expect(large.nodeLengthPerMegabase).toBeLessThan(
      small.nodeLengthPerMegabase,
    )
    expect(drawnLength(large, 164_000)).toBeCloseTo(drawnLength(small, 164), 5)
  })

  test('an empty graph cannot divide by zero', () => {
    expect(bandageAutoScale(graphOf([])).nodeLengthPerMegabase).toBe(10_000)
  })
})

// The graph's own way out. Shaped after the two graphs this view actually ships
// with, because they behave completely differently: every E. coli strain is a
// loaded assembly, and none of HPRC's contributing haplotypes is.
describe('launching out of the graph', () => {
  // An HPRC-shaped graph: the reference backbone is spelled GRCh38 in the graph
  // and loaded as hg38 in the session, and the alleles come from haplotypes that
  // are not assemblies at all.
  const HPRC_RGFA =
    'H\tVN:Z:1.0\n' +
    'S\t1\tACGTACGTAC\tSN:Z:GRCh38#0#chr6\tSO:i:31000000\tSR:i:0\n' +
    'S\t2\tACGTACGTAC\tSN:Z:GRCh38#0#chr6\tSO:i:31000010\tSR:i:0\n' +
    'S\t3\tTTTT\tSN:Z:HG02717#1#chr6\tSO:i:9000\tSR:i:1\n' +
    'L\t1\t+\t2\t+\t0M\nL\t1\t+\t3\t+\t0M\nL\t3\t+\t2\t+\t0M\n'

  // The one HPRC donor a session can load: CHM13, whose sequence is UCSC's `hs1`
  // and whose contigs are spelled the way GRCh38's are.
  const CHM13_RGFA =
    'H\tVN:Z:1.0\n' +
    'S\t1\tACGTACGTAC\tSN:Z:GRCh38#0#chr17\tSO:i:83022650\tSR:i:0\n' +
    'S\t2\tACGTACGTAC\tSN:Z:GRCh38#0#chr17\tSO:i:83022660\tSR:i:0\n' +
    'S\t3\tTTTT\tSN:Z:CHM13#0#chr17\tSO:i:83899576\tSR:i:61\n' +
    'L\t1\t+\t2\t+\t0M\nL\t1\t+\t3\t+\t0M\nL\t3\t+\t2\t+\t0M\n'

  // An E. coli-shaped graph: two strains, both loaded as assemblies.
  const ECOLI_RGFA =
    'H\tVN:Z:1.0\n' +
    'S\t1\tACGTACGTAC\tSN:Z:K12#1#chr\tSO:i:1000\tSR:i:0\n' +
    'S\t2\tACGTACGTAC\tSN:Z:K12#1#chr\tSO:i:1010\tSR:i:0\n' +
    'S\t3\tTTTT\tSN:Z:Sakai#1#chr\tSO:i:90000\tSR:i:1\n' +
    'L\t1\t+\t2\t+\t0M\nL\t1\t+\t3\t+\t0M\nL\t3\t+\t2\t+\t0M\n'

  const HPRC_REGION = {
    refName: 'chr6',
    assemblyName: 'hg38',
    start: 31000000,
    end: 31000020,
  }

  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
    mockSession.assemblyNames = []
    mockSession.assemblyAliases = {}
    mockSession.views = []
    mockSession.addedViews = []
  })

  function launchLabels(model: { menuItems: () => unknown[] }) {
    const items = model.menuItems() as {
      label?: string
      subMenu?: { label?: string }[]
    }[]
    const launch = items.find(i => i.label === 'Launch view')
    return (launch?.subMenu ?? []).map(i => i.label)
  }

  async function loadedGraph(gfa: string, region = HPRC_REGION) {
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GetSubgraph'
        ? Promise.resolve(gfa)
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = createModel()
    await model.loadFromTabixSubgraph({ type: 'RgfaTabixAdapter' }, region, {
      trackId: 'rgfa-track',
    })
    return model
  }

  // The graph spells the reference GRCh38 and the session calls it hg38, so
  // resolving the backbone by its PanSN name would leave the graph with no way
  // out at all. The cut region names the assembly instead.
  test('the reference resolves through the cut region, not its stable name', async () => {
    mockSession.assemblyNames = ['hg38']
    const model = await loadedGraph(HPRC_RGFA)

    expect(model.contributingAssemblies.map(c => c.sample)).toEqual([
      'GRCh38',
      'HG02717',
    ])
    expect(model.launchableAssemblies).toEqual([
      expect.objectContaining({
        sample: 'hg38',
        refName: 'chr6',
        start: 31000000,
        end: 31000020,
        rank: 0,
      }),
    ])
    expect(launchLabels(model)).toEqual([
      'Linear genome view — hg38 chr6:31,000,001-31,000,020',
    ])
  })

  // 400-odd contributing haplotypes, one loaded assembly: a per-assembly menu
  // would be all dead items, and there is nothing to compare in a synteny view.
  test('unloaded haplotypes offer no synteny item', async () => {
    mockSession.assemblyNames = ['hg38']
    const model = await loadedGraph(HPRC_RGFA)
    expect(launchLabels(model)).not.toContain(
      'Linear synteny view (2 assemblies)',
    )
  })

  // A haplotype allele has an exact coordinate on a sequence nothing has loaded,
  // so the way back to a coordinate is the reference projection.
  test('an unloaded haplotype node still locates on the reference', async () => {
    mockSession.assemblyNames = ['hg38']
    const model = await loadedGraph(HPRC_RGFA)
    const { own, reference } = model.nodeLaunchTargets('3+')

    expect(own).toBeUndefined()
    expect(reference).toEqual({
      assembly: 'hg38',
      location: expect.objectContaining({ refName: 'chr6' }),
    })
  })

  // A donor is openable when the session has its sequence, whatever the session
  // calls it: the graph says CHM13, the assembly is `hs1` with CHM13 as an alias,
  // and the launch has to name `hs1` because that is what addView can open.
  test('a donor loaded under an alias is openable, under the assembly name', async () => {
    mockSession.assemblyNames = ['hg38', 'hs1']
    mockSession.assemblyAliases = { CHM13: 'hs1', GRCh38: 'hg38' }
    const model = await loadedGraph(CHM13_RGFA, {
      refName: 'chr17',
      assemblyName: 'hg38',
      start: 83022650,
      end: 83022670,
    })

    expect(model.launchableAssemblies.map(c => c.sample)).toEqual([
      'hg38',
      'hs1',
    ])
    expect(model.nodeLaunchTargets('3+').own).toEqual({
      assembly: 'hs1',
      location: expect.objectContaining({ refName: 'chr17' }),
    })
  })

  // The same graph with no CHM13 assembly loaded: the donor node falls back to
  // the reference projection, which is the HPRC default.
  test('a donor with no assembly, aliased or otherwise, is not openable', async () => {
    mockSession.assemblyNames = ['hg38']
    const model = await loadedGraph(CHM13_RGFA, {
      refName: 'chr17',
      assemblyName: 'hg38',
      start: 83022650,
      end: 83022670,
    })

    expect(model.launchableAssemblies.map(c => c.sample)).toEqual(['hg38'])
    expect(model.nodeLaunchTargets('3+').own).toBeUndefined()
  })

  // Where every contributor is a loaded assembly the graph offers one panel per
  // strain, and a synteny view of all of them — the item is disabled while no
  // synteny track aligns them, rather than absent.
  test('loaded strains offer a per-strain linear view and a synteny item', async () => {
    mockSession.assemblyNames = ['K12', 'Sakai']
    const model = await loadedGraph(ECOLI_RGFA, {
      refName: 'chr',
      assemblyName: 'K12',
      start: 1000,
      end: 1020,
    })

    expect(model.launchableAssemblies.map(c => c.sample)).toEqual([
      'K12',
      'Sakai',
    ])
    expect(launchLabels(model)).toEqual([
      'Linear genome view',
      'Linear synteny view (2 assemblies)',
    ])
  })

  // The gesture is "show me this", not "give me another pane": a linear view
  // already on the assembly is the one that moves.
  test('showing a node moves the linear view beside the graph', async () => {
    mockSession.assemblyNames = ['hg38']
    const navToLocString = vi.fn()
    mockSession.views = [
      {
        id: 'lgv1',
        type: 'LinearGenomeView',
        assemblyNames: ['hg38'],
        navToLocString,
      },
    ]
    const model = await loadedGraph(HPRC_RGFA)
    const { reference } = model.nodeLaunchTargets('1+')
    model.showInLinearView(reference!)

    expect(navToLocString).toHaveBeenCalledWith(
      expect.stringContaining('chr6:'),
      'hg38',
    )
    expect(mockSession.addedViews).toEqual([])
    // and pairs with it, so the hover sync works both ways from here on
    expect(model.connectedViewId).toBe('lgv1')
  })

  test('with no linear view to move, one is opened carrying the graph track', async () => {
    mockSession.assemblyNames = ['hg38']
    const model = await loadedGraph(HPRC_RGFA)
    const { reference } = model.nodeLaunchTargets('1+')
    model.showInLinearView(reference!)

    expect(mockSession.addedViews).toEqual([
      [
        'LinearGenomeView',
        expect.objectContaining({
          init: expect.objectContaining({
            assembly: 'hg38',
            tracks: ['rgfa-track'],
          }),
        }),
      ],
    ])
    expect(model.connectedViewId).toBe('view-1')
  })
})

// Bubble spread is the force layout's legibility knob, and 'auto' has to leave
// the drawing exactly as it was — every existing force figure is committed
// against it, and the proportionality test above is stated at that setting.
describe('bubbleSpread', () => {
  // the real minigraph cut behind `pangenome/graph_resolution`: a 16.4 kb
  // backbone segment and a 4.4 kb one, against five alleles of 6-154 bp
  const minigraphLengths = [16_417, 4_423, 154, 88, 65, 33, 6]
  const graphOf = (lengths: number[]) =>
    ({
      nodes: lengths.map((length, i) => ({ id: `${i}`, name: `${i}`, length })),
      edges: [],
    }) as unknown as Graph

  // What the engine does with what we hand it (`settings.h`,
  // `getDrawnNodeLength`): linear in the node's length, with a floor.
  function drawn(scaling: ReturnType<typeof layoutScaling>, index: number) {
    const { nodeLengthPerMegabase, minimumNodeLength } = scaling.opts
    const length = scaling.nodes[index]!.length
    return Math.max(
      (nodeLengthPerMegabase * length) / 1_000_000,
      minimumNodeLength,
    )
  }

  const lengthsUnder = (spread: string) => {
    const scaling = layoutScaling(graphOf(minigraphLengths), spreadFor(spread))
    return minigraphLengths.map((_, i) => drawn(scaling, i))
  }

  test("'auto' hands the engine the graph's own nodes, untransformed", () => {
    const graph = graphOf(minigraphLengths)
    const scaling = layoutScaling(graph, spreadFor('auto'))
    // identity, not a copy: the proportional path must not round-trip lengths
    // through a rounding step FMMM is free to amplify
    expect(scaling.nodes).toBe(graph.nodes)
    expect(scaling.opts).toStrictEqual(bandageAutoScale(graph))
  })

  // The equivalence that lets the law replace the old linear scale outright
  // rather than sit beside it.
  test("the proportional law reproduces bandageAutoScale's own drawn lengths", () => {
    const graph = graphOf(minigraphLengths)
    const scale = bandageAutoScale(graph)
    const law = drawnLengthFor(graph, PROPORTIONAL_LENGTH)
    for (const bp of minigraphLengths) {
      expect(law(bp)).toBeCloseTo(
        Math.max((scale.nodeLengthPerMegabase * bp) / 1_000_000, 5),
        6,
      )
    }
  })

  test('compressing shrinks the drawn length range', () => {
    const range = (lengths: number[]) =>
      Math.max(...lengths) / Math.min(...lengths)
    // the rope: on the real cut the longest node draws tens of times the
    // shortest, so zoom-to-fit frames the long one and the alleles vanish
    expect(range(lengthsUnder('auto'))).toBeGreaterThan(20)
    expect(range(lengthsUnder('compress'))).toBeLessThan(5)
  })

  // The property a per-node floor did not have, and the reason it could only be
  // afforded on a small cut: compressing against the mean leaves the drawing
  // the size it already was, so the same setting works at any node count.
  test('compressing does not inflate the total drawing', () => {
    const total = (lengths: number[]) => lengths.reduce((a, b) => a + b, 0)
    const proportional = total(lengthsUnder('auto'))
    expect(total(lengthsUnder('compress'))).toBeLessThan(proportional * 1.5)
  })

  test('every allele clears the floor it used to clamp to', () => {
    // 6 bp against a 3 kb mean is 5 units proportionally, which is the engine's
    // own minimum: indistinguishable from the 33 bp and 65 bp beside it
    const auto = lengthsUnder('auto')
    expect(auto.at(-1)).toBe(5)
    expect(auto.at(-2)).toBe(5)
    const compressed = lengthsUnder('compress')
    expect(compressed.at(-1)).toBeGreaterThan(5)
    expect(compressed.at(-1)).toBeLessThan(compressed.at(-2)!)
  })

  test('an unknown spread draws proportionally rather than throwing', () => {
    expect(spreadFor('nonsense')).toStrictEqual({
      law: PROPORTIONAL_LENGTH,
      minNodeLength: 0,
    })
  })

  // The floor and the law are alternatives, not a stack, and the floor-based
  // spreads have to keep drawing exactly what they drew before the law existed:
  // every figure committed against them predates it.
  test('the floor-based spreads still raise a floor and nothing else', () => {
    const graph = graphOf(minigraphLengths)
    for (const spread of ['open', 'wide']) {
      const scaling = layoutScaling(graph, spreadFor(spread))
      expect(scaling.nodes).toBe(graph.nodes)
      expect(scaling.opts.nodeLengthPerMegabase).toBe(
        bandageAutoScale(graph).nodeLengthPerMegabase,
      )
      expect(scaling.opts.minimumNodeLength).toBeGreaterThan(40)
    }
    expect(
      layoutScaling(graph, spreadFor('wide')).opts.minimumNodeLength,
    ).toBeGreaterThan(
      layoutScaling(graph, spreadFor('open')).opts.minimumNodeLength,
    )
  })

  // What each instrument is for: a floor leaves the long node long, the law
  // does not. That difference is why both are kept.
  test('a floor keeps the top end proportional where the law compresses it', () => {
    const longest = (spread: string) => lengthsUnder(spread)[0]!
    expect(longest('open')).toBe(longest('auto'))
    expect(longest('compress')).toBeLessThan(longest('auto') / 3)
  })
})

// A cut made for a region draws on that region's axis, which is the whole claim
// of the reference-anchored layouts: the graph pane's x is meant to match the
// linear view stacked above it. One allele can anchor far outside the window and
// still be correct -- in the E. coli pggb graph a 75 bp CFT073 segment attaches
// at K12:997,574 and rejoins at K12:1,004,667, a real 7 kb deletion -- and
// fitting the drawing to that redrew a 484 bp window at 6% of the frame. It got
// there when the graph-context default went from None to 1 hop, which is what
// first fetches the distant anchor.
const FAR_ANCHORED_RGFA =
  'H\tVN:Z:1.0\n' +
  // in the window
  'S\tin1\tACGTACGTAC\tSN:Z:chr\tSO:i:100000\tSR:i:0\n' +
  'S\tin2\tACGTACGTAC\tSN:Z:chr\tSO:i:100380\tSR:i:0\n' +
  // the same reference, 99 kb upstream of the window: reached because the
  // allele below links to it, never walked through
  'S\tfar\tACGTACGTAC\tSN:Z:chr\tSO:i:1000\tSR:i:0\n' +
  // the allele that bridges them
  'S\talt\tTTTT\tSN:Z:other\tSO:i:0\tSR:i:1\n' +
  'L\tfar\t+\talt\t+\t0M\nL\talt\t+\tin1\t+\t0M\nL\tin1\t+\tin2\t+\t0M\n'

const FAR_REGION = {
  refName: 'chr',
  assemblyName: 'hg38',
  start: 100000,
  end: 100400,
}

describe('layoutBounds on a reference axis', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = [TEST_TRACK]
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GetSubgraph'
        ? Promise.resolve(FAR_ANCHORED_RGFA)
        : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
  })

  test('x is the cut region, not how far the drawing reaches', async () => {
    const model = createAnchoredModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      FAR_REGION,
      { trackId: 'rgfa-track' },
    )

    // the drawing does reach the far anchor -- this is not a fetch change
    const drawnX = Object.values(model.nodePositions!)
      .flat()
      .map(s => s.x)
    expect(Math.min(...drawnX)).toBeLessThan(FAR_REGION.start)

    expect(model.layoutBounds!.minX).toBe(FAR_REGION.start)
    expect(model.layoutBounds!.w).toBe(FAR_REGION.end - FAR_REGION.start)
  })

  // The fit is only half of it. Row spacing and the off-reference floor are
  // both fractions of the reference span, so a backbone stretched by the far
  // anchor pushed the rows 15x apart and set a 111 bp floor inside a 484 bp
  // window -- a pane too tall for its own viewport, with the drawing at the top
  // of it.
  test('rows are spaced against the region, not the stretched backbone', async () => {
    const model = createAnchoredModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      FAR_REGION,
      { trackId: 'rgfa-track' },
    )
    const rowYs = [...new Set(model.rowLabels.map(r => r.y))].sort(
      (a, b) => a - b,
    )
    expect(rowYs.length).toBeGreaterThan(1)
    // whatever the fraction is, one row step has to stay inside the window it
    // is a fraction of
    expect(rowYs[1]! - rowYs[0]!).toBeLessThan(
      FAR_REGION.end - FAR_REGION.start,
    )
  })

  test('y still comes from the rows, which are not on the reference', async () => {
    const model = createAnchoredModel()
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      FAR_REGION,
      { trackId: 'rgfa-track' },
    )
    const drawnY = Object.values(model.nodePositions!)
      .flat()
      .map(s => s.y)
    expect(model.layoutBounds!.h).toBe(
      Math.max(...drawnY) - Math.min(...drawnY),
    )
  })

  test('a force layout keeps the extent it measured', async () => {
    mockRpcCall.mockImplementation((_sid: unknown, method: string) =>
      method === 'GetSubgraph'
        ? Promise.resolve(FAR_ANCHORED_RGFA)
        : method === 'GraphComputeLayout'
          ? Promise.resolve({ result: MOCK_LAYOUT, duration: 5 })
          : Promise.reject(new Error(`Unexpected RPC: ${method}`)),
    )
    const model = createModel()
    model.setLayoutMode('force')
    await model.loadFromTabixSubgraph(
      { type: 'RgfaTabixAdapter' },
      FAR_REGION,
      { trackId: 'rgfa-track' },
    )
    // MOCK_LAYOUT's own units, which no region bounds
    const drawnX = Object.values(model.nodePositions!)
      .flat()
      .map(s => s.x)
    expect(model.layoutBounds!.minX).toBe(Math.min(...drawnX))
    expect(model.layoutBounds!.w).toBe(
      Math.max(...drawnX) - Math.min(...drawnX),
    )
  })
})
