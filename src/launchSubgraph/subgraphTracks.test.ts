import {
  adapterCanCutSubgraph,
  displayLanes,
  subgraphTracks,
} from './subgraphTracks'

import type PluginManager from '@jbrowse/core/PluginManager'

// A stand-in registry: the real one throws for an unregistered type, which is
// the behaviour the guard in adapterCanCutSubgraph exists for.
function fakePluginManager(capabilities: Record<string, string[]>) {
  return {
    adapterTypes: {
      has: (name: string) => name in capabilities,
    },
    getAdapterType: (name: string) => {
      const adapterCapabilities = capabilities[name]
      if (!adapterCapabilities) {
        throw new Error(`AdapterType '${name}' not found`)
      }
      return { adapterCapabilities }
    },
  } as unknown as PluginManager
}

const pluginManager = fakePluginManager({
  RgfaTabixAdapter: ['getSubgraph'],
  MinigraphBubbleAdapter: [],
})

// Plain objects rather than config models: readConfObject returns a non-MST
// object's own fields unchanged, so this exercises the same read path.
function track(props: Record<string, unknown>) {
  return props as never
}

const RGFA_TRACK = track({
  trackId: 'graph',
  name: 'rGFA segments',
  assemblyNames: ['hg38'],
  adapter: { type: 'RgfaTabixAdapter' },
})
const BUBBLE_TRACK = track({
  trackId: 'bubbles',
  name: 'bubbles',
  assemblyNames: ['hg38'],
  adapter: { type: 'MinigraphBubbleAdapter' },
})

function scan(tracks: never[], assemblyName = 'hg38') {
  return subgraphTracks(
    pluginManager,
    { tracks, assemblies: [] },
    assemblyName,
  ).map(t => t.trackId)
}

test('finds tracks whose adapter declares the capability', () => {
  expect(scan([RGFA_TRACK, BUBBLE_TRACK])).toEqual(['graph'])
})

test('ignores tracks on another assembly', () => {
  expect(scan([RGFA_TRACK], 'volvox')).toEqual([])
})

// The gate is the declared capability, not the adapter's name — the old launcher
// hardcoded adapter names and went dead when they were removed.
test('an adapter that declares nothing cannot cut a subgraph', () => {
  expect(adapterCanCutSubgraph(pluginManager, 'MinigraphBubbleAdapter')).toBe(
    false,
  )
  expect(adapterCanCutSubgraph(pluginManager, 'RgfaTabixAdapter')).toBe(true)
})

// A session can hold tracks whose plugin isn't loaded. getAdapterType throws for
// those, so a session-wide scan has to check registration first or it takes the
// whole menu down with it.
test('an unregistered adapter type is skipped, not thrown on', () => {
  expect(adapterCanCutSubgraph(pluginManager, 'NeverLoadedAdapter')).toBe(false)
  expect(
    scan([track({ trackId: 'x', assemblyNames: ['hg38'], adapter: {} })]),
  ).toEqual([])
  expect(
    scan([
      track({
        trackId: 'y',
        assemblyNames: ['hg38'],
        adapter: { type: 'NeverLoadedAdapter' },
      }),
      RGFA_TRACK,
    ]),
  ).toEqual(['graph'])
})

// A track that is not on screen in the launching view cuts for its config's
// lane selection: the `lanes` slot a hosted config sets on its
// MultiWaySyntenyDisplay.
test('a track whose display names lanes launches for that set', () => {
  const lanes = ['HG00097.1', 'HG00099.1']
  const gbz = track({
    trackId: 'gbz',
    name: 'graph',
    assemblyNames: ['hg38'],
    adapter: { type: 'RgfaTabixAdapter' },
    displays: [
      { type: 'LinearBasicDisplay' },
      { type: 'MultiWaySyntenyDisplay', lanes },
    ],
  })
  expect(displayLanes(gbz)).toEqual(lanes)
  expect(
    subgraphTracks(pluginManager, { tracks: [gbz], assemblies: [] }, 'hg38'),
  ).toEqual([
    {
      trackId: 'gbz',
      name: 'graph',
      referenceAssembly: 'hg38',
      haplotypes: lanes,
    },
  ])
})

// On screen, the lanes the display draws win over the config that seeded them.
test('a track on screen launches for the lanes its display draws', () => {
  const gbz = track({
    trackId: 'gbz',
    name: 'graph',
    assemblyNames: ['hg38'],
    adapter: { type: 'RgfaTabixAdapter' },
    displays: [{ type: 'MultiWaySyntenyDisplay', lanes: ['HG00097.1'] }],
  })
  const view = {
    tracks: [
      { configuration: gbz, displays: [{ laneSelection: ['HG00128.1'] }] },
    ],
  }
  const [found] = subgraphTracks(
    pluginManager,
    { tracks: [gbz], assemblies: [] },
    'hg38',
    view,
  )
  expect(found?.haplotypes).toEqual(['HG00128.1'])
})

test('a track reports the first assembly it names as the one it is cut on', () => {
  const both = track({
    trackId: 'graph',
    name: 'rGFA segments',
    assemblyNames: ['hg38', 'NA20809.2'],
    adapter: { type: 'RgfaTabixAdapter' },
  })
  const [found] = subgraphTracks(
    pluginManager,
    { tracks: [both], assemblies: [] },
    'NA20809.2',
  )
  expect(found?.referenceAssembly).toBe('hg38')
})

test('a track with no lane selection launches for every haplotype', () => {
  expect(displayLanes(RGFA_TRACK)).toBeUndefined()
  expect(
    displayLanes(
      track({
        trackId: 'x',
        displays: [{ type: 'MultiWaySyntenyDisplay', lanes: [] }],
      }),
    ),
  ).toBeUndefined()
})
