# Layout experiments on HPRC loci

Measured 2026-09-13 on the six loci the HPRC tutorials use, cut from the hosted
release 2.1 rGFA index exactly as the view cuts them. The question was why the
two shipped layouts read badly on a pangenome window and what would read better.
Four changes came out of it, in the order they are worth building:

1. **Orient the force layout to the reference.** A rigid rotation after FMMM,
   fitted on the backbone. JS only, no engine change. Every window then reads
   left to right in the same direction as the linear view above it.
2. **Seed FMMM from reference coordinates.** Backbone end to end along x,
   alleles at their anchors, `KeepPositions`, and no component rotation. This
   removes the curl that turns every long reference run into a C or a spiral,
   and it is faster than random placement. About 40 lines of C++ in the engine.
3. **A reference-ordered layered layout.** The tube map's skeleton without its
   lanes: x is reference order, node width is log bp, y is a lane. 2 ms on 279
   nodes. Bubbles read as lenses, a SNP allele gets the same room as a 10 kb
   segment, and the drawing scrolls instead of shrinking. This is the candidate
   to replace **Anchored** as the default for an rGFA cut.
4. **Haplotype lanes.** For path GFAs with many walks, port the sequence tube
   map's ordering and lane passes and give the renderer per-node lane packing.
   The largest change and the one that makes a GBZ cut of eight haplotypes a
   picture rather than a rope.

Everything below uses the view's **Reference position** colour scheme: rank-0
segments take a hue from red to magenta across the window, exactly as the rGFA
segments track paints them in the linear view, and off-reference segments are
charcoal. That is the one colouring in which a reader can find a graph node in
the linear view and back, so it is the one every comparison here is drawn in.

## The test cases

| Locus        | Window                         | Nodes | Edges | What the graph holds                                                                     |
| ------------ | ------------------------------ | ----: | ----: | ---------------------------------------------------------------------------------------- |
| LPA KIV-2    | `chr6:160,525,000-160,655,000` |    58 |    81 | The kringle repeat: each loop is a copy, haplotypes differ in how many they walk         |
| MHC class II | `chr6:32,510,000-32,600,000`   |   279 |   370 | The DRB haplotypes: a 12 kb reference stretch many haplotypes replace, dozens of alleles |
| AMY1         | `chr1:103,690,000-103,780,000` |    42 |    54 | The amylase copy-number locus; the cut arrives in several pieces                         |
| C4           | `chr6:31,980,000-32,050,000`   |    34 |    41 | One bubble spanning the C4A/C4B duplication                                              |
| CFH          | `chr1:196,640,000-196,900,000` |    44 |    60 | The CFHR3/CFHR1 deletion as a bare edge skipping 84 kb of reference                      |
| KIR          | `chr19:54,750,000-54,840,000`  |   154 |   199 | The KIR cluster, the densest of the six                                                  |

The cuts come from `https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38` with the
adapter's one-hop rule (`subgraphContext: 1`, the view's default), so the KIV-2
cut is the same 58 nodes and 81 edges the tutorial figure shows.
`scripts/layout-lab/cut-hprc.ts` reproduces them.

These six are also the demonstration set for README screenshots once a layout
lands: each has a tutorial figure at
`jbrowse-components/website/static/img/pangenome/` showing the linear view above
the graph, so a before/after pair needs no new locus.

## Why the shipped layouts look the way they do

The force mode hands OGDF FMMM one chain of nodes per segment (one per 20 drawn
units, 5-unit edges between segments), places them at random, runs one FMMM per
connected component, rotates each component through 50 angles to minimise its
bounding box against a 4:3 page ratio, and packs the components. That is
upstream Bandage's recipe and three of its properties fight a pangenome window:

- A long chain under FMMM's repulsion buckles, so the reference is a C or a
  spiral and the two arms of a bubble ride the curve.
- The rotation optimises area, not reading direction, so the reference runs
  diagonally in one window and top to bottom in the next.
- Node length is linear in bp, so 1-50 bp alleles clamp to the 5-unit floor.

The anchored mode is the opposite extreme. x is reference bp, so an allele
occupies the bp it replaces and a SNP is a sliver under a 60 kb line; y is one
row per rank, which on HPRC means nothing biological. Bubbles collapse onto the
axis and the drawing reads as a track.

![KIV-2, shipped force layout](img/kiv2-force.png)

_KIV-2 as the view draws it today. The reference runs diagonally; the kringle
loops hang off its middle._

![KIV-2, anchored](img/kiv2-anchored.png)

_The same cut in the anchored layout._

## Experiment 1: orient to the reference

Fit the rotation that maps backbone node midpoints onto their reference
coordinate (a one-dimensional orthogonal Procrustes fit, weighted by segment
length), then reflect so the off-reference mass sits below the axis. The
drawing's shape is untouched; only its frame moves.

![KIV-2, oriented](img/kiv2-force_orient_1.png)

_KIV-2 oriented. Red is now on the left in every window, which is the one thing
the linear view above it can promise too._

The fit does nothing for curl: a rope has no principal axis, so a window whose
backbone curls into a C comes out as a C, merely upright.

## Experiment 2: seed FMMM from the reference

FMMM accepts initial positions through `InitialPlacementForces::KeepPositions`,
which the engine already uses for `linearLayout`, seeded from node **name**
order. Seeding from what the graph states instead: backbone segments end to end
along x at their drawn length, each allele at the x of its anchor with a y
offset by BFS depth, then FMMM with the component rotation switched off and the
orientation fit applied.

![KIV-2, seeded](img/kiv2-seeded_quality_2_orient_1.png)

_KIV-2 seeded. The reference is a gentle arc left to right; each kringle copy is
a loop hanging under the position it belongs to._

![MHC class II, seeded](img/mhc-seeded_quality_2_orient_1.png)

_MHC class II, 279 nodes, seeded. The shipped layout of this cut is an L._

Measured against random placement on the same cuts (native build of the same
OGDF, within about 20% of the wasm engine):

| Locus | Nodes | Shipped force | Seeded FMMM |
| ----- | ----: | ------------: | ----------: |
| C4    |    34 |         35 ms |       21 ms |
| AMY1  |    42 |         41 ms |       24 ms |
| CFH   |    44 |         52 ms |       28 ms |
| KIV-2 |    58 |         57 ms |       33 ms |
| KIR   |   154 |        151 ms |       87 ms |
| MHC   |   279 |        150 ms |       94 ms |

Faster because FMMM starts near a minimum. Two limits stay. Above roughly 300
nodes on screen the drawing is a rope whatever the seed, because node thickness
is constant in pixels and zoom-to-fit gives each node under 3 px
(`agent-docs/GRAPH_SCALE_AND_LOD.md`). And a window whose alleles close a large
cycle, a haplotype bypassing most of the window, still draws the cycle.

The engine change: `bindings.cpp` reads an optional `x`/`y` per node;
`addToOgdfGraph` takes them as the chain's start, which is the code path
`linearLayout` already has; `layoutGraph` takes a flag to skip
`reassembleDrawings`' rotation; `drawnScale.ts` computes the seeds from
`stable`. `layout-digest.mjs` gains the seeded cases and every force figure of
an anchored graph regenerates, deliberately.

## Experiment 3: a reference-ordered layered layout

Every node gets an integer layer; x is cumulative layer width; y is a lane.
Backbone nodes take increasing layers in reference order. Every edge is directed
from lower to higher reference order, so the graph is acyclic by construction
and no cycle-removal heuristic can misplace the reference. Off-reference nodes
take the longest-path layer between their anchors, then slide right to centre in
their bubble. Node width is `10 + 8 * log2(bp)`, the tube map's compressed rule.
y is a left-to-right barycenter sweep with the backbone pinned at 0 and each
allele taking the nearest free lane above or below. Ninety lines of JS,
`scripts/layout-lab/ordered.mjs`.

![KIV-2, ordered](img/kiv2-ordered.png)

_KIV-2 ordered, drawn 4,800 px wide. Each kringle copy is a lens on the
reference line; the dashed reference-to-reference skips are the bare edges the
view already labels as deletions._

![MHC class II, ordered](img/mhc-ordered.png)

_MHC class II ordered. 279 nodes fit one scrollable strip, every allele
visible._

This keeps what the anchored layout was for, a left-to-right reference with x
monotone in reference order, but x is **order**, not bp, so a SNP allele gets
the same drawn room as a 3 kb segment beside it and a bubble is a lens rather
than a bar under a line. It gives up lining up under a linear view column for
column. The row layouts stay for the figures that need that.

OGDF's own `SugiyamaLayout` was tried for the same job. It draws bubbles well
but does not know rank 0, so its cycle removal wraps the backbone into two rows
on the HLA cut, and it would grow the wasm engine from 307 KB to 1.88 MB, since
`OptimalRanking` pulls in COIN-OR's LP solver. The JS layout needs neither.

## Experiment 4: haplotype lanes

The same windows through sequenceTubeMapModern's `tubemap.ts`, run headless
under jsdom. Its ordering is a path-anchored version of experiment 3. What it
adds is per-node lane packing: a node is as tall as the haplotypes through it, a
track keeps its lane where it can, and a haplotype that skips a node runs past
it as a horizontal band. No layout that emits one polyline per node can express
that, and the view's `drawPaths` ribbons, which offset every path by a constant,
draw 44 walks as a rainbow rope.

The costs are real and documented in that repo: cost tracks node visits, not
nodes; width grows superlinearly with the window; every haplotype is drawn. On
the hosted KIV-2 eight-haplotype GBZ cut (15,808 nodes, 9 walks) the tube map
laid out in 3.3 s and produced a 226,000 px wide strip. The port is
`generateNodeOrder` (about 150 lines) and `generateLaneAssignment` with
`generateSingleLaneAssignment` (about 450 lines), plus lane geometry in
`LayoutResult` and a lane-band pass in `GeometryBuilder`. The license is MIT.

## What did not help

- FMMM's force model, repulsion method and iteration counts, left at Bandage's
  values in every run; seeding dominated anything they could buy.
- OGDF Sugiyama, for the reasons above.
- Renaming nodes so Bandage's `linearLayout` sorts them in reference order. It
  works, but the component rotation then tips the line diagonal, so the engine
  needs the rotate flag either way.

## Reproduce

`scripts/layout-lab/` holds the harness: `cut-hprc.ts` cuts a locus from the
hosted index with the adapter's hop rule, `one.mjs` runs any set of layout
variants on a GFA and writes PNGs, `ordered.mjs` is the layered prototype,
`engine.mjs` drives the committed wasm engine and holds the orientation fit,
`native/driver.cpp` runs FMMM with seeds against a native OGDF built by
`scripts/profile/build.sh`. `README.md` there has the commands.
