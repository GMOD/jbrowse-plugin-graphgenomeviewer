---
name: fmmm-near-field-repulsion
description: What is left of FMMM layout time after -fcx-limited-range, why a GPU port ceilings at ~2.3x, and which FMMM options to try before editing vendored OGDF.
---

# Past the build flag: FMMM's near-field repulsion

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
