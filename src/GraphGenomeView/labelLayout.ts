import {
  nodeLabelBudget,
  placeSizeLabels,
  rowLabelBox,
  sizeLabelCandidates,
} from './graphLabels'
import { LABEL_CHAR_PX, occupancy, placeLabels } from './overlayLabels'

import type { BubbleHalo, RouteLabel } from './bubbles/bubbleHalos'
import type { DeletionEdge } from './deletionEdges'
import type { GenePin } from './genes/genePins'
import type { GraphLabel } from './graphLabels'
import type { Box, PlacedLabel } from './overlayLabels'
import type { AlleleDeletion, NodeSegment } from './types'
import type { AxisScale } from './util/geometry'

export const HALO_FACTOR = 3.4
const LEGEND_CORNER_WIDTH_PX = 240
const LEGEND_CORNER_HEIGHT_PX = 60
// routes whose own stretches are drawn on top of each other stack their chips
const ROUTE_STACK = 8
const GENE_PIN_DROP_PX = 18

export interface LabelLayoutSource {
  width: number
  canvasHeight: number
  axisScale: AxisScale
  translateX: number
  translateY: number
  contigThickness: number
  drawnRowLabels: { label: string; y: number }[]
  bubbleHalos: BubbleHalo[]
  genePins: GenePin[]
  poppedFrom?: { label: string }
  nodePositions?: Record<string, NodeSegment[]>
  nodeLengths: Map<string, number>
  showDeletionEdges: boolean
  deletions: DeletionEdge[]
  alleleDeletions: AlleleDeletion[]
  positionsVersion: number
}

export interface LabelLayout {
  bubbles: PlacedLabel<BubbleHalo>[]
  genes: PlacedLabel<GenePin>[]
  routes: PlacedLabel<{ halo: BubbleHalo; route: RouteLabel }>[]
  sizes: GraphLabel[]
}

// The order is what survives a crowd: the bubble's name, then the gene's, then
// what a deletion skips, then who takes each route, and a node's length last.
export function layoutLabels(m: LabelLayoutSource): LabelLayout {
  const { width, canvasHeight: height, translateX, translateY } = m
  const { scaleX, scaleY } = m.axisScale
  const frame = { width, height }
  const screen = (p: { x: number; y: number }) => ({
    x: p.x * scaleX + translateX,
    y: p.y * scaleY + translateY,
  })
  const reserved: Box[] = [
    {
      x0: width - LEGEND_CORNER_WIDTH_PX,
      x1: width,
      y0: 0,
      y1: LEGEND_CORNER_HEIGHT_PX,
    },
    ...m.drawnRowLabels.map(({ label, y }) =>
      rowLabelBox(label, y * scaleY + translateY),
    ),
  ]
  if (m.poppedFrom) {
    reserved.push({
      x0: 0,
      x1: 60 + m.poppedFrom.label.length * LABEL_CHAR_PX * 1.2,
      y0: 0,
      y1: 44,
    })
  }
  const take = occupancy(frame, reserved)

  // On a row layout a bubble's name goes in the band above the top row, where
  // it names the stretch below it; a lower row's allele would otherwise put it
  // on the reference line.
  const rowsTop = Math.min(...m.drawnRowLabels.map(r => r.y))
  const halo = m.contigThickness * HALO_FACTOR
  const byBubble = [...m.bubbleHalos].sort((a, b) => b.members - a.members)
  const bubbles = placeLabels(
    byBubble.map(h => {
      const { x, y } = screen({
        x: h.labelAt.x,
        y: Math.min(h.labelAt.y, rowsTop),
      })
      return { item: h, x, y: y - halo / 2 - 6, text: h.label }
    }),
    frame,
    take,
  )
  const genes = placeLabels(
    [...m.genePins]
      .sort((a, b) => b.gene.end - b.gene.start - (a.gene.end - a.gene.start))
      .map(pin => {
        const { x, y } = screen(pin.at)
        return {
          item: pin,
          x,
          y: y + m.contigThickness + GENE_PIN_DROP_PX,
          text: pin.covered < 0.98 ? `${pin.gene.name} …` : pin.gene.name,
        }
      }),
    frame,
    take,
  )
  const sizeCandidates = m.nodePositions
    ? sizeLabelCandidates({
        nodePositions: m.nodePositions,
        nodeLengths: m.nodeLengths,
        deletions: m.showDeletionEdges ? m.deletions : [],
        alleleDeletions: m.alleleDeletions,
        axis: m.axisScale,
        translateX,
        translateY,
        width,
        height,
        version: m.positionsVersion,
      })
    : { deletions: [], nodes: [] }
  const deletionLabels = placeSizeLabels(sizeCandidates.deletions, take)
  const routes = placeLabels(
    byBubble.flatMap(h =>
      h.routes.map(route => {
        const { x, y } = screen(route.at)
        return {
          item: { halo: h, route },
          x,
          y: y + 4,
          text: route.text,
          stack: ROUTE_STACK,
        }
      }),
    ),
    frame,
    take,
  )
  const nodeLabels = placeSizeLabels(
    sizeCandidates.nodes,
    take,
    nodeLabelBudget(width, height),
  )
  return { bubbles, genes, routes, sizes: [...deletionLabels, ...nodeLabels] }
}
