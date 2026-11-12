import { fireEvent, render, screen } from '@testing-library/react'

import PaneContextMenu from './PaneContextMenu'

import type { GraphPaneModel } from '../model'

const model = {
  nodeLaunchTargets: () => ({}),
  canHighlightInLinearView: false,
  showNodeDetails: vi.fn(),
  walkRowBars: { reference: { name: 'ref' }, rows: [] },
  walkRowLaunchTarget: () => undefined,
  walkRowSamples: undefined,
  liftsWalks: false,
  modeDrawsNodes: false,
  walkLayers: [],
} as unknown as GraphPaneModel

test('a right-click on a node offers its details', () => {
  const onClose = vi.fn()
  render(
    <PaneContextMenu
      model={model}
      at={{ clientX: 10, clientY: 10, nodeId: 's7' }}
      onClose={onClose}
    />,
  )
  fireEvent.click(screen.getByText('Node details'))
  expect(model.showNodeDetails).toHaveBeenCalledWith('s7')
  expect(onClose).toHaveBeenCalled()
})

test('a right-click on a walk row with no contig says why it opens nothing', () => {
  render(
    <PaneContextMenu
      model={model}
      at={{ clientX: 10, clientY: 10, row: 0 }}
      onClose={() => {}}
    />,
  )
  expect(screen.getByText('Linear genome view')).toBeTruthy()
  expect(screen.queryByText('Node details')).toBeNull()
})

test('nothing opens without a right-click', () => {
  render(<PaneContextMenu model={model} at={undefined} onClose={() => {}} />)
  expect(screen.queryByRole('menu')).toBeNull()
})

const rowOf = (
  name: string,
  held: { abridgedSteps?: number; unloadedBp?: number },
) => ({
  name,
  label: name,
  sample: name,
  bp: 1000,
  offReferenceBp: 0,
  gapBp: 0,
  complete: true,
  runs: [],
  ...held,
})

test.each([
  [
    'a count',
    { abridgedSteps: 12_400, unloadedBp: 900 },
    'Load the 12 k steps not loaded',
  ],
  [
    'runs not loaded and no count',
    { unloadedBp: 900 },
    'Load the steps not loaded',
  ],
  [
    'a count and no run in the window',
    { abridgedSteps: 40 },
    'Load the 40 steps not loaded',
  ],
])('a walk row holding %s offers to load them', (_, held, label) => {
  const expandWalk = vi.fn()
  const withRow = {
    ...model,
    expandWalk,
    walkRowBars: { reference: { name: 'ref' }, rows: [rowOf('HG1#1#c', held)] },
  } as unknown as GraphPaneModel
  render(
    <PaneContextMenu
      model={withRow}
      at={{ clientX: 10, clientY: 10, row: 1 }}
      onClose={() => {}}
    />,
  )
  fireEvent.click(screen.getByText(label))
  expect(expandWalk).toHaveBeenCalledWith('HG1#1#c')
})

test('a walk row with every step loaded offers no load', () => {
  const withRow = {
    ...model,
    walkRowBars: { reference: { name: 'ref' }, rows: [rowOf('HG1#1#c', {})] },
  } as unknown as GraphPaneModel
  render(
    <PaneContextMenu
      model={withRow}
      at={{ clientX: 10, clientY: 10, row: 1 }}
      onClose={() => {}}
    />,
  )
  expect(screen.getByText('Linear genome view')).toBeTruthy()
  expect(screen.queryByText(/^Load the/)).toBeNull()
})
