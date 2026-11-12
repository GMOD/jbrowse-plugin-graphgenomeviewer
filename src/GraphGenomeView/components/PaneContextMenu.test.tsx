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
  held: { abridgedSteps?: number },
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

const stripOf = (held: { abridgedSteps?: number }) => ({
  reference: rowOf('ref', {}),
  rows: [rowOf('HG1#1#c', held)],
  origin: 0,
})

test.each([
  ['12 k', 12_400],
  ['40', 40],
])(
  "a strip row whose detours are fetched without nodes offers to show them, %s steps",
  (steps, abridgedSteps) => {
    const expandWalk = vi.fn()
    render(
      <PaneContextMenu
        model={{ ...model, expandWalk } as unknown as GraphPaneModel}
        at={{
          clientX: 10,
          clientY: 10,
          row: 1,
          bars: stripOf({ abridgedSteps }),
        }}
        onClose={() => {}}
      />,
    )
    fireEvent.click(
      screen.getByText(
        `Show the nodes of this haplotype's detours (${steps} steps)`,
      ),
    )
    expect(expandWalk).toHaveBeenCalledWith('HG1#1#c')
  },
)

test('a walk row offers no fetch, since its bar would look the same', () => {
  const withRow = {
    ...model,
    walkRowBars: stripOf({ abridgedSteps: 40 }),
  } as unknown as GraphPaneModel
  render(
    <PaneContextMenu
      model={withRow}
      at={{ clientX: 10, clientY: 10, row: 1 }}
      onClose={() => {}}
    />,
  )
  expect(screen.getByText('Linear genome view')).toBeTruthy()
  expect(screen.queryByText(/detours/)).toBeNull()
})

test('a strip row with every node fetched offers no fetch', () => {
  render(
    <PaneContextMenu
      model={model}
      at={{ clientX: 10, clientY: 10, row: 1, bars: stripOf({}) }}
      onClose={() => {}}
    />,
  )
  expect(screen.queryByText(/detours/)).toBeNull()
})
