import { applySnapshot, getSnapshot } from '@jbrowse/mobx-state-tree'

import { bandageAutoScale } from './layout/drawnScale'
import stateModelFactory from './model'

const mockRpcCall = vi.fn()
const mockSession = {
  tracks: [] as { trackId: string; [key: string]: unknown }[],
  rpcManager: { call: mockRpcCall },
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
    getEnv: () => ({
      pluginManager: {
        runtimePluginDefinitions: [
          { name: 'GraphGenomeView', url: 'http://localhost/plugin.js' },
        ],
      },
    }),
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

describe('region size cap', () => {
  beforeEach(() => {
    mockRpcCall.mockReset()
    mockSession.tracks = []
  })

  test('declines regions over the 100kb cap without an RPC call', async () => {
    rpcRespond()
    const model = createModel()
    await model.loadFromTabixSubgraph(
      { type: 'GfaTabixAdapter' },
      { ...TEST_REGION, start: 0, end: 200_000 },
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
      { ...TEST_REGION, start: 0, end: 100_000 },
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
