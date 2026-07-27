import { locLabel, locString } from './contributors'
import { launchTracks } from './launchTracks'
import { linearViewTarget } from './linearViewTarget'

import type { Contributor, GraphLocation } from './contributors'
import type { TrackScanSession } from '../launchSubgraph/subgraphTracks'

export interface GraphLaunchSession extends TrackScanSession {
  addView: (type: string, snapshot?: Record<string, unknown>) => { id: string }
  assemblyNames: string[]
  views: unknown[]
}

// A node is often shorter than a line of text — a base-level allele can be a
// handful of bp — and a linear view opened on exactly that span shows the span
// and no context at all. Padding to a minimum window puts the node in the middle
// of something readable.
const MIN_LAUNCH_SPAN_BP = 1000

export function paddedLocation(
  loc: GraphLocation,
  minSpan = MIN_LAUNCH_SPAN_BP,
): GraphLocation {
  const pad = Math.max(0, Math.ceil((minSpan - (loc.end - loc.start)) / 2))
  return { ...loc, start: Math.max(0, loc.start - pad), end: loc.end + pad }
}

// Restate the rank-0 contributor in the terms of the region the graph was cut
// from. Two separate corrections, both required:
//
//   - the *assembly*. A backbone segment's SN is the graph's own spelling of the
//     reference, which need not be the name of any loaded assembly: the HPRC
//     graph says `GRCh38#0#chr6` in a session whose assembly is `hg38`. Taking
//     the PanSN sample there resolves to nothing and the graph offers no way out
//     at all. `loadedRegion` is authoritative — the adapter resolved that
//     assembly to that stable sequence to cut the subgraph in the first place.
//   - the *locus*. The cut region is what the user framed in the linear view, and
//     it is the span every other panel of a synteny launch is compared against;
//     the union of backbone segments differs from it whenever the window ends
//     inside a bubble.
//
// A subgraph is cut on one reference, so there is at most one rank-0
// contributor. Must run before contributors are resolved against the session's
// assemblies, or the reference is filtered out by the name this replaces.
export function withReferenceRegion(
  contributors: Contributor[],
  region:
    | { refName: string; assemblyName: string; start: number; end: number }
    | undefined,
): Contributor[] {
  return region
    ? contributors.map(c =>
        c.rank === 0
          ? {
              ...c,
              sample: region.assemblyName,
              refName: region.refName,
              start: region.start,
              end: region.end,
            }
          : c,
      )
    : contributors
}

// Show a location in a linear view: move the one already on screen if there is
// one to move, open a pane only if there isn't.
//
// This is the difference between "flip to the linear view" and "accumulate
// panes". The pangenome sessions this ships in are a linear view above a graph,
// and there the answer to "where is this node?" should be that the linear view
// scrolls to it — see linearViewTarget for which view counts as the one to move.
//
// `tracks` is only applied to a view being created; a view already open keeps
// whatever the user has turned on. Returns the id of the view that ended up
// showing the location, so the graph can pair with it for the hover sync.
export function showInLinearView({
  session,
  location,
  assembly,
  connectedViewId,
  tracks = [],
}: {
  session: GraphLaunchSession
  location: GraphLocation
  assembly: string
  connectedViewId?: string
  tracks?: string[]
}) {
  const existing = linearViewTarget({
    views: session.views,
    connectedViewId,
    assemblyName: assembly,
  })
  let viewId: string
  if (existing) {
    void existing.navToLocString(locString(location), assembly)
    viewId = existing.id
  } else {
    viewId = session.addView('LinearGenomeView', {
      displayName: `${assembly} — ${locLabel(location)}`,
      init: { assembly, loc: locString(location), tracks },
    }).id
  }
  return viewId
}

// Mark where a node sits on the reference, in the linear view already on
// screen, instead of scrolling that view to it. Review: "need to be able to
// just highlight lineargenomeview coords".
//
// The other half of the pair above, and the half that survives being let go of:
// hover sync draws a band for as long as the pointer is over the node, where a
// highlight is written into the view's own list and stays until it is removed.
// It also keeps the reader's frame — the interesting comparison at a pangenome
// locus is usually the whole window, not the 200 bp the node occupies.
//
// Nothing to mark when no linear view on that assembly is ours to move (see
// linearViewTarget); the caller offers the item only when there is.
export function highlightInLinearView({
  session,
  location,
  assembly,
  connectedViewId,
}: {
  session: GraphLaunchSession
  location: GraphLocation
  assembly: string
  connectedViewId?: string
}) {
  const target = linearViewTarget({
    views: session.views,
    connectedViewId,
    assemblyName: assembly,
  })
  target?.addToHighlights?.({
    refName: location.refName,
    start: location.start,
    end: location.end,
    assemblyName: assembly,
  })
  return target !== undefined
}

// One panel per contributing assembly, each framed on the locus that assembly
// contributes here, with the graph's own reference panel on top.
//
// The panel loci come from the graph rather than from the synteny track: rGFA
// states where each contributor's sequence sits on its own coordinates, so the
// launch needs no mate discovery, no PAF lookup and no dialog. That is the whole
// point of launching from the graph instead of from a linear view.
//
// Each panel carries its own assembly's annotation (see launchTracks), so the
// ribbons run between named genes rather than between bare rulers — on a
// pangenome that is the difference between "these coordinates correspond" and
// "this strain's insertion carries these genes".
export function launchSyntenyView({
  session,
  contributors,
  trackId,
}: {
  session: GraphLaunchSession
  contributors: Contributor[]
  trackId?: string
}) {
  session.addView('LinearSyntenyView', {
    init: {
      views: contributors.map(c => ({
        assembly: c.sample,
        loc: locString(c),
        tracks: launchTracks({ session, assemblyName: c.sample }),
      })),
      // One entry per LEVEL, not one for the track. `init.tracks` is 2D — the
      // gap between views[i] and views[i+1] — and a flat `[trackId]` is read as
      // the level-0 shorthand, so on a five-strain launch only the top band got
      // the alignment and the four below it opened as bare rulers. The same
      // all-vs-all track fills every level: it carries all the pairs.
      tracks: trackId ? contributors.slice(1).map(() => [trackId]) : [],
      collapseEmptyRows: true,
    },
  })
}
