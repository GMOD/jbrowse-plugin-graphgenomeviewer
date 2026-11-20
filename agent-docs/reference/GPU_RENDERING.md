---
name: gpu-rendering
description:
  Canvas2D paints a 15k-node graph at 7 to 14 frames a second on screen, because
  Chrome triangulates every stroke again each frame, and no Canvas2D change
  tried removes that. A GPU backend is the fix and has not been priced. Read
  this before tuning Canvas2D further or reviving a triangle mesh.
---

# GPU rendering: Canvas2D is frame-bound at 15k nodes, and a GPU backend is unpriced

Replace `Canvas2DRenderer` with a GPU backend. The view has never plotted with
the GPU; `createGraphRenderer` returns the Canvas2D backend unconditionally.

**Drawing and layout are separate questions.** Running FMMM itself on the GPU
has the opposite answer, measured and recorded in
`ideas/waiting-on-a-number/fmmm-near-field-repulsion.md` and
`reference/GRAPH_SCALE_AND_LOD.md`: near-field repulsion is 54% of a real
layout, so a perfect port ceilings at ~2.3x and never reaches interactive.

## A frame at 15k nodes takes 70 to 140 ms on screen

Measured on bandage-core `b7ffbc7` (14.1.0 plus the sub-path changes below) in
Chrome 158, a 1280×800 canvas at a device pixel ratio of 1, whole graph in view,
ms per frame:

| scene                                                        | headless, CPU canvas | headless, default | on screen, Intel UHD 630 | on screen, AMD WX 3200 |
| ------------------------------------------------------------ | -------------------- | ----------------- | ------------------------ | ---------------------- |
| `renderPasses.bench.ts` fixture, 14,999 nodes, anchored rows | 95                   | 90                | 139                      | 71                     |
| the same fixture at 1,499 nodes                              | 16                   | 15                | 21, capped by vsync      | 18                     |
| synthetic assembly graph, 15k nodes, FMMM layout             | 102                  | 108               | 117                      | 96                     |
| `rhd.syng.gfa.gz` from ggbandage, 14,355 nodes, FMMM layout  | 50                   | 58                | 128                      | 51                     |

- **Headless columns**: the median of 20 frames, each a full paint and a 1 px
  readback, the method `reference/GRAPH_SCALE_AND_LOD.md` used. The machine's
  load average was about 16 during these runs.
- **On-screen columns**: a headed window with vsync on a 48 Hz monitor. The AMD
  card needs `--use-angle=vulkan`. Frame times on screen differ between
  sessions: `rhd` on Intel read 96 ms in one and 128 ms in another.
- **The 10.8 ms that GRAPH_SCALE_AND_LOD.md records for the 14,999-node
  fixture** (2026-09-16, headless, 900×600) is not reproduced by either method.
  The cause of the difference was not found.
- **Headless timing of the GPU canvas reads low.** A trace of `rhd` showed 5 ms
  of GPU-process work per frame headless and 115 ms on screen, so on-screen
  numbers are the ones to compare.

## Where a frame's time goes

- **Chrome's GPU process, on its CPU.** A headed trace of the 14,999-node
  fixture on Intel shows 117 ms per frame on the GPU process's main thread, 54
  ms in Skia's `TriangulatingPathOp` and 52 ms in `internalDrawPath`, against 19
  ms on the page's main thread. Skia turns every stroked sub-path into triangles
  again on every frame.
- **A whole-graph view is mostly dots.** On `rhd`, 12,727 of 12,838 node strokes
  are under 1 px long and every link is under 1 px. Each one is a round cap for
  Skia to tessellate. The level-of-detail fold removes 3 to 11% of nodes at
  these zooms, because it folds small variant sites and leaves small nodes.
- **A pan pays the whole frame again.** A pan inside the built window repaints
  strokes and rebuilds no geometry (`reference/GRAPH_SCALE_AND_LOD.md`), so the
  frame times above are pan frame times.

## Canvas2D changes tried

In bandage-core, on a raster canvas only, with SVG export unchanged:

- **Stroke widths stepped to 1/8 px of half-width**, so nodes widened by depth
  share a few dozen paths. On screen on Intel a 15k-node graph of distinct
  depths went from 6.9 to 9.7 frames a second and a 50k-node one from 1.7 to
  3.2.
- **A paint group stroked every 1,024 sub-paths, and sub-paths under 1/4 px
  drawn once per 1/8 px cell.** On screen on Intel: `kiv2_walks` 80 to 50 ms,
  `rhd` 112 to 96 ms, 15k nodes 108 to 92 ms, 50k nodes 301 to 240 ms.

Measured and left out because the drawing changes visibly:

- **Butt caps** are 40 to 60% faster, and a node shorter than a pixel loses its
  dot.
- **Skipping strokes under 1/4 px** is 50 to 80% faster, and isolated dots and
  link marks disappear.

Measured with no gain: `alpha: false`, `desynchronized`, `willReadFrequently`
(which forces the CPU canvas), `clearRect` for the background, bevel joins, and
curves flattened to lines (5% at most).

**Retained `Path2D` objects do not help.** Chrome tessellates a `Path2D` again
on every frame, so the same objects stroked under `setTransform` take the GPU
process 85 ms on the first frame of a 15k-node graph and 82 to 84 ms on the next
five with the transform unchanged, and 92 then 93 to 113 ms during a pan. The
saving is the page's path-building code, 10 to 60 ms a frame down to 0.3 ms.

After these changes a whole-graph view on screen on Intel runs at about 4 frames
a second at 50k nodes, 11 at 15k, 10 on `rhd` and 20 on `kiv2_walks`.

## What a GPU backend would and would not fix

- **A GPU backend shortens the pan frame.** The backend uploads geometry once
  and sets a transform per frame, where Canvas2D tessellates every stroke again.
- **A zoom's rebuild stays as long.** `buildGeometry` takes ~60 ms for 15k nodes
  on the main thread and `graphLabels` runs per mousemove, and a drawing backend
  runs neither.
- **A GPU backend is not priced.** No GPU prototype has been measured. The
  measurement that decides whether to build one is the same batch drawn with
  instanced WebGL2, on the scenes above, on screen.
- **One Canvas2D option is untried**: keep the last painted frame as a bitmap,
  draw it translated and scaled during a pan or zoom gesture, and repaint when
  the view settles. It changes what is on screen during a gesture, a blank
  margin on a pan and blur on a zoom.

## The tube map

The tube map with reads was measured headless and has not been measured on
screen. The cactus graph with NA12879's full 51k-read GAF, cut to
`ref:10,000-30,000` (4,551 reads after sampling, 1,979 mismatch marks) on a
1388×1200 pane in headless Chrome: a pan frame is 2.3 ms of script and ~10 ms
once a 1 px readback forces the raster. It was ~10 ms at 781 reads as well.
Hover is drawn on a separate canvas (`HoverLayer`) and takes 0.2 ms; repainting
the whole tube map for it took 1.7 ms of script plus that raster.

## What a backend would take

The host does not re-export `@jbrowse/render-core` (ADR-030 in
jbrowse-components keeps the GPU surface static-import-only), so the HAL ladder
would be bundled: about 30 KB minified on a 55 KB entry. And a `.slang` source
plus the `@jbrowse/shader-tools` codegen, which does support an out-of-tree
plugin through `--root` and the shared modules render-core ships in
`src/shaders`.

Take the batch as it is, `nodeStrokes`, `edgeCurves` and `arrows` in layout
units with css-px weights, and draw it as instances, not as a revived mesh: a
capsule per node segment on render-core's `capsule.slang`, and a bezier ribbon
per edge stroke tessellated in the vertex shader the way
`syntenyFillCurve.slang` does. Both backends then consume the same arrays and
the Canvas2D twin is the renderer that exists. A row layout has `scaleY = 1` and
`scaleX ≈ 1e-2`, so a half-width expanded as `normal * thickness / scale.x`
stretches a hundredfold; divide componentwise. The triangle mesh built for an
earlier GPU backend that was never wired drew at 414 ms a frame on Canvas2D
(`reference/GRAPH_SCALE_AND_LOD.md`).
