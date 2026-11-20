---
name: circular-contigs
description:
  Treat a circular reference contig as circular in bandage-core and the plugin,
  so a variant, a walk or a link across the origin is placed and labelled where
  it is.
metadata:
  category: ready
  area: circular
  first_move:
    "Add an optional `Graph.circular`, set at load when a link joins the
    reference path's last step to its first, with the five ring fixtures as
    tests."
  order: 3
---

# Circular contigs

- A circular contig (chrM, a plasmid, a phage) loads as a ring, in which the
  reference path's last node has a link back to its first.
- bandage-core has no field marking a contig circular. Each module reads the
  reference as a line from the first backbone node to the last, so the closing
  link and anything that crosses the origin is handled as on a linear contig.
- The lists below come from an audit of bandage-core 14.0.2 plus the commits up
  to `3f1dc79`, which ran five synthetic rings through loading, anchoring,
  bubbles, every layout, the drawing and the fold.

## Test data

- No real circular reference graph was found on the development machine. The
  HPRC chrM GBZ in BandageJS's e2e data has every assembly rotated to rCRS, with
  no closing link and no walk across the origin, and the loops in Bandage's
  assembly-graph sample are self-loops on one node.
- The five fixtures, as a generator:

```ts
const seg = (name: string, len: number) => `S\t${name}\t*\tLN:i:${len}`
const L = (a: string, b: string) =>
  `L\t${a.slice(0, -1)}\t${a.at(-1)}\t${b.slice(0, -1)}\t${b.at(-1)}\t0M`
const links = (list: string[]) =>
  list.map(s => {
    const [a = '', b = ''] = s.split(' ')
    return L(a, b)
  })
const W = (sample: string, hap: number, steps: string[], len: number) =>
  `W\t${sample}\t${hap}\tchr1\t0\t${len}\t${steps.map(s => `>${s}`).join('')}`

// reference chr1 o1..o5, 100 bp each, closing link o5->o1; a 30 bp allele `a`
// in place of o3
export const CLOSED = [
  ...['o1', 'o2', 'o3', 'o4', 'o5'].map(n => seg(n, 100)),
  seg('a', 30),
  ...links([
    'o1+ o2+',
    'o2+ o3+',
    'o3+ o4+',
    'o4+ o5+',
    'o2+ a+',
    'a+ o4+',
    'o5+ o1+',
  ]),
  W('REF', 0, ['o1', 'o2', 'o3', 'o4', 'o5'], 500),
  W('HAP1', 1, ['o1', 'o2', 'a', 'o4', 'o5'], 430),
].join('\n')

// CLOSED plus a haplotype written from o3, round the origin to o2
export const ROTATED = [
  CLOSED,
  W('HAP2', 1, ['o3', 'o4', 'o5', 'o1', 'o2'], 500),
].join('\n')

// reference o1..o6 with the closing link; HAP3 is rotated and its 50 bp `v`
// replaces o6 and o1, across the origin
export const ORIGIN_VARIANT = [
  ...['o1', 'o2', 'o3', 'o4', 'o5', 'o6'].map(n => seg(n, 100)),
  seg('v', 50),
  ...links([
    'o1+ o2+',
    'o2+ o3+',
    'o3+ o4+',
    'o4+ o5+',
    'o5+ o6+',
    'o6+ o1+',
    'o5+ v+',
    'v+ o2+',
  ]),
  W('REF', 0, ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'], 600),
  W('HAP3', 1, ['o4', 'o5', 'v', 'o2', 'o3'], 450),
  W('HAP4', 1, ['o3', 'o4', 'o5', 'o6', 'o1', 'o2'], 600),
].join('\n')

// a plasmid ring with a bubble and no paths, as an assembler writes one
export const ASSEMBLY_RING = [
  ...['p1', 'p2', 'p3', 'p4'].map(n => seg(n, 1000)),
  seg('q', 10),
  ...links(['p1+ p2+', 'p2+ p3+', 'p2+ q+', 'q+ p3+', 'p3+ p4+', 'p4+ p1+']),
].join('\n')

const rseg = (name: string, len: number, sn: string, so: number, sr: number) =>
  `S\t${name}\t*\tLN:i:${len}\tSN:Z:${sn}\tSO:i:${so}\tSR:i:${sr}`

// an rGFA ring: s1..s6 on chr1, a 1 bp allele `n` in place of s3, the closing
// link, and an allele `w` from s6 back to s2 in place of s1
export const RGFA_RING = [
  ...[0, 100, 200, 201, 301, 401].map((so, i) =>
    rseg(`s${i + 1}`, i === 2 ? 1 : 100, 'chr1', so, 0),
  ),
  rseg('n', 1, 'hap1', 0, 1),
  rseg('w', 20, 'hap2', 0, 1),
  ...links([
    's1+ s2+',
    's2+ s3+',
    's3+ s4+',
    's4+ s5+',
    's5+ s6+',
    's6+ s1+',
    's2+ n+',
    'n+ s4+',
    's6+ w+',
    'w+ s2+',
  ]),
].join('\n')
```

## Drawn or stated wrongly

- **Hover highlight and the position ramp.** `nodeReferenceSpan` and
  `referenceMidpoints` (`bandage-core/src/referenceSpan.ts`) place an allele
  that crosses the origin, such as `w` in `RGFA_RING`, in the middle of the
  contig, between its two anchors. The fix needs to know which side of each
  anchor the allele joins. The plugin calls `nodeReferenceSpan` with a plain
  `buildNeighbors` map (`GraphGenomeView/pane/graphViews.ts`), so the signature
  changes.
- **Level-of-detail folding.** The same allele becomes a fold site over the
  interval between its anchors, and the reference nodes in that interval are
  counted as inside the site (`bandage-core/src/levelOfDetail.ts`).
- **Walk rows with a window.** `walkRowRuns` misreads a walk that crosses the
  origin. In `ORIGIN_VARIANT`, HAP3 runs through 350..450 and its row reads
  "contig ends 50 bp before the window", with 0 bp drawn. HAP4 continues
  straight on and its row reads "turns back out of the window". The fix needs
  positions that wrap at the contig's length.
- **The closing link.** The anchored and ordered layouts draw it as a straight
  line that lies on the reference line, so it cannot be seen. A back-link on a
  linear contig, such as a tandem duplication's, is drawn the same way.
- **The tube map on reference.** `tubemapref` drew the origin-spanning variant
  between o3 and o4. The audit saw this and did not find the cause.

## Missing

- **A deletion across the origin** is drawn as a plain link, with no dashes and
  no bp stated.
- **The wrap side of a ring can belong to no bubble.** With walks,
  `referenceOrder` (`bandage-core/src/layout/orderedLayout.ts`) can sort its
  nodes after the last boundary.
- **A bubble across the origin has no reference interval.** It is marked
  `offReference` and takes the span it was found in, because an interval from a
  later reference node to an earlier one cannot be written with start before
  end.
- **An allele across the origin has no span.** `projectAlleles` places it like a
  run that leaves the window, chained after a neighbouring anchor, which is not
  at the origin.
- **The key, the hover text and the reference strip** are those of a linear
  contig, with no mark that the contig is circular.

## Correct on a ring today

- Anchoring treats the closing link as an ordinary link.
- `foldVariants` keeps the ring whole.
- Hover on the closing link reads `o5+ → o1+`.
- Where two superbubbles lie between the same two nodes of a ring, each is
  listed, and a bubble reads a walk only where the walk crosses the bubble.
- The reference seeds lay a ring out as a line with one long link, and the arch
  seeds leave that link alone.
- An assembly graph with no reference (`ASSEMBLY_RING`) only has the force
  layout, and the audit found nothing wrong there.

## Proposal

- **The field.** `Graph.circular?: Map<refName, length>`, the contigs that are
  rings with each one's length in bp. A graph with no ring leaves the field off,
  as `Graph.depthStated` is left off.
- **Where the field is set.** At load, when a link joins the reference path's
  last step back to its first. Both converter routes can test that from the
  links and walks they already read, so the walk file format (format 8) and
  `GraphTables` stay as they are. A load option lets a host state or deny
  circularity where the links are ambiguous, for example a cut that holds one
  window of a ring.
- **Readers of the field, in the order the work can be done:**
  - `nodeReferenceSpan`, `referenceMidpoints`, `projectAlleles` and the fold
    sites, which need spans that wrap
  - `superbubbles` and `bubblesFromGraph`, so a bubble across the origin gets
    its interval
  - `walkRowRuns`, with positions taken modulo the contig length
  - `deletionEdges`, so a skip across the origin is found and its bp stated
  - `util/edgeCurves`, which routes the closing link
  - the reference strip, the key and the hover text, which say the contig is
    circular
  - `referenceSeeds`, which could seed a ring as a circle
- **The multi-contig axis.** `backbonePositions` and the bp axis are being
  changed on bandage-core's `multi-contig` branch, which lays several contigs
  end to end. Circular work that touches the axis goes on top of that branch.

## Calls to make

- **How an interval across the origin is written.** The options are one interval
  with start greater than end, or two intervals. Two intervals keep every
  existing reader of `start` and `end` correct, and the plugin's linear-view
  highlight (`hoverSync/lgvHover.ts`, `hoverSync/graphViewHighlights.ts`) would
  draw one rectangle per interval, so two intervals are the recommendation.
- **Whether circularity is detected or stated.** The recommendation is to detect
  it at load and let the load option above override it, because BandageJS and
  the figure CLI then need no change to draw a ring as a ring.
- **How the closing link and a linear contig's back-links are drawn.** The
  options are an arc over the drawing, as a skip is drawn, or a short stub at
  each end with a mark saying the two ends join. An arc from the last node to
  the first spans the whole drawing. This call needs a look at both options on
  `ORIGIN_VARIANT` and on a tandem duplication.
