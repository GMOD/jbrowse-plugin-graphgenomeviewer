---
status: Accepted
summary:
  'Seed FMMM along the reference, add an ordered layout and a variant map, and
  derive bubbles from the layered order when no index exists'
---

# ADR-042: Reference-seeded force layout, ordered layout, bubbles from the graph

## Status

Accepted (2026-09-13). Extends ADR-041. Measured on the six HPRC release 2.1
rGFA loci in `docs/layouts.md` and the eight-haplotype KIV-2 GBZ cut;
`scripts/layout-lab/` reproduces the measurements.

## Context

The two ADR-041 layouts read badly on a pangenome window:

- **Force** used upstream Bandage's recipe: random placement, one FMMM per
  component, each component rotated through 50 angles to fit a 4:3 page.
  Repulsion buckles a long reference chain into a C or a spiral, and the
  rotation optimises area, so the reference runs diagonally in one window and
  top to bottom in the next.
- **Anchored** puts x in bp, so a SNP is a sliver under a 60 kb line and bubbles
  collapse onto the axis. Its y is one row per rank, which means nothing
  biological on HPRC.

Neither says what a reader wants from a locus like KIV-2: what varies, how big,
and who carries it.

## Decision

**Seed FMMM from the reference** (`layout/referenceSeeds.ts`,
`layout/orientToReference.ts`). For a graph with a backbone, `force` gives each
node an `x`/`y` with the backbone end to end along x, runs FMMM with
`KeepPositions` and `rotateComponents: false`, then fits a rotation so the
reference reads left to right. Component packing stays, since a cut can arrive
in pieces.

- Seeding costs what random placement does. Native, min of three: KIV-2 39 vs 37
  ms, MHC class II 112 vs 108 ms, KIR 77 vs 78 ms.
- OGDF applies seeds only at the coarsest multilevel level (`minGraphSize` 50),
  so FMMM keeps the backbone's coarse shape and discards the alleles' seeded y.
  The backbone waves as a result; `singleLevel` would honour every seed but is
  untested.
- Seeds come from the `LayoutScaling` the model hands the engine, not from bp:
  under the `compress` spread a node's `length` crosses the RPC as drawn units
  × 1000.
- `forceLayoutKey` includes the reference path, since the seeds depend on it.

**Add an ordered layout** (`layout/orderedLayout.ts`). x is cumulative layer
width in reference order, node width is `10 + 8 * log2(1 + bp)`, and y is a lane
from a barycenter sweep. Every edge points from lower to higher reference order,
so the graph is acyclic by construction and no cycle-removal heuristic can
misplace the reference. The layout reserves the reference lane in every layer,
including layers with no backbone node. 2 ms on 279 nodes.

**Add a variant map** (`layout/variantMapLayout.ts`,
`bubbles/classifyBubble.ts`). The map draws one glyph per `gfatools bubble` row
on the reference line, typed SNP, substitution, insertion, deletion, inversion,
superbubble or repeat array, and sized by allele length. `classifyBubble` calls
a bubble a repeat array only where the session's repeat track covers it, since a
common insertion has the same shape. Clicking a glyph pops the bubble's segments
into their own graph.

**Derive bubbles from the layered order when no index exists**
(`bubbles/bubblesFromGraph.ts`), which covers GBZ cuts, pggb and odgi GFAs, and
popped bubbles. A backbone node alone in a layer that no edge jumps is a
boundary, as are the window ends, and a bubble is whatever lies between
consecutive boundaries. Route stats come from walks when the graph has them,
otherwise from a DP over the DAG.

| graph                    |  nodes | bubbles |   time |
| ------------------------ | -----: | ------: | -----: |
| MHC class II rGFA cut    |    279 |      11 |   3 ms |
| KIV-2 rGFA cut           |     58 |       7 |   2 ms |
| KIV-2 GBZ, 8 haplotypes  | 15,808 |      21 | 128 ms |
| E. coli pggb, P lines    |     54 |      14 |   2 ms |
| 1q21.1 inversion, popped |    221 |       1 |   3 ms |

Conservation checks the GBZ result: per haplotype, walk bp minus reference span
summed over bubbles equals the walk's excess over the reference (0 for GRCh38,
22.2 kb for HG00097, 116.4 kb for HG00133). `bubblesFromGraph.test.ts` runs the
same check on a synthetic graph.

**Hand FMMM runs, not nodes** (`layout/mergeRuns.ts`). The KIV-2 GBZ cut's
15,808 nodes are 4,919 unbranching runs, which lay out in 2.5 s instead of 7.3 s
with the same shape.

**Draw depth as width** (`nodeWidths.ts`), Bandage's rule: the square root of
depth over the length-weighted mean, clamped to 0.3–3. `gfaConverter` derives
depth from walks when a GFA has no depth tag, so on a GBZ cut width is carriage.

## Consequences

- Derived bubbles are chain-level: a nested bubble or an inverted stretch comes
  out as one bubble. Popping descends, and `popStack` holds each level.
- Derived bubbles never claim an inversion. The strand a path first visits a
  node on is not evidence of one: a pggb path walking the window backwards made
  eleven SNPs read as inversions in a first draft.
- A gbz-base cut at the default 1 kb `context` drops haplotypes' private array
  copies, so KIV-2 reads as two bubbles of 4 and 1 routes rather than one of 9.
  A walk piece that enters a bubble and ends before its far boundary marks the
  bubble partial, and its lengths read as a floor. `context: 200000` closes the
  array at 15,808 nodes and 2.4 s. `subgraphSnarls` cannot help: with a
  haplotype selection gbz-base-js takes `subgraphForHaplotypes`, which never
  calls `extractSnarls`.
- Above roughly 300 nodes on screen any node layout is a rope, because node
  thickness is constant in pixels (`GRAPH_SCALE_AND_LOD.md`).
- The ordered layout's log widths give up bp comparability, so a deletion arc
  reads as topology, not length. The row layouts remain for figures that must
  line up under a linear view.

## Alternatives rejected

- **OGDF `SugiyamaLayout`** for the ordered layout. It does not know rank 0, so
  its cycle removal wraps the MHC class II backbone into two rows. It also grows
  the wasm from 307 KB to 1.88 MB (about 2.6 MB as base64), mostly
  `OptimalRanking`'s COIN-OR LP solver.
- **The orientation fit without seeds.** A curled backbone has no principal
  axis, so a C comes out as an upright C.
- **Renaming nodes so `linearLayout` sorts them in reference order.** The sort
  works, but component rotation tips the line diagonal, so the engine needs the
  rotate flag anyway.
- **Tuning FMMM's force model, repulsion or iterations.** Seeding outweighed
  anything they bought.
- **Collapsing runs of equal carriage and drawing thickness by haplotype
  count.** The GBZ cut still has 4,919 nodes after merging and reads as a strip
  with one thick detour. A repeat array's readout belongs in a per-haplotype
  panel, not a node drawing.
- **Porting sequenceTubeMap's lane packing into the node renderer.** The tube
  map layouts on `@gmod/tubemap-core` superseded it.
