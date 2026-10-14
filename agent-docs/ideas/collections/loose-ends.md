---
name: loose-ends
description:
  Small cleanups and checks, including render errors through core DisplayChrome,
  model caches as computeds, the SVG export's unchecked raster path, and a unit
  test that fails under load.
---

# Loose ends

- LinearGraphDisplay shows render errors through GraphCanvas's own banner;
  moving to core's `DisplayChrome` would give it core's renderError phase
- Model caches (hitDetection, edgeCurves, graphLabels, GeometryBuilder,
  forceLayouts) are WeakMaps that could be observed computeds; force and ordered
  could cut with margins and re-cut only when the window leaves the cut
- `PaneSvg`'s vector export, rendered from a hosted pane through `rsvg-convert`,
  draws the nodes, a lifted walk, an open bubble's greying, the tube map and the
  legend as the screen does. Nobody has looked at its raster path
  (`rasterizeLayers`), which jsdom cannot draw, or compared either with a 7.1.1
  build's export.
- One full `pnpm test` failed a single test while four other suites ran on the
  same machine, then passed on rerun, and another run under the same load did
  the same. Neither run recorded the test's name. Run the suite under CPU load
  to name it, then check whether it sits near the 15 s `testTimeout`.
