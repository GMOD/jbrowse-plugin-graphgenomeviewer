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
  abridged: [],
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

const rowOf = (name: string) => ({
  name,
  label: name,
  sample: name,
  bp: 1000,
  offReferenceBp: 0,
  gapBp: 0,
  complete: true,
  runs: [],
})

const strip = {
  reference: rowOf('ref'),
  rows: [rowOf('HG1#1#c')],
  origin: 0,
}

// 6 bp in a departure alone is a walk whose row counts no abridged steps
test.each([
  [12_400, 0, 'HG1#1#c: 12,400 steps not loaded'],
  [40, 6, 'HG1#1#c: 40 steps not loaded, 6 bp off the reference'],
  [0, 6, 'HG1#1#c: 0 steps not loaded, 6 bp off the reference'],
])(
  "a strip row whose walk the cut abridged offers to load its steps, saying graph-walks' not-loaded text: %i steps, %i bp",
  (steps, bp, text) => {
    const expandWalk = vi.fn()
    render(
      <PaneContextMenu
        model={{
          ...model,
          abridged: [{ name: 'HG1#1#c', steps, bp }],
          expandWalk,
        }}
        at={{ clientX: 10, clientY: 10, row: 1, bars: strip }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(text)).toBeTruthy()
    fireEvent.click(screen.getByText('Load its steps'))
    expect(expandWalk).toHaveBeenCalledWith('HG1#1#c')
  },
)

test('a walk row offers no fetch, since its bar would look the same', () => {
  const withRow = {
    ...model,
    walkRowBars: strip,
    abridged: [{ name: 'HG1#1#c', steps: 40, bp: 6 }],
  } as unknown as GraphPaneModel
  render(
    <PaneContextMenu
      model={withRow}
      at={{ clientX: 10, clientY: 10, row: 1 }}
      onClose={() => {}}
    />,
  )
  expect(screen.getByText('Linear genome view')).toBeTruthy()
  expect(screen.queryByText('Load its steps')).toBeNull()
})

test('a strip row with every node fetched offers no fetch', () => {
  render(
    <PaneContextMenu
      model={model}
      at={{ clientX: 10, clientY: 10, row: 1, bars: strip }}
      onClose={() => {}}
    />,
  )
  expect(screen.queryByText('Load its steps')).toBeNull()
})
