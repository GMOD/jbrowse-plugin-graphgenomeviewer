import { PLACEMENT_CHOICE_TEXT } from '@jbrowse/bandage-core/gfa/departures'
import { render, screen } from '@testing-library/react'

import { LegendRowView } from './Legend'
import { NOTE_MAX_WIDTH_PX } from './legendStyles'

// pggb's walk rows key wrote its placement choice note on one line, and the
// key took about 550 px of the pane
test('a long note wraps at its width, so the key is no wider than that', () => {
  render(
    <LegendRowView
      row={{
        key: 'placement',
        label: `${PLACEMENT_CHOICE_TEXT}: the writer chose which pass of a node the reference passes more than once a step takes`,
      }}
    />,
  )
  const note = screen.getByText(new RegExp(`^${PLACEMENT_CHOICE_TEXT}:`))
  expect(NOTE_MAX_WIDTH_PX).toBe(260)
  expect(note.style.maxWidth).toBe('260px')
  expect(note.style.whiteSpace).toBe('normal')
})
