---
name: review-cleanups
description:
  Splits and dedupes a code review found that need no call, from fitViews.ts and
  graphViews.ts down to the lane adapters' duplicates.
---

# Review cleanups

The synteny adapters' shared dispatch waits on a call, in
[synteny-getfeatures-dispatch](../waiting-on-a-call/synteny-getfeatures-dispatch.md).

## Views and actions

- `pane/fitViews.ts` still holds walk-row sizing (105-230) and figure export
  (562-670), and `pane/graphViews.ts` is 1247 lines; the tube-map views already
  moved to `pane/tubeMapViews.ts`
- Viewport placement (`pane/settingActions.ts` 399-530) could become
  `viewportActions.ts`
- The host branches of `setTransform`/`zoom` (`settingActions.ts` 399-416) look
  unreachable: gestures return on `hostPlacesX` (`usePaneGestures.ts` 27, 153)
  and the toolbar renders only with the pane's own chrome. Confirm, then delete
- `relayout`, `switchLayout` and `switchForceEngine` sit in separate action
  blocks (`pane/renderingActions.ts` 291, 298, 304, 413); only `relayoutFrom`
  needs its own, since hosts override it
- `dropGraph` (`pane/loadActions.ts` 656-675) repeats
  `dropLayoutOfReplacedGraph` (190); `engineSettingsOf` (`loadActions.ts` 59)
  and `figureSpecSettings` (`fitViews.ts` 629) list the same engine fields
- `ENGINE_NAMES` (`pane/launchActions.ts` 44) hard-codes the two engines the
  dialog reads from core's `LAYOUT_ENGINES`; a
  `Record<LayoutEngineKind, string>` would make a third engine a type error
- Four group-into-a-Map loops: `tubeMapPanels.ts` 151, `walkRowGroups.ts` 103,
  `repeats/walkCalls.ts` 139, `launchFromGraph/contributors.ts` 105
- The pane transform string repeats in `GenePins.tsx` 39 and `BubbleHalos.tsx`
  30

## Adapters

- `walkCutFor` runs in `GbzBaseSyntenyAdapter.ts` 424 and
  `RgfaTabixAdapter/walkReader.ts` 72; `GetSubgraph.ts` has the region and
  `walkRows` to apply it once, which also gives the GBZ text cut its runs
- `getHaplotypes` (`GbzBaseSyntenyAdapter.ts` 288-305) builds `contigs` and
  `isReference` that only a test reads, scanning `db.paths()` per haplotype, and
  runs again at 320 and 462
- `recordsAreAlignments` (`synteny/ComparativeAdapterBase.ts` 37) is overridden
  only by a test
- The adapters build the zoom-in notice two ways: `zoomInNotice` in
  `GbzBaseSyntenyAdapter.ts` writes a span, and `laneZoomNotice`
  (`synteny/laneZoomNotice.ts`) rewrites graph-walks' message as a fold for
  lanes; graph-walks' `RegionTooLargeError` could carry both
- `wholeBp` (`GbzBaseSyntenyAdapter.ts` 227) floors and ceils a region; the walk
  adapter passes fractional coordinates into its cut and status text

## Ports from BandageJS

- Spacing and component-separation controls: core's `engineSettingsOf` takes
  both, and `loadActions.ts` 57-67 passes neither
- Node thickness, Rerun layout, the node details panel and genes in the node
  hover. BandageJS `agent-docs/ideas/collections/share-with-bandage-core.md`
  lists what both apps could share through core
