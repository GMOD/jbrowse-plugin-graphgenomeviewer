import { adapterCanCutSubgraph, subgraphTracks } from './subgraphTracks'

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
