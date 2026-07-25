// Minimal GFA (Graphical Fragment Assembly) text parser shared by the graph
// pangenome plugins (GraphGenomeView, TubeMapView). Handles GFA1/GFA2 segment,
// link, edge, path and walk records plus header tags.

// Only the first two colons delimit a tag; everything after them is the value.
// A Z value may contain colons of its own, and rGFA stable names routinely do
// (`SN:Z:chr1:1-1000` from a sliced reference), where splitting on every colon
// silently truncates the name to `chr1` and mis-anchors the whole layout.
function parseTag(tag: string, tags: Record<string, string | number>) {
  const nameEnd = tag.indexOf(':')
  const typeEnd = tag.indexOf(':', nameEnd + 1)
  if (nameEnd !== -1 && typeEnd !== -1) {
    const name = tag.slice(0, nameEnd)
    const type = tag.slice(nameEnd + 1, typeEnd)
    const val = tag.slice(typeEnd + 1)
    if (type === 'i' || type === 'f') {
      tags[name] = +val
    } else if (type === 'Z') {
      tags[name] = val
    }
  }
}

function parseTags(fields: string[]) {
  const tags: Record<string, string | number> = {}
  for (const field of fields) {
    parseTag(field, tags)
  }
  return tags
}

export interface GFANode {
  id: string
  length: number
  sequence: string
  tags: Record<string, string | number>
}

// rGFA (minigraph) anchors every segment to a reference coordinate: SN is the
// stable sequence name, SO the offset on it, and SR the stable rank, where 0 is
// the reference backbone and higher ranks are the sequence that diverges from
// it. Plain GFA (pggb, odgi, Minigraph-Cactus) carries none of these, which is
// why coordinates there exist only inside the P/W lines.
export interface StableCoordinate {
  refName: string
  start: number
  rank: number
}

export function stableCoordinate(node: GFANode): StableCoordinate | undefined {
  const { SN, SO, SR } = node.tags
  return typeof SN === 'string' &&
    typeof SO === 'number' &&
    typeof SR === 'number'
    ? { refName: SN, start: SO, rank: SR }
    : undefined
}

export interface GFALink {
  source: string
  target: string
  strand1?: string
  strand2?: string
  cigar: string
  tags: Record<string, string | number>
}

export interface GFAPath {
  name: string
  path: string
  rest: string[]
}

export interface GFAWalkSegment {
  id: string
  strand: string
}

export interface GFAWalk {
  sample: string
  haplotype: number
  contig: string
  start: number
  end: number
  segments: GFAWalkSegment[]
  tags: Record<string, string | number>
}

function parseWalkBody(body: string) {
  const segments: GFAWalkSegment[] = []
  let current = ''
  let currentStrand = '+'
  for (const ch of body) {
    if (ch === '>' || ch === '<') {
      if (current) {
        segments.push({ id: current, strand: currentStrand })
      }
      current = ''
      currentStrand = ch === '>' ? '+' : '-'
    } else {
      current += ch
    }
  }
  if (current) {
    segments.push({ id: current, strand: currentStrand })
  }
  return segments
}

export interface GFAGraph {
  nodes: GFANode[]
  links: GFALink[]
  paths: GFAPath[]
  walks: GFAWalk[]
  header: Record<string, string | number>[]
  id: string
}

export function parseGFA(file: string) {
  const graph: GFAGraph = {
    nodes: [],
    links: [],
    paths: [],
    walks: [],
    header: [],
    id: '',
  }

  // \r is stripped rather than split on, so a CRLF file does not leave it on
  // whichever field happens to be last: a trailing Z tag would carry it into a
  // stable name and a trailing cigar into the CIGAR string.
  //
  // Stripped per line inside the loop rather than with a .map() over the split,
  // which would hold a second copy of every line in the file at once.
  for (const rawLine of file.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line.startsWith('H')) {
      const [, ...rest] = line.split('\t')
      graph.header.push(parseTags(rest))
    } else if (line.startsWith('S')) {
      const [, name, ...rest] = line.split('\t')
      let len: number
      let seq: string
      let tagfields: string[]
      let gfa1 = false
      // A truncated record has no field to read; `*` is what the spec writes for
      // a segment whose sequence is absent, so treating a missing one the same
      // way yields a 0 bp segment instead of throwing partway through the file.
      const first = rest[0] ?? '*'
      // GFA2 puts an integer length in this field, GFA1 the sequence. Testing
      // the digits rather than the coerced number keeps a GFA2 `S sid 0 *` from
      // being read as a GFA1 sequence of "0".
      if (/^\d+$/.test(first)) {
        len = +first
        seq = rest[1] ?? '*'
        tagfields = rest.slice(2)
      } else {
        gfa1 = true
        seq = first
        // `*` is GFA1's "no sequence here"; its length is whatever LN says
        // below, and 0 if the file states none. Counting the placeholder's own
        // character instead reports every such segment as 1 bp.
        len = seq === '*' ? 0 : seq.length
        tagfields = rest.slice(1)
      }
      const tags = parseTags(tagfields)
      if (gfa1 && 'LN' in tags) {
        len = +tags.LN
      }
      graph.nodes.push({ id: name!, length: len, sequence: seq, tags })
    } else if (line.startsWith('E')) {
      const [, , source, target, , , , , cigar, ...rest] = line.split('\t')
      const source1 = source!.slice(0, -1)
      const target1 = target!.slice(0, -1)
      const strand1 = source!.at(-1)
      const strand2 = target!.at(-1)
      graph.links.push({
        source: source1,
        target: target1,
        strand1,
        strand2,
        cigar: cigar!,
        tags: parseTags(rest),
      })
    } else if (line.startsWith('L')) {
      const [, source, strand1, target, strand2, cigar, ...rest] =
        line.split('\t')
      graph.links.push({
        source: source!,
        target: target!,
        strand1,
        strand2,
        cigar: cigar!,
        tags: parseTags(rest),
      })
    } else if (line.startsWith('W')) {
      const [, sample, hap, contig, start, end, body, ...rest] =
        line.split('\t')
      graph.walks.push({
        sample: sample!,
        haplotype: +hap!,
        contig: contig!,
        start: start === '*' ? -1 : +start!,
        end: end === '*' ? -1 : +end!,
        segments: parseWalkBody(body!),
        tags: parseTags(rest),
      })
    } else if (line.startsWith('P')) {
      const [, name, path, ...rest] = line.split('\t')
      graph.paths.push({ name: name!, path: path!, rest })
    }
  }
  return graph
}
