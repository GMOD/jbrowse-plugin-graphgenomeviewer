import { observer } from 'mobx-react'

import type { GraphGenomeViewModel } from '../model'

// The session's genes drawn onto the graph: exons as dark stretches along the
// backbone nodes that carry them, and each gene's name pinned under the
// backbone at its midpoint. Drawn once in layout units and moved by the same
// transform the halos use; the labels sit below the line where the halo
// labels sit above it.

const svgStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  overflow: 'hidden' as const,
  zIndex: 3,
}

const EXON_COLOR = '#1c1c22'
const LABEL_PX = 11
const LABEL_CHAR_PX = 6.4
const LABEL_PAD = 4

const GenePins = observer(function GenePins({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { genePins } = model
  if (genePins.length === 0) {
    return null
  }
  const {
    scaleX,
    scaleY,
    translateX,
    translateY,
    width,
    canvasHeight,
    contigThickness,
  } = model
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
  const labels = [...genePins]
    .sort((a, b) => b.gene.end - b.gene.start - (a.gene.end - a.gene.start))
    .flatMap(pin => {
      const x = pin.at.x * scaleX + translateX
      const y = pin.at.y * scaleY + translateY + contigThickness + 18
      const text = pin.covered < 0.98 ? `${pin.gene.name} …` : pin.gene.name
      const w = text.length * LABEL_CHAR_PX + LABEL_PAD * 2
      const box = {
        x0: x - w / 2,
        x1: x + w / 2,
        y0: y - LABEL_PX,
        y1: y + LABEL_PAD,
      }
      if (
        box.x1 < 0 ||
        box.x0 > width ||
        box.y1 < 0 ||
        box.y0 > canvasHeight ||
        placed.some(
          p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0,
        )
      ) {
        return []
      }
      placed.push(box)
      return [{ pin, x, y, w, text }]
    })

  return (
    <svg
      style={svgStyle}
      width={width}
      height={canvasHeight}
      data-testid="graph-gene-pins"
    >
      <g
        transform={`translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`}
      >
        {genePins.map(pin =>
          pin.exons ? (
            <path
              key={`${pin.gene.name}-${pin.gene.start}`}
              d={pin.exons}
              fill="none"
              stroke={EXON_COLOR}
              strokeOpacity={0.9}
              strokeWidth={contigThickness * 0.45}
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
          ) : null,
        )}
      </g>
      {labels.map(({ pin, x, y, w, text }) => (
        <g
          key={`${pin.gene.name}-${pin.gene.start}-label`}
          data-testid="graph-gene-pin-label"
        >
          <title>{`${pin.gene.name} ${pin.gene.refName}:${pin.gene.start.toLocaleString()}-${pin.gene.end.toLocaleString()}${pin.covered < 0.98 ? ', runs past the cut' : ''}`}</title>
          <line
            x1={x}
            x2={x}
            y1={y - LABEL_PX - 2}
            y2={pin.at.y * scaleY + translateY + contigThickness / 2}
            stroke={EXON_COLOR}
            strokeWidth={0.8}
            strokeOpacity={0.6}
          />
          <rect
            x={x - w / 2}
            y={y - LABEL_PX}
            width={w}
            height={LABEL_PX + LABEL_PAD}
            rx={2}
            fill="rgba(255,255,255,0.85)"
          />
          <text
            x={x}
            y={y}
            fontSize={LABEL_PX}
            fontFamily="sans-serif"
            fontStyle="italic"
            fontWeight={600}
            fill={EXON_COLOR}
            textAnchor="middle"
          >
            {text}
          </text>
        </g>
      ))}
    </svg>
  )
})

export default GenePins
