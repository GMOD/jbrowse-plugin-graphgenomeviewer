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

## GPU rendering, for anchored layouts only

Replace `Canvas2DRenderer` with a GPU backend on the anchored / sample-rows
path. The view has never plotted with the GPU; `createGraphRenderer` returns the
Canvas2D backend unconditionally.

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

Worth opening only if a real graph is still too slow after the 1.5x. It was not
obviously the bottleneck for anything when this was written.
