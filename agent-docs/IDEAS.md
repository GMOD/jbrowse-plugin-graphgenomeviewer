# Ideas not built

Things worth doing that nobody has done, kept here so picking one up does not
start from scratch.

An entry earns its place by carrying the **measurement that would justify it**
and an honest account of **what it costs** — including the part of the problem
it does not solve. An idea with neither is a guess, and guesses belong in a
conversation rather than in a file that reads as a plan.

Two things deliberately do not live here. Work that was measured and rejected
stays beside the measurement that rejected it — `GRAPH_SCALE_AND_LOD.md` has the
"do not fix it" notes, and they are more useful next to their numbers than in a
list of aspirations. And anything already decided is an ADR.

## The graph following the linear view beside it

Its own file, `FOLLOW_THE_LINEAR_VIEW.md`, because the measurement and the cost
run past what an entry here holds — and because the answer turns on two facts
(an anchored graph's x axis already IS the linear view's; a graph cut cannot be
extrapolated, so `SyntenyFollow`'s two-pass structure only half transfers)
rather than on a number.

The number, for the entry's own sake: an rGFA re-cut is **~1.3 s and flat in
window size**, which is what makes a margin nearly free and the feature
plausible; a GBZ re-cut is **up to 12 s**, which is what keeps it off that
route. It also wants a decision this repo has not made — which linear views a
graph is related to — and that is the smaller half, described there.

## GPU rendering, for anchored layouts only

Replace `Canvas2DRenderer` with a GPU backend on the anchored / sample-rows
path. The view has never plotted with the GPU; `createGraphRenderer` returns the
Canvas2D backend unconditionally.

**This is about drawing, not laying out.** Running FMMM itself on the GPU is a
separate question with the opposite answer — measured, and recorded at the
bottom of this file and in `GRAPH_SCALE_AND_LOD.md`: near-field repulsion is 54%
of a real layout, so a perfect port ceilings at ~2.3x and never reaches
interactive. The two share the word "GPU" and nothing else, and both have been
asked.

**The preparation is already done**, which is most of why this is attractive.
`renderer/shaders/graph.generated.ts` is live today as a vertex buffer layout
contract — `GeometryBuilder` packs with `INSTANCE_STRIDE_F32` /
`FIELD_OFFSET_F32` and `Canvas2DRenderer` unpacks with the same constants — so
the geometry is already interleaved the way a GPU backend wants it, colors are
already ABGR-packed u32 to match a `uint` attribute, and `Canvas2DRenderer`
already extends `Canvas2DRenderingBackendBase` so `useRenderingBackend` wires
either kind uniformly. A GPU backend extends `GpuRenderingBackendBase` instead
and satisfies the same `Renderer` interface. Nothing in the model, the
component, or the geometry builder has to change.

**The payoff, measured** (GRAPH_SCALE_AND_LOD.md): draw calls run at **12.6 per
node**, and nodes are 79% of them because each is a triangle fan rasterized one
`fill()` per triangle. 10k nodes is 125k draw calls per frame, which is
single-digit fps while panning. Instancing collapses that to roughly one call.

**The scope is narrower than it sounds.** This only helps anchored layouts. A
force layout is bounded by the layout itself long before rendering — and by
legibility well before that, since it wants tens of nodes on screen, not
thousands. So the honest framing is "anchored layouts above ~2k nodes", not
"make the view fast".

**What it does not fix.** `buildGeometry` runs on the main thread and is already
632 ms at 100k nodes; the GPU never sees that. Nor does it change the 75 MB of
vertex buffers at that size.

**The blocker is that `graph.slang` exists in neither repo.** Only the generated
module's layout constants are in use; its WGSL and GLSL are dead code that
nothing compiles, and the codegen that produced them is not here either (which
is also why that file's "do not edit" header is false, and why a render-core
rename broke `pnpm typecheck` in 2026-08). Recreating the `.slang` is the real
work, and it has a bug waiting: it writes
`(position + normal * thickness / scale.x) * scale`, which only cancels when the
two scales are equal. A row layout has `scaleY = 1` and `scaleX ≈ 1e-2`, so
every stroke's half-width would stretch by about a hundred. The fix is `/ scale`
— the componentwise division cancels either way — and it has to happen in the
`.slang`.

**How to settle it:** build it behind the existing `Renderer` interface and
benchmark an anchored layout at 10k nodes against Canvas2D. The interface makes
that a real experiment rather than a commitment.

## Pick a tier by zoom, and expand a bubble on click

The view picks a tier by `bpPerPx`, the way PIF's two tiers already do in
jbrowse-components (`agent-docs/reference/SYNTENY_LOD.md`) — config is a prefix
per tier plus its bp range, and there is no new rendering mode. Then
**expand-on-click** (PangyPlot's `/pop`): the tier node id _is_ the bubble's
source segment, so expanding is a fine-index query over the same span with no
cross-reference to maintain. This retires `maxRegionBp`, which is the interim
mechanism.

A graph loaded through `gfaLocation` has no tier to switch to, so its coarsening
has to happen in the view: `COARSEN_TRIVIAL_BUBBLES.md`.

## Draw a node once per carrier

`sampleRowLayout` emits one position per node id and the renderer keys geometry
by that id, so real multi-row carriage needs synthetic per-carrier ids plus hit
detection resolving them back.

## A requested row set on the rGFA route

`subgraphHaplotypes` names the haplotypes a cut is for, and only the GBZ cut
reads it. On the rGFA route rows still come from whoever contributed to the
window, so a graph cannot be lined up row-for-row with a genotype matrix of
chosen donors. An explicit list (empty rows included) would make the two panels
comparable, pin the order across windows, and let the graph label `HG00642.1`
where the callset labels `HG00642 HP0`.

## Hops that reach donor rows without indexing every donor contig

A reference-only segs/links pair was built and does _not_ serve a graph cut:
`subgraphContext` defaults to 1 hop, and a hop follows allele interiors, which
are indexed under exactly the donor contigs the small pair drops — so pointing
the cut at it silently returns the context-0 graph with no error to notice
(measured on C4: context 0 agrees at 30/36, context 1 and 2 differ). The small
pair is for a segments track drawn on the reference. What would do it is making
the hop reach donor rows without indexing every donor contig — a third small
file keyed by segment id for allele interiors, or a link row carrying enough
interior that no second query is needed. Producer plus adapter change, not a
config swap.

## Past the build flag: FMMM's near-field repulsion

`-fcx-limited-range` took 1.3-1.9x off the force layout by inlining complex
division. What is left at q=4 is the near-field direct force: `f_rep_u_on_v`
27.8%, `add_local_expansion` 13.3%, `calculate_neighbourcell_forces` 12.3%.

**Nothing here is a build flag.** Every remaining candidate means editing
vendored OGDF, which buys merge debt at every version bump — `vendor/README.md`
keeps the delta to two hunks precisely so a bump stays mechanical — and moves
every committed force-directed figure. SIMD was measured and does not reach this
code: the loops walk `NodeArray`/`EdgeArray` through pointers, not over
contiguous doubles.

**Try FMMM's own options first if this is ever opened.** `nmPrecision`,
`fixedIterations` and `fineTuningIterations` are set in `graphlayout.cpp` — our
file, no merge debt — and the quality switch already moves them together.
Decoupling them is a legitimate change that costs nothing structurally, though
unlike the build flag it _does_ move figures.

Worth opening only if a real graph is still too slow after the 1.5x.

**Measured since, on real graphs** (GRAPH_SCALE_AND_LOD.md): a 5,000-segment
base-level window is 3-5 s and a 118k-segment graph is 111 s, so "not the
bottleneck for anything" was too generous — it is the bottleneck on base-level
graphs, and only the legibility ceiling keeps that academic.

**Running the layout on the GPU is not the way out, and that is measured too**
(not to be confused with the rendering entry above, which is a live idea). The
near-field repulsion is 54% of a real q=2 layout, so the Amdahl ceiling on a
perfect port is ~2.3x, against a quadtree that FMMM rebuilds every iteration.
That takes 111 s to ~45 s and 5.3 s to ~2.3 s — neither crosses into
interactive, and at the node counts a force layout is legible at, the layout is
already under 100 ms.
