---
status: Accepted
summary:
  'Seed FMMM along the reference, add an ordered layered layout and a variant
  map, derive bubbles from the layered order when no index exists'
---

# ADR-042: Reference-seeded force layout, ordered layout, bubbles from the graph

## Status

Accepted (2026-09-13). Extends ADR-041. Measured on six HPRC release 2.1 rGFA
cuts (the loci table in `docs/layouts.md`) and the eight-haplotype KIV-2 GBZ
cut. `scripts/layout-lab/` reproduces every measurement.

## Context

On a pangenome window the two ADR-041 layouts read badly:

- **Force.** Upstream Bandage's recipe: random placement, one FMMM per
  component, each component rotated through 50 angles to fit a 4:3 page. A long
  reference chain under FMMM's repulsion buckles into a C or a spiral, and the
  rotation optimises area, so the reference runs diagonally in one window and
  top to bottom in the next.
- **Anchored.** x is bp, so a SNP is a sliver under a 60 kb line and bubbles
  collapse onto the axis. y is one row per rank, which means nothing biological
  on HPRC.

Neither answers what a reader asks of a locus like KIV-2: what varies, how big,
and who carries it.

## Decision

**Seed FMMM from the reference** (`layout/referenceSeeds.ts`,
`layout/orientToReference.ts`). For a graph with a backbone, `force` sends each
node an `x`/`y` with the backbone end to end along x, runs FMMM with
`KeepPositions` and `rotateComponents: false` (keeping MAAR packing, since a cut
can arrive in several components), then fits a rotation so the reference reads
left to right.

- Same cost as random placement: in one native binary, KIV-2 39 vs 37 ms, MHC
  class II 112 vs 108 ms, KIR 77 vs 78 ms.
- OGDF applies the seed only at the coarsest multilevel level (`minGraphSize` is
  50), so only the backbone's coarse shape survives. That is the property
  wanted; allele y offsets are discarded, hence the waviness. `singleLevel`
  would honour every seed; untested.
- Seeds come from the `LayoutScaling` the model already hands the engine, not
  from bp: under the `compress` spread a node's `length` crosses the RPC as
  drawn units × 1000.
- `forceLayoutKey` carries the reference path, since the seeds depend on it.

**Add an ordered layout** (`layout/orderedLayout.ts`). x is cumulative layer
width in reference order, node width `10 + 8 * log2(bp)`, y a lane from a
barycenter sweep. Every edge points from lower to higher reference order, so the
graph is acyclic by construction and no cycle-removal heuristic can misplace the
reference. The reference lane is reserved in every layer, including those with
no backbone node. 2 ms on 279 nodes.

**Add a variant map** (`layout/variantMapLayout.ts`,
`bubbles/classifyBubble.ts`). One glyph per `gfatools bubble` row on the
reference line, typed SNP / substitution / insertion / deletion / inversion /
superbubble / repeat array, sized by allele length. A bubble is a repeat array
only where the session's repeat track covers it, since a common insertion has
the same shape. Clicking a glyph pops the bubble's segments into their own
graph.

**Derive bubbles from the layered order when no index exists**
(`bubbles/bubblesFromGraph.ts`): GBZ cuts, pggb/odgi GFAs, popped bubbles. A
backbone node alone in a layer that no edge jumps is a boundary, as are the
window ends; what lies between consecutive boundaries is a bubble. Route stats
come from walks when present, otherwise a DP over the DAG.

| graph                    |  nodes | bubbles |   time |
| ------------------------ | -----: | ------: | -----: |
| MHC class II rGFA cut    |    279 |      11 |   3 ms |
| KIV-2 rGFA cut           |     58 |       7 |   2 ms |
| KIV-2 GBZ, 8 haplotypes  | 15,808 |      21 | 128 ms |
| E. coli pggb, P lines    |     54 |      14 |   2 ms |
| 1q21.1 inversion, popped |    221 |       1 |   3 ms |

Conservation checks the GBZ result: per haplotype, the sum over bubbles of walk
bp minus reference span equals the walk's excess (0 for GRCh38, 22.2 kb HG00097,
116.4 kb HG00133). `bubblesFromGraph.test.ts` carries that check.

**Hand FMMM runs, not nodes** (`mergeRuns`). The KIV-2 GBZ cut's 15,808 nodes
are 4,919 unbranching runs: 2.5 s against 7.3 s, same shape.

**Draw depth as width**, Bandage's rule: square root of depth against the
length-weighted mean, clamped 0.3–3. Converters derive depth from walks when no
`dp` tag exists, so on a GBZ cut width is carriage.

## Consequences

- Derived bubbles are chain-level: nested bubbles and an inverted stretch come
  out as one bubble each. Popping is how to descend; `popStack` holds each
  level.
- Derived bubbles never claim an inversion. The strand a path first visits a
  node on is not one: a pggb path walking backwards made eleven SNPs read as
  inversions in a first draft.
- A gbz-base cut at the default 1 kb `context` truncates haplotypes' private
  array copies (KIV-2 reads as two bubbles of 4 and 1 routes instead of one of
  9). A walk piece that enters a bubble and ends before its far boundary marks
  the bubble partial, and its lengths read as a floor. `context: 200000` closes
  the array at 15,808 nodes and 2.4 s. `subgraphSnarls` does not help: with a
  haplotype selection the reader takes `subgraphForHaplotypes`, which never
  calls `extractSnarls`.
- Above roughly 300 nodes on screen any node layout is a rope, because node
  thickness is constant in pixels (`GRAPH_SCALE_AND_LOD.md`).
- The ordered layout's log widths give up bp comparability, so a deletion arc
  reads as topology, not length. The row layouts stay for figures that must line
  up under a linear view.
- Merging runs with identical carriage still leaves 4,919 nodes on the GBZ cut;
  a repeat array's readout belongs in a per-haplotype panel, not a node drawing.

## Alternatives rejected

- **OGDF `SugiyamaLayout`** for the ordered layout. It does not know rank 0, so
  cycle removal wraps the backbone into two rows on the HLA cut, and it grows
  the wasm from 307 KB to 1.88 MB (about 2.6 MB base64), mostly
  `OptimalRanking`'s COIN-OR LP solver.
- **Orientation fit alone**, without seeds. A curled backbone has no principal
  axis, so a C comes out as an upright C.
- **Renaming nodes so `linearLayout` sorts them in reference order.** Works, but
  component rotation tips the line diagonal, so the rotate flag is needed
  anyway.
- **Tuning FMMM's force model, repulsion or iterations.** Seeding dominated
  anything they bought.
- **Porting sequenceTubeMap's lane packing into the node renderer.** Superseded
  by the separate tube map layouts on `@gmod/tubemap-core`.
