---
name: svg-export-open-bubble
description:
  The canvas greys everything outside an open bubble, but the SVG export draws
  it in full colour while its reference strip is greyed.
metadata:
  category: ready
  area: export
  first_move:
    'Add one drawnHighlight view (walkLift ?? openBubbleFocus) and use it in
    PaneSvg and the canvas.'
  order: 5
---

# The SVG export leaves out an open bubble's greying

- `components/PaneSvg.tsx` 545 passes `lift={model.walkLift}`; the canvas draws
  `walkLift ?? openBubbleFocus` (`pane/renderingActions.ts` 255), as GenePins
  and hostViews do
- Pairs with the unchecked SVG export in
  [loose-ends](../ideas/collections/loose-ends.md)
