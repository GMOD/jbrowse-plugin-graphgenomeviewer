import { REFERENCE_RANK, isAnchored } from '../GraphGenomeView/anchoredNodes'

import type { AnchoredNode } from '../GraphGenomeView/anchoredNodes'
import type { Graph } from '../GraphGenomeView/types'

// Project an rGFA subgraph onto the reference as per-sample alleles.
//
// rGFA states, on every segment, the stable sequence it came from (SN), its
// offset there (SO) and its rank (SR, 0 on the reference). That is enough to
// say what each contributing assembly does relative to the reference *without
// any walk records*: an allele is a run of off-reference segments, and the
// rank-0 segments it detaches from and reattaches to give it a reference span.
// Comparing that span to the allele's own length classifies it.
//
// This matters because rGFA has no W/P lines at all — `test_data/
// ecoli_rgfa_slice.gfa` has zero, and minigraph never emits them. Anything
// requiring walks to attribute variation would not work on the format the
// graph tracks actually read.
//
// The attribution is by *source assembly*, which for an incrementally built
// minigraph graph is the assembly that first contributed the sequence. It is
// not a genotype: other haplotypes may traverse the same segment and rGFA does
// not record that. `AlleleProjection.attribution` carries this distinction so a
// display cannot present it as a genotype matrix by accident.

export interface ProjectedAllele {
  // reference coordinates, from the flanking rank-0 segments
  refName: string
  start: number
  end: number
  // PanSN sample name parsed off the allele's own stable sequence
  sample: string
  haplotype?: number
  sourceRefName: string
  // bp of reference between the anchors, and bp the allele substitutes for it
  refSpan: number
  altLength: number
  // altLength - refSpan; positive is net gain
  delta: number
  kind: 'insertion' | 'deletion' | 'substitution'
  // segment names for display, and the strand-suffixed graph node ids a layout
  // needs to position them; the two differ and conflating them silently
  // produces an empty layout
  segmentIds: string[]
  nodeIds: string[]
  rank: number
}

export interface AlleleProjection {
  alleles: ProjectedAllele[]
  // samples present, sorted by name. Sorted rather than in first-appearance
  // order because the point is stability across pans: which allele a traversal
  // reaches first changes with the window, a name does not.
  samples: string[]
  // never 'genotype'. See the note above.
  attribution: 'source-assembly'
  // runs that reach the edge of the fetched subgraph with only one rank-0
  // anchor, so no reference span can be stated. Surfaced rather than dropped
  // silently, because at a window boundary they are the common case and a
  // display that shows nothing is indistinguishable from one that is broken.
  unanchored: number
}

// PanSN is `sample#haplotype#contig` (the HPRC files) but minigraph is happy
// with a bare contig name, and our own E. coli fixture is `K12#1#chr`. Parse
// what is there rather than requiring the full form.
export function parsePanSN(refName: string) {
  const parts = refName.split('#')
  const haplotype = parts.length >= 2 ? Number(parts[1]) : Number.NaN
  return {
    sample: parts[0] ?? refName,
    haplotype: Number.isFinite(haplotype) ? haplotype : undefined,
  }
}

function adjacency(graph: Graph) {
  const adj = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    const existing = adj.get(a)
    if (existing) {
      existing.push(b)
    } else {
      adj.set(a, [b])
    }
  }
  for (const edge of graph.edges) {
    link(edge.from, edge.to)
    link(edge.to, edge.from)
  }
  return adj
}

// Walk one connected run of off-reference segments, collecting the rank-0
// segments on its boundary. A single allele is often several segments (a bubble
// path), so projecting segment-by-segment both fragments the picture and
// invents anchors for interior segments that have none.
// The run is walked through *anchored* nodes only. Everything this reports about
// an allele — its sample, its rank, its reference span — is read off a stable
// coordinate, so a segment without one cannot be a member; a graph that carries
// SN/SO/SR on only some segments would otherwise walk into one and dereference a
// coordinate it does not have.
function collectRun(
  seed: string,
  byId: Map<string, AnchoredNode>,
  adj: Map<string, string[]>,
  claimed: Set<string>,
) {
  const members: AnchoredNode[] = []
  const anchors: AnchoredNode[] = []
  const queue = [seed]
  claimed.add(seed)

  while (queue.length > 0) {
    const id = queue.pop()!
    const node = byId.get(id)
    if (node) {
      members.push(node)
      for (const neighborId of adj.get(id) ?? []) {
        const neighbor = byId.get(neighborId)
        if (neighbor) {
          if (neighbor.stable.rank === REFERENCE_RANK) {
            anchors.push(neighbor)
          } else if (!claimed.has(neighborId)) {
            claimed.add(neighborId)
            queue.push(neighborId)
          }
        }
      }
    }
  }
  return { members, anchors }
}

// The reference interval an allele replaces: from the end of the last backbone
// segment before it to the start of the first one after it. Both anchors must
// sit on the same stable sequence, and the interval must not run backwards —
// an inverted or translocated attachment produces anchors whose order does not
// reflect reference order, and stating a negative span for those would be worse
// than declining to state one.
function anchorSpan(anchors: AnchoredNode[]) {
  const refNames = new Set(anchors.map(a => a.stable.refName))
  if (refNames.size !== 1 || anchors.length < 2) {
    return undefined
  }
  // Sorted by reference position, the first anchor is upstream of the allele
  // and the last is downstream; the interval between them is what the allele
  // replaces. Taking max(end)/min(start) across all anchors instead picks the
  // outer edges of the flanks and yields a backwards span.
  const sorted = [...anchors].sort((a, b) => a.stable.start - b.stable.start)
  const first = sorted[0]!
  const last = sorted.at(-1)!
  const start = first.stable.start + first.length
  const end = last.stable.start
  return end >= start ? { refName: first.stable.refName, start, end } : undefined
}

function classify(delta: number) {
  return delta > 0 ? 'insertion' : delta < 0 ? 'deletion' : 'substitution'
}

export function projectAlleles(graph: Graph): AlleleProjection {
  const byId = new Map(
    graph.nodes.filter(isAnchored).map(n => [n.id, n] as const),
  )
  const adj = adjacency(graph)
  const claimed = new Set<string>()
  const alleles: ProjectedAllele[] = []
  const samples: string[] = []
  const seen = new Set<string>()
  let unanchored = 0

  for (const node of byId.values()) {
    if (node.stable.rank !== REFERENCE_RANK && !claimed.has(node.id)) {
      const { members, anchors } = collectRun(node.id, byId, adj, claimed)
      const span = anchorSpan(anchors)
      if (span) {
        // A run can mix stable sequences when several assemblies contribute to
        // one bubble; attribute to the longest contributor rather than to
        // whichever segment the traversal happened to reach first.
        const dominant = members.reduce((a, b) => (b.length > a.length ? b : a))
        const { sample, haplotype } = parsePanSN(dominant.stable.refName)
        const altLength = members.reduce((sum, m) => sum + m.length, 0)
        const refSpan = span.end - span.start
        if (!seen.has(sample)) {
          seen.add(sample)
          samples.push(sample)
        }
        alleles.push({
          refName: span.refName,
          start: span.start,
          end: span.end,
          sample,
          haplotype,
          sourceRefName: dominant.stable.refName,
          refSpan,
          altLength,
          delta: altLength - refSpan,
          kind: classify(altLength - refSpan),
          segmentIds: members.map(m => m.name),
          nodeIds: members.map(m => m.id),
          rank: dominant.stable.rank,
        })
      } else {
        unanchored++
      }
    }
  }

  alleles.sort((a, b) => a.start - b.start || a.sample.localeCompare(b.sample))
  samples.sort()
  return { alleles, samples, attribution: 'source-assembly', unanchored }
}
