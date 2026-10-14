---
name: stop-load-blank-track
description:
  Stop pressed after a recut swapped in its graph but before the layout landed
  leaves a graph with no layout, and showLoading never clears.
metadata:
  category: ready
  area: loading
  first_move:
    'In stopLoad, call resetCut() when the graph on screen has no layout.'
  order: 7
---

# Stopping a recut can leave a blank track with an endless spinner

- `stopLoad` (`pane/loadActions.ts` 691-697) calls `dropLayoutOfReplacedGraph`,
  which clears `layoutResult` for the new graph
- `showLoading` (`pane/graphViews.ts` 317-323) stays true while
  `graph !== undefined && !geometryPainted`, so the AppReadyMarker never fires
- Alternative: let the in-flight layout finish once its graph is swapped in
