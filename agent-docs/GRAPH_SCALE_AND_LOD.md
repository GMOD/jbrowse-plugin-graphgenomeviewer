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

- **Anchored / sample-rows** (O(n), local): rendering is the wall.
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

- **`graphScopeComboBox` + `nodeDistanceSpinBox`** — draw the whole graph, or
  everything within N steps of a named node. `RgfaTabixAdapter.getSubgraph`
  already takes `context` for exactly this and **nothing in the UI ever sets
  it**, so the expensive half is built. This is the one that changes what the
  view is for: it turns a fixed window into somewhere you can walk outward from.
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
