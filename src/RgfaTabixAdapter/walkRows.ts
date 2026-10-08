import { NodeLimitError } from '@jbrowse/bandage-core/gbzWindow'
import { panSNMatchesPrefix } from '@jbrowse/bandage-core/pansn'
import { getBpDisplayStr } from '@jbrowse/core/util'

import type { RgfaLink, RgfaSegment } from './rgfaBed.ts'

// A walk-indexed graph is three tabix files filed under fixed chunks of each
// reference: walk rows, node rows and link rows. A row's first three columns
// name its chunk, either as the whole chunk or as its first base.
//
//   walks: anchor cs ce sample#hap#contig fragStart hapOffset piece nsteps steps
//   nodes: anchor cs ce id rank stableName start end [tags]
//   links: anchor cs ce src+ tgt- [both endpoints' coordinates]
//
// Steps are node-id deltas with the orientation in the low bit,
// comma-separated, the first of each row absolute. A haplotype path's piece in
// one chunk is cut into rows of at most a fixed number of steps, and each row
// takes the next piece index, so consecutive indices of one path join.
export interface WalkRow {
  name: string
  fragStart: number
  hapOffset: number
  piece: number
  n: number
  enc: string
  chunkStart: number
}

export interface WalkNode {
  refName: string
  start: number
  end: number
  rank: number
}

export interface WalkWindow {
  refName: string
  start: number
  end: number
}

// The name column, read without splitting the steps, so a row the cut does
// not want costs a few indexOf calls
export function walkRowName(line: string) {
  let at = -1
  for (let k = 0; k < 3; k++) {
    at = line.indexOf('\t', at + 1)
  }
  return line.slice(at + 1, line.indexOf('\t', at + 1))
}

export function parseWalkRow(line: string): WalkRow {
  const c = line.split('\t', 9)
  return {
    chunkStart: +c[1]!,
    name: c[3]!,
    fragStart: +c[4]!,
    hapOffset: +c[5]!,
    piece: +c[6]!,
    n: +c[7]!,
    enc: c[8]!,
  }
}

// Columns past the eighth (LN:i:, SQ:Z:, and whatever follows) are not read
export function parseNodeRow(line: string): [number, WalkNode] {
  const c = line.split('\t', 8)
  return [
    +c[3]!,
    { rank: +c[4]!, refName: c[5]!, start: +c[6]!, end: +c[7]! },
  ]
}

export function parseLinkEnds(line: string) {
  const c = line.split('\t', 5)
  const source = c[3]!
  const target = c[4]!
  return {
    source: +source.slice(0, -1),
    sourceStrand: source.slice(-1),
    target: +target.slice(0, -1),
    targetStrand: target.slice(-1),
  }
}

// The chunk size a file states in a `#walks\tchunk:i:65536` header line
export function headerChunk(lines: string[]) {
  for (const line of lines) {
    const match = /(?:^|\t)chunk:i:(\d+)/.exec(line)
    if (match) {
      return +match[1]!
    }
  }
  return undefined
}

// The first base a cut queries: the start of the chunk holding the base one
// chunk before the window, whose rows carry the detour a haplotype takes into
// the window's first reference node
export function chunkQueryStart(start: number, chunk: number) {
  return Math.max(0, Math.floor((start - chunk) / chunk) * chunk)
}

// Which walks a cut decodes: the reference's, and those `wanted` names by
// PanSN prefix at sample or haplotype depth; undefined decodes every one
export function walkNameFilter(
  wanted: string[] | undefined,
  referenceHaplotype: string | undefined,
) {
  return wanted === undefined || wanted.length === 0
    ? undefined
    : (name: string) =>
        panSNMatchesPrefix(name, referenceHaplotype) ||
        wanted.some(prefix => panSNMatchesPrefix(name, prefix))
}

export function decodeSteps(
  enc: string,
  n: number,
  ids = new Int32Array(n),
  rev = new Uint8Array(n),
  at = 0,
) {
  let prev = 0
  let i = at
  let v = 0
  let neg = false
  for (let p = 0; p <= enc.length; p++) {
    const ch = p < enc.length ? enc.charCodeAt(p) : 44
    if (ch === 44) {
      const d = neg ? -v : v
      const r = d & 1
      rev[i] = r
      prev += (d - r) / 2
      ids[i++] = prev
      v = 0
      neg = false
    } else if (ch === 45) {
      neg = true
    } else {
      v = v * 10 + (ch - 48)
    }
  }
  return { ids, rev }
}

// One stretch of a haplotype path: rows of consecutive piece index, decoded
export interface WalkRun {
  name: string
  hapOffset: number
  ids: Int32Array
  rev: Uint8Array
}

export function joinPieces(rows: WalkRow[]) {
  const byPath = new Map<string, WalkRow[]>()
  for (const row of rows) {
    const key = `${row.name}\t${row.fragStart}`
    const list = byPath.get(key)
    if (list) {
      list.push(row)
    } else {
      byPath.set(key, [row])
    }
  }
  const runs: WalkRun[] = []
  for (const pieces of byPath.values()) {
    pieces.sort((a, b) => a.piece - b.piece)
    let from = 0
    for (let i = 1; i <= pieces.length; i++) {
      if (i === pieces.length || pieces[i]!.piece !== pieces[i - 1]!.piece + 1) {
        runs.push(decodeRun(pieces.slice(from, i)))
        from = i
      }
    }
  }
  return runs
}

function decodeRun(pieces: WalkRow[]): WalkRun {
  const n = pieces.reduce((sum, p) => sum + p.n, 0)
  const ids = new Int32Array(n)
  const rev = new Uint8Array(n)
  let at = 0
  for (const p of pieces) {
    decodeSteps(p.enc, p.n, ids, rev, at)
    at += p.n
  }
  return { name: pieces[0]!.name, hapOffset: pieces[0]!.hapOffset, ids, rev }
}

export interface WalkFragment {
  name: string
  hapStart: number
  hapEnd: number
  ids: Int32Array
  rev: Uint8Array
}

/**
 * The cut a window draws from its walks: the reference inside the window plus
 * `context`, and each run from its first to its last step on that stretch,
 * run on outward while the next step's node is already in the cut. Without
 * the run-on a haplotype whose alternate allele straddles the edge stopped
 * short of a node other walks had brought into the cut, and that node drew
 * without it. The run-on adds no node, so one pass is enough.
 */
export function walkCut(
  runs: WalkRun[],
  nodes: Map<number, WalkNode>,
  window: WalkWindow,
  context: number,
) {
  const lo = window.start - context
  const hi = window.end + context
  const onWindow = (node: WalkNode | undefined) =>
    node !== undefined &&
    node.rank === 0 &&
    node.refName === window.refName &&
    node.end > lo &&
    node.start < hi
  const kept = new Set<number>()
  for (const [id, node] of nodes) {
    if (onWindow(node)) {
      kept.add(id)
    }
  }
  const spans: { run: WalkRun; first: number; last: number }[] = []
  for (const run of runs) {
    const { ids } = run
    let first = -1
    let last = -1
    for (let i = 0; i < ids.length; i++) {
      if (onWindow(nodes.get(ids[i]!))) {
        if (first < 0) {
          first = i
        }
        last = i
      }
    }
    if (first >= 0) {
      for (let i = first; i <= last; i++) {
        kept.add(ids[i]!)
      }
      spans.push({ run, first, last })
    }
  }
  const length = (id: number) => {
    const node = nodes.get(id)
    return node === undefined ? 0 : node.end - node.start
  }
  const fragments: WalkFragment[] = []
  for (const { run, first: f, last: l } of spans) {
    const { ids, rev } = run
    let first = f
    let last = l
    while (first > 0 && kept.has(ids[first - 1]!)) {
      first--
    }
    while (last < ids.length - 1 && kept.has(ids[last + 1]!)) {
      last++
    }
    let hapStart = run.hapOffset
    for (let i = 0; i < first; i++) {
      hapStart += length(ids[i]!)
    }
    let hapEnd = hapStart
    for (let i = first; i <= last; i++) {
      hapEnd += length(ids[i]!)
    }
    fragments.push({
      name: run.name,
      hapStart,
      hapEnd,
      ids: ids.subarray(first, last + 1),
      rev: rev.subarray(first, last + 1),
    })
  }
  return { kept, fragments }
}

export function formatWalk({ name, hapStart, hapEnd, ids, rev }: WalkFragment) {
  const [sample, haplotype, ...contig] = name.split('#')
  const steps = new Array<string>(ids.length)
  for (let i = 0; i < ids.length; i++) {
    steps[i] = (rev[i] ? '<' : '>') + ids[i]
  }
  return `W\t${sample}\t${haplotype}\t${contig.join('#')}\t${hapStart}\t${hapEnd}\t${steps.join('')}`
}

// The cut's nodes and the links between them, in the shapes formatSubgraph
// writes
export function keptGraph(
  kept: Set<number>,
  nodes: Map<number, WalkNode>,
  links: ReturnType<typeof parseLinkEnds>[],
) {
  const segment = (id: number): RgfaSegment => ({
    id: String(id),
    ...nodes.get(id)!,
    tags: '',
  })
  const segments = new Map<string, RgfaSegment>()
  for (const id of kept) {
    if (nodes.has(id)) {
      segments.set(String(id), segment(id))
    }
  }
  const keptLinks = new Map<string, RgfaLink>()
  for (const { source, sourceStrand, target, targetStrand } of links) {
    if (segments.has(String(source)) && segments.has(String(target))) {
      keptLinks.set(`${source}${sourceStrand}${target}${targetStrand}`, {
        source: String(source),
        sourceStrand,
        target: String(target),
        targetStrand,
        sourceSegment: segments.get(String(source))!,
        targetSegment: segments.get(String(target))!,
      })
    }
  }
  return { segments, links: keptLinks }
}

/**
 * The zoom-in notice for a cut whose walk rows hold more steps than `budget`,
 * or undefined when they fit. A window reads whole chunks, the one before it
 * included, so the span that fits is counted in chunks from the window's
 * start; when the two chunks a window there always reads are over on their
 * own, no zoom fits and the notice asks for fewer haplotypes.
 */
export function stepBudgetError(
  rows: WalkRow[],
  budget: number,
  window: { start: number; end: number },
  chunk: number,
  filtered: boolean,
) {
  let total = 0
  const perChunk = new Map<number, number>()
  for (const row of rows) {
    total += row.n
    perChunk.set(row.chunkStart, (perChunk.get(row.chunkStart) ?? 0) + row.n)
  }
  if (total <= budget) {
    return undefined
  }
  const windowBp = window.end - window.start
  let read = 0
  let fitsBp = 0
  for (const cs of [...perChunk.keys()].sort((a, b) => a - b)) {
    read += perChunk.get(cs)!
    if (read > budget) {
      break
    }
    fitsBp = Math.max(fitsBp, cs + chunk - window.start)
  }
  const error = new NodeLimitError(budget, windowBp, Math.max(fitsBp, 1))
  error.message =
    fitsBp > 0
      ? `Zoom in to about ${getBpDisplayStr(fitsBp)} to see the graph`
      : `Too many haplotype steps here to draw ${filtered ? 'these haplotypes' : 'every haplotype'} (${read.toLocaleString()} against walkStepBudget ${budget.toLocaleString()}); choose fewer haplotypes`
  return error
}
