import { useCallback, useId, useMemo } from 'react'

import { walkRowsTree } from '@jbrowse/bandage-core/layout/walkRowDraw'
import { computed } from 'mobx'
import { observer } from 'mobx-react'

import ElTree from './ElTree'
import { PaneOverlayCanvas, PaneSvgLayer } from './PaneLayer'
import { SECTION_HEADER_PX } from '../walkRowGroups'
import { paintWalkRowSpans, walkRowSpans } from '../walkRowSpans'

import type { GraphPaneModel } from '../model'
import type { WalkRowSection } from '../walkRowGroups'
import type { El } from '@jbrowse/bandage-core/el'
import type {
  WalkRowsFrame,
  WalkRowsWithCalls,
} from '@jbrowse/bandage-core/layout/walkRowDraw'

// The walk-rows layout's bars: one per haplotype walk under the reference
// row, each on its own bp axis from the window's left edge. The runs paint as
// spans on a canvas, coloured by whether they are on the reference walk's
// path, and core's walkRowsTree draws the rest: unit separators, each row's
// genes from its own assembly's annotation, the allele a repeat genotype
// called and a readout. Under the
// reference-position ramp an aligned run takes the hue of the reference it is
// threaded through. In a tandem array that is the aligner's pick among
// near-identical copies, so the hue says which reference copy the graph used,
// not which one a copy resembles.
//
// The walk rows pair a repeat record's allele with each walk — see
// repeats/walkCalls.ts, which also holds the threshold a red readout is read
// off. Colouring each copy by its unit is jbrowse-plugin-tandem-repeat's.

// The rows' trees, a section at a time while grouped. walkRowsTree puts its
// i-th row at i * rowPx below its reference row and draws that row too, so
// each section is drawn shifted down to its place with its reference row
// dropped.
export function walkRowTrees(
  bars: WalkRowsWithCalls,
  sections: WalkRowSection[],
  rowY: (i: number) => number,
  frame: WalkRowsFrame & { rowPx: number },
  o: Parameters<typeof walkRowsTree>[2] & { idPrefix: string },
): El[] {
  if (sections.length === 0) {
    return [walkRowsTree(bars, frame, o)]
  }
  return [
    walkRowsTree({ ...bars, rows: [] }, frame, o),
    ...sections.flatMap((section, k) => {
      const tree = walkRowsTree(
        {
          ...bars,
          rows: bars.rows.slice(
            section.first - 1,
            section.first - 1 + section.count,
          ),
        },
        {
          ...frame,
          translateY:
            frame.translateY +
            (rowY(section.first) - frame.rowPx) * frame.scaleY,
        },
        { ...o, idPrefix: `${o.idPrefix}-s${k}` },
      )
      return tree.children.filter(
        (c): c is El =>
          typeof c !== 'string' &&
          c.attrs['data-testid'] !== 'graph-walk-reference',
      )
    }),
  ]
}

// The spans are recut only when the rows, the zoom or the ramp change
function WalkRowSpansCanvas({ model }: { model: GraphPaneModel }) {
  const spans = useMemo(
    () =>
      computed(() => {
        const bars = model.walkRowBars
        return bars
          ? walkRowSpans(
              [bars.reference, ...bars.rows],
              model.scaleX,
              model.referenceRampDomain,
            )
          : undefined
      }),
    [model],
  )
  const paint = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const bars = model.walkRowBars
      const place = model.walkRowPlacement
      const pitch = model.walkRowPitch
      const painted = spans.get()
      if (!bars || !place || !pitch || !painted) {
        return
      }
      const sections = model.walkRowGroups?.sections
      const blocks = sections?.length
        ? [
            { first: 0, count: 1, rowY: place.rowY(0) },
            ...sections.map(s => ({
              first: s.first,
              count: s.count,
              rowY: place.rowY(s.first),
            })),
          ]
        : [{ first: 0, count: bars.rows.length + 1, rowY: place.rowY(0) }]
      paintWalkRowSpans(ctx, painted, {
        ...model.screenTransform,
        width: model.paneWidth,
        height: model.canvasHeight,
        rowPx: pitch.rowPx,
        barPx: pitch.barPx,
        origin: bars.origin,
        blocks,
      })
    },
    [model, spans],
  )
  return (
    <PaneOverlayCanvas
      model={model}
      zIndex={3}
      testId="graph-walk-rows-spans"
      paint={paint}
    />
  )
}

// `vector` for an SVG export, which draws the bars as walkRowsTree's rects
const WalkRowsOverlay = observer(function WalkRowsOverlay({
  model,
  vector = false,
}: {
  model: GraphPaneModel
  vector?: boolean
}) {
  const idPrefix = useId().replace(/[^\w-]/g, '')
  const bars = model.walkRowBars
  const place = model.walkRowPlacement
  const pitch = model.walkRowPitch
  const bare = useMemo(
    () =>
      bars && {
        ...bars,
        reference: { ...bars.reference, runs: [] },
        rows: bars.rows.map(r => ({ ...r, runs: [] })),
      },
    [bars],
  )
  if (!bars || !bare || !place || !pitch) {
    return null
  }
  const { paneWidth: width, canvasHeight } = model
  const hovered = model.hoveredWalkRowText
    ? [bars.reference, ...bars.rows].findIndex(
        r => r.name === model.hoveredWalkRow,
      )
    : -1
  const lit =
    hovered >= 0
      ? {
          row: [bars.reference, ...bars.rows][hovered]!,
          start: model.toScreen({ x: bars.origin, y: place.rowY(hovered) }),
        }
      : undefined
  const frame = {
    ...model.screenTransform,
    width,
    height: canvasHeight,
    ...pitch,
  }
  return (
    <>
      {vector ? null : <WalkRowSpansCanvas model={model} />}
      <PaneSvgLayer
        model={model}
        zIndex={3}
        overflow="visible"
        testId="graph-walk-rows"
      >
        {walkRowTrees(
          vector ? bars : bare,
          model.walkRowGroups?.sections ?? [],
          place.rowY,
          frame,
          {
            ramp: model.referenceRampDomain,
            rowGenes: model.walkRowGenes,
            idPrefix,
          },
        ).map((tree, i) => (
          <ElTree key={i} el={tree} />
        ))}
        {place.headers.map(header => (
          <text
            key={header.key}
            x={10}
            y={
              model.toScreen({ x: 0, y: header.top }).y + SECTION_HEADER_PX - 4
            }
            fontFamily="sans-serif"
            fontSize={11}
            fontWeight="bold"
            fill="#333"
            data-testid="graph-walk-section"
          >
            {header.title}
          </text>
        ))}
        {lit ? (
          <rect
            data-testid="graph-walk-row-hovered"
            x={lit.start.x - 2}
            y={lit.start.y - pitch.rowPx / 2 - 1}
            width={lit.row.bp * model.scaleX + 4}
            height={pitch.rowPx + 2}
            fill="none"
            stroke="#111"
            strokeWidth={1}
          />
        ) : null}
      </PaneSvgLayer>
    </>
  )
})

export default WalkRowsOverlay
