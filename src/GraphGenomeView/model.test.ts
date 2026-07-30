import { applySnapshot, getSnapshot } from '@jbrowse/mobx-state-tree'

import { minNodeLengthFor } from './bubbleSpreads'
import { MEAN_NODE_LENGTH, bandageAutoScale } from './layout/drawnScale'
import stateModelFactory, { MAX_GRAPH_REGION_BP, formatSpanBp } from './model'

const mockRpcCall = vi.fn()
const mockSession = {
  tracks: [] as { trackId: string; [key: string]: unknown }[],
  rpcManager: { call: mockRpcCall },
  assemblyNames: [] as string[],
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

vi.mock('@jbrowse/core/configuration', () => ({
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
    const model = createModel()
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
    const model = createModel()
    await model.loadGFA(PGGB_GFA, 'pggb')

    expect(model.activeReferencePath).toBe('K12#1#chr')
    expect(model.canAnchorLayout).toBe(true)
    // laid out from the walk, so the force engine is never reached
    expect(layoutCalls()).toHaveLength(0)
    expect(backboneStarts(model)).toEqual(['1@100', '2@105', '4@106'])
  })

  test('the picker moves the backbone onto another path', async () => {
    rpcRespond()
    const model = createModel()
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
    const model = createModel()
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
    const model = createModel()
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
    const model = createModel()
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
  const graph = {
    nodes: [
      { id: '1', name: '1', length: 164 },
      { id: '2', name: '2', length: 1 },
    ],
    edges: [],
  } as unknown as Parameters<typeof bandageAutoScale>[0]

  test("'auto' keeps Bandage's own floor", () => {
    expect(
      bandageAutoScale(graph, minNodeLengthFor('auto')).minimumNodeLength,
    ).toBe(5)
  })

  test('opening bubbles raises the floor above the mean drawn node length', () => {
    const open = bandageAutoScale(graph, minNodeLengthFor('open'))
    const wide = bandageAutoScale(graph, minNodeLengthFor('wide'))
    expect(open.minimumNodeLength).toBeGreaterThan(MEAN_NODE_LENGTH)
    expect(wide.minimumNodeLength).toBeGreaterThan(open.minimumNodeLength)
    // the scale itself is untouched, so a node above the floor keeps the length
    // it had — only the smallest ones are lifted
    expect(open.nodeLengthPerMegabase).toBe(
      bandageAutoScale(graph, minNodeLengthFor('auto')).nodeLengthPerMegabase,
    )
  })

  test('an unknown spread falls back to auto rather than to zero', () => {
    expect(minNodeLengthFor('nonsense')).toBe(0)
    expect(
      bandageAutoScale(graph, minNodeLengthFor('nonsense')).minimumNodeLength,
    ).toBe(5)
  })
})
