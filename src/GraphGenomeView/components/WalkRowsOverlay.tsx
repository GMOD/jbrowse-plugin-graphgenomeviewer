import { observer } from 'mobx-react'

import { ROW_HEIGHT_PX } from '../layout/rowSpacing'

import type { GraphGenomeViewModel } from '../model'

// The walk-rows layout's bars: one per haplotype walk under the reference line
// the canvas draws, each on its own bp axis from the window's left edge. Blue
// is sequence the reference walk also carries, purple is sequence it does not,
// and the readout at the end of a bar is what it carries against the
// reference, which for a repeat array is the expansion.

const svgStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  overflow: 'visible' as const,
  zIndex: 3,
}

const ON_REFERENCE = '#2f8fd6'
const OFF_REFERENCE = '#8e3fbf'
const BAR_PX = 12

function kb(bp: number) {
  return `${(bp / 1000).toFixed(bp < 10_000 ? 1 : 0)} kb`
}

function readout(bp: number, referenceBp: number, complete: boolean) {
  const delta = bp - referenceBp
  const against =
    delta === 0 ? '' : ` (${delta > 0 ? '+' : '−'}${kb(Math.abs(delta))})`
  return `${kb(bp)}${against}${complete ? '' : ' · partial walk'}`
}

const WalkRowsOverlay = observer(function WalkRowsOverlay({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { walkRowBars } = model
  if (!walkRowBars) {
    return null
  }
  const { scaleX, scaleY, translateX, translateY, width, canvasHeight } = model
  const X = (bp: number) => bp * scaleX + translateX
  const Y = (row: number) => row * ROW_HEIGHT_PX * scaleY + translateY
  const { origin, reference, rows } = walkRowBars
  return (
    <svg
      style={svgStyle}
      width={width}
      height={canvasHeight}
      data-testid="graph-walk-rows"
    >
      <text
        x={X(origin + reference.bp) + 6}
        y={Y(0) + 4}
        fontSize={11}
        fontFamily="sans-serif"
        fill="#333"
      >
        {kb(reference.bp)}
      </text>
      {rows.map((row, i) => {
        const y = Y(i + 1)
        if (y < -BAR_PX || y > canvasHeight + BAR_PX) {
          return null
        }
        return (
          <g key={row.name} data-testid="graph-walk-row">
            {row.runs.map(run => (
              <rect
                key={run.start}
                x={X(origin + run.start)}
                y={y - BAR_PX / 2}
                width={Math.max(1, run.bp * scaleX)}
                height={BAR_PX}
                fill={run.onReference ? ON_REFERENCE : OFF_REFERENCE}
              />
            ))}
            <text
              x={X(origin + row.bp) + 6}
              y={y + 4}
              fontSize={11}
              fontFamily="sans-serif"
              fill="#333"
            >
              {readout(row.bp, reference.bp, row.complete)}
            </text>
          </g>
        )
      })}
    </svg>
  )
})

export default WalkRowsOverlay
