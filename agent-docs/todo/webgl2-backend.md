---
name: webgl2-backend
description:
  Build bandage-core's WebGL2Renderer from the render lab's prototype and make
  it the graph view's and track's renderer, per ADR-047, so whole-graph views of
  15k to 50k nodes pan at vsync.
metadata:
  category: ready
  area: drawing
  first_move:
    "Copy bandage-core's scripts/render-lab/glPrototype.ts to
    src/renderer/WebGL2Renderer.ts implementing `Renderer`, and point the lab's
    'gl' painter at it."
  order: 4
---

# WebGL2 backend

ADR-047 records the decision and `reference/GPU_RENDERING.md` the measurements.
Work in bandage-core unless a step names the plugin or BandageJS.

## Steps

- **Start from the prototype.** `scripts/render-lab/glPrototype.ts` draws node
  segments as capsules and link cubics as ribbons. Move it to
  `src/renderer/WebGL2Renderer.ts` behind the `Renderer` interface in
  `src/renderer/types.ts`, and keep the lab's `gl` painter on it so every step
  is measured and diffed.
- **Add each mark `Canvas2DRenderer` draws**, diffing against it in the lab
  after each:
  - the faded layer: strokes off the lifted walks drawn opaque into a texture,
    composited once at `FADED_ALPHA`
  - paint order: skip, turn and along links over the nodes, longest skip first,
    lifted nodes over the rest, and node strokes placeholders first, widest
    first (`overNodesLongestFirst`, `paintRuns`, `widestFirst`)
  - `setNodeHighlights` and `setEdgeHighlight`, by rewriting the colours of the
    highlighted instances
  - arrowheads and their halos (`arrowheadOutline`, `LANE_HEAD_HALO_PX`)

  Skip links arrive already cut into dashes (`dashSpans` in `buildGeometry`), so
  they need no dash pattern in the shader.

- **Size and lifecycle.** `resize` against `MAX_CANVAS_DIM_PX` and the `fit`
  that `Canvas2DRenderer.resize` applies, `releaseOffscreenTargets`, `dispose`,
  and `webglcontextlost`.
- **Add lab scenes for the marks** a whole-graph view lacks: a lifted walk, a
  highlight, skip links and arrowheads, so the diff covers each.
- **Wire it.** The plugin's `createGraphRenderer`
  (`src/GraphGenomeView/renderer/GraphRenderer.ts`) and BandageJS's
  `src/view.ts` create a `WebGL2Renderer` where `getContext('webgl2')` succeeds
  and a `Canvas2DRenderer` otherwise. SVG export and `HoverLayer` stay on
  Canvas2D.
- **Pack typed arrays in `buildGeometry`** if the upload, 4 to 127 ms per
  rebuild, shows in a zoom.

## Done when

- The lab's six scenes pan at vsync on both GPUs through `WebGL2Renderer`, and
  each scene differs from Canvas2D only at anti-aliased edges.
- `shoot-figures.mjs` figures and the e2e suite pass with the new renderer.
- `GPU_RENDERING.md` is rewritten as the backend's reference, and
  `GRAPH_SCALE_AND_LOD.md`'s numbers for 15k nodes are measured again.
