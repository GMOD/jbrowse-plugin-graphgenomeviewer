import { renderHook } from '@testing-library/react'

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
  }) as unknown as React.MouseEvent

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
