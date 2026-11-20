---
name: gpu-rendering
description:
  Measurements behind ADR-047's WebGL2 backend for the graph view. Canvas2D
  draws whole-graph views of 15k nodes at 10 to 26 frames a second on screen,
  because Chrome tessellates every visible stroke again each frame, and an
  instanced WebGL2 prototype of the same batch holds vsync up to 50k nodes. Read
  this before tuning Canvas2D further or starting the backend.
---

# GPU rendering: build a WebGL2 backend

`createGraphRenderer` returns bandage-core's `Canvas2DRenderer` unconditionally.
Measured on screen, a WebGL2 painter of the same `RenderBatch` draws every frame
of a pan inside the vsync interval on graphs up to 50k nodes, where Canvas2D
misses one to seventeen vsyncs a frame from 15k nodes up. ADR-047 decides to
build the backend, with Canvas2D kept for SVG export and as the fallback;
`todo/webgl2-backend.md` holds the work, and this page the measurements.

**Drawing and layout are separate questions.** Running FMMM itself on the GPU
has the opposite answer, measured and recorded in
`ideas/waiting-on-a-number/fmmm-near-field-repulsion.md` and
`reference/GRAPH_SCALE_AND_LOD.md`: near-field repulsion is 54% of a real
layout, so a perfect port ceilings at ~2.3x and never reaches interactive.

## Canvas2D against the WebGL2 prototype, on screen

Frames a second during a one-pixel-per-frame pan of a whole-graph view, 1280×800
at a device pixel ratio of 1, Chrome 158 in a headed window with vsync on.
bandage-core's `scripts/render-lab` reproduces every row (`scenes.mjs` writes
the scenes, `drive.mjs` paints them).

| scene                                      | nodes  | Canvas2D, Intel UHD 630 | WebGL2, Intel | Canvas2D, AMD WX 3200 | WebGL2, AMD | WebGL2 upload, ms |
| ------------------------------------------ | ------ | ----------------------- | ------------- | --------------------- | ----------- | ----------------- |
| `renderPasses.bench.ts` bubble chain, rows | 1,499  | at vsync                | at vsync      | at vsync              | at vsync    | 4 to 5            |
| the same chain                             | 14,999 | 9.8                     | at vsync      | 14.6                  | at vsync    | 14 to 23          |
| KIV-2 figure graph, FMMM                   | 14,645 | 18.2                    | at vsync      | 26.5                  | at vsync    | 8 to 9            |
| `rhd.syng.gfa.gz` from ggbandage, FMMM     | 14,355 | 9.5                     | at vsync      | 21.3                  | at vsync    | 10 to 14          |
| synthetic assembly graph, FMMM             | 15,000 | 10.7                    | at vsync      | 11.4                  | at vsync    | 25 to 26          |
| synthetic assembly graph, FMMM             | 50,000 | 3.9                     | at vsync      | 3.3                   | 53.5        | 72 to 127         |

- **At vsync** means no frame missed a vsync interval. The monitor ran at 60 and
  48 Hz in different runs; the AMD card needs `--use-angle=vulkan`.
- **The two painters draw the same picture.** The prototype differs from
  Canvas2D on 1 to 10% of pixels, at anti-aliased edges and where overlapping
  strokes are drawn in a different order.
- **Upload** is the time to pack the batch into buffers and send it, once per
  geometry rebuild. A pan inside the built window repaints without a rebuild, so
  it sets two uniforms and draws.

## Why Canvas2D is slow here

- **Chrome's GPU process tessellates every stroke again each frame.** A headed
  trace of the 14,999-node chain on Intel shows 117 ms per frame on the GPU
  process's main thread, 54 ms in Skia's `TriangulatingPathOp` and 52 ms in
  `internalDrawPath`, against 19 ms on the page's main thread.
- **The time follows the subpaths in view.** Thinning every stroke of the
  14,999-node chain to a tenth of its width takes its headless frame from 111 to
  81 ms, so the time is per subpath, not per pixel covered. Subpaths off the
  pane take almost nothing: at the bench's own axis scale, where most of the
  chain lies off a 900×600 pane, a frame takes 28 ms headless.
- **A whole-graph view is mostly dots.** On `rhd`, 12,727 of 12,838 node strokes
  are under 1 px long and every link is under 1 px. The level-of-detail fold
  removes 3 to 11% of nodes at these zooms, because it folds small variant sites
  and leaves small nodes.
- **The 10.8 ms frame that `GRAPH_SCALE_AND_LOD.md` once recorded for this chain
  was not a whole-graph view.** The September renderer, run from commit
  `c14f18b` on today's batch, takes 260 to 1,150 ms a frame headless with the
  whole chain in view, and 51 ms at the bench's axis scale.

## Canvas2D changes tried

In bandage-core, on a raster canvas, with SVG export unchanged:

- **Kept: stroke widths stepped to 1/8 px of half-width**, so nodes widened by
  depth share a few dozen paths. On Intel a 15k-node graph of distinct depths
  went from 6.9 to 9.7 frames a second and a 50k-node one from 1.7 to 3.2.
- **Kept: a paint group stroked every 1,024 subpaths, and subpaths under 1/4 px
  drawn once per 1/8 px cell.** On Intel, `kiv2_walks` went from 80 to 50 ms a
  frame, `rhd` from 112 to 96 and 50k nodes from 301 to 240.
- **Left out because the drawing changes**: butt caps (40 to 60% faster, and a
  node shorter than a pixel loses its dot) and skipping strokes under 1/4 px (50
  to 80% faster, and isolated dots and link marks disappear).
- **No gain**: `alpha: false`, `desynchronized`, `willReadFrequently`,
  `clearRect` for the background, bevel joins, curves flattened to lines, and
  retained `Path2D` objects, which Chrome tessellates again every frame.

## The prototype, and what the backend leaves as it is

`scripts/render-lab/glPrototype.ts` in bandage-core draws a node segment as a
capsule and a link cubic as a ribbon tessellated in the vertex shader, one
instance each, in raw WebGL2 with GLSL in strings. It needs neither
`@jbrowse/render-core` nor the `.slang` codegen, which the host does not
re-export. `todo/webgl2-backend.md` lists the marks and lifecycle the backend
has to add to it.

Things the backend leaves as they are:

- **A zoom's rebuild.** `buildGeometry` takes ~60 ms for 15k nodes on the main
  thread, and the upload adds 4 to 127 ms. Packing typed arrays inside
  `buildGeometry` would remove most of the upload.
- **Labels and hover.** `graphLabels` runs per mousemove, and hover is drawn on
  a separate Canvas2D layer (`HoverLayer`).
- **The tube map.** Measured headless with NA12879's full 51k-read GAF on the
  cactus graph, cut to `ref:10,000-30,000` (4,551 reads after sampling, 1,979
  mismatch marks) on a 1388×1200 pane, a pan frame is 2.3 ms of script and ~10
  ms once a 1 px readback forces the raster, at 781 reads as well as at 4,551.

A row layout has `scaleY = 1` and `scaleX ≈ 1e-2`, so a half-width expanded as
`normal * thickness / scale.x` stretches a hundredfold; divide componentwise.
