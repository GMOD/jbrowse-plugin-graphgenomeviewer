import { Canvas2DRenderer } from './Canvas2DRenderer'

// Canvas2D-first: return the Canvas2D backend directly, skipping the GPU-HAL
// probe in `createRenderingBackend`. A GPU backend (GpuRenderingBackendBase +
// createRenderingBackend with graph passes/shader) can slot in later without
// touching the model or component — both consume the `Renderer` interface.
//
// **One thing to fix when it does.** `TransformUniform` now carries two
// different scales: a row layout draws y in screen px and x in reference bp, so
// scaleY is 1 while scaleX is ~1e-2 (see the model's scaleX/scaleY).
// Canvas2DRenderer handles that — it expands `normal * thickness` in screen
// space, after the transform — but `graph.slang`, which the committed
// `shaders/graph.generated.ts` was compiled from, writes
// `(position + normal * thickness / scale.x) * scale`, which only cancels when
// the two scales are equal. On a row layout it would stretch every stroke's
// half-width by scaleY/scaleX, i.e. by about a hundred. The fix is `/ scale`
// rather than `/ scale.x` — the componentwise division cancels either way — and
// it has to happen in the `.slang`, which lives in neither repo today: only the
// generated module's vertex LAYOUT constants are in use, and its WGSL/GLSL is
// dead code until this function returns something that runs it.
export function createGraphRenderer(canvas: HTMLCanvasElement) {
  return Promise.resolve(new Canvas2DRenderer(canvas))
}
