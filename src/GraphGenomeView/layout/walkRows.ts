import { panSNSample } from '../../pansn'
import { pathOrigin } from '../pathAnchoring'

import type { Graph, GraphPath } from '../types'

// Each haplotype walk on its own bp axis, so what a walk carries through the
// window is its bar length. Reference-anchored rows cannot state that: a
// haplotype's private copies of a repeat consume no reference and collapse to
// a mark, which is why the KIV-2 array reads as a knot in every node layout
// and as a ladder here.
//
// A base-level graph does not revisit reference nodes through a repeat array,
// so a copy count is not a visit count; it is the sequence a walk spends
// between the reference nodes flanking the window, divided by the unit. Runs
// distinguish sequence the reference walk also carries from sequence it does
// not, so an expansion is the purple stretch of a row.

export interface WalkRun {
  // bp offset from the start of this walk's slice
  start: number
  bp: number
  onReference: boolean
}

export interface WalkRow {
  name: string
  label: string
  bp: number
  offReferenceBp: number
  // false when the walk does not reach both flanking reference nodes, in which
  // case the whole walk is measured and the bar says so
  complete: boolean
  runs: WalkRun[]
}

export interface WalkRows {
  // reference bp the rows' bars start at, so a row's x is origin + run.start
  origin: number
  reference: WalkRow
  // every other walk, longest first
  rows: WalkRow[]
}

function labelOf(path: GraphPath) {
  return path.sample !== undefined
    ? path.haplotype !== undefined
      ? `${path.sample}#${path.haplotype}`
      : path.sample
    : panSNSample(path.name)
}

function sliceBetween(
  nodeIds: string[],
  before: string | undefined,
  after: string | undefined,
) {
  if (before === undefined || after === undefined) {
    return { ids: nodeIds, complete: true }
  }
  const i0 = nodeIds.indexOf(before)
  const i1 = nodeIds.indexOf(after)
  if (i0 < 0 || i1 < 0) {
    return { ids: nodeIds, complete: false }
  }
  const [a, b] = i0 < i1 ? [i0, i1] : [i1, i0]
  return { ids: nodeIds.slice(a + 1, b), complete: true }
}

export function walkRows(
  graph: Graph,
  region?: { start: number; end: number },
): WalkRows | undefined {
  const paths = graph.paths ?? []
  // `referencePath` is the anchor name, which pathOrigin has already stripped
  // of the range suffix odgi leaves on a P record's name
  const reference =
    paths.find(p => pathOrigin(p.name).name === graph.referencePath) ?? paths[0]
  if (!reference || paths.length < 2) {
    return undefined
  }
  const lengthOf = new Map(graph.nodes.map(n => [n.id, n.length]))
  const onReference = new Set(reference.nodeIds)
  const referenceStart =
    graph.anchorPaths?.find(p => p.name === pathOrigin(reference.name).name)
      ?.start ?? 0

  let before: string | undefined
  let after: string | undefined
  if (region && region.end > region.start) {
    let pos = referenceStart
    for (const id of reference.nodeIds) {
      const len = lengthOf.get(id) ?? 0
      if (pos + len <= region.start) {
        before = id
      }
      if (after === undefined && pos >= region.end) {
        after = id
      }
      pos += len
    }
  }

  const rowOf = (path: GraphPath): WalkRow => {
    const { ids, complete } = sliceBetween(path.nodeIds, before, after)
    const runs: WalkRun[] = []
    let bp = 0
    let offReferenceBp = 0
    for (const id of ids) {
      const len = lengthOf.get(id) ?? 0
      const shared = onReference.has(id)
      const last = runs.at(-1)
      if (last?.onReference === shared) {
        last.bp += len
      } else {
        runs.push({ start: bp, bp: len, onReference: shared })
      }
      bp += len
      if (!shared) {
        offReferenceBp += len
      }
    }
    return {
      name: path.name,
      label: labelOf(path),
      bp,
      offReferenceBp,
      complete,
      runs,
    }
  }

  const origin = before !== undefined && region ? region.start : referenceStart
  return {
    origin,
    reference: rowOf(reference),
    rows: paths
      .filter(p => p !== reference)
      .map(rowOf)
      .sort((a, b) => b.bp - a.bp || a.label.localeCompare(b.label)),
  }
}
