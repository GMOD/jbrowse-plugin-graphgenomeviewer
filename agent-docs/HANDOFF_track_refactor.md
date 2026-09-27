# Handoff: the graph track refactor (2026-09-26)

The refactor is on plugin main, unreleased. `agent-docs/GRAPH_TRACK.md`
describes the design that shipped.

## What landed

The graph display no longer nests the view model as `pane`. `GraphPaneMixin`
(src/GraphGenomeView/model.ts) draws a graph and cuts a region it is handed
(`cutSubgraph`). `LinearGraphDisplay` composes BaseDisplay + TrackHeightMixin +
the mixin flat and owns the cut policy, settle clock and `displayPhase`,
rendered through core's `DisplayStatusChrome`. `GraphGenomeView` composes the
mixin, loads `gfaLocation`, and cuts a stated `loadedTrackId`/`loadedRegion`
once on attach, so 4.0 share links, the docs' specs and the host-compat probe
still open.

That fixed the 4.0 track's errors below its clip, its missing phase, its frozen
height, its flash on every re-cut, the unaborted fetch of a removed track and
the shared `'graph'` RPC session. A Fable review of the branch found six more,
fixed with it (phase stuck off-screen, render errors, a canceled re-cut, the
haplotype blur, switchLayout's promise, a height test). The standalone view's
width was read through `getContainingView`, which never returns the node itself;
the unit mocks had hidden that.

`test/launchAndHover` now drives the track, and all e2e suites pass on
5.0.0-beta.9, so plugin CI should go green again.

## Left

- Declare `adapterCapabilities: ['getSubgraph']` on the display type once
  `@jbrowse/core` past 5.0.0-beta.9 is published (core `b05ac725c4` added the
  field; the plugin builds against the npm types).
- The bubble classifier calls any bubble with at least 8 routes and a longest
  route over 5x the shortest a "repeat array"; GSTT1's presence/absence
  insertion reads "0 bp–55 kb repeat array". Replace the shape rule in
  bubbles/classifyBubble.ts with the repeat track's arrays, which the pane
  already reads.
- A render error shows through GraphCanvas's own banner, because `DisplayChrome`
  wants to own the canvas through a factory. Moving the track to `DisplayChrome`
  would give it core's renderError phase.
- From the review, later: WeakMap caches (hitDetection, edgeCurves, graphLabels,
  GeometryBuilder, the model's forceLayouts) as observed computeds;
  force/ordered cut with margins, re-cut only when the window leaves the cut;
  one menu for the standalone toolbar and the track menu.

## Release consequences (jbrowse-components and jb2hubs)

Flattening changes what a session states: track entries write `layoutMode`,
`colorScheme` flat, and `paneHeight` is inert in a track (use `height`). The
`pane` fold keeps old links loading. Before a release: jbrowse-components
`website/scripts/specs/graph-fixtures.ts` `graphTrack()` (24 callers) spreads
props flat and maps `paneHeight` to `height`; `website/scripts/graphAnchor.ts`
and `probe-graph-nodes.ts` read `display` not `display.pane`; jb2hubs
`website/src/components/pangenomeLinks.ts:296` writes the choices flat. The part
5 tutorial's `loadedTrackId` fences and `graph-ecoli.ts` `rgfa_launch_out_menu`
still open (the standalone view cuts a stated pair once) but no longer follow
the linear view. Then reshoot the graph figures: the track now keeps its
configured height rather than shrinking to its rows, and errors and the
too-large gate draw as core's banners.

`scripts/preview-candidate.mjs` screenshots any hosted session with this
checkout's `dist/` served in place of the store bundle:
`pnpm build && node scripts/preview-candidate.mjs '<?config=...>' out.png`.
