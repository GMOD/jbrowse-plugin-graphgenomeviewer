import type { RgfaSegment } from './rgfaBed.ts'

// A row of a walk file: one haplotype path's steps through one chunk of a
// reference, `anchorSeq chunkStart chunkEnd sample#hap#contig fragStart
// hapOffset piece nsteps steps`. Steps are node-id deltas with the orientation
// in the low bit, comma-separated, the first one absolute.
export interface WalkRow {
  name: string
  fragStart: number
  hapOffset: number
  piece: number
  n: number
  enc: string
  chunkStart: number
  chunkEnd: number
}

export function parseWalkRow(line: string): WalkRow {
  const c = line.split('\t')
  return {
    chunkStart: +c[1]!,
    chunkEnd: +c[2]!,
    name: c[3]!,
    fragStart: +c[4]!,
    hapOffset: +c[5]!,
    piece: +c[6]!,
    n: +c[7]!,
    enc: c[8]!,
  }
}

export function decodeSteps(enc: string, n: number) {
  const ids = new Int32Array(n)
  const rev = new Uint8Array(n)
  let prev = 0
  let i = 0
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

export interface WalkFragment {
  sample: string
  haplotype: string
  contig: string
  hapStart: number
  hapEnd: number
  steps: { id: string; rev: boolean }[]
}

/**
 * The W fragments a window draws: each haplotype's rows joined by consecutive
 * piece index, then cut to the stretch from its first to its last step on a
 * reference node inside the window plus `context`, detours between kept.
 * `segments` is what the node file returned for the same chunks; a step's
 * node is looked up there for its length and reference coordinate.
 */
export function walkFragments(
  rows: WalkRow[],
  segments: Map<string, RgfaSegment>,
  window: { refName: string; start: number; end: number },
  context: number,
) {
  const byPath = new Map<string, WalkRow[]>()
  for (const row of rows) {
    const key = `${row.name}\t${row.fragStart}`
    const list = byPath.get(key) ?? []
    list.push(row)
    byPath.set(key, list)
  }
  const lo = window.start - context
  const hi = window.end + context
  const inWindow = (segment: RgfaSegment | undefined) =>
    segment?.rank === 0 &&
    segment.refName === window.refName &&
    segment.end > lo &&
    segment.start < hi
  const fragments: WalkFragment[] = []
  for (const [key, pieces] of byPath) {
    pieces.sort((a, b) => a.piece - b.piece)
    const name = key.split('\t')[0]!
    const [sample, haplotype, ...contig] = name.split('#')
    const runs: WalkRow[][] = []
    let run: WalkRow[] = []
    for (const p of pieces) {
      if (run.length > 0 && p.piece !== run[run.length - 1]!.piece + 1) {
        runs.push(run)
        run = []
      }
      run.push(p)
    }
    if (run.length > 0) {
      runs.push(run)
    }
    for (const r of runs) {
      const n = r.reduce((s, p) => s + p.n, 0)
      const ids = new Int32Array(n)
      const rev = new Uint8Array(n)
      let at = 0
      for (const p of r) {
        const d = decodeSteps(p.enc, p.n)
        ids.set(d.ids, at)
        rev.set(d.rev, at)
        at += p.n
      }
      let first = -1
      let last = -1
      for (let i = 0; i < n; i++) {
        if (inWindow(segments.get(String(ids[i])))) {
          if (first < 0) {
            first = i
          }
          last = i
        }
      }
      if (first < 0) {
        continue
      }
      const len = (i: number) => {
        const s = segments.get(String(ids[i]))
        return s === undefined ? 0 : s.end - s.start
      }
      let hapStart = r[0]!.hapOffset
      for (let i = 0; i < first; i++) {
        hapStart += len(i)
      }
      let hapEnd = hapStart
      const steps: WalkFragment['steps'] = []
      for (let i = first; i <= last; i++) {
        hapEnd += len(i)
        steps.push({ id: String(ids[i]), rev: rev[i] === 1 })
      }
      fragments.push({
        sample: sample!,
        haplotype: haplotype!,
        contig: contig.join('#'),
        hapStart,
        hapEnd,
        steps,
      })
    }
  }
  return fragments
}

export function formatWalk(fragment: WalkFragment) {
  const { sample, haplotype, contig, hapStart, hapEnd, steps } = fragment
  const body = steps.map(s => `${s.rev ? '<' : '>'}${s.id}`).join('')
  return `W\t${sample}\t${haplotype}\t${contig}\t${hapStart}\t${hapEnd}\t${body}`
}
