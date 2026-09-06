import { readConfObject } from '@jbrowse/core/configuration'
import { getTrackName } from '@jbrowse/core/util/tracks'

import type PluginManager from '@jbrowse/core/PluginManager'
import type { AnyConfigurationModel } from '@jbrowse/core/configuration'

export interface SubgraphTrack {
  trackId: string
  name: string
  // The lanes one of the track's displays is configured to draw, which is the
  // set a launched cut is for; undefined when no display names any.
  haplotypes: string[] | undefined
}

export interface TrackScanSession {
  tracks: AnyConfigurationModel[]
  assemblies: AnyConfigurationModel[]
}

// Whether an adapter declares it can cut a local subgraph. Discovery is by
// declared capability, not adapter name: the old launcher hardcoded
// `GfaTabixAdapter`/`GfaServerAdapter`, which is exactly what left it dead when
// those were removed.
//
// `getAdapterType` throws for a type that was never registered, and a session
// can hold tracks whose plugin isn't loaded, so registration is checked first —
// a session-wide scan reaches tracks a single display's menu never would.
export function adapterCanCutSubgraph(
  pluginManager: PluginManager,
  adapterType: unknown,
) {
  return (
    typeof adapterType === 'string' &&
    pluginManager.adapterTypes.has(adapterType) &&
    pluginManager
      .getAdapterType(adapterType)
      .adapterCapabilities.includes('getSubgraph')
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

// The `lanes` slot of the track's displays (MultiWaySyntenyDisplay's chosen
// set), the first non-empty one. A launch from a linear view has no display of
// the graph track in scope, so the config is where its selection lives.
export function displayLanes(track: AnyConfigurationModel) {
  const displays: unknown = readConfObject(track, 'displays')
  const sets = Array.isArray(displays)
    ? displays.flatMap((display: unknown) =>
        typeof display === 'object' &&
        display !== null &&
        'lanes' in display &&
        isStringArray(display.lanes) &&
        display.lanes.length > 0
          ? [display.lanes]
          : [],
      )
    : []
  return sets[0]
}

// Tracks anywhere in the session that can cut a subgraph on `assemblyName`, so
// the launch can be offered from a linear view that doesn't have the graph track
// in it. The entry point no longer has to be the graph track's own menu — which
// was the whole problem: a user browsing genes had no way in.
export function subgraphTracks(
  pluginManager: PluginManager,
  session: TrackScanSession,
  assemblyName: string,
) {
  const found: SubgraphTrack[] = []
  for (const track of session.tracks) {
    const assemblyNames: unknown = readConfObject(track, 'assemblyNames')
    const adapter: unknown = readConfObject(track, 'adapter')
    const trackId: unknown = readConfObject(track, 'trackId')
    if (
      Array.isArray(assemblyNames) &&
      assemblyNames.includes(assemblyName) &&
      typeof trackId === 'string' &&
      typeof adapter === 'object' &&
      adapter !== null &&
      'type' in adapter &&
      adapterCanCutSubgraph(pluginManager, adapter.type)
    ) {
      found.push({
        trackId,
        name: getTrackName(track, session),
        haplotypes: displayLanes(track),
      })
    }
  }
  return found
}
