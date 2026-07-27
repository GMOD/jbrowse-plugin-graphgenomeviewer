import { MAX_GRAPH_REGION_BP, formatSpanBp } from '../GraphGenomeView/model'

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

// The one block a launch runs on, out of however many the view or the selection
// covers. A subgraph spans one stable sequence, so a span crossing a region
// boundary has to pick: the widest, which is the sequence the user is mostly
// looking at. Taking the first is worse here than anywhere, because the size cap
// then reads the wrong block — a view scrolled 3 bp past a boundary offers an
// enabled menu item that cuts a 3 bp graph, where the widest block would have
// said "zoom in".
//
// Widest in bp rather than in pixels: a dynamic block carries widthPx and a
// selected region does not, and within one view bpPerPx is uniform, so the two
// orders agree.
export function widestBlock<T extends { start: number; end: number }>(
  blocks: T[],
) {
  return blocks.reduce<T | undefined>(
    (best, block) =>
      best && best.end - best.start >= block.end - block.start ? best : block,
    undefined,
  )
}

// The span of a linear view or of a selection in one, as a region to cut from.
export function regionFromViewport(blocks: Region[]) {
  const block = widestBlock(blocks)
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
  const span = region.end - region.start
  return span > MAX_GRAPH_REGION_BP
    ? `Region is ${formatSpanBp(span)} — zoom in or select a smaller range (max ${formatSpanBp(MAX_GRAPH_REGION_BP)})`
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
      `Region too large (${formatSpanBp(regionSize)}) — zoom in to open a graph view (max ${formatSpanBp(MAX_GRAPH_REGION_BP)})`,
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
