---
name: loose-ends
description:
  Small cleanups and checks, including render errors through core DisplayChrome,
  model caches as computeds, the GBZ anchor's alias check, an unchecked SVG
  export, and a unit test that fails under load.
---

# Loose ends

- LinearGraphDisplay shows render errors through GraphCanvas's own banner;
  moving to core's `DisplayChrome` would give it core's renderError phase
- Model caches (hitDetection, edgeCurves, graphLabels, GeometryBuilder,
  forceLayouts) are WeakMaps that could be observed computeds; force and ordered
  could cut with margins and re-cut only when the window leaves the cut
- `GbzBaseSyntenyAdapter` compares a region's assembly with its anchor by plain
  `===`/`!==` in `getRefNames`, `getSubgraph` and `getFeatures`, so a region
  named by an alias of the anchor fails those checks. The track display and the
  view canonicalize both names in `offReference`
  (`src/GraphGenomeView/model.ts`) through `canonicalAssemblyName`; the GBZ
  adapter needs the same, though the route is deprecated.
- Nobody has looked at an SVG export since `PaneSvg`'s raster and vector paths
  merged and the dark-paper branches went. Only the unit test covers it. Export
  the same figure from a 7.1.1 build and from main and compare.
- One full `pnpm test` failed a single test while four other suites ran on the
  same machine, then passed on rerun, and another run under the same load did
  the same. Neither run recorded the test's name. Run the suite under CPU load
  to name it, then check whether it sits near the 15 s `testTimeout`.
