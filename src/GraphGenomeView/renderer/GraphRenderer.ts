import { Canvas2DRenderer } from './Canvas2DRenderer'

// Canvas2D-first: return the Canvas2D backend directly, skipping the GPU-HAL
// probe in `createRenderingBackend`. A GPU backend (GpuRenderingBackendBase +
// createRenderingBackend with graph passes/shader) can slot in later without
// touching the model or component — both consume the `Renderer` interface.
export function createGraphRenderer(canvas: HTMLCanvasElement) {
  return Promise.resolve(new Canvas2DRenderer(canvas))
}
