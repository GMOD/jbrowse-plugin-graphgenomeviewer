import { act, renderHook } from '@testing-library/react'

import { usePaneGestures } from './usePaneGestures'

import type { GraphPaneModel } from '../model'

function fakeModel(state: Record<string, unknown> = {}) {
  return {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    layoutResult: undefined,
    nodePositions: undefined,
    referenceStripNodeAt: () => null,
    setSelectedNode: vi.fn(),
    showNodeDetails: vi.fn(),
    closeBubbles: vi.fn(),
    ...state,
  }
}

const at = (x: number, y: number) =>
  ({
    clientX: x,
    clientY: y,
    currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
  }) as unknown as React.PointerEvent

test('a click on empty canvas deselects and leaves open bubbles open', () => {
  const model = fakeModel()
  const { result } = renderHook(() =>
    usePaneGestures(model as unknown as GraphPaneModel),
  )
  result.current.handlers.onClick(at(10, 10))
  expect(model.setSelectedNode).toHaveBeenCalledWith(null)
  expect(model.showNodeDetails).not.toHaveBeenCalled()
  expect(model.closeBubbles).not.toHaveBeenCalled()
})

test('the canvas reads out the gene chip under the pointer, since the chip leaves the pointer to it', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    frames.push(cb),
  )
  const pin = {
    gene: {
      name: 'LPA',
      refName: 'chr6',
      start: 160_531_482,
      end: 160_664_259,
    },
    covered: 1,
  }
  const model = fakeModel({
    isPanning: false,
    draggingNode: null,
    walkRowBars: undefined,
    overlayLabels: { genes: [{ item: pin, x: 100, y: 30, w: 40 }] },
  })
  const { result } = renderHook(() =>
    usePaneGestures(model as unknown as GraphPaneModel),
  )
  const move = (x: number, y: number) => {
    act(() => {
      result.current.handlers.onPointerMove(at(x, y))
      frames.shift()?.(0)
    })
  }
  move(100, 25)
  expect(result.current.hoveredChip).toEqual({
    label: 'LPA',
    readout: 'chr6:160,531,482-160,664,259',
  })
  move(300, 25)
  expect(result.current.hoveredChip).toBeUndefined()
  vi.unstubAllGlobals()
})

test('a pan frame before any layout does not replay the last hover', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    frames.push(cb),
  )
  const walkRowAt = vi.fn(() => undefined)
  const setTransform = vi.fn()
  const model = fakeModel({
    isPanning: false,
    draggingNode: null,
    overlayLabels: { genes: [] },
    walkRowBars: { reference: { name: 'ref' }, rows: [] },
    walkRowAt,
    setHoveredWalkRow: vi.fn(),
    scale: 1,
    setTransform,
  })
  const { result } = renderHook(() =>
    usePaneGestures(model as unknown as GraphPaneModel),
  )
  const move = (x: number) => {
    act(() => {
      result.current.handlers.onPointerMove(at(x, 20))
      frames.shift()?.(0)
    })
  }
  move(40)
  expect(walkRowAt).toHaveBeenCalledTimes(1)
  Object.assign(model, { isPanning: true })
  move(60)
  expect(setTransform).toHaveBeenCalledWith(1, 20, 0)
  expect(walkRowAt).toHaveBeenCalledTimes(1)
  vi.unstubAllGlobals()
})

test('a hosted pane that pans itself claims presses from the linear view; one the view places does not', () => {
  const model = fakeModel({ host: {}, hostPlacesX: false })
  const { result, rerender } = renderHook(() =>
    usePaneGestures(model as unknown as GraphPaneModel),
  )
  expect(result.current.surfaceProps).toHaveProperty('data-gesture-owner', '')
  const stopPropagation = vi.fn()
  ;(
    result.current.surfaceProps as { onMouseDown: (e: unknown) => void }
  ).onMouseDown({ stopPropagation })
  expect(stopPropagation).toHaveBeenCalled()

  Object.assign(model, { hostPlacesX: true })
  rerender()
  expect(result.current.surfaceProps).toEqual({})
})

test('a second finger neither restarts nor ends the pan', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    frames.push(cb),
  )
  const setTransform = vi.fn()
  const model: Record<string, unknown> = fakeModel({
    isPanning: false,
    draggingNode: null,
    hostPlacesX: false,
    referenceStripZonePx: 0,
    scale: 1,
    setTransform,
    setDraggingNode: vi.fn(),
    setPanning: (on: boolean) => {
      model.isPanning = on
    },
    stopDragging: () => {
      model.isPanning = false
    },
  })
  const { result } = renderHook(() =>
    usePaneGestures(model as unknown as GraphPaneModel),
  )
  const finger = (pointerId: number, x: number) =>
    ({
      clientX: x,
      clientY: 20,
      button: 0,
      pointerId,
      nativeEvent: { offsetY: 20 },
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        setPointerCapture: vi.fn(),
      },
    }) as unknown as React.PointerEvent
  const { onPointerDown, onPointerMove, onPointerUp } = result.current.handlers
  act(() => {
    onPointerDown(finger(1, 10))
    onPointerDown(finger(2, 200))
    onPointerMove(finger(2, 260))
    onPointerUp(finger(2, 260))
    onPointerMove(finger(1, 30))
    frames.shift()?.(0)
  })
  expect(model.isPanning).toBe(true)
  expect(setTransform).toHaveBeenCalledWith(1, 20, 0)
  vi.unstubAllGlobals()
})
