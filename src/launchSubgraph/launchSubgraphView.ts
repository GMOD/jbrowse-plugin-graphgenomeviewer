import { MAX_GRAPH_REGION_BP } from '../GraphGenomeView/model'

import type { NotificationLevel, Region } from '@jbrowse/core/util'

// Only the two session members the launch uses, so the return type of addView
// (which this ignores) can't couple the launcher to a session shape.
export interface SubgraphLaunchSession {
  addView: (type: string, snapshot: Record<string, unknown>) => unknown
  notify: (message: string, level?: NotificationLevel) => void
}

export interface SubgraphRegion {
  refName: string
  assemblyName: string
  start: number
  end: number
}

function regionLabel(region: SubgraphRegion) {
  return `${region.refName}:${region.start.toLocaleString()}-${region.end.toLocaleString()}`
}

// Half the segment's own length on either side, so it opens with the graph
// around it rather than clipped to its own ends. The 10 bp floor keeps a
// single-base segment from opening a degenerate region.
export function regionAroundSegment(region: SubgraphRegion): SubgraphRegion {
  const padding = Math.max(10, Math.floor((region.end - region.start) * 0.5))
  return {
    ...region,
    start: Math.max(0, region.start - padding),
    end: region.end + padding,
  }
}

// The visible span of a linear view. A view scrolled across a region boundary
// has more than one content block; the graph is cut from the first, since a
// subgraph spans one stable sequence.
export function regionFromViewport(blocks: Region[]) {
  const block = blocks[0]
  return block
    ? {
        refName: block.refName,
        assemblyName: block.assemblyName,
        start: Math.max(0, Math.floor(block.start)),
        end: Math.floor(block.end),
      }
    : undefined
}

// Why a region can't be cut, or undefined if it can. A menu item shows this as
// the reason it is greyed out, so the cap is something the user reads before
// clicking rather than a notification afterwards.
export function subgraphRegionProblem(region: SubgraphRegion) {
  const kb = Math.round((region.end - region.start) / 1000)
  return region.end - region.start > MAX_GRAPH_REGION_BP
    ? `Region is ${kb} kb — zoom in or select a smaller range (max ${MAX_GRAPH_REGION_BP / 1000} kb)`
    : undefined
}

// The launch is a plain snapshot: `loadedTrackId`/`loadedRegion` are persisted
// view props, and the view fetches them when its canvas mounts — the same path
// a reloaded session takes, so a launched view is restorable for free and the
// menu does no RPC of its own.
//
// The size cap is checked here as well as in loadFromTabixSubgraph because past
// it the view would open only to display its own error.
export function launchSubgraphView({
  session,
  region,
  trackId,
  connectedViewId,
}: {
  session: SubgraphLaunchSession
  region: SubgraphRegion
  trackId: string
  // The linear view being launched from. Pairs the two views for the hover
  // sync — see hoverSync/graphViewHighlights.
  connectedViewId?: string
}) {
  const regionSize = region.end - region.start
  if (regionSize > MAX_GRAPH_REGION_BP) {
    session.notify(
      `Region too large (${Math.round(regionSize / 1000)} kb) — zoom in to open a graph view (max ${MAX_GRAPH_REGION_BP / 1000} kb)`,
      'warning',
    )
  } else {
    session.addView('GraphGenomeView', {
      displayName: `Graph — ${regionLabel(region)}`,
      loadedTrackId: trackId,
      loadedRegion: region,
      connectedViewId,
    })
  }
}
