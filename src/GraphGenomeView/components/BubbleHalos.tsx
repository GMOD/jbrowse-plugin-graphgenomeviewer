import { observer } from 'mobx-react'

import { BUBBLE_KIND_COLORS } from '../bubbles/classifyBubble'

import type { GraphGenomeViewModel } from '../model'

// The bubbles over a node drawing: each a translucent halo along its nodes,
// drawn once in layout units and moved with the canvas by one transform, and
// a label at its highest node that opens the bubble. The halo itself takes no
// pointer events, so the nodes under it still hover and drag.

const svgStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  overflow: 'hidden' as const,
  zIndex: 2,
}

const LABEL_PX = 11
const LABEL_CHAR_PX = 6.2
const LABEL_PAD = 4
const HALO_FACTOR = 3.4

const BubbleHalos = observer(function BubbleHalos({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { bubbleHalos, walkHighlight } = model
  // a lifted walk dims the bubbles it never enters, halo and label alike
  const dimmed = (nodeIds: string[]) =>
    walkHighlight !== undefined &&
    !nodeIds.some(id => walkHighlight.nodeIds.has(id))
  if (bubbleHalos.length === 0) {
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
  const halo = contigThickness * HALO_FACTOR
  // Biggest bubbles label first; one whose box lands on a placed label keeps
  // its tooltip only.
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
  const labels = [...bubbleHalos]
    .sort((a, b) => b.members - a.members)
    .flatMap(h => {
      const x = h.top.x * scaleX + translateX
      const y = h.top.y * scaleY + translateY - halo / 2 - 6
      const w = h.label.length * LABEL_CHAR_PX + LABEL_PAD * 2
      const box = {
        x0: x - w / 2,
        x1: x + w / 2,
        y0: y - LABEL_PX - LABEL_PAD,
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
      return [{ h, x, y, w }]
    })

  return (
    <svg
      style={svgStyle}
      width={width}
      height={canvasHeight}
      data-testid="graph-bubble-halos"
    >
      <g
        transform={`translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`}
      >
        {bubbleHalos.map(h => (
          <path
            key={`${h.bubble.start}-${h.bubble.end}`}
            d={h.path}
            fill="none"
            stroke={BUBBLE_KIND_COLORS[h.kind]}
            strokeOpacity={dimmed(h.nodeIds) ? 0.06 : 0.22}
            strokeWidth={halo}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {labels.map(({ h, x, y, w }) => {
        const color = BUBBLE_KIND_COLORS[h.kind]
        return (
          <g
            key={`${h.bubble.start}-${h.bubble.end}-label`}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              opacity: dimmed(h.nodeIds) ? 0.35 : 1,
            }}
            data-testid="graph-bubble-halo-label"
            onClick={() => {
              void model.popBubble(h.bubble)
            }}
          >
            <title>{`${h.label}\n${h.bubble.segmentCount} segments · click to open`}</title>
            <rect
              x={x - w / 2}
              y={y - LABEL_PX - LABEL_PAD + 2}
              width={w}
              height={LABEL_PX + LABEL_PAD * 2 - 2}
              rx={3}
              fill="rgba(255,255,255,0.85)"
              stroke={color}
              strokeWidth={1}
            />
            <text
              x={x}
              y={y}
              fontSize={LABEL_PX}
              fontFamily="sans-serif"
              fill={color}
              textAnchor="middle"
            >
              {h.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
})

export default BubbleHalos
