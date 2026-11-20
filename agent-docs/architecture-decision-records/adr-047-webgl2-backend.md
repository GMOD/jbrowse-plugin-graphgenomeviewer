---
status: Accepted
summary:
  'The graph view and track draw with an instanced WebGL2 backend in
  bandage-core, with Canvas2D kept for SVG export and as the fallback, because
  Canvas2D misses vsync on whole-graph views from 15k nodes up'
---

# ADR-047: Draw the graph with WebGL2

## Status

Accepted (2026-11-20). Not yet built: `todo/webgl2-backend.md` holds the work.
Replaces the ruling, recorded until then in `reference/GPU_RENDERING.md`, that a
GPU backend was not worth building below ~50k nodes.

## Context

`createGraphRenderer` returns bandage-core's `Canvas2DRenderer`. On screen, with
the whole graph in view, it draws 15k-node graphs at 10 to 26 frames a second
and a 50k-node graph at 3 to 4, on both GPUs of the development machine. Chrome
tessellates every visible stroke again on every frame, so the time follows the
number of subpaths in view, and a pan repaints all of them.

The Canvas2D changes that keep the drawing as it is have been made or measured
without gain (`reference/GPU_RENDERING.md`, "Canvas2D changes tried"). An
instanced WebGL2 painter of the same `RenderBatch`
(`scripts/render-lab/glPrototype.ts` in bandage-core) draws every frame of those
pans inside the vsync interval, and its pixels differ from Canvas2D's only at
anti-aliased edges and in the order of overlapping strokes.

## Decision

- bandage-core gains a `WebGL2Renderer` implementing the `Renderer` interface on
  the same `RenderBatch`: a capsule instance per node segment and a ribbon
  instance per link cubic, in raw WebGL2 with GLSL source in the module.
- The plugin's `createGraphRenderer` and BandageJS return it where a WebGL2
  context is available, and `Canvas2DRenderer` where it is not or the context is
  lost.
- `Canvas2DRenderer` stays for SVG export and figures, and `HoverLayer` stays on
  Canvas2D.
- The backend ships when every mark `Canvas2DRenderer` draws is drawn, and the
  figure scenes differ from Canvas2D only at anti-aliased edges.

## Alternatives declined

- **Further Canvas2D tuning.** What remains is butt caps and skipping strokes
  under 1/4 px, 40 to 80% faster, and both change the drawing: a node shorter
  than a pixel loses its dot, and isolated dots and link marks disappear.
- **Repainting only when a gesture ends** and moving a cached bitmap during it.
  A pan shows a blank margin and a zoom shows blur, and the WebGL2 painter
  repaints at vsync with neither.
- **`@jbrowse/render-core`'s HAL and the `.slang` shader codegen.** The host
  does not re-export render-core, so the HAL would be bundled (about 30 KB on a
  55 KB entry), and the prototype needs neither.
- **Waiting for graphs above 50k nodes.** Views of 15k nodes already miss vsync.

## Consequences

- Two painters must draw the same picture; bandage-core's render lab diffs them
  on six scenes, and its scenes are where a parity regression shows first.
- Each geometry rebuild uploads the batch, which takes 4 to 127 ms on top of
  `buildGeometry`. A pan inside the built window does not rebuild.
- Each graph pane and graph track holds a WebGL context. Chrome loses the oldest
  context past its per-page limit, so the backend must handle `webglcontextlost`
  by falling back or restoring.
