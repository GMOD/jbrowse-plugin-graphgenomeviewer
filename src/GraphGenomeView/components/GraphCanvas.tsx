import { useEffect, useRef, useState } from 'react'

import { ErrorBanner, Menu } from '@jbrowse/core/ui'
import { useRenderingBackend } from '@jbrowse/render-core'
import InfoIcon from '@mui/icons-material/Info'
import { LinearProgress, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import GraphToolbar from './GraphToolbar'
import { locLabel, nodeOwnLocation } from '../../launchFromGraph/contributors'
import { nodeLaunchMenuItems } from '../../launchFromGraph/graphMenuItems'
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

// The overlay origin has to be the canvas, not the wrapper: the wrapper also
// holds the toolbar, so anything positioned against it is offset by the
// toolbar's height, and a row label lands a whole row off the row it names.
const canvasAreaStyle = { position: 'relative' as const, lineHeight: 0 }

const rowLabelStyle = {
  position: 'absolute' as const,
  left: 6,
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.82)',
  padding: '0 4px',
  borderRadius: 3,
  fontSize: 11,
  // explicit, because the canvas container zeroes line-height to kill the
  // inline-block gap under the canvas. Inherited, that collapses the label to a
  // zero-height box: it still paints, but it has no layout, so anything asking
  // whether it is visible (a screenshot spec's waitForVisible, a11y tooling)
  // is told no.
  lineHeight: '16px',
  whiteSpace: 'nowrap' as const,
  pointerEvents: 'none' as const,
  zIndex: 4,
}

// Names the rows of a row-structured layout (anchored, sample rows). Without
// them the layout draws real structure that cannot be read: a stack of bars
// where every row means something and nothing says what.
//
// Positioned from the layout's own `rowLabels` through the same transform the
// canvas draws with, so a label tracks its row across pan and zoom instead of
// sitting at a measured pixel. It therefore has to be mounted in the canvas's
// own positioning context (canvasAreaStyle) — against the wrapper it picks up
// the toolbar's height and names the wrong row. Pinned to the left edge rather
// than to the row's own x, because a row's leftmost node is wherever its first
// allele happens to branch. Rows scrolled out of the canvas are dropped rather
// than clamped to the edge, so a label never points at a row that is not
// there.
const RowLabels = observer(function RowLabels({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { rowLabels } = model
  return (
    <>
      {rowLabels.map(({ label, y }) => {
        const screenY = y * model.scale + model.translateY
        return screenY >= 0 && screenY <= model.canvasHeight ? (
          <div
            key={label}
            data-testid="graph-row-label"
            style={{ ...rowLabelStyle, top: screenY }}
          >
            {label}
          </div>
        ) : null
      })}
    </>
  )
})

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

  const ownLocation = hoveredNodeData
    ? nodeOwnLocation(hoveredNodeData)
    : undefined

  const hoveredDeletion =
    model.hoveredEdge === null
      ? undefined
      : model.deletions.find(d => d.edgeIndex === model.hoveredEdge)

  return (
    <>
      {hoveredNodeData ? (
        <div style={tooltipStyle}>
          <strong>{hoveredNodeData.name}</strong> — length:{' '}
          {hoveredNodeData.length.toLocaleString()}, depth:{' '}
          {hoveredNodeData.depth.toFixed(1)}
          {/* Which assembly contributed this segment, and where it sits on it.
              rGFA states both, and until now neither reached the screen: the
              node was a bare id in a picture. */}
          {ownLocation ? (
            <>
              <br />
              {ownLocation.sample} {locLabel(ownLocation)} (rank{' '}
              {hoveredNodeData.stable?.rank})
            </>
          ) : null}
        </div>
      ) : null}
      {hoveredEdgeData ? (
        <div style={tooltipStyle}>
          {/* A deletion edge is the one link that means something on its own —
              the backbone it skips is sequence some haplotype does not carry —
              so it says how much rather than just naming its endpoints. */}
          {hoveredDeletion ? (
            <>
              <strong>Deletion</strong> {hoveredDeletion.bp.toLocaleString()} bp
              <br />
              {hoveredDeletion.refName}:{hoveredDeletion.start.toLocaleString()}
              -{hoveredDeletion.end.toLocaleString()}
            </>
          ) : (
            <>
              Edge: {hoveredEdgeData.from} → {hoveredEdgeData.to}
            </>
          )}
        </div>
      ) : null}
    </>
  )
})

// Flat rather than under a "Launch view" submenu: this menu is two or three
// items long and every one of them is contextual to the node just clicked. The
// submenu grouping earns its keep in the long view and track menus.
const NodeContextMenu = observer(function NodeContextMenu({
  model,
  nodeId,
  top,
  left,
  onClose,
}: {
  model: GraphGenomeViewModel
  nodeId: string
  top: number
  left: number
  onClose: () => void
}) {
  const { own, reference } = model.nodeLaunchTargets(nodeId)
  return (
    <Menu
      open
      anchorReference="anchorPosition"
      anchorPosition={{ top, left }}
      onClose={() => {
        onClose()
      }}
      onMenuItemClick={callback => {
        callback()
      }}
      menuItems={[
        {
          label: 'Node details',
          icon: InfoIcon,
          onClick: () => {
            model.showNodeDetails(nodeId)
          },
        },
        ...nodeLaunchMenuItems({
          own,
          reference,
          onShowLinear: target => {
            model.showInLinearView(target)
          },
          onHighlight: model.canHighlightInLinearView
            ? target => {
                model.highlightInLinearView(target)
              }
            : undefined,
        }),
      ]}
    />
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
  const [contextNode, setContextNode] = useState<
    { nodeId: string; top: number; left: number } | undefined
  >(undefined)

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

  // Right-clicking a node is the gesture that asks "where is this?", and until
  // now the graph had no answer: a node named an assembly and an offset in its
  // tags that nothing surfaced. The items come from the model's launch targets,
  // so what is offered is what can actually be opened.
  function handleContextMenu(e: React.MouseEvent) {
    const { x, y } = getMouseCoord(e)
    const node = nodeAt(x, y)
    if (node) {
      e.preventDefault()
      setContextNode({ nodeId: node, top: e.clientY, left: e.clientX })
    }
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

      <div style={canvasAreaStyle}>
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
          onContextMenu={handleContextMenu}
        />

        <RowLabels model={model} />
      </div>

      <HoverTooltips model={model} />

      {contextNode ? (
        <NodeContextMenu
          model={model}
          nodeId={contextNode.nodeId}
          top={contextNode.top}
          left={contextNode.left}
          onClose={() => {
            setContextNode(undefined)
          }}
        />
      ) : null}

      {model.error ? <ErrorBanner error={model.error} /> : null}
    </div>
  )
})

export default GraphCanvas
