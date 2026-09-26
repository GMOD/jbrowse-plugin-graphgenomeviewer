# Handoff: the graph track refactor (2026-09-26)

Branch `graph-track-hardening`, worktree `~/src/jb2plugins/ggv-track`, three
commits past plugin main (`c68612f`). Not landed, not released. The last
commit is WIP and does not compile.

## Why

A fresh review of the 4.0 graph track found real bugs that trace to the
display nesting the whole view model as `pane` and copying state into it:

1. A hosted track's errors render below the clipped 300 px box, so a failed
   cut is a blank track, and the display has no `displayPhase`, so the app
   reports ready before the cut lands.
2. Height froze at the first host placement (`hostPaneHeight`), ratcheted into
   the config's `height` slot, and changed on restore.
3. `loadedRegion` moves to the next cut before the fetch, so the ramp colours
   the old graph against the new window: every re-cut flashes red.
4. A removed track's fetch is never aborted (no `beforeDestroy`).
5. Every graph track shares the hard-coded RPC session `'graph'`.

Also found: plugin CI has been red since 4.0.0 on six `test/launchAndHover`
e2e tests, which still click the retired "Graph genome view (this region)"
launch items. The bubble classifier calls any bubble with at least 8 routes
and a longest route over 5x the shortest a "repeat array"; GSTT1's
presence/absence insertion reads "0 bp–55 kb repeat array". The honest source
is the repeat track the pane already reads.

## Done on the branch

- `3094878`: `GraphPaneMixin` (src/GraphGenomeView/model.ts) is the drawing;
  `GraphGenomeView` (viewModel.ts) is BaseViewModel + the mixin + its Launch
  menu. The pane reads `paneWidth` off `getContainingView`. `launchSubgraph/`
  deleted (dead launch code and an unimported 255-line test env); what had
  readers is `src/graphTrackConfig.ts`.
- `b18f103`: `LinearGraphDisplay` is BaseDisplay + TrackHeightMixin +
  GraphPaneMixin. Layout and colour are optional session choices over
  overridable `defaultLayoutMode`/`defaultColorScheme` (the display reads its
  config live), resolved as `chosenLayoutMode`/`chosenColorScheme`. Height is
  the track's (`canvasHeight` overridden to `self.height`). The track menu is
  `graphMenuItems()` + Settings + `launchMenuItems()`. A 4.0 snapshot's
  `pane: {...}` is folded flat in preProcessSnapshot (share links). hoverSync
  reads the display's own `hoverHighlight`. 740 tests green.
- `97dd383` (WIP): pane props `loadedTrackId`, `loadedRegion`, `maxRegionBp`,
  `subgraphContext`, `subgraphHaplotypes`, `gfaLocation`, `coarseCut` and the
  volatile `cutNote`/`recuts` are removed; `graphRegion` is set with the graph
  in `parseAndLayout(text, name, region, keepSelection)`; views read it;
  `sourceAdapter` comes from `getContainingTrack`; the tier views and cut
  setters are gone; RPC calls use `getRpcSessionId(self)`.

## To finish step 1c (typecheck lists the rest)

- `doSubgraphLoad` becomes the action `cutSubgraph(adapterConfig, region,
  opts: { hops, haplotypes, tier })`, with no refusal checks and bubbles read
  only when `tier !== 'coarse'`. Delete `cutFromLoadedTrack`,
  `loadFromTabixSubgraph`, `refetchIfNeeded`, `reloadSubgraph`, `settleOn`,
  `startHosting` from the pane.
- `loadWholeGFA`/`loadGFAFromLocation(location, region?)` pass the region to
  `parseAndLayout`; `reloadGenes`/`reloadRepeats` use `graphRegion`.
- One `abortLoad()` (abort, `liveLoad++`, `liveRequest++`) used by
  `clearGraph`, `cancelLoad` and a `beforeDestroy`.
- Delete the lane-painting autorun in `startRenderingBackend` and the helpers
  in laneRamp.ts it alone used (a hosted display never shows the basic lane).
- `showInLinearView`/`showSyntenyView`: `onReference` from `graphRegion`, the
  graph's track id from the containing track.
- The pane's `switchLayout` just recomputes; the display overrides it to
  re-cut when the new mode's `cutMargins` differ.
- Display (src/LinearGraphDisplay/model.ts) gains: props `cutRegion`,
  `coarseCut`, `maxRegionBp`, `subgraphContext`, `subgraphHaplotypes`
  (default `trackLanes(config)` as a getter, not copied); volatile
  `cutNote`, `recuts`; views `coarseAboveBpPerPx`, `cutTier`, `regionCapBp`;
  actions `settleOn`, `cut()` (offReference and cap refusals, then
  `cutSubgraph`), `startHosting` (clocks), `retryLoad`/`reload` = `cut()`,
  `afterAttach` (restore: `cutRegion` and no graph cuts it).
- Display phase: `displayPhase` from `computeDisplayStatusPhase`
  (`@jbrowse/render-core/displayPhase`): tooLarge when past the cap, error,
  canceled, loading while loading or before the first graph or before
  geometry, else ready. Render the root through `DisplayStatusChrome`
  (`@jbrowse/display-kit/DisplayChrome`, testid `linear-graph-display`,
  `drawn={model.canvasDrawn}`), satisfying `StatusChromeModel`:
  `regionTooLargeReason` (the cap message), `zoomCanReleaseGate: true`,
  `forceLoad` (raise `maxRegionBp` to the window and cut), `fetchCanceled`,
  `cancelFetchByUser`. Drop `GraphLoadStatus` and the cut note from the track,
  and GraphCanvas's own error banner there (it lands below the clip).
- The standalone view gets `gfaLocation`, `loadedRegion` (stated region),
  `hasPendingSource`, `canRetryLoad`, `retryLoad`, `rpcSessionId` = its id,
  and an afterAttach that loads `gfaLocation`. It no longer cuts from a track.
- The settings dialog's `SubgraphContextSelect`/`SubgraphHaplotypesField`
  become a section the display passes to the dialog.
- Tests: model.test.ts, subgraphLoad.test.ts, renderPipeline.test.ts drive
  `loadFromTabixSubgraph`; move them to `cutSubgraph` or the display harness
  in LinearGraphDisplay.test.ts. Add tests for the flash (ramp during a
  re-cut), abort on destroy, and the phase.

## Then

- Rewrite test/launchAndHover.test.ts for the track: open the rGFA track as
  `LinearGraphDisplay`, then hover in both directions (DOM:
  `[data-testid="linear-graph-display"]`, `data-node-count`, the band
  `graph-node-highlight`). CI goes green with it.
- Declare `adapterCapabilities: ['getSubgraph']` on the display type once
  `@jbrowse/core` past 5.0.0-beta.9 is published (core `b05ac725c4` added the
  field; the plugin builds against the npm types).
- Replace the repeat-array shape rule in bubbles/classifyBubble.ts with the
  repeat track's arrays.
- Later, from the review: WeakMap caches (hitDetection, edgeCurves,
  graphLabels, GeometryBuilder, model's forceLayouts) as observed computeds;
  force/ordered cut with margins and re-cut only when the window leaves the
  cut; one menu for the standalone toolbar and the track menu.
- Rewrite agent-docs/GRAPH_TRACK.md for the composed display.

## Release consequences (jbrowse-components and jb2hubs)

Flattening changes what a session states: track entries write `layoutMode`,
`colorScheme` flat, and `paneHeight` is inert in a track (use `height`). The
`pane` fold keeps old links loading. Before a release: jbrowse-components
`website/scripts/specs/graph-fixtures.ts` `graphTrack()` (24 callers) spreads
props flat and maps `paneHeight` to `height`; `website/scripts/graphAnchor.ts`
and `probe-graph-nodes.ts` read `display` not `display.pane`; the part 5
tutorial's two `loadedTrackId` fences and `graph-ecoli.ts` `rgfa_launch_out_menu`
(standalone view cut from a track) become a linear view with the track;
jb2hubs `website/src/components/pangenomeLinks.ts:296` writes the choices flat.
Then reshoot the graph figures.

`scripts/preview-candidate.mjs` (on plugin main) screenshots any hosted
session with this checkout's `dist/` served in place of the store bundle:
`pnpm build && node scripts/preview-candidate.mjs '<?config=...>' out.png`.
