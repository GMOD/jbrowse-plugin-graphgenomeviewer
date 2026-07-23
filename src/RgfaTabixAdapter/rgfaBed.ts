import { panSNContig, panSNSample } from '../pansn.ts'

// A segment as it appears in segs.bed.gz, and as it is repeated inside every
// links.bed.gz row: `stableName start end segmentId rank`. These are the SN/SO/
// SR tags rGFA already carries, projected to BED by `gfatools gfa2bed -m`.
export interface RgfaSegment {
  refName: string
  start: number
  end: number
  id: string
  rank: number
}

export interface RgfaLink {
  source: string
  sourceStrand: string
  target: string
  targetStrand: string
  sourceSegment: RgfaSegment
  targetSegment: RgfaSegment
}

export function parseSegmentLine(line: string): RgfaSegment {
  const cols = line.split('\t')
  return {
    refName: cols[0]!,
    start: +cols[1]!,
    end: +cols[2]!,
    id: cols[3]!,
    rank: +cols[4]!,
  }
}

// `s322+` — the L-line's segment id with its orientation appended, mirroring
// the GFA record it came from.
function parseEndpoint(field: string) {
  return { id: field.slice(0, -1), strand: field.slice(-1) }
}

export function parseLinkLine(line: string): RgfaLink {
  const cols = line.split('\t')
  const source = parseEndpoint(cols[3]!)
  const target = parseEndpoint(cols[4]!)
  return {
    source: source.id,
    sourceStrand: source.strand,
    target: target.id,
    targetStrand: target.strand,
    sourceSegment: {
      id: source.id,
      refName: cols[5]!,
      start: +cols[6]!,
      end: +cols[7]!,
      rank: +cols[8]!,
    },
    targetSegment: {
      id: target.id,
      refName: cols[9]!,
      start: +cols[10]!,
      end: +cols[11]!,
      rank: +cols[12]!,
    },
  }
}

export function linkKey(link: RgfaLink) {
  return `${link.source}${link.sourceStrand}${link.target}${link.targetStrand}`
}

// Both endpoints of a link are written into every row, so the same link is
// indexed under each endpoint's stable sequence and arrives twice for a region
// covering both. Callers dedupe on linkKey.

// The stable sequences in these files are usually PanSN (`K12#1#chr`) while the
// assembly asking for them uses the bare contig (`chr` in assembly `K12`). One
// map answers both spellings: the raw tabix name, plus a sample+contig key for
// PanSN names.
export function buildRefNameLookup(tabixRefNames: string[]) {
  const lookup = new Map<string, string>()
  for (const name of tabixRefNames) {
    lookup.set(name, name)
    const sample = panSNSample(name)
    if (sample !== name) {
      lookup.set(qualifiedKey(sample, panSNContig(name)), name)
    }
  }
  return lookup
}

// A tab can occur in neither half — both come out of BED columns.
function qualifiedKey(assemblyName: string, refName: string) {
  return `${assemblyName}\t${refName}`
}

export function resolveRefName(
  lookup: Map<string, string>,
  assemblyName: string,
  refName: string,
) {
  const qualified = lookup.get(qualifiedKey(assemblyName, refName))
  return qualified === undefined ? lookup.get(refName) : qualified
}

// Segments carry no sequence here — the BED records only their span — so every
// S-line is written with `*` and an LN tag, which is what the GFA spec asks for
// and what packages/graph-core's parser reads back as the node length.
function formatSegment(segment: RgfaSegment) {
  const { id, refName, start, end, rank } = segment
  return `S\t${id}\t*\tLN:i:${end - start}\tSN:Z:${refName}\tSO:i:${start}\tSR:i:${rank}`
}

function formatLink(link: RgfaLink) {
  const { source, sourceStrand, target, targetStrand } = link
  return `L\t${source}\t${sourceStrand}\t${target}\t${targetStrand}\t0M`
}

// Codepoint order, not localeCompare: the byte-identical-output guarantee below
// has to hold across locales.
function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

// Deterministic ordering: the same region always produces byte-identical GFA,
// so a layout computed from it is reproducible.
export function formatSubgraph(
  segments: Map<string, RgfaSegment>,
  links: Map<string, RgfaLink>,
) {
  const sortedSegments = [...segments.values()].sort((a, b) =>
    a.refName === b.refName ? a.start - b.start : compare(a.refName, b.refName),
  )
  const sortedLinks = [...links.keys()].sort((a, b) => compare(a, b))
  return [
    'H\tVN:Z:1.0',
    ...sortedSegments.map(s => formatSegment(s)),
    ...sortedLinks.map(k => formatLink(links.get(k)!)),
  ].join('\n')
}
