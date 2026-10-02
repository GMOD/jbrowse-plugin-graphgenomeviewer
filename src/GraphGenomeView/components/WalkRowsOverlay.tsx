import { useId } from 'react'

import { ROW_HEIGHT_PX } from '@jbrowse/bandage-core/layout/rowSpacing'
import {
  BAR_PX,
  GAP_PX,
  GENE_INK,
  readoutPlacement,
  rowGeneBoxes,
  runPaint,
  unitTicks,
  walkRowReadout,
  walkRowsKey,
} from '@jbrowse/bandage-core/layout/walkRowDraw'
import { RAMP_GRADIENT_CSS } from '@jbrowse/bandage-core/referenceRampCss'
import { observer } from 'mobx-react'

import { legendBoxStyle, legendRowStyle } from './legendStyles'
import { CALL_TOLERANCE } from '../repeats/walkCalls'

import type { GraphPaneModel } from '../model'
import type {
  KeySwatch,
  RowGene,
} from '@jbrowse/bandage-core/layout/walkRowDraw'

// The walk-rows layout's bars: one per haplotype walk under the reference
// row, each on its own bp axis from the window's left edge, with what core's
// walkRowDraw says to draw: runs coloured by how the graph aligned the walk
// to the reference, unit separators, a readout, and each row's genes from its
// own assembly's annotation. Under the reference-position ramp an aligned run
// takes the hue of the reference it is threaded through. In a tandem array
// that is the aligner's pick among near-identical copies, so the hue says
// which reference copy the graph used, not which one a copy resembles.
//
// A repeat record's allele for a walk marks its length with a tick. The walk
// rows pair them — see repeats/walkCalls.ts, which also holds the threshold
// this reads a red readout off. Colouring each copy by its unit is
// jbrowse-plugin-tandem-repeat's.

const svgStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  overflow: 'visible' as const,
  zIndex: 3,
}

const CALL_TICK = '#111'
const UNBACKED_TICK = '#9e9e9e'
const DISAGREES = '#c62828'

const swatchStyle = { width: 18, height: BAR_PX - 4, borderRadius: 2 }
const tickSwatchStyle = {
  ...swatchStyle,
  display: 'flex',
  justifyContent: 'center',
}

function TickSwatch({ color }: { color: string }) {
  return (
    <div style={tickSwatchStyle}>
      <div style={{ width: 2, backgroundColor: color }} />
    </div>
  )
}

function Swatch({ swatch }: { swatch: KeySwatch }) {
  return swatch.kind === 'gene' ? (
    <div
      style={{
        ...swatchStyle,
        boxSizing: 'border-box',
        border: `1.5px solid ${GENE_INK}`,
        borderRadius: 0,
      }}
    />
  ) : (
    <div
      style={{
        ...swatchStyle,
        height: swatch.kind === 'gap' ? GAP_PX : swatchStyle.height,
        background: swatch.fill,
      }}
    />
  )
}

// What the bar colours, genes and ticks mean, in the legend stack with the
// other keys. Each tick row appears once the rows hold one, so a catalogue
// with no genotypes keeps the plain key.
export const WalkRowsLegend = observer(function WalkRowsLegend({
  model,
}: {
  model: GraphPaneModel
}) {
  const bars = model.walkRowBars
  if (!bars) {
    return null
  }
  const ramp = model.referenceRampDomain
  const calls = [bars.reference, ...bars.rows].flatMap(row => row.call ?? [])
  const key = walkRowsKey(bars, {
    ramp,
    rampCss: RAMP_GRADIENT_CSS,
    genes: model.walkRowGenes?.size ? model.walkRowGeneGaps : undefined,
  })
  return (
    <div style={legendBoxStyle} data-testid="graph-walk-rows-legend">
      {key.map(entry =>
        entry.note ? (
          <div key={entry.label} style={{ color: '#666', fontStyle: 'italic' }}>
            {entry.label}
          </div>
        ) : (
          <div key={entry.label} style={legendRowStyle}>
            <Swatch swatch={entry.swatch} />
            <span>{entry.label}</span>
          </div>
        ),
      )}
      {calls.some(call => call.spanningReads !== 0) ? (
        <div style={legendRowStyle}>
          <TickSwatch color={CALL_TICK} />
          <span>allele length called for this walk</span>
        </div>
      ) : null}
      {calls.some(call => call.spanningReads === 0) ? (
        <div style={legendRowStyle}>
          <TickSwatch color={UNBACKED_TICK} />
          <span>called with no read spanning it</span>
        </div>
      ) : null}
      {calls.some(call => call.agrees === false) ? (
        <div style={legendRowStyle}>
          <div style={swatchStyle} />
          <span style={{ color: DISAGREES }}>
            walk and call over {Math.round(CALL_TOLERANCE * 100)}% apart
          </span>
        </div>
      ) : null}
    </div>
  )
})

function RowGenes({
  genes,
  X,
  y,
}: {
  genes: RowGene[]
  X: (offset: number) => number
  y: number
}) {
  return rowGeneBoxes(genes, X, y).map(box => (
    <g key={`${box.name}-${box.x}`} data-testid="graph-walk-gene">
      <title>{box.name}</title>
      {box.exons.map(e => (
        <rect
          key={e.x}
          x={e.x}
          y={y - BAR_PX / 2}
          width={e.w}
          height={BAR_PX}
          fill={GENE_INK}
          opacity={0.35}
        />
      ))}
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill="none"
        stroke={GENE_INK}
        strokeWidth={1.5}
      />
      {box.label ? (
        <text
          x={box.label.x}
          y={box.label.y}
          fontSize={box.label.size}
          fontFamily="sans-serif"
          fontWeight={600}
          textAnchor="middle"
          fill={GENE_INK}
          stroke="white"
          strokeWidth={2.5}
          paintOrder="stroke"
        >
          {box.name}
        </text>
      ) : null}
    </g>
  ))
}

const WalkRowsOverlay = observer(function WalkRowsOverlay({
  model,
}: {
  model: GraphPaneModel
}) {
  const idPrefix = useId().replace(/[^\w-]/g, '')
  const { walkRowBars, referenceRampDomain: ramp, walkRowGenes } = model
  if (!walkRowBars) {
    return null
  }
  const {
    scaleX,
    scaleY,
    translateX,
    translateY,
    paneWidth: width,
    canvasHeight,
  } = model
  const X = (bp: number) => bp * scaleX + translateX
  const Y = (row: number) => row * ROW_HEIGHT_PX * scaleY + translateY
  const { origin, unit, reference, rows } = walkRowBars
  const along = (offset: number) => X(origin + offset)
  return (
    <svg
      style={svgStyle}
      width={width}
      height={canvasHeight}
      data-testid="graph-walk-rows"
    >
      {[reference, ...rows].map((row, i) => {
        const y = Y(i)
        if (y < -BAR_PX || y > canvasHeight + BAR_PX) {
          return null
        }
        const { call } = row
        const text = walkRowReadout(
          row,
          i === 0 ? undefined : reference,
          unit,
          call,
        )
        const at = readoutPlacement(text, along(row.bp), width)
        return (
          <g
            key={row.name}
            data-testid={i === 0 ? 'graph-walk-reference' : 'graph-walk-row'}
          >
            {row.runs.map(run => {
              const paint = runPaint(run, ramp)
              const id = `${idPrefix}-${i}-${run.start}`
              const h = run.gap ? GAP_PX : BAR_PX
              return (
                <g key={run.start}>
                  {'stops' in paint ? (
                    <linearGradient id={id}>
                      {paint.stops.map((color, k) => (
                        <stop
                          key={k}
                          offset={k / (paint.stops.length - 1)}
                          stopColor={color}
                        />
                      ))}
                    </linearGradient>
                  ) : null}
                  <rect
                    x={along(run.start)}
                    y={y - h / 2}
                    width={Math.max(1, run.bp * scaleX)}
                    height={h}
                    fill={'stops' in paint ? `url(#${id})` : paint.fill}
                  />
                </g>
              )
            })}
            {unit
              ? unitTicks(row.bp, unit, scaleX).map(k => (
                  <line
                    key={k}
                    x1={along(k)}
                    x2={along(k)}
                    y1={y - BAR_PX / 2}
                    y2={y + BAR_PX / 2}
                    stroke="white"
                    strokeWidth={1}
                  />
                ))
              : null}
            {call ? (
              <rect
                data-testid="graph-walk-call"
                x={along(call.bp) - 1}
                y={y - BAR_PX / 2 - 3}
                width={2}
                height={BAR_PX + 6}
                fill={call.spanningReads === 0 ? UNBACKED_TICK : CALL_TICK}
              />
            ) : null}
            <RowGenes
              genes={walkRowGenes?.get(row.name) ?? []}
              X={along}
              y={y}
            />
            <text
              x={at.x}
              y={y + 4}
              fontSize={11}
              fontFamily="sans-serif"
              fill={call?.agrees === false ? DISAGREES : '#333'}
              stroke={at.halo ? 'white' : undefined}
              strokeWidth={at.halo ? 3 : undefined}
              paintOrder="stroke"
              textAnchor={at.anchor}
            >
              {text}
            </text>
          </g>
        )
      })}
    </svg>
  )
})

export default WalkRowsOverlay
