import type { BezierCurve } from '../util/geometry'

export type SubBatchKey = 'nodes' | 'arrows'
export const SUB_BATCH_KEYS: readonly SubBatchKey[] = ['nodes', 'arrows']

// Edges are carried as bezier control points, not as a triangle mesh: the
// renderer strokes them natively, one path per edge. A tessellated `edges`
// sub-batch was built alongside these until it was found to be dead — nothing
// ever drew it, and it cost half of every geometry build and more buffer memory
// than the node mesh. A GPU backend can tessellate from these curves at upload
// time instead.
export interface EdgeCurveBatch {
  curves: BezierCurve[]
  thickness: number
  color: number
}

// Interleaved per-vertex buffer laid out to match graph.generated.ts
// (stride = INSTANCE_STRIDE_BYTES, fields at FIELD_OFFSET_*). `vertexData`
// and `vertexDataU32` alias the same ArrayBuffer — the float view covers
// position / normal / thickness, the u32 view reads the packed ABGR colour
// slot. `colors` is an independent dense snapshot (1 u32 / vertex) kept so
// hover / select utilities can restore originals without deinterleaving.
export interface SubBatch {
  vertexData: Float32Array
  vertexDataU32: Uint32Array
  colors: Uint32Array
  indices: Uint32Array
  vertexCount: number
}

export interface VertexRange {
  start: number
  count: number
}

export type RenderBatch = Record<SubBatchKey, SubBatch> & {
  nodeVertexRanges: Map<string, VertexRange>
  arrowVertexRanges: Map<number, VertexRange>
  // One stroke per edge, or one per path crossing it when drawPaths is on.
  edgeCurves: EdgeCurveBatch[]
  // Graph edge index -> its run of `edgeCurves` entries, so a renderer can find
  // the strokes belonging to one edge without re-deriving the path fan-out.
  edgeCurveRanges: Map<number, VertexRange>
}

export interface TransformUniform {
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
  viewportWidth: number
  viewportHeight: number
  // Backing-store pixels per css pixel, from render-core's `getDpr()`. Every
  // other field here is already multiplied by it, because a position goes
  // through the transform; a THICKNESS does not — the mesh expands
  // `normal * thickness` AFTER the transform (Canvas2DRenderer.renderSubBatch,
  // and graph.slang's `normal * thickness / scale`) — so the renderer has to
  // apply the ratio to that half of the expansion itself. render-core's own
  // marks carry the same quantity as a `devicePixelRatio` shader uniform, for
  // the same reason.
  //
  // Required rather than defaulted, for the reason AxisScale is one object: a
  // caller that omits it draws a picture that is right on one class of display
  // and wrong on the other, and reports nothing either way. Every screen-metric
  // constant in the geometry builder is quoted in css px — the dash period, the
  // path-stripe floor, the arrowhead, both thicknesses — and only the dash
  // period survived a 2x display, because it is the one of them that reaches
  // the drawing through a position rather than through a thickness.
  dpr: number
}

export interface Renderer {
  resize(width: number, height: number): void
  uploadGeometry(batch: RenderBatch): void
  updateSubBatchColors(
    target: SubBatchKey,
    colors: Uint32Array,
    vertexStart: number,
  ): void
  // Edges have no vertex buffer to recolor, so highlighting one is a draw-time
  // override of its strokes' colors rather than an updateSubBatchColors write.
  // null clears it; the override is absolute, so no restore pass is needed.
  setEdgeHighlight(edgeIndex: number | null, factor: number): void
  updateTransform(transform: TransformUniform): void
  render(clearColor: [number, number, number, number]): void
  dispose(): void
}
