---
name: loose-ends
description:
  Small cleanups: render errors through core DisplayChrome, and model caches as
  computeds.
---

# Loose ends

- LinearGraphDisplay shows render errors through GraphCanvas's own banner;
  moving to core's `DisplayChrome` would give it core's renderError phase
- Model caches (hitDetection, edgeCurves, graphLabels, GeometryBuilder,
  forceLayouts) are WeakMaps that could be observed computeds; force and ordered
  could cut with margins and re-cut only when the window leaves the cut
