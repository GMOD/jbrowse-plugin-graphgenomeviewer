import { useEffect, useRef, useState } from 'react'

import {
  findHoveredEdge,
  findHoveredNode,
} from '@jbrowse/bandage-core/util/hitDetection'
import { wheelZoomFactor } from '@jbrowse/bandage-core/util/wheelZoom'
import { screenToLayout } from '@jbrowse/bandage-core/viewport'
import { isAlive } from '@jbrowse/mobx-state-tree'

import { chipReadoutAt } from './LabelLayer'

import type { PaneContextAt } from './PaneContextMenu'
import type { GraphPaneModel } from '../model'

// Bound on the whole canvas area, so a wheel over a label, pin or legend zooms
// the graph rather than the linear view under it. Imperative, because React
// registers wheel listeners as passive and this one has to preventDefault.
export function useWheelZoom(
  area: HTMLElement | null,
  canvas: HTMLCanvasElement | null | undefined,
  model: GraphPaneModel,
) {
  useEffect(() => {
    if (!area) {
      return undefined
    }
    const handleWheel = (e: WheelEvent) => {
      if (model.hostPlacesX) {
        return
      }
      if (model.host) {
        e.stopPropagation()
      }
      e.preventDefault()
      const under =
        e.target instanceof Element ? e.target.closest('canvas') : null
      const origin = under ?? (model.facetPanels ? null : canvas)
      if (!origin) {
        return
      }
      const rect = origin.getBoundingClientRect()
      model.zoom(
        wheelZoomFactor(e),
        e.clientX - rect.left,
        e.clientY - rect.top,
      )
    }
    area.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      area.removeEventListener('wheel', handleWheel)
    }
  }, [area, canvas, model])
}

const CLICK_SLOP_PX = 3

// The pointer on a canvas drawing the pane's transform: the pane's own, or any
// facet panel, since the panels share it. Coordinates are read against the
// canvas the event is on.
export function usePaneGestures(model: GraphPaneModel) {
  // Where the pointer was last, and whether it has travelled since mousedown —
  // per-gesture scratch that nothing renders from, which is what a ref is for.
  // Whether a drag is in progress is model state (`isPanning`/`draggingNode`),
  // because the cursor renders from it.
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const downRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)
  // the pointer driving a drag, so a second finger neither restarts nor ends it
  const dragPointerRef = useRef<number | undefined>(undefined)
  const isOtherPointer = (e: React.PointerEvent) =>
    dragPointerRef.current !== undefined &&
    e.pointerId !== dragPointerRef.current
  // A pan and a hover are applied once per frame, not once per mousemove:
  // mousemove fires in bursts well above the frame rate, and each pan step
  // repainted the canvas and re-placed every overlay label, while each hover
  // step ran both hit indexes. The pending pan is the summed delta; the pending
  // hover is the last pointer position, since only the last one can be right.
  const pendingRef = useRef<{
    frame: number
    pan: { dx: number; dy: number } | null
    hover: { x: number; y: number } | null
  }>({ frame: 0, pan: null, hover: null })
  useEffect(
    () => () => {
      cancelAnimationFrame(pendingRef.current.frame)
    },
    [],
  )
  const [contextMenu, setContextMenu] = useState<PaneContextAt>()
  const [hoveredChip, setHoveredChip] =
    useState<ReturnType<typeof chipReadoutAt>>(undefined)

  // the event's point in pane px, against the canvas it is on
  function pointerAt(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // The node at a pane point, which mousedown, mousemove and click all need.
  // Takes the point rather than the event so a caller that already has one
  // does not pay for a second getBoundingClientRect.
  function nodeAt(sx: number, sy: number) {
    if (model.layoutResult?.tubeMap) {
      return model.tubeMapNodeAt(sx, sy)
    }
    const onStrip = model.referenceStripNodeAt(sx, sy)
    if (onStrip) {
      return onStrip
    }
    const { nodePositions } = model
    if (!nodePositions) {
      return null
    }
    const { x, y } = screenToLayout(sx, sy, model, model.axisScale)
    return findHoveredNode(
      nodePositions,
      x,
      y,
      model.axisScale,
      model.positionsVersion,
      model.nodeInk,
    )
  }

  function edgeAt(sx: number, sy: number) {
    const { nodePositions, graph } = model
    if (!nodePositions || !graph) {
      return null
    }
    const { x, y } = screenToLayout(sx, sy, model, model.axisScale)
    return findHoveredEdge(
      nodePositions,
      graph,
      x,
      y,
      model.axisScale,
      // resolved, so the hit index bounds the ribbons that are actually
      // drawn — see effectiveDrawPaths. Facet panels draw none.
      model.effectiveDrawPaths && !model.facetPanels,
      model.positionsVersion,
      model.deletionEdgeIndexes,
      model.hiddenEdgeIndexes,
      model.deletionRoutes,
      model.layoutResult?.stranded,
    )
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 0) {
      e.preventDefault()
    }
  }

  // Captured, so a drag keeps going over a bubble chip or the gap between
  // facet panels, and a finger drags as a mouse does
  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 0 && !isOtherPointer(e)) {
      hasMovedRef.current = false
      downRef.current = { x: e.clientX, y: e.clientY }
      if (model.hostPlacesX) {
        return
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      dragPointerRef.current = e.pointerId
      const { x, y } = pointerAt(e)
      // a tube map's boxes are the layout's, and the strip's are bp, not
      // positions to drag
      const node =
        model.layoutResult?.tubeMap ||
        e.nativeEvent.offsetY < model.referenceStripZonePx
          ? null
          : nodeAt(x, y)
      if (node) {
        model.setDraggingNode(node)
      } else {
        model.setPanning(true)
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  function applyPending() {
    const pending = pendingRef.current
    const { pan, hover } = pending
    pending.frame = 0
    pending.pan = null
    pending.hover = null
    if (pan) {
      model.setTransform(
        model.scale,
        model.translateX + pan.dx,
        model.translateY + pan.dy,
      )
    }
    if (!hover) {
      return
    }
    const { x: sx, y: sy } = hover
    const chip = model.facetPanels
      ? undefined
      : chipReadoutAt(model.overlayLabels, sx, sy)
    setHoveredChip(was =>
      was?.label === chip?.label && was?.readout === chip?.readout ? was : chip,
    )
    const bars = model.walkRowBars
    if (bars) {
      const i = model.walkRowAt(sx, sy)
      model.setHoveredWalkRow(
        i === undefined ? null : [bars.reference, ...bars.rows][i]!.name,
      )
    }
    if (model.nodePositions && model.graph) {
      const node = nodeAt(sx, sy)
      model.setHoveredPanel(model.tubeMapPanelAt(sy))
      model.setHoveredNode(node, { x: sx, y: sy })
      model.setHoveredTube(
        node === null && model.layoutResult?.tubeMap
          ? model.tubeAt(sx, sy)
          : null,
      )
      model.setHoveredEdge(
        node || model.layoutResult?.tubeMap || !model.hoverLightsEverything
          ? null
          : edgeAt(sx, sy),
      )
    }
  }

  function scheduleFrame() {
    if (!pendingRef.current.frame) {
      pendingRef.current.frame = requestAnimationFrame(applyPending)
    }
  }

  function dropPending() {
    const pending = pendingRef.current
    cancelAnimationFrame(pending.frame)
    pending.frame = 0
    pending.pan = null
    pending.hover = null
  }

  function onPointerMove(e: React.PointerEvent) {
    if (isOtherPointer(e)) {
      return
    }
    const dx = e.clientX - lastMouseRef.current.x
    const dy = e.clientY - lastMouseRef.current.y
    lastMouseRef.current = { x: e.clientX, y: e.clientY }

    // from where the button went down, not per event: a slow drag moves a
    // pixel at a time
    if (
      Math.hypot(e.clientX - downRef.current.x, e.clientY - downRef.current.y) >
      CLICK_SLOP_PX
    ) {
      hasMovedRef.current = true
    }

    const pending = pendingRef.current
    if (model.draggingNode) {
      model.moveNode(model.draggingNode, dx / model.scaleX, dy / model.scaleY)
    } else if (model.isPanning) {
      pending.pan = {
        dx: (pending.pan?.dx ?? 0) + dx,
        dy: (pending.pan?.dy ?? 0) + dy,
      }
      scheduleFrame()
    } else {
      const rect = (
        e.currentTarget as HTMLCanvasElement
      ).getBoundingClientRect()
      pending.hover = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      scheduleFrame()
    }
  }

  // also the end of a capture the browser took back
  function onPointerUp(e: React.PointerEvent) {
    if (isOtherPointer(e)) {
      return
    }
    dragPointerRef.current = undefined
    if (isAlive(model)) {
      model.stopDragging()
    }
  }

  // also fired by the canvas unmounting under a resting pointer, after the
  // view closing it has destroyed the model
  function onPointerLeave() {
    dragPointerRef.current = undefined
    dropPending()
    setHoveredChip(undefined)
    if (!isAlive(model)) {
      return
    }
    model.stopDragging()
    model.clearHover()
  }

  // Right-clicking a node is the gesture that asks "where is this?", and until
  // now the graph had no answer: a node named an assembly and an offset in its
  // tags that nothing surfaced. The items come from the model's launch targets,
  // so what is offered is what can actually be opened.
  function onContextMenu(e: React.MouseEvent) {
    const { x, y } = pointerAt(e)
    const node = nodeAt(x, y)
    const { clientX, clientY } = e
    if (node) {
      e.preventDefault()
      setContextMenu({ clientX, clientY, nodeId: node })
      return
    }
    const row = model.walkRowAt(x, y)
    if (row !== undefined) {
      e.preventDefault()
      setContextMenu({ clientX, clientY, row })
    }
  }

  function onClick(e: React.MouseEvent) {
    // a click that ended a drag selects nothing
    if (!hasMovedRef.current) {
      const { x, y } = pointerAt(e)
      const node = nodeAt(x, y)
      model.setSelectedNode(node)
      if (node) {
        model.showNodeDetails(node)
      }
    }
  }

  const canvasStyle: React.CSSProperties = {
    cursor: model.isPanning || model.draggingNode ? 'grabbing' : 'grab',
    // a pane the linear view drags leaves a finger its scroll
    touchAction: model.hostPlacesX ? 'auto' : 'none',
    overscrollBehavior: 'contain',
  }

  // A hosted pane that pans itself claims every press on its surface, labels
  // and strip included: the linear view's pan starts on pointerdown and skips
  // `[data-gesture-owner]`, and its shift-drag range select starts on
  // mousedown.
  const claimsPress = model.host !== undefined && !model.hostPlacesX
  const surfaceProps = claimsPress
    ? {
        'data-gesture-owner': '',
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation()
        },
      }
    : {}

  return {
    canvasStyle,
    surfaceProps,
    handlers: {
      onMouseDown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture: onPointerUp,
      onPointerLeave,
      onClick,
      onContextMenu,
    },
    contextMenu,
    hoveredChip,
    closeContextMenu: () => {
      setContextMenu(undefined)
    },
  }
}

export type PaneHandlers = ReturnType<typeof usePaneGestures>['handlers']
