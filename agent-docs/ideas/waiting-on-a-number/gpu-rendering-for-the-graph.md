---
name: gpu-rendering-for-the-graph
description:
  GPU drawing for the graph view is priced and not worth it below ~50k nodes;
  the trigger is a geometry builder off the main thread, so read this before
  reviving a triangle mesh.
---

# GPU rendering: priced, and not worth it at this view's node cap

Replace `Canvas2DRenderer` with a GPU backend. The view has never plotted with
the GPU; `createGraphRenderer` returns the Canvas2D backend unconditionally.

**This is about drawing, not laying out.** Running FMMM itself on the GPU is a
separate question with the opposite answer, measured and recorded in
`ideas/waiting-on-a-number/fmmm-near-field-repulsion.md` and
`reference/GRAPH_SCALE_AND_LOD.md`: near-field repulsion is 54% of a real
layout, so a perfect port ceilings at ~2.3x and never reaches interactive. The
two share the word "GPU" and nothing else, and both have been asked.

**The measurement that used to justify it is gone** (GRAPH_SCALE_AND_LOD.md,
"Strokes, batched by paint"). The case rested on 12.6 draw calls per node from a
triangle mesh built for a GPU backend that was never wired. Stroking nodes as
polylines batched by paint draws a 15k-node anchored layout in 11 ms a frame on
a software rasterizer, against 414 ms for the mesh, and that is inside a frame
budget at `maxGraphNodes`. What is left on the main thread — `buildGeometry` at
~60 ms for 15k nodes, `graphLabels` per mousemove — a GPU backend does not
touch.

**The tube map with reads is inside budget too.** The cactus graph with
NA12879's full 51k-read GAF, cut to `ref:10,000-30,000` (4,551 reads after
sampling, 1,979 mismatch marks) on a 1388×1200 pane in headless Chrome: a pan
frame is 2.3 ms of script and ~10 ms once a 1 px readback forces the raster. It
was ~10 ms at 781 reads as well, so the frame is the canvas's fixed cost, not
the read count, and a GPU would not shorten it. Hover lives on its own canvas
(`HoverLayer`) and costs 0.2 ms; repainting the whole tube map for it cost 1.7
ms of script plus that raster.

**What it would cost.** The host does not re-export `@jbrowse/render-core`
(ADR-030 in jbrowse-components keeps the GPU surface static-import-only), so the
HAL ladder would be bundled: about 30 KB minified on a 55 KB entry. And a
`.slang` source plus the `@jbrowse/shader-tools` codegen, which does support an
out-of-tree plugin through `--root` and the shared modules render-core ships in
`src/shaders`.

**If it is ever built,** take the batch as it is — `nodeStrokes`, `edgeCurves`,
`arrows` in layout units with css-px weights — and draw it as instances, not as
a revived mesh: a capsule per node segment on render-core's `capsule.slang`, and
a bezier ribbon per edge stroke tessellated in the vertex shader the way
`syntenyFillCurve.slang` does. Both backends then consume the same arrays and
the Canvas2D twin is the renderer that exists. The one shader bug the old
attempt carried is worth remembering: a row layout has `scaleY = 1` and
`scaleX ≈ 1e-2`, so a half-width expanded as `normal * thickness / scale.x`
stretches a hundredfold; divide componentwise.

**The trigger** is a real workload drawn above ~50k nodes, where the frame is
geometry-bound anyway — so the honest framing is that the trigger is a geometry
builder off the main thread, and the GPU comes after it if at all.
