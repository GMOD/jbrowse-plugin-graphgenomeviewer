---
name: legend-measure-during-hover
description:
  A lane-row hover re-fits a hosted pane on every hover, and a legend change
  during a node hover is never measured.
metadata:
  category: ready
  area: legend
  first_move:
    'Gate the legend ResizeObserver on an at-rest view and re-measure when the
    pane returns to rest.'
  order: 6
---

# The legend measures wrong around hovers

Two bugs in the legend `ResizeObserver` in `components/GraphCanvas.tsx`
(169-173), which skips a measurement only while `hoveredNode` is set:

- A lane-row hover lifts walks (`pane/graphViews.ts` 404-419), which adds
  walk-key rows (`legendSections.ts` 491); the new height changes `fitPadTop`,
  and under a host the reaction at `renderingActions.ts` 112-119 calls
  `zoomToFit`, so the drawing jumps on each lane hover and back on leave
- A size change dropped during a node hover, e.g. "Reading annotations" adding
  the gene section, is never measured again, so labels can sit under the legend
- Fix: an at-rest view that also needs `hoveredRowWalks.length === 0`, and a
  reaction that measures when it turns true
