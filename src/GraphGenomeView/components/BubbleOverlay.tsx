import { Button } from '@mui/material'
import { observer } from 'mobx-react'

import { BUBBLE_KIND_COLORS } from '../bubbles/classifyBubble'

import type { GraphGenomeViewModel } from '../model'

// The variant map's glyphs: one lens per bubble on the reference line the
// canvas draws, sized by the longest route through it, coloured and labelled
// by what kind of variation it is. SVG over the canvas rather than geometry in
// it, because a glyph is text plus a shape that reads at one screen size
// whatever the zoom, which is what the row labels are too.
//
// Height is in screen px and adapts to the room above the line, so a pane of
// any height shows every glyph; a bubble shorter than the reference it
// replaces also gets a dashed chord under the line, the deletion's side.

const svgStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  overflow: 'visible' as const,
  zIndex: 3,
}

const backButtonStyle = {
  position: 'absolute' as const,
  left: 8,
  top: 8,
  zIndex: 5,
  background: 'rgba(255,255,255,0.9)',
}

const LABEL_ROW_PX = 15
const LABEL_CHAR_PX = 6.2
const MIN_GLYPH_PX = 10

function glyphHeight(bp: number, room: number) {
  const raw = 12 + 26 * Math.log10(1 + bp)
  return Math.min(raw, room)
}

const BubbleOverlay = observer(function BubbleOverlay({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { bubbleGlyphs, poppedFrom } = model
  const back = poppedFrom ? (
    <Button
      size="small"
      variant="outlined"
      style={backButtonStyle}
      data-testid="graph-unpop-bubble"
      onClick={() => {
        void model.unpopBubble()
      }}
    >
      ◀ Back to {poppedFrom.label}
    </Button>
  ) : null
  if (bubbleGlyphs.length === 0) {
    return back
  }
  const { scaleX, translateX, translateY, width, canvasHeight } = model
  const lineY = translateY
  const X = (bp: number) => bp * scaleX + translateX
  // labels stack above the tallest glyph; both share the room above the line
  const labelRows = Math.min(bubbleGlyphs.length, 6)
  const labelBand = labelRows * LABEL_ROW_PX + 8
  const room = Math.max(24, lineY - labelBand - 6)

  const glyphs = [...bubbleGlyphs].sort(
    (a, b) => b.bubble.end - b.bubble.start - (a.bubble.end - a.bubble.start),
  )
  const rowEnd: number[] = []
  const labels = [...bubbleGlyphs]
    .sort((a, b) => a.bubble.start - b.bubble.start)
    .map(g => {
      const bx = (X(g.bubble.start) + X(g.bubble.end)) / 2
      const half = (g.label.length * LABEL_CHAR_PX) / 2
      const cx = Math.min(Math.max(bx, half + 4), width - half - 4)
      let row = 0
      while ((rowEnd[row] ?? -Infinity) > cx - half - 10) {
        row++
      }
      rowEnd[row] = cx + half
      return { g, bx, cx, y: 14 + (row % labelRows) * LABEL_ROW_PX }
    })

  return (
    <>
      {back}
      <svg
        style={svgStyle}
        width={width}
        height={canvasHeight}
        data-testid="graph-bubble-overlay"
      >
        {glyphs.map(({ bubble, kind, label }) => {
          const x0 = X(bubble.start)
          const x1 = X(bubble.end)
          const w = Math.max(x1 - x0, MIN_GLYPH_PX)
          const cx = (x0 + x1) / 2
          const h = glyphHeight(bubble.longestAlleleLength, room)
          const color = BUBBLE_KIND_COLORS[kind]
          const refSpan = bubble.end - bubble.start
          const skipped = refSpan - bubble.shortestAlleleLength
          const dip = skipped > 0 ? 6 + 10 * Math.log10(1 + skipped) : 0
          const key = `${bubble.start}-${bubble.end}`
          return (
            <g key={key}>
              <path
                d={`M${cx - w / 2},${lineY} C${cx - w / 2},${lineY - h} ${cx + w / 2},${lineY - h} ${cx + w / 2},${lineY} Z`}
                fill={color}
                fillOpacity={0.18}
                stroke={color}
                strokeWidth={2}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={() => {
                  void model.popBubble(bubble)
                }}
              >
                <title>{`${label}\n${bubble.segmentCount} segments · click to open`}</title>
              </path>
              {dip > 0 ? (
                <path
                  d={`M${cx - w / 2},${lineY} C${cx - w / 2},${lineY + dip} ${cx + w / 2},${lineY + dip} ${cx + w / 2},${lineY}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              ) : null}
            </g>
          )
        })}
        {labels.map(({ g, bx, cx, y }) => {
          const color = BUBBLE_KIND_COLORS[g.kind]
          const top = lineY - glyphHeight(g.bubble.longestAlleleLength, room)
          return (
            <g key={`${g.bubble.start}-${g.bubble.end}-label`}>
              <line
                x1={bx}
                x2={bx}
                y1={y + 4}
                y2={top - 2}
                stroke={color}
                strokeWidth={0.7}
                strokeOpacity={0.5}
              />
              <text
                x={cx}
                y={y}
                fontSize={11}
                fontFamily="sans-serif"
                fill={color}
                textAnchor="middle"
              >
                {g.label}
              </text>
            </g>
          )
        })}
      </svg>
    </>
  )
})

export default BubbleOverlay
