import { useEffect, useRef } from 'react'

import { ErrorBanner } from '@jbrowse/core/ui'
import { useRenderingBackend } from '@jbrowse/core/util'
import { LinearProgress, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import GraphToolbar from './GraphToolbar'
import { createGraphRenderer } from '../renderer/GraphRenderer'
import { findHoveredEdge, findHoveredNode } from '../util/hitDetection'

import type { GraphGenomeViewModel } from '../model'

const tooltipStyle = {
  position: 'absolute' as const,
  bottom: 8,
  left: 8,
  background: 'rgba(0,0,0,0.75)',
  color: 'white',
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: 12,
  pointerEvents: 'none' as const,
}

const loadingOverlayStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 10,
  background: 'rgba(255,255,255,0.8)',
  padding: 16,
  borderRadius: 8,
  minWidth: 200,
}

const progressStyle = { marginTop: 8 }

const wrapperStyle = { position: 'relative' as const }

const HoverTooltips = observer(function HoverTooltips({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const hoveredNodeData = model.hoveredNode
    ? model.nodeById?.get(model.hoveredNode)
    : null

  const hoveredEdgeData =
    model.hoveredEdge !== null && model.graph
      ? model.graph.edges[model.hoveredEdge]
      : null

  return (
    <>
      {hoveredNodeData ? (
        <div style={tooltipStyle}>
          <strong>{hoveredNodeData.name}</strong> — length:{' '}
          {hoveredNodeData.length.toLocaleString()}, depth:{' '}
          {hoveredNodeData.depth.toFixed(1)}
        </div>
      ) : null}
      {hoveredEdgeData ? (
        <div style={tooltipStyle}>
          Edge: {hoveredEdgeData.from} → {hoveredEdgeData.to}
        </div>
      ) : null}
    </>
  )
})

const GraphCanvas = observer(function GraphCanvas({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { canvasRef, canvas } = useRenderingBackend(createGraphRenderer, model)
  // Where the pointer was last, and whether it has travelled since mousedown —
  // per-gesture scratch that nothing renders from, which is what a ref is for.
  // Whether a drag is in progress is model state (`isPanning`/`draggingNode`),
  // because the cursor renders from it.
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)

  // wheel events need passive:false to call preventDefault — React registers
  // wheel listeners as passive, so we must add this imperatively
  useEffect(() => {
    if (canvas) {
      const c = canvas
      function handleWheel(e: WheelEvent) {
        e.preventDefault()
        const rect = c.getBoundingClientRect()
        model.zoom(
          e.deltaY < 0 ? 1.1 : 1 / 1.1,
          e.clientX - rect.left,
          e.clientY - rect.top,
        )
      }
      c.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        c.removeEventListener('wheel', handleWheel)
      }
    }
    return undefined
  }, [canvas, model])

  function screenToGraph(screenX: number, screenY: number) {
    return {
      x: (screenX - model.translateX) / model.scale,
      y: (screenY - model.translateY) / model.scale,
    }
  }

  function getMouseCoord(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
    return screenToGraph(e.clientX - rect.left, e.clientY - rect.top)
  }

  // The node at a graph coordinate, which mousedown, mousemove and click all
  // need. Takes the coordinate rather than the event so a caller that already
  // has one does not pay for a second getBoundingClientRect.
  function nodeAt(x: number, y: number) {
    const { nodePositions } = model
    return nodePositions
      ? findHoveredNode(nodePositions, x, y, model.scale, model.viewportDirty)
      : null
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 0) {
      hasMovedRef.current = false
      const { x, y } = getMouseCoord(e)
      const node = nodeAt(x, y)
      if (node) {
        model.setDraggingNode(node)
      } else {
        model.setPanning(true)
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const dx = e.clientX - lastMouseRef.current.x
    const dy = e.clientY - lastMouseRef.current.y
    lastMouseRef.current = { x: e.clientX, y: e.clientY }

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      hasMovedRef.current = true
    }

    if (model.draggingNode) {
      model.moveNode(model.draggingNode, dx / model.scale, dy / model.scale)
    } else if (model.isPanning) {
      model.setTransform(
        model.scale,
        model.translateX + dx,
        model.translateY + dy,
      )
    } else if (model.nodePositions && model.graph) {
      const { x, y } = getMouseCoord(e)
      const node = nodeAt(x, y)
      model.setHoveredNode(node)
      model.setHoveredEdge(
        node
          ? null
          : findHoveredEdge(
              model.nodePositions,
              model.graph,
              x,
              y,
              model.scale,
              model.drawPaths,
              model.viewportDirty,
            ),
      )
    }
  }

  function handleMouseUp() {
    model.stopDragging()
  }

  function handleMouseLeave() {
    model.stopDragging()
    model.setHoveredNode(null)
    model.setHoveredEdge(null)
  }

  function handleClick(e: React.MouseEvent) {
    // a click that ended a drag selects nothing
    if (!hasMovedRef.current) {
      const { x, y } = getMouseCoord(e)
      const node = nodeAt(x, y)
      model.setSelectedNode(node)
      if (node) {
        model.showNodeDetails(node)
      }
    }
  }

  return (
    <div style={wrapperStyle}>
      <GraphToolbar model={model} />

      {model.isLoading ? (
        <div style={loadingOverlayStyle}>
          <Typography>{model.statusMessage || 'Loading...'}</Typography>
          <LinearProgress variant="indeterminate" style={progressStyle} />
        </div>
      ) : null}

      <canvas
        ref={canvasRef}
        data-testid="graph-genome-canvas"
        style={{
          width: model.width,
          height: model.canvasHeight,
          cursor: model.isPanning || model.draggingNode ? 'grabbing' : 'grab',
          display: 'block',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      <HoverTooltips model={model} />

      {model.error ? <ErrorBanner error={model.error} /> : null}
    </div>
  )
})

export default GraphCanvas
