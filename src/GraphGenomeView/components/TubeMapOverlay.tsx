import { useEffect, useRef } from 'react'

import { formatBp } from '@jbrowse/bandage-core/graphLabels'
import { drawTubeMapRuler, rulerInk } from '@jbrowse/bandage-core/tubeMap/axis'
import { drawTubeMapConnectors } from '@jbrowse/bandage-core/tubeMap/connectors'
import {
  deviationInk,
  drawDeviationMarks,
} from '@jbrowse/bandage-core/tubeMap/deviations'
import { drawTubeMap } from '@jbrowse/bandage-core/tubeMap/draw'
import { drawTubeMapGenes } from '@jbrowse/bandage-core/tubeMap/genes'
import { getDpr } from '@jbrowse/render-core/canvas2dUtils'
import { autorun } from 'mobx'
import { observer } from 'mobx-react'

import type { GraphPaneModel } from '../model'

const canvasStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  zIndex: 1,
}

// The tube map's ink, over the canvas, which draws nothing under a tube map
// layout. Above the tubes go the session's genes in a view of its own, or in
// a linear view the bands tying each reference box to its bp there; under
// them a reference ruler, unless the linear view's is already the axis.
// Repainted by an autorun on every change of transform, so a pan in the linear
// view above moves the tubes in the same frame as its other tracks.
const TubeMapOverlay = observer(function TubeMapOverlay({
  model,
}: {
  model: GraphPaneModel
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { tubeMapPicture, paneWidth, canvasHeight } = model
  useEffect(
    () =>
      autorun(() => {
        const canvas = ref.current
        const picture = model.tubeMapPicture
        const frame = model.tubeMapFrame
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx && picture && frame) {
          const dpr = getDpr()
          const width = model.paneWidth
          const height = model.canvasHeight
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, width, height)
          const tubeFrame = {
            ...frame,
            width,
            highlightNode: model.hoveredNode ?? model.selectedNode,
            darkMode: model.darkMode,
          }
          drawTubeMap(ctx, picture, tubeFrame)
          drawDeviationMarks(ctx, model.tubeMapDeviations, tubeFrame)
          drawTubeMapConnectors(
            ctx,
            model.tubeMapConnectors,
            model.connectorZoneBottom,
            tubeFrame,
          )
          const { bounds } = picture
          drawTubeMapGenes(
            ctx,
            model.tubeMapGenes,
            tubeFrame,
            frame.y(bounds.minY) - 2,
          )
          const boxes = model.tubeMapRulerBoxes
          if (boxes) {
            drawTubeMapRuler(
              ctx,
              boxes,
              tubeFrame,
              frame.y(bounds.maxY) + 4,
              model.layoutResult?.referenceAxis,
            )
          }
        }
      }),
    [model],
  )
  // Mounted whether or not there is a tube map, so the autorun above has its
  // canvas the moment a layout brings one.
  return (
    <canvas
      ref={ref}
      data-testid={tubeMapPicture ? 'graph-tube-map' : undefined}
      style={{
        ...canvasStyle,
        width: paneWidth,
        height: canvasHeight,
        display: tubeMapPicture ? 'block' : 'none',
      }}
    />
  )
})

export default TubeMapOverlay

const legendBoxStyle = {
  background: 'rgba(255,255,255,0.82)',
  padding: '4px 6px',
  borderRadius: 3,
  fontSize: 11,
  lineHeight: '15px',
  whiteSpace: 'nowrap' as const,
}
const legendRowStyle = { display: 'flex', alignItems: 'center', gap: 5 }
const SWATCH_PX = 18

// Two boxes' brackets, as the ruler draws them under every box
function BracketSwatch() {
  const brackets = [
    [0.5, 5.5],
    [8.5, SWATCH_PX - 0.5],
  ]
  return (
    <svg width={SWATCH_PX} height={7} style={{ flex: 'none' }}>
      <path
        d={brackets.map(([x0, x1]) => `M${x0},6 V1.5 H${x1} V6`).join(' ')}
        fill="none"
        stroke={rulerInk()}
        strokeWidth={1}
      />
    </svg>
  )
}

const tubeSwatchStyle = {
  width: SWATCH_PX,
  height: 7,
  flex: 'none',
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: '#b8b8c0',
}

function TickSwatch() {
  return (
    <div style={tubeSwatchStyle}>
      <div style={{ width: 2, backgroundColor: deviationInk() }} />
    </div>
  )
}

// What a tube map draws that nothing else on screen explains, each listed
// only while it applies
export const TubeMapLegend = observer(function TubeMapLegend({
  model,
}: {
  model: GraphPaneModel
}) {
  const { logWidths, foldBp } = model.tubeMapKeys
  return logWidths || foldBp !== undefined ? (
    <div style={legendBoxStyle} data-testid="graph-tube-map-legend">
      {foldBp !== undefined ? (
        <div style={legendRowStyle}>
          <TickSwatch />
          <span>a haplotype's variant under {formatBp(foldBp)}</span>
        </div>
      ) : null}
      {logWidths ? (
        <div style={legendRowStyle}>
          <BracketSwatch />
          <span>width grows with log of length</span>
        </div>
      ) : null}
    </div>
  ) : null
})
