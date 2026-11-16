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

// The review's clipped count lines: beside KIV-2's range line, beside a
// narrower range, and with no position ramp. The line is sized by the widest
// it can come to, unseen, whether or not the labels have filled it.
test('the unlabelled count line carries an unseen sizer of the widest it can come to, filled or blank', () => {
  for (const [under, sizer] of [
    [
      '1,204 unlabelled, 10.5 kb or less each',
      '1,204 unlabelled, 10.5 kb or less each',
    ],
    ['361 unlabelled, 2 bp or less each', '377 unlabelled, 2 bp or less each'],
    ['', '377 unlabelled, 2 bp or less each'],
  ]) {
    const { unmount } = render(
      <LegendRowView
        row={{
          key: 'not-shown',
          label: 'nodes not shown',
          swatch: { kind: 'fill', stops: [{ offset: 0, color: '#fff' }] },
          under,
          unlabelledLine: true,
          sizer,
        }}
      />,
    )
    const sized = screen.getByTestId('graph-key-sizer')
    expect(sized.textContent).toBe(sizer)
    expect(sized.style.visibility).toBe('hidden')
    const line = sized.nextElementSibling as HTMLElement
    expect(line.textContent).toBe(under || '\u00a0')
    // no wider than the sizer makes the key, clipped past it
    expect(line.style.width).toBe('0px')
    expect(line.style.minWidth).toBe('100%')
    expect(line.style.overflow).toBe('hidden')
    expect(line.style.textOverflow).toBe('ellipsis')
    unmount()
  }
})
