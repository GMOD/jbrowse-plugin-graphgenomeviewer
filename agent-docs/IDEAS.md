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

## GPU rendering: priced, and not worth it at this view's node cap

Replace `Canvas2DRenderer` with a GPU backend. The view has never plotted with
the GPU; `createGraphRenderer` returns the Canvas2D backend unconditionally.

**This is about drawing, not laying out.** Running FMMM itself on the GPU is a
separate question with the opposite answer — measured, and recorded at the
bottom of this file and in `GRAPH_SCALE_AND_LOD.md`: near-field repulsion is 54%
of a real layout, so a perfect port ceilings at ~2.3x and never reaches
interactive. The two share the word "GPU" and nothing else, and both have been
asked.

**The measurement that used to justify it is gone** (GRAPH_SCALE_AND_LOD.md,
"Strokes, batched by paint"). The case rested on 12.6 draw calls per node from a
triangle mesh built for a GPU backend that was never wired. Stroking nodes as
polylines batched by paint draws a 15k-node anchored layout in 11 ms a frame on
a software rasterizer, against 414 ms for the mesh, and that is inside a frame
budget at `maxGraphNodes`. What is left on the main thread — `buildGeometry` at
~60 ms for 15k nodes, `graphLabels` per mousemove — a GPU backend does not
touch.

**What it would cost.** The host does not re-export `@jbrowse/render-core`
(ADR-030 in jbrowse-components keeps the GPU surface static-import-only), so the
HAL ladder would be bundled: about 30 KB minified on a 55 KB entry. And a
`.slang` source plus the `@jbrowse/shader-tools` codegen, which does support an
out-of-tree plugin through `--root` and the shared modules render-core ships in
`src/shaders`.

**If it is ever built,** take the batch as it is — `nodeStrokes`, `edgeCurves`,
`arrows` in layout units with css-px weights — and draw it as instances, not as
a revived mesh: a capsule per node segment on render-core's `capsule.slang`, and
a bezier ribbon per edge stroke tessellated in the vertex shader the way
`syntenyFillCurve.slang` does. Both backends then consume the same arrays and
the Canvas2D twin is the renderer that exists. The one shader bug the old
attempt carried is worth remembering: a row layout has `scaleY = 1` and
`scaleX ≈ 1e-2`, so a half-width expanded as `normal * thickness / scale.x`
stretches a hundredfold; divide componentwise.

**The trigger** is a real workload drawn above ~50k nodes, where the frame is
geometry-bound anyway — so the honest framing is that the trigger is a geometry
builder off the main thread, and the GPU comes after it if at all.

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
