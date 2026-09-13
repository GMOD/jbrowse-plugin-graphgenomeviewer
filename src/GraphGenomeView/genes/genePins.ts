import { isBackbone } from '../anchoredNodes'
import { polylineSlice } from '../layout/mergeRuns'

import type { GeneModel } from './geneFeatures'
import type { Graph, NodeSegment } from '../types'

// A gene drawn onto the graph: its exons as stretches of the backbone nodes
// that carry them, in layout units, and one point on the backbone to pin its
// name to. Only the backbone has coordinates, so an allele shows no exon even
// where a haplotype's own annotation would put one.
export interface GenePin {
  gene: GeneModel
  // an SVG path of the exon stretches, in layout units
  exons: string
  // where the name goes: the backbone point at the gene's midpoint, or the
  // nearest backbone point inside the gene where the midpoint is not in the cut
  at: NodeSegment
  // how much of the gene's span the cut's backbone covers, so a label can say
  // when a gene runs off the cut
  covered: number
}

function round(v: number) {
  return Math.round(v * 100) / 100
}

function pathOf(points: NodeSegment[]) {
  return points
    .map((p, i) => `${i ? 'L' : 'M'}${round(p.x)},${round(p.y)}`)
    .join('')
}

export function genePins(
  graph: Graph,
  genes: GeneModel[],
  positions: Record<string, NodeSegment[]>,
): GenePin[] {
  const backbone = graph.nodes
    .filter(isBackbone)
    .filter(node => positions[node.id]?.length)
    .sort((a, b) => a.stable.start - b.stable.start)
  if (backbone.length === 0) {
    return []
  }
  const pins: GenePin[] = []
  for (const gene of genes) {
    const parts: string[] = []
    let at: NodeSegment | undefined
    let atDistance = Infinity
    let covered = 0
    const mid = (gene.start + gene.end) / 2
    for (const node of backbone) {
      if (node.stable.refName !== gene.refName) {
        continue
      }
      const nodeStart = node.stable.start
      const nodeEnd = nodeStart + node.length
      if (nodeEnd <= gene.start || nodeStart >= gene.end) {
        continue
      }
      const line = positions[node.id]!
      covered += Math.min(nodeEnd, gene.end) - Math.max(nodeStart, gene.start)
      for (const exon of gene.exons) {
        const a = Math.max(exon.start, nodeStart)
        const b = Math.min(exon.end, nodeEnd)
        if (b <= a) {
          continue
        }
        const stretch = polylineSlice(
          line,
          (a - nodeStart) / node.length,
          (b - nodeStart) / node.length,
        )
        if (stretch.length === 1) {
          stretch.push({ ...stretch[0]! })
        }
        parts.push(pathOf(stretch))
      }
      const pinBp = Math.min(Math.max(mid, nodeStart), nodeEnd)
      const distance = Math.abs(pinBp - mid)
      if (distance < atDistance) {
        atDistance = distance
        const [p] = polylineSlice(
          line,
          (pinBp - nodeStart) / node.length,
          (pinBp - nodeStart) / node.length,
        )
        at = p
      }
    }
    if (at) {
      pins.push({
        gene,
        exons: parts.join(''),
        at,
        covered: covered / (gene.end - gene.start),
      })
    }
  }
  return pins
}
