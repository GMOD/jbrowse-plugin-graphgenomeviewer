# Graph scale: what we can draw, and what it would take to draw more

Measured 2026-07-24 while removing the dead edge mesh. Records the scale
envelope, why the region cap is the wrong knob, and why the obvious next steps
(bubble coarsening, a stroke-based renderer) are **deliberately not built**.
Every number here was measured in this repo or read out of vendored source; none
is estimated.

## The envelope

Bubble-chain graphs, `buildGeometry` on the main thread, canvas draw calls
counted through a recording 2D context (see `Canvas2DRenderer.test.ts` for the
technique):

| nodes | edges | parse+convert | buildGeometry | vertex buffers | draw calls / frame |
| ----- | ----- | ------------- | ------------- | -------------- | ------------------ |
| 1k    | 1.3k  | 4 ms          | 7 ms          | 0.8 MB         | 12,550             |
| 10k   | 13k   | 36 ms         | 43 ms         | 7.5 MB         | 125,410            |
| 100k  | 132k  | 221 ms        | 632 ms        | 75 MB          | 1,254,010          |

- **≤2k nodes**: comfortable. Rebuild under 10 ms.
- **~10k nodes**: degraded. 125k draw calls is single-digit fps while panning.
- **≥50k nodes**: broken. Geometry alone blows a frame budget by 10×.

Draw calls run at **12.6 per node**, and the breakdown is exact: 991 nodes × 10
triangles = 9,910 `fill()` calls, + 1,320 edge strokes + 1,320 arrow fills.
**Nodes are 79% of all draw calls**, because each is a triangle fan rasterized
one triangle per `fill()`.

Which wall you hit first depends on the layout mode:

- **Anchored / sample-rows** (O(n), local): rendering is the wall. This is the
  one mode a GPU backend would help, and the only one — `IDEAS.md` scopes it.
- **Force (OGDF FMMM in WASM)**: the layout is the wall, and it arrives earlier.
  strangepg's README is the best available calibration — its _parallelized C_
  Fruchterman-Reingold is "still slow for 10k+ nodes". Ours is single-threaded
  WASM, so low thousands.

The FMMM layout does run off the main thread:
`jbrowse-web/src/rootModel/rootModel.ts` sets
`defaultDriverName: 'WebWorkerRpcDriver'`. `buildGeometry` does **not** — it
runs in the model's `upload` callback, so it is the main-thread cost that
matters.

## The legibility ceiling is ~50x tighter than the node budget (2026-07-30)

`maxGraphNodes` (20,000) is where the tab stops being usable. It says nothing
about where a **force layout stops being readable**, and that limit is set by
geometry rather than by cost:

- node thickness is a constant in backing-store pixels (`Canvas2DRenderer`:
  `position * scaleX + normal * thickness`), so it does not shrink with zoom;
- zoom-to-fit puts the whole drawing in ~900 CSS px;
- so **N nodes on a path get 900/N px each**, and once that is under the
  thickness the drawing is a rope with the topology inside it.

Measured on HPRC release 2's chrM pggb graph, whole-file import:

| graph                                   | nodes | edges | FMMM    | px per node | reads as        |
| --------------------------------------- | ----- | ----- | ------- | ----------- | --------------- |
| whole chrM, 234 paths                   | 4,749 | 6,540 | 1.6 s   | 0.19        | a fat rope      |
| 12 divergent haps, unchopped            | 1,426 | 1,985 | -       | 0.63        | a rope          |
| `chrM:16,024-16,400` (HVS-I), 234 paths | 351   | 514   | 163 ms  | 2.6         | rope + speckles |
| `chrM:8,200-8,400`, 234 paths           | 61    | 84    | <100 ms | 15          | **legible**     |

So the force layout wants **tens of nodes, not thousands**, and the way to get
there on a base-level graph is a _narrow window with many haplotypes_ — which is
also why `pangenome/local_subgraph` (36 nodes over 561 bp) is the one existing
force figure that reads well. Node count, not window size, is the axis.

### What the two force-layout settings cost (2026-08-13)

The engine's cost tracks the OGDF node count, not the graph's. Each graph node
becomes `ceil(drawnLength / nodeSegmentLength) + 1` of them, so raising the
floor on drawn length — which is what `bubbleSpread`'s 'open' and 'wide' do —
subdivides **every** node, the non-branching chain included, not just the
alleles it is meant to open. Measured on the committed engine over a bubble
chain (`scripts/` has no fixture for this; the generator is a backbone segment
between each pair of alleles), ms:

| nodes | spread       | OGDF nodes | q=0 | q=2   | q=4    |
| ----- | ------------ | ---------- | --- | ----- | ------ |
| 121   | proportional | 447        | 97  | 86    | 213    |
| 121   | wide         | 2,541      | 90  | 355   | 1,328  |
| 1,201 | proportional | 4,407      | 165 | 561   | 2,385  |
| 1,201 | open         | 7,607      | 242 | 961   | 3,583  |
| 1,201 | wide         | 25,221     | 708 | 3,847 | 13,127 |

Re-measured after `-fcx-limited-range` (below), which is why the high-quality
column is ~1.5x faster than this table first recorded. **Every engine timing
elsewhere in this file predates that commit and is now an upper bound**, the
chrM figures above included.

So the two settings multiply: 'wide' at the highest quality is **23x**
proportional at the default quality on the same graph. Both are legitimate
choices — see BUBBLE_SPREADS for what each buys — but they are the reason a
force layout is ever slow, and neither said so.

Two consequences, both now in place. `model.ts` holds a per-graph cache keyed on
exactly these three inputs, so a comparison that goes back to a drawing already
computed pays nothing; and the settings dialog states the quality's cost and
says outright when an anchored layout is ignoring both controls.

**Fragmentation is not a cost.**
`rotateComponentsAndCalculateBoundingRectangles` allocates two
`NodeArray<DPoint>` sized to the whole graph once per connected component, which
looks quadratic. It is not the wall: at 1,200 nodes, 1 component is 501 ms and
300 components is 228 ms, because FMMM is superlinear and splitting helps more
than the allocation hurts. Do not "fix" it.

### SIMD and LTO buy nothing (2026-08-13)

`-msimd128` and `-flto` are the cheap end of "make the engine faster" — build
flags rather than a patch to the vendored OGDF, so they cost no merge debt at a
version bump. Both were built and measured; **neither is worth taking.** Applied
to both `libOGDF.a` and the engine translation unit, min of 5 interleaved
rounds, ms:

| case                          | base  | simd  | lto   | simd+lto |
| ----------------------------- | ----- | ----- | ----- | -------- |
| 361 nodes, proportional q=2   | 183   | 183   | 171   | 171      |
| 361 nodes, proportional q=4   | 975   | 971   | 945   | 943      |
| 361 nodes, wide q=2           | 1,209 | 1,213 | 1,141 | 1,134    |
| 1,201 nodes, proportional q=2 | 644   | 647   | 609   | 608      |
| 1,201 nodes, proportional q=4 | 3,548 | 3,533 | 3,449 | 3,643    |
| 1,201 nodes, open q=4         | 5,567 | 5,602 | 5,648 | 5,462    |
| 1,201 nodes, wide q=2         | 4,104 | 4,128 | 4,072 | 4,055    |

SIMD is **1.00x on every case** — the flag does change the binary, so it is not
inert at the compiler level, it just does not reach what FMMM spends its time
on: the hot loops walk OGDF's `NodeArray`/`EdgeArray` structures through node
and edge pointers rather than over contiguous doubles, and there is nothing
there to vectorize. LTO is 0-7% and **costs 43 KB on the committed artifact**
(441 KB to 484 KB), which is inlined base64 in a lazy chunk. That is a bad trade
for 5%.

**They are safe, though, which is the reusable part.** All three variants
reproduced the committed drawing exactly — 90 of 90 `layout-digest.mjs` cases
byte-identical to the baseline. So neither flag reorders FMMM's arithmetic, and
if a future emcc makes either pay, it can be turned on without regenerating a
single figure. Recheck with the recipe in `src/bandage/README.md`; a variant
build is `CXXFLAGS=<flags>` on both cmake configures.

The same run re-confirmed that a from-scratch rebuild under emcc 6.0.6 is
digest-identical to the committed artifact.

**Do not benchmark this with three rounds.** A min-of-3 first pass showed SIMD
at 1.16x and simd+lto at 1.20x on the two most expensive cases, which is
entirely first-round tiering noise; min-of-5 collapsed both to 1.00x. Anything
under ~10% here needs the extra rounds before it means anything.

### Where the layout time actually goes (2026-08-13)

Profiled rather than guessed, which is what turned up the finding below. The
engine has no profiler of its own, so the layout path was driven by a native
build — `graphlayout.cpp` and the vendored OGDF compiled with `g++ -O3 -g`, a
`main()` reproducing `bench-layout.mjs`'s bubble chain, `perf record` under
`sudo` (this box has `perf_event_paranoid=4`). Native and wasm run within ~20%
of each other on the same case, so **attribution transfers but magnitudes do
not** — see the divergence below.

Self time, 1,201-node bubble chain, top entries:

| symbol                             | prop q=2 | prop q=4  | wide q=2 |
| ---------------------------------- | -------- | --------- | -------- |
| `numexcept::f_rep_u_on_v`          | 28.4%    | 19.2%     | 21.9%    |
| `__divdc3` (complex division)      | 7.5%     | **22.4%** | 6.3%     |
| `calculate_neighbourcell_forces`   | 13.3%    | 11.4%     | 13.8%    |
| `transform_local_exp_to_forces`    | 5.0%     | 5.1%      | 6.1%     |
| `find_smallest_quad`               | 4.2%     | 3.0%      | 9.3%     |
| `atan2` (from `std::log(complex)`) | 4.6%     | 3.2%      | 3.2%     |
| `PoolMemoryAllocator::allocate`    | 3.5%     | 2.9%      | 4.9%     |

Two things are load-bearing. The near-field direct repulsion — `f_rep_u_on_v`
plus its caller `calculate_neighbourcell_forces` — is ~35% and is irreducible
without touching OGDF. And **`__divdc3` is the compiler's out-of-line
complex-division helper**, which at the highest quality is the single largest
cost in the program. It is there because the multipole expansions divide by
`(z_1 - z_0)^k` for k up to `precision()`, which the quality knob raises from 2
to 8 (`NewMultipoleMethod.cpp`, `add_local_expansion`) — so the quality setting
buys its extra precision largely in complex divides.

#### `-fcx-limited-range` is worth 1.3-1.9x and moves nothing

**Applied**, on both `libOGDF.a` and the engine TU — `scripts/build-wasm.sh`
carries the reasoning and stamps the flag into the OGDF build tree so a stale
library cannot be linked into the committed artifact. The measurement that
justified it, min of 5 interleaved rounds, ms:

| case                          | base  | -fcx-limited-range |       |
| ----------------------------- | ----- | ------------------ | ----- |
| 361 nodes, proportional q=2   | 181   | 143                | 1.27x |
| 361 nodes, proportional q=4   | 986   | 550                | 1.79x |
| 361 nodes, wide q=2           | 1,283 | 971                | 1.32x |
| 1,201 nodes, proportional q=2 | 681   | 521                | 1.31x |
| 1,201 nodes, proportional q=4 | 3,892 | 2,013              | 1.93x |
| 1,201 nodes, open q=4         | 6,279 | 3,661              | 1.72x |
| 1,201 nodes, wide q=2         | 4,985 | 3,085              | 1.62x |

**The wasm gain is far larger than the native profile predicts** (native q=4 is
2,701 to 2,087 ms, 1.29x, against 1.93x for the same case in wasm). `__divdc3`'s
`logb`/`scalbn`/`fmax` are inline instructions natively and out-of-line calls in
wasm, so the helper costs much more there. This is the one place the native
profile understates rather than merely approximates: take attribution from it,
take numbers from `bench-layout.mjs`.

**The drawing does not move, and not by luck.** Emscripten's `__divdc3`
(`emsdk/upstream/emscripten/system/lib/compiler-rt/lib/builtins/divdc3.c`)
computes the same naive `(ac+bd)/(c²+d²)` that the flag inlines — it just scales
`c` and `d` by `scalbn(±ilogbw)` first and unscales the result. Those are exact
powers of two, so every rounding is the same one and the results are
**bit-identical whenever no intermediate overflows or underflows**. Confirmed
empirically both ways: all 90 `layout-digest.mjs` cases identical and finite,
and 8 larger shapes than the digest covers (up to 2,401 nodes at q=4) identical
with a max coordinate delta of exactly 0.

Where it _would_ differ is precisely the case the scaling exists for: the naive
denominator is `|z_1 - z_0|^(2k)`, so it needs `|z_1 - z_0|` outside roughly
`[1e-19, 1e19]` at q=4 to leave double's range. The measured drawings have an
extent of 1e4 to 1e5, so there are ~14 orders of magnitude of headroom, and the
underflow end needs two quadtree box centers nearly coincident. It also drops
complex multiplication's NaN-recovery path, which only fires on operands that
are already inf or NaN. `layout-digest.mjs` prints a `finite` column, which is
the check that would catch it.

After the flag, the near-field repulsion is the profile's floor: `f_rep_u_on_v`
27.8%, `add_local_expansion` 13.3%, `calculate_neighbourcell_forces` 12.3% at
q=4. Going past that means editing OGDF, with the merge cost that implies.

### On real pangenome graphs the cost is linear in OGDF nodes (2026-08-13)

Every layout number above this line was measured on a synthetic bubble chain —
uniform degree 2, two node lengths. `scripts/bench-gfa-layout.mjs` runs the
committed engine on actual files instead, one child process per case so a
timeout or an abort is a row rather than a dead run. Four graphs, spanning the
kinds this view is pointed at, at q=2 and the proportional spread:

| graph                                | segs    | links   | mean deg | OGDF nodes | layout  | RSS     |
| ------------------------------------ | ------- | ------- | -------- | ---------- | ------- | ------- |
| `chrM.pan.4` (pggb)                  | 154     | 205     | 2.7      | 589        | 102 ms  | 73 MB   |
| `hprc-v1.1-mc-grch38.chrM` (MC)      | 1,393   | 1,885   | 2.7      | 5,194      | 675 ms  | 92 MB   |
| `31.chr22` (strangepg fixture)       | 5,001   | 13,998  | 5.6      | 19,065     | 5.3 s   | 137 MB  |
| `22.hlasortof` (strangepg fixture)   | 118,663 | 146,811 | 2.5      | 440,790    | 111 s   | 1.04 GB |

Nothing failed. **There is no cliff** — the 118k-segment graph is 441k OGDF
nodes and 111 seconds, which is unusable but not a crash, and memory grows
smoothly to a gigabyte.

Cutting the HLA graph to increasing prefixes gives the shape, and it is close to
linear in OGDF nodes across three orders of magnitude:

| OGDF nodes | layout  | ms per OGDF node |
| ---------- | ------- | ---------------- |
| 3,621      | 580 ms  | 0.160            |
| 18,158     | 2.97 s  | 0.164            |
| 36,947     | 5.73 s  | 0.155            |
| 92,051     | 17.7 s  | 0.192            |
| 184,920    | 36.9 s  | 0.199            |
| 440,790    | 111 s   | 0.252            |

So the superlinearity FMMM is known for is mild at this scale — the exponent
runs about 1.0 to 1.27, and the per-node cost only drifts up 1.6x while the
graph grows 120x. **Mean degree moves it more than size does**: chr22 at 19,065
OGDF nodes costs 0.28 ms each against the HLA graph's 0.164 at 18,158, and the
difference between them is degree 5.6 against 2.3.

Two things this settles. `bench-layout.mjs`'s bubble chain is not misleading —
its 1,201-node proportional q=2 case is 4,407 OGDF nodes at 521 ms, i.e. 0.118
ms per node, the same order as everything here. And IDEAS.md's "not obviously
the bottleneck for anything" is too generous for **base-level** graphs: a 5,000
segment pggb/MC window is already 3-5 s, which is past interactive. It stays
academic only because of the legibility ceiling above — 5,000 nodes in a 900 px
fit is 0.18 px each, so nobody can read the drawing that took 5 seconds.

### The profile on a real graph, and what it says about a GPU (2026-08-13)

The profile above was taken on the bubble chain. `scripts/profile/` rebuilds the
same sources natively — `build.sh`, then `perf record` — so the split can be
read on a real one. chr22 (5,001 segments, mean degree 5.6), which the native
driver lays out in 4,484 ms against the engine's 5,343 ms, i.e. the usual ~20%
native-vs-wasm gap. Self time, grouped by what a GPU port could and could not
take:

| group                                          | chr22 q=2 | chr22 q=4 | chain q=2 |
| ---------------------------------------------- | --------- | --------- | --------- |
| **near-field direct repulsion** (parallel)      | **54.3%** | **44.9%** | 41.7%     |
| far-field multipole, tree passes                | 15.6%     | 27.6%     | ~12%      |
| quadtree build + `PoolMemoryAllocator`          | 8.8%      | 9.9%      | ~8%       |
| attractive/edge forces (parallel)               | 1.5%      | 2.4%      | -         |
| `libm` (`atan2`, `hypot`, `log`)                | 4.9%      | 4.3%      | 7.8%      |

Near-field is `f_rep_u_on_v` plus `calculate_neighbourcell_forces`; far-field is
`add_local_expansion`, `transform_*_to_forces`, `well_separated` and the leaf
expansions.

**A real graph is more parallel than the synthetic one, not less** — 54% against
42% at q=2, because degree 5.6 puts more pairs in each neighbour cell. Quality
pushes the other way: q=4 raises the multipole precision `k` from 2 to 8, and
`add_local_expansion` goes 6.1% to 14.3%, so the far-field tree work more than
doubles its share.

`__divdc3` is **absent at both qualities**, which is the check that
`-fcx-limited-range` is live in this build. It was 22.4% at q=4 before it.

So the Amdahl ceiling on porting the parallel part is **2.3x at q=2 and 1.9x at
q=4** — 2.5x and 2.2x if the far-field force evaluation goes too — with a
perfect port and zero transfer cost. FMMM rebuilds its quadtree every iteration
and runs hundreds of them, so a real implementation pays a kernel launch and a
sequential tree build per iteration against that ceiling.

**What that buys, against the measurements above.** The 118k-segment graph goes
from 111 s to perhaps 45 s: still unusable. A 5,000-segment base-level window
goes from 5.3 s to ~2.3 s: still not interactive. And at the sizes the
legibility ceiling actually permits — tens of nodes, where a drawing is
readable — the layout is already under 100 ms. **A GPU port does not move the
boundary between interactive and not at any graph size**, which is the reason
this is recorded here, beside its numbers, rather than in IDEAS.md.

The cheaper lever is in the table above: mean degree and `bubbleSpread` set the
constant, and the quality knob is worth 4x on its own.

Two things follow, and both are now implemented or recorded:

- **The floor on a node's drawn length is what hides the variation**, and it is
  a view setting (`bubbleSpread`, `src/GraphGenomeView/bubbleSpreads.ts`) rather
  than a retuned default. Bandage's 5 units suits assembly contigs; a 1-50 bp
  allele clamps to a stub and both arms of a bubble land inside one node
  thickness. At 2.5x the mean drawn node length every bubble on that 61-node
  window is a legible lens; at 10x clearer; past that the drawing only grows
  (1,980 -> 3,386 -> 7,452 -> 26,617 units wide, aspect flat at ~1.33). The
  default stays Bandage's, because raising it flattens the length ratio among
  the smallest nodes and `bandageAutoScale`'s proportionality test pins that at
  `'auto'`.
- **A drawing far larger than the pane can render blank.** Reproduced twice in a
  real jbrowse-web capture of the 4,749-node graph: the toolbar reported the
  graph, the layout and `geom 10ms`, and the canvas was white; changing the
  colour scheme (which invalidates the upload autorun) painted it correctly.
  `buildGeometry` culls against a viewport derived from the transform read
  `untracked`, and a build that runs before zoom-to-fit lands sees a pane-sized
  window of a 97,000-unit drawing and discards every node — offline, that build
  is 0 vertices in 14 ms against 90,864 in 24 ms fitted, which matches the
  reported 10 ms. **The recovery path is not identified yet**:
  `src/GraphGenomeView/renderPipeline.test.ts` drives the real autoruns in both
  mount orders and both recover, so something the model harness lacks (the
  `useRenderingBackend` mount sequence, a resize that clears the canvas) is
  involved. Do not "fix" this by guessing — it reproduces in a capture, so
  instrument that.

## Why the region cap is the wrong knob

`MAX_GRAPH_REGION_BP` bounds the _fetch_, and it is the only cap applicable
before one happens. But cost tracks node count, and bp-per-node varies by ~400×
across graph types:

| graph                                           | bp / node | 100 kb window is |
| ----------------------------------------------- | --------- | ---------------- |
| HPRC minigraph chr6 (24,362 segs over 170.8 Mb) | ~7,000    | ~12 nodes        |
| `ecoli_pggb_subgraph` (31 nodes / 545 bp)       | ~18       | ~5,700 nodes     |

So 100 kb protects the graph type that doesn't need protecting. Real HPRC chr6
windows, counting distinct segments both link endpoints pull: **median 12, p90
32, p99 115, max 350** — 6-150× _inside_ the comfortable ceiling.

Hence `maxGraphNodes` (default 20,000), checked in `parseAndLayout` because that
is the one point both load paths cross and it is upstream of layout, geometry
and draw calls. It also gives the whole-file import path its first cap of any
kind; before, a chromosome-scale GFA parsed and then froze the tab. It is a view
prop, not a constant, so a session can raise it — the escape hatch strangepg
spells `-T N`.

## Bubble coarsening: a zoom level, not the answer

`MinigraphBubbleAdapter` already reads precomputed, tabix-indexed
`gfatools bubble` output, so the expensive half of bubble coarsening is done and
region-queryable. Tempting. The arithmetic says it buys one zoom level:

- Measured locally, HPRC chr6 MHC over the same 1.95 Mb: **565 segments → 131
  bubbles = 4.3×** (mean 6.5 segments/bubble, max 104).
- Genome-wide, from `RGFA_GRAPH_HANDOFF.md`: **751,237 segments / 130,510
  bubbles = 5.8×**. Two independent measurements agreeing on ~4-6×.

A whole-genome graph coarsened by bubbles is still ~130k glyphs — 65× above the
comfortable ceiling. pangyplot's `context/multi-resolution-zoom.md` explains why
any topology-respecting collapse caps out, measured on chrY (163,806 segments):

- **39.4% of segments are junctions** (degree ≠ 2); pangenome graphs are
  branchy.
- Linear runs average **2.8 segments**, max 4.
- Their Ramer-Douglas-Peucker experiment stalled at ~60%: "RDP preserves all
  endpoints (junctions), so it can never reduce below the junction count."

Their coarse view therefore uses **grid snapping**, which merges _nearby
junctions_ and so breaks the topological floor, reaching 99%+. Bubbles structure
their detail view as collapsible units; grid snapping delivers the orders of
magnitude.

Two warnings before anyone builds either:

- **Bubble enumeration is preprocessing, never runtime.** pangyplot's
  `context/bubblegun-migration.md`: BubbleGun indexing costs chrY 2 s/1 GB, chrX
  30 s/11 GB, chr9 ~40 min/13 GB, and **chr1 hangs at 15+ GB**. Their
  integration was reverted from `main` over a ~50× regression. We dodge this
  entirely by consuming `gfatools bubble` output (26 s, 4 GB, genome-wide)
  instead.
- **Per-graph sidecars were already tried here and rejected.** The removed
  `GfaTabixAdapter` was 487 lines plus five bespoke artifacts per graph, one of
  which was `.graph.coarse.bed.gz` — a precomputed coarse LOD. See
  `MULTILGV_SYNTENY_RGFA_HANDOFF.md`. Any grid-snapping scheme needs a story for
  that cost, or it repeats the mistake.

## Whole chromosomes: a goal (decided 2026-07-24)

Showing chromosome-scale graphs is wanted, on the reasoning that JBrowse itself
invests heavily in whole-chromosome rendering and graphs should be no different
— subject to not blowing up the browser.

**The framing that matters: at that scale coarsening is the wrong tool.** chr6
is 170.8 Mb; at a 1000 px canvas that is 170,806 bp/px, and a mean rank-0
minigraph segment (10,946 bp) is **0.064 px wide** — 16 segments per pixel
column. Every coarsening scheme (bubble collapse, grid snapping, coarsening
trees) reduces the node _count_ while still drawing something node-shaped. At
1/16th of a pixel there is no node-shaped thing to draw. What is needed is a
**different visual idiom per zoom band**, which is exactly what JBrowse already
does for quantitative data with BigWig reduction levels, and what pangyplot does
with two views.

The other thing that makes this cheap: **the anchored layout already puts x on
the reference axis in bp**, so an overview and a locus graph share one
coordinate system. The overview is therefore naturally an _LGV track_, not a
zoomed-out graph canvas — and JBrowse's block machinery, worker rendering and
density handling all apply for free.

### The three bands

| band         | zoom          | data                     | drawn                       |
| ------------ | ------------- | ------------------------ | --------------------------- |
| **Overview** | chromosome–Mb | bubble index only        | per-pixel-column summary    |
| **Bubble**   | Mb–100 kb     | bubble index only        | one glyph per bubble        |
| **Detail**   | ≤100 kb       | segs + links (the graph) | today's node/edge rendering |

Bands 1 and 2 read the **same** tabix bubble index and differ only in whether a
bubble is drawn individually or binned, so they are one adapter and two glyph
modes — far cheaper than grid snapping, and needing no new precomputed artifact.

Sizing, from the fixtures: chr6 has ~7,200 bubbles (42 bubbles/Mb genome-wide),
so binned to 1000 pixel columns that is **7.2 bubbles per column** — O(pixels)
to draw. A 5 Mb window holds ~210 bubbles, comfortable to draw individually.

**Why this cannot blow up the browser, structurally:** bands 1 and 2 never fetch
segments or links. No graph is built, no layout runs, no FMMM, and
`maxGraphNodes` never comes into play, because there are no nodes. The expensive
path is only ever entered at locus scale, where measured density is p99 115
nodes against a ~2,000 ceiling. The launcher for that transition already exists
(`launchSubgraph`).

### What is actually missing

`MinigraphBubbleAdapter` already emits `score: segmentCount` plus
`shortestAlleleLength` / `longestAlleleLength` / `inversion` per bubble, and the
track is a plain `FeatureTrack` defaulting to `LinearBasicDisplay`. So the
overview _works_ today — it just draws 7,200 feature boxes that coalesce into an
uninformative smear and convey no magnitude.

The gap is a **quantitative/density display** for that track: per pixel column,
bubble count and max allele delta (`longest - shortest`), with inversions
marked.

**This is configuration, not code — verified by reading the wiggle plugin.**
`plugins/wiggle/src/RenderWiggleDataRPC/executeRenderWiggleData.ts:83` calls
`adapter.getFeaturesArray(region, opts).then(featuresToRaw)` against a plain
`BaseFeatureDataAdapter`, and the score domain is computed from the fetched
features (`computeScoreExtent` via `shared/WiggleCommonMixin.ts`), **not** from
an adapter-side `getGlobalStats`. `MinigraphBubbleAdapter` already extends
`BaseFeatureDataAdapter` and already sets `score`, so adding a
`LinearWiggleDisplay` to the bubble track should give the overview band with no
new rendering code. First cut is a `displays: [...]` entry in the track config.

Two follow-ups once that is confirmed running (the e2e harness cannot boot here,
so the contract above is read, not executed):

- `score` is currently `segmentCount`. **Allele delta**
  (`longestAlleleLength - shortestAlleleLength`) is the more meaningful
  magnitude for "how variable is this spot" — the label already leads with it.
  Making the scored field a config option on the adapter is a few lines.
- `inversion` has no quantitative channel; it likely wants to stay a
  feature-track glyph layered above the density, not be folded into the score.

### Superseded: grid-snapping LOD

Recorded because it was the previous recommendation and should not be revived
without reading this. pangyplot needs grid snapping because their coarse view is
still a _graph_ drawing; if the overview is a per-column summary instead,
merging junctions buys nothing that binning does not already buy, and it costs
the precomputed multi-level per-graph artifact this repo already rejected once
(see the `.graph.coarse.bed.gz` note above).

## Still deferred: nodes as strokes

A node is geometrically a stroked polyline with round caps, which is exactly
`ctx.stroke()` with `lineCap: 'round'` — the pattern edges already use. It would
cut draw calls **12,550 → 3,631 (3.5×)**, delete `addPolyline`/`addRoundCap` and
the node half of the highlight machinery, and leave one drawing model instead of
two.

Not done, because the workload doesn't ask for it: minigraph windows are p99 115
nodes against a 2,000 ceiling, and the band plan above keeps it that way. It
only pays off on **base-level graphs** (pggb / Minigraph-Cactus), where a 100 kb
window is thousands of nodes — and those have no indexed adapter today, arriving
only by whole-file import.

> **Trigger**: build it when a base-level-graph adapter lands, or when a real
> workload is measured above ~2k drawn nodes. It also retires the GPU-ready
> vertex mesh, which `GraphRenderer.ts` reserves for a future WebGL backend;
> that mesh currently has one consumer left (arrowheads).

## Fixed along the way

For the record, since the numbers justify the changes:

- Dead edge mesh removed: it was tessellated every build and drawn by nothing.
  Interleaved same-process A/B: **133 ms → 37 ms**, and 5.06 MB of buffers per
  build (128k vertices, 240k indices) no longer allocated.
- Spatial-index cell size derived from mean item extent, not a fixed 50 world
  units: bp-scale edge index **7.15 ms → 0.60 ms**.
- `Math.max(...backbone)` replaced with folds — it throws `RangeError` between
  125k and 150k arguments, reachable on the uncapped import path.

## Measured against Bandage's own UI (2026-07-30)

Cross-referenced `~/src/vendor/BandageNG/ui/mainwindow.ui`, which is the control
list of the tool this view's layout engine comes from. Ours now covers node
labels (`graphLabels.ts` — Bandage's Length, and it picks the same fact a
pangenome reader wants), the colour modes, the layout quality, and a floor on
drawn node length that Bandage exposes as `nodeWidthSpinBox`'s neighbours. What
it has and we do not, in the order I would take it:

- **`selectNodesButton` + exact/partial match** — find a segment by name and
  centre on it. A graph with no search is a graph you can only browse.
- **node width by depth.** Bandage's signature look, and the reason a collapsed
  repeat is obvious there: `GraphNode.depth` is parsed and only the `depth`
  colour scheme reads it. Width is the stronger channel and it is free — the
  mesh already takes a per-node thickness.
- **`pathListButton` / `walkSelectButton`** — list the paths, select one, and
  recolour or highlight the route it takes. `drawPaths` is the beginning of
  this, but there is no way to pick _which_ path, and on a path-anchored pggb
  graph (234 haplotypes through chrM) picking one is the whole question.
- **`textOutlineCheckBox`** — labels over a busy drawing need a halo. Ours use a
  translucent background, which is the cheap version and is worse where nodes
  overlap.

Two Bandage features that deliberately do not port: BLAST search
(`blastSearchButton` and friends), because a JBrowse session has real annotation
tracks to launch out to instead, and `csvCheckBox` custom labels, which is a
config slot's job here.

## Graph context: what the cut reaches, and what it can't (2026-07-30)

`graphScopeComboBox`/`nodeDistanceSpinBox` above is now the **Graph context**
select in Graph settings (`SubgraphContextSelect`), the `subgraphContext` view
prop, and `getSubgraph`'s long-unused `context` argument. It exists for
correctness before reach: at context 0 the cut stops at the segments the
region's own links name, and a detour that leaves the backbone _before_ the
window and rejoins _after_ it is indexed only under its own stable sequence, so
its interior never arrives. What draws is the entry and exit fragments — two
stubs. A reader seeing CFT073's 43 bp fragment at the E. coli paa locus would
conclude it carries a small insertion, where the truth is it bypasses 21 kb of
reference.

Measured with `tabix` directly against the two hosted indexes, not estimated:

| cut                                 | context 0     | context 1       |
| ----------------------------------- | ------------- | --------------- |
| E. coli `K12#1#chr:1445000-1474500` | 14 segs, 2 q  | 22 segs, 10 q   |
| HPRC chr6 100 kb, densest window    | 352 segs, 2 q | 363 segs, 140 q |

So the cost is **queries, not nodes** — one per off-reference segment already
reached, all fired together by the `Promise.all` in `getSubgraph`, and +3% nodes
on the HPRC window. Merging each hop's frontier intervals per stable sequence
was tried and dropped: it only reached 128 queries from 140, because every arm
sits on its own contig and there is nothing to merge.

The limitation to state plainly, because it is why a doc figure still ships a
`gfatools`-cut file rather than a launch: **hops on a coordinate index do not
converge to a graph-aware cut**. Each hop's frontier is an interval per reached
segment, so it also drags in flanking backbone outside the window, and it still
stops somewhere. At the paa locus context 1 closes all four detours but misses
`s1614`/`s509` while adding five segments `gfatools view -R … -r 1` leaves out.
Both are legitimate answers to different questions; a figure that has to be an
exact hop radius on the graph should be cut with the graph tool and loaded as a
file (`gfaLocation`), which is what `pangenome/rgfa_paa_bubble` does.

A file-loaded graph has no `loadedRegion`, so the reference-position ramp had
nothing to span and fell back to the file's own first/last backbone midpoints.
`colorDomain` is how such a snapshot states the span instead, resolved with
`loadedRegion` by the `rampDomain` getter — that is what lets a linear track
above a file-loaded graph be painted the same ramp from the same two numbers.
