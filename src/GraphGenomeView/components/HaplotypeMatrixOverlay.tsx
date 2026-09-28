import {
  BUBBLE_KIND_COLORS,
  BUBBLE_KIND_NAMES,
  formatBp,
} from '@jbrowse/bandage-core/bubbles/classifyBubble'
import {
  NOT_CROSSED,
  routeDelta,
} from '@jbrowse/bandage-core/bubbles/haplotypeMatrix'
import { ROW_HEIGHT_PX } from '@jbrowse/bandage-core/layout/rowSpacing'
import { LABEL_CHAR_PX } from '@jbrowse/bandage-core/overlayLabels'
import { observer } from 'mobx-react'

import type { GraphPaneModel } from '../model'
import type {
  HaplotypeMatrix,
  MatrixColumn,
} from '@jbrowse/bandage-core/bubbles/haplotypeMatrix'

// The haplotype matrix: a cell per walk and site, coloured by the route that
// walk takes, as a multi-sample variant display colours a genotype. A column
// stands for one site whatever its length, so a band ties it back to the bp
// the site spans, and a strip over it says what kind of site it is.

const svgStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  pointerEvents: 'none' as const,
  zIndex: 3,
}

const REFERENCE_ROUTE = '#cfcfcf'
// Tableau 10 without its grey, which the reference's route has
const ROUTE_COLORS = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
]
const RARER_ROUTES = '#555'
const BAND_FILL = 'rgba(0,0,0,0.07)'
const BAND_SIDE = 'rgba(0,0,0,0.35)'
const LIT_FILL = 'rgba(255,192,203,0.5)'
const LIT_SIDE = '#ff0000'
const CELL_TEXT_PX = 10

function routeColor(column: MatrixColumn, route: number) {
  const alternative = column.referenceRoute ? route - 1 : route
  return alternative < 0
    ? REFERENCE_ROUTE
    : (ROUTE_COLORS[alternative] ?? RARER_ROUTES)
}

function signedBp(delta: number) {
  return `${delta > 0 ? '+' : '−'}${formatBp(Math.abs(delta))}`
}

function visibleRange(count: number, at: (i: number) => number, max: number) {
  let first = 0
  while (first < count && at(first + 1) < 0) {
    first++
  }
  let last = first
  while (last < count && at(last) <= max) {
    last++
  }
  return { first, last }
}

// The cells on screen, and where each sits. A cell whose route is longer or
// shorter than the reference's states by how much, where the words fit.
function cellsOnScreen(model: GraphPaneModel, matrix: HaplotypeMatrix) {
  const { scaleX, scaleY, translateX, translateY, paneWidth, canvasHeight } =
    model
  const rowPx = ROW_HEIGHT_PX * scaleY
  const columns = visibleRange(
    matrix.columns.length,
    c => c * scaleX + translateX,
    paneWidth,
  )
  const rows = visibleRange(
    matrix.rows.length,
    r => (r - 0.5) * rowPx + translateY,
    canvasHeight,
  )
  const gap = Math.min(1, scaleX / 4)
  const cells = []
  for (let r = rows.first; r < rows.last; r++) {
    for (let c = columns.first; c < columns.last; c++) {
      const route = matrix.cells[r]![c]!
      const column = matrix.columns[c]!
      const delta = route === NOT_CROSSED ? 0 : routeDelta(column, route)
      const text = delta === 0 ? undefined : signedBp(delta)
      const width = scaleX - 2 * gap
      cells.push({
        row: r,
        column: c,
        route,
        x: c * scaleX + translateX + gap,
        y: (r - 0.5) * rowPx + translateY + 1,
        width,
        height: rowPx - 2,
        text:
          text && text.length * LABEL_CHAR_PX * 0.85 + 4 <= width
            ? text
            : undefined,
      })
    }
  }
  return cells
}

function bandPaths(
  connectors: {
    top0: number
    top1: number
    bottom0: number
    bottom1: number
  }[],
  top: number,
  bottom: number,
) {
  let fill = ''
  let sides = ''
  for (const c of connectors) {
    fill += `M${c.top0},${top}L${c.top1},${top}L${c.bottom1},${bottom}L${c.bottom0},${bottom}Z`
    sides += `M${c.top0},${top}L${c.bottom0},${bottom}M${c.top1},${top}L${c.bottom1},${bottom}`
  }
  return { fill, sides }
}

const HaplotypeMatrixOverlay = observer(function HaplotypeMatrixOverlay({
  model,
}: {
  model: GraphPaneModel
}) {
  const matrix = model.haplotypeMatrix
  if (!matrix) {
    return null
  }
  const { paneWidth: width, canvasHeight, hoveredCell, matrixKinds } = model
  if (matrix.columns.length === 0) {
    return (
      <svg style={svgStyle} width={width} height={canvasHeight}>
        <text
          x={model.fitPadLeft}
          y={model.translateY - ROW_HEIGHT_PX}
          fontSize={12}
          fontFamily="sans-serif"
          fill="#555"
        >
          The walks take one route through every site in this cut
        </text>
      </svg>
    )
  }
  const bands = model.matrixBands
  if (!bands) {
    return null
  }
  const cells = cellsOnScreen(model, matrix)
  const lit = bands.connectors.find(
    c => hoveredCell && c.node === String(hoveredCell.column),
  )
  const all = bandPaths(bands.connectors, bands.top, bands.bottom)
  const litPaths = lit ? bandPaths([lit], bands.top, bands.bottom) : undefined
  const { ruler } = bands
  return (
    <svg
      style={svgStyle}
      width={width}
      height={canvasHeight}
      data-testid="graph-haplotype-matrix"
    >
      {ruler ? (
        <g fontSize={10} fontFamily="sans-serif" fill="#555">
          <line
            x1={ruler.x0}
            x2={ruler.x1}
            y1={bands.top}
            y2={bands.top}
            stroke="#999"
            strokeWidth={2}
          />
          <text x={ruler.x0} y={bands.top - 4}>
            {ruler.start.toLocaleString()}
          </text>
          <text x={ruler.x1} y={bands.top - 4} textAnchor="end">
            {ruler.end.toLocaleString()}
          </text>
        </g>
      ) : null}
      <path d={all.fill} fill={BAND_FILL} />
      <path d={all.sides} stroke={BAND_SIDE} strokeWidth={0.5} />
      {litPaths ? (
        <>
          <path d={litPaths.fill} fill={LIT_FILL} />
          <path d={litPaths.sides} stroke={LIT_SIDE} strokeWidth={1} />
        </>
      ) : null}
      {bands.connectors.map(c => (
        <rect
          key={c.node}
          x={c.bottom0}
          y={bands.stripTop}
          width={Math.max(1, c.bottom1 - c.bottom0)}
          height={bands.stripPx}
          fill={BUBBLE_KIND_COLORS[matrixKinds[Number(c.node)]!.kind]}
        />
      ))}
      {cells.map(cell =>
        cell.route === NOT_CROSSED ? null : (
          <rect
            key={`${cell.row}-${cell.column}`}
            x={cell.x}
            y={cell.y}
            width={Math.max(0.5, cell.width)}
            height={cell.height}
            fill={routeColor(matrix.columns[cell.column]!, cell.route)}
          />
        ),
      )}
      {cells.map(cell =>
        cell.text ? (
          <text
            key={`${cell.row}-${cell.column}-text`}
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2 + 3.5}
            fontSize={CELL_TEXT_PX}
            fontFamily="sans-serif"
            textAnchor="middle"
            fill="#111"
            stroke="white"
            strokeWidth={2.5}
            paintOrder="stroke"
          >
            {cell.text}
          </text>
        ) : null,
      )}
      {hoveredCell
        ? cells
            .filter(
              c => c.row === hoveredCell.row && c.column === hoveredCell.column,
            )
            .map(c => (
              <rect
                key="hovered"
                x={c.x - 0.5}
                y={c.y - 0.5}
                width={Math.max(1, c.width) + 1}
                height={c.height + 1}
                fill="none"
                stroke="#111"
                strokeWidth={1.5}
              />
            ))
        : null}
    </svg>
  )
})

export default HaplotypeMatrixOverlay

const legendBoxStyle = {
  background: 'rgba(255,255,255,0.82)',
  padding: '4px 6px',
  borderRadius: 3,
  fontSize: 11,
  lineHeight: '15px',
  whiteSpace: 'nowrap' as const,
}
const legendRowStyle = { display: 'flex', alignItems: 'center', gap: 5 }
const swatchStyle = { width: 18, height: 10, flex: 'none' as const }

function Swatch({ colors, outline }: { colors: string[]; outline?: boolean }) {
  return (
    <div
      style={{
        ...swatchStyle,
        display: 'flex',
        boxShadow: outline ? 'inset 0 0 0 1px #bbb' : undefined,
      }}
    >
      {colors.map(color => (
        <div key={color} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </div>
  )
}

// Each row appears while what it names is on screen
export const HaplotypeMatrixLegend = observer(function HaplotypeMatrixLegend({
  model,
}: {
  model: GraphPaneModel
}) {
  const matrix = model.haplotypeMatrix
  if (!matrix || matrix.columns.length === 0) {
    return null
  }
  const reference = matrix.rows[0]!.label
  const alternatives = Math.max(
    0,
    ...matrix.columns.map(c => c.routes.length - (c.referenceRoute ? 1 : 0)),
  )
  const uncrossed = matrix.cells.some(row => row.includes(NOT_CROSSED))
  const kindsByColor = new Map<string, Set<string>>()
  for (const { kind } of model.matrixKinds) {
    const color = BUBBLE_KIND_COLORS[kind]
    const kinds = kindsByColor.get(color) ?? new Set<string>()
    kinds.add(BUBBLE_KIND_NAMES[kind])
    kindsByColor.set(color, kinds)
  }
  const texts = cellsOnScreen(model, matrix).some(c => c.text)
  return (
    <div style={legendBoxStyle} data-testid="graph-haplotype-matrix-legend">
      {matrix.columns.some(c => c.referenceRoute) ? (
        <div style={legendRowStyle}>
          <Swatch colors={[REFERENCE_ROUTE]} />
          <span>{reference}'s route</span>
        </div>
      ) : null}
      <div style={legendRowStyle}>
        <Swatch colors={ROUTE_COLORS.slice(0, Math.min(3, alternatives))} />
        <span>other routes, most taken first</span>
      </div>
      {alternatives > ROUTE_COLORS.length ? (
        <div style={legendRowStyle}>
          <Swatch colors={[RARER_ROUTES]} />
          <span>routes past the {ROUTE_COLORS.length}th</span>
        </div>
      ) : null}
      {uncrossed ? (
        <div style={legendRowStyle}>
          <Swatch colors={['white']} outline />
          <span>walk does not cross the site in the cut</span>
        </div>
      ) : null}
      {texts ? (
        <div style={legendRowStyle}>
          <span style={{ ...swatchStyle, textAlign: 'center' }}>±</span>
          <span>route length against {reference}'s</span>
        </div>
      ) : null}
      {[...kindsByColor].map(([color, kinds]) => (
        <div key={color} style={legendRowStyle}>
          <div style={{ ...swatchStyle, height: 4, backgroundColor: color }} />
          <span>site: {[...kinds].join(', ')}</span>
        </div>
      ))}
      <div style={legendRowStyle}>
        <div style={swatchStyle} />
        <span>rows: each beside the one it differs from least</span>
      </div>
    </div>
  )
})

// The view's name for the contig, where the bubble has the graph's PanSN one
function siteLocation(column: MatrixColumn, refName: string) {
  const { start, end } = column.bubble
  return end > start
    ? `${refName}:${(start + 1).toLocaleString()}-${end.toLocaleString()}`
    : `${refName}:${start.toLocaleString()}^${(start + 1).toLocaleString()}`
}

// The hovered cell in words: whose row, which site, and the route it takes
export const HaplotypeMatrixReadout = observer(function HaplotypeMatrixReadout({
  model,
}: {
  model: GraphPaneModel
}) {
  const matrix = model.haplotypeMatrix
  const cell = model.hoveredCell
  const column = cell ? matrix?.columns[cell.column] : undefined
  if (!matrix || !cell || !column) {
    return null
  }
  const row = matrix.rows[cell.row]!
  const reference = matrix.rows[0]!.label
  const route = matrix.cells[cell.row]![cell.column]!
  const kind = model.matrixKinds[cell.column]!
  const taken = route === NOT_CROSSED ? undefined : column.routes[route]!
  const walks = matrix.rows.length
  const delta = taken === undefined ? 0 : routeDelta(column, route)
  const against =
    delta === 0
      ? `same length as ${reference}'s`
      : `${signedBp(delta)} against ${reference}'s`
  return (
    <>
      <strong>{row.label}</strong> · {kind.label}
      <br />
      {siteLocation(
        column,
        model.graphRegion?.refName ?? column.bubble.refName,
      )}
      <br />
      {taken === undefined
        ? 'does not cross this site in the cut'
        : column.referenceRoute && route === 0
          ? `${reference}'s route, ${taken.bp.toLocaleString()} bp, taken by ${taken.carriers} of ${walks} walks`
          : `route ${route + 1} of ${column.routes.length}, ${taken.bp.toLocaleString()} bp (${against}), taken by ${taken.carriers} of ${walks} walks`}
    </>
  )
})
