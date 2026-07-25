import {
  abgrToCssRgba,
  brightenAbgr,
  normalizedRgbToCssRgba,
} from './colorBits'
import * as graphShader from './shaders/graph.generated'
import { SUB_BATCH_KEYS } from './types'

import type {
  EdgeCurveBatch,
  RenderBatch,
  Renderer,
  SubBatch,
  SubBatchKey,
  TransformUniform,
  VertexRange,
} from './types'

const STRIDE_F32 = graphShader.INSTANCE_STRIDE_F32
const POS_F32 = graphShader.FIELD_OFFSET_F32.position
const NORMAL_F32 = graphShader.FIELD_OFFSET_F32.normal
const THICKNESS_F32 = graphShader.FIELD_OFFSET_F32.thickness
const COLOR_F32 = graphShader.FIELD_OFFSET_F32.color

export class Canvas2DRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D
  private transform: TransformUniform | null = null
  private subBatches: Record<SubBatchKey, SubBatch | null> = {
    nodes: null,
    arrows: null,
  }
  // Edges are stroked as native beziers, one ctx.stroke() per edge, so they
  // stay crisp at any zoom and never enter a vertex buffer.
  private edgeCurves: EdgeCurveBatch[] = []
  private edgeCurveRanges = new Map<number, VertexRange>()
  private highlightedEdge: VertexRange | null = null
  private highlightFactor = 1

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D not supported')
    }
    this.ctx = ctx
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1
    this.ctx.canvas.width = width * dpr
    this.ctx.canvas.height = height * dpr
    this.ctx.canvas.style.width = `${width}px`
    this.ctx.canvas.style.height = `${height}px`
  }

  uploadGeometry(batch: RenderBatch) {
    for (const key of SUB_BATCH_KEYS) {
      this.subBatches[key] = batch[key].indices.length > 0 ? batch[key] : null
    }
    this.edgeCurves = batch.edgeCurves
    this.edgeCurveRanges = batch.edgeCurveRanges
    // A rebuild renumbers the strokes, so the old range no longer addresses the
    // same edge; the model re-applies the current hover against the new batch.
    this.highlightedEdge = null
  }

  setEdgeHighlight(edgeIndex: number | null, factor: number) {
    this.highlightedEdge =
      edgeIndex === null
        ? null
        : (this.edgeCurveRanges.get(edgeIndex) ?? null)
    this.highlightFactor = factor
  }

  updateSubBatchColors(
    target: SubBatchKey,
    colors: Uint32Array,
    vertexStart: number,
  ) {
    const batch = this.subBatches[target]
    if (!batch) {
      return
    }
    const dst = batch.vertexDataU32
    for (let i = 0, l = colors.length; i < l; i++) {
      dst[(vertexStart + i) * STRIDE_F32 + COLOR_F32] = colors[i]!
    }
  }

  updateTransform(transform: TransformUniform) {
    this.transform = transform
  }

  render(clearColor: [number, number, number, number]) {
    if (!this.transform) {
      return
    }
    const ctx = this.ctx
    const { width, height } = ctx.canvas

    ctx.fillStyle = normalizedRgbToCssRgba(
      [clearColor[0], clearColor[1], clearColor[2]],
      clearColor[3],
    )
    ctx.fillRect(0, 0, width, height)

    this.renderEdgeCurves()
    this.renderSubBatch(this.subBatches.nodes)
    this.renderSubBatch(this.subBatches.arrows)
  }

  // Project a world-space point through the current transform.
  private px(x: number, y: number): [number, number] {
    const t = this.transform!
    return [x * t.scaleX + t.translateX, y * t.scaleY + t.translateY]
  }

  private renderEdgeCurves() {
    if (!this.transform || this.edgeCurves.length === 0) {
      return
    }
    const ctx = this.ctx
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const hl = this.highlightedEdge
    let lastColor = -1
    for (let i = 0, edgesLen = this.edgeCurves.length; i < edgesLen; i++) {
      const e = this.edgeCurves[i]!
      const color =
        hl && i >= hl.start && i < hl.start + hl.count
          ? brightenAbgr(e.color, this.highlightFactor)
          : e.color
      if (color !== lastColor) {
        ctx.strokeStyle = abgrToCssRgba(color)
        lastColor = color
      }
      // thickness is the half-width in backing-store pixels (mesh path
      // expands by `normal * thickness` after `position * scaleX`, with no
      // extra dpr scaling). Stroke is the full width.
      ctx.lineWidth = e.thickness * 2
      ctx.beginPath()
      const first = e.curves[0]!
      const [sx, sy] = this.px(first.x0, first.y0)
      ctx.moveTo(sx, sy)
      for (let j = 0, l = e.curves.length; j < l; j++) {
        const c = e.curves[j]!
        const [cx0, cy0] = this.px(c.cx0, c.cy0)
        const [cx1, cy1] = this.px(c.cx1, c.cy1)
        const [x1, y1] = this.px(c.x1, c.y1)
        ctx.bezierCurveTo(cx0, cy0, cx1, cy1, x1, y1)
      }
      ctx.stroke()
    }
  }

  private renderSubBatch(batch: SubBatch | null) {
    if (!batch || !this.transform) {
      return
    }
    const ctx = this.ctx
    const t = this.transform
    const { vertexData, vertexDataU32, indices } = batch

    let lastColor = -1
    for (let i = 0, indicesLen = indices.length; i < indicesLen; i += 3) {
      const i0 = indices[i]!
      const i1 = indices[i + 1]!
      const i2 = indices[i + 2]!
      const b0 = i0 * STRIDE_F32
      const b1 = i1 * STRIDE_F32
      const b2 = i2 * STRIDE_F32

      const x0 =
        vertexData[b0 + POS_F32]! * t.scaleX +
        vertexData[b0 + NORMAL_F32]! * vertexData[b0 + THICKNESS_F32]! +
        t.translateX
      const y0 =
        vertexData[b0 + POS_F32 + 1]! * t.scaleY +
        vertexData[b0 + NORMAL_F32 + 1]! * vertexData[b0 + THICKNESS_F32]! +
        t.translateY
      const x1 =
        vertexData[b1 + POS_F32]! * t.scaleX +
        vertexData[b1 + NORMAL_F32]! * vertexData[b1 + THICKNESS_F32]! +
        t.translateX
      const y1 =
        vertexData[b1 + POS_F32 + 1]! * t.scaleY +
        vertexData[b1 + NORMAL_F32 + 1]! * vertexData[b1 + THICKNESS_F32]! +
        t.translateY
      const x2 =
        vertexData[b2 + POS_F32]! * t.scaleX +
        vertexData[b2 + NORMAL_F32]! * vertexData[b2 + THICKNESS_F32]! +
        t.translateX
      const y2 =
        vertexData[b2 + POS_F32 + 1]! * t.scaleY +
        vertexData[b2 + NORMAL_F32 + 1]! * vertexData[b2 + THICKNESS_F32]! +
        t.translateY

      const c = vertexDataU32[b0 + COLOR_F32]!
      if (c !== lastColor) {
        ctx.fillStyle = abgrToCssRgba(c)
        lastColor = c
      }
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.closePath()
      ctx.fill()
    }
  }

  dispose() {
    this.subBatches = { nodes: null, arrows: null }
    this.edgeCurves = []
    this.edgeCurveRanges = new Map()
    this.highlightedEdge = null
  }
}
