import { render, screen } from '@testing-library/react'

import GraphGenomeView from './GraphGenomeView'

import type { GraphGenomeViewModel } from '../model'

// Stubs, because MUI resolves its own React from the linked jbrowse-components
// and fails to render here; what is under test is which of the three shows.
vi.mock('./GraphCanvas', () => ({ default: () => <div>canvas</div> }))
vi.mock('./GraphLoading', () => ({ default: () => <div>loading</div> }))
vi.mock('./ImportForm', () => ({ default: () => <div>import form</div> }))

function view(state: Partial<GraphGenomeViewModel>) {
  render(
    <GraphGenomeView
      model={{ hasGraph: false, isLoading: false, ...state } as never}
    />,
  )
}

function importFormHidden() {
  return screen.getByText('import form').closest('[hidden]') !== null
}

test('a view with nothing to load offers the import form', () => {
  view({})
  expect(screen.queryByText('loading')).toBeNull()
  expect(importFormHidden()).toBe(false)
})

test('a view fetching its first graph shows the loading state instead', () => {
  view({ isLoading: true })
  expect(screen.getByText('loading')).toBeTruthy()
  expect(importFormHidden()).toBe(true)
})

test('a reload over a drawn graph keeps the canvas', () => {
  view({ hasGraph: true, isLoading: true })
  expect(screen.getByText('canvas')).toBeTruthy()
  expect(screen.queryByText('loading')).toBeNull()
})
