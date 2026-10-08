---
name: graph-track
description: How LinearGraphDisplay draws the graph inside a linear genome view: the pane, its host, and what shipped.
---

# The graph as a track

`LinearGraphDisplay` draws the graph inside a linear genome view. It composes
`BaseDisplay`, `TrackHeightMixin` and `GraphPaneMixin`, the same mixin the
standalone `GraphGenomeView` composes, so every layout, colour, overlay and menu
the view has, the track has. The pane draws a graph and cuts a region it is
handed (`cutSubgraph`); the display decides which region to cut and when. This
records what shipped and why.

## The pane finds its host from the tree

A pane inside a display reads the linear view above it as `host`, through
`getContainingView`, and its source track through `getContainingTrack`. A pane
that is a view of its own has no host and reads its own `width`. Nothing is
written by a launch and nothing pairs two views: the relation is where the pane
sits. `connectedViewId` stays for the node menu's "Open in …" targets and the
hover sync between a standalone view and a linear view.

## Two clocks, both the host's

On a layout whose x is reference bp (`referenceAxis`), showing the host's window
is a transform: `scale = 1 / bpPerPx`, and a translate that puts the cut's
refName at the same screen x (`hostFrame`). The frame clock applies it on every
frame of the host and fetches nothing; the pane's `viewportOwner` is `host`, and
a drag or a wheel on the canvas is the host's, as on any track.

A cut cannot be extrapolated past its edge, so the display's settle clock, woken
by the host's debounced `coarseDynamicBlocks`, re-cuts once the window leaves
`cutRegion`: the window plus a window-width each side on a layout the host
places (`hostCut`), narrowed to fit under `maxRegionBp`. Force, ordered and walk
rows are cut to the window alone (`cutMargins`): the first two draw a picture of
it, and walk rows' bars are lengths through it. Switching between the two kinds
re-cuts at once.

Past the cap the display's phase is `tooLarge`, and core's banner offers Force
load, which raises `maxRegionBp` to the window and cuts it. A canceled cut is
made again by the next viewport change, as on the other linear-view tracks.

A layout whose x is not reference bp — force-directed and ordered — draws in its
own coordinates inside the track, the way a variant matrix does: the pane owns
its viewport (`fit`, then `user`), the wheel zooms, the Layout menu's Zoom to
fit refits, and a drag or a wheel on the canvas stays inside the track. The
settle clock still re-cuts it as the view moves. A popped bubble is a picture of
its own the same way.

Such a drawing gets a reference strip (`bandage-core/src/referenceStrip.ts`,
`ReferenceStripOverlay`): each backbone node at its bp in the host's frame,
painted the colour `getNodeColor` gives its node, so the strip and the graph
cannot disagree about a hue. `fitPadTop` leaves the strip's zone clear, the
label layout reserves it, and the legends start under it. The lit node's
`nodeReferenceSpan` is boxed on the strip with a leader to its node, and a
hovered bubble name lights the bubble's span the same way (`hoveredSpan`). A
tube map has its own bands and walk rows' bars are lengths, so neither gets a
strip.

The host's hover reaches the pane through `session.hovered`, and a pointer over
the pane is the host's too. There the host reads its x as bp, which a force or
ordered drawing's x is not, so while `pointerInPane` holds the pane's own hit
test is its only hover source.

## Status

The display reports `displayPhase` through core's `computeDisplayStatusPhase`
and renders through `DisplayStatusChrome`, so an error, the loading scrim and
the too-large banner sit inside the track's box rather than below its clip, and
the app's readiness waits for the first graph. It is `loading` until a graph is
drawn, suppressed for a minimized track, an empty viewport or an unmounted view
body as core's displays are. A backend failure is folded into the error phase,
and GraphCanvas shows it with the render hook's retry.

## The tier

`RgfaTabixAdapter`'s `coarse` slot names a second segments/links pair at one
node per bubble, and `aboveBpPerPx`, the zoom past which a settle cuts it. A
coarse cut has no bp cap, since `maxGraphNodes` counts what came back; it asks
for no hops, and reads no bubble index, since its nodes are the bubbles. The
display persists `cutRegion` and `coarseCut`, so a restored session re-makes the
cut it saved. The segments lane (`LinearBasicDisplay` on the same track) does
not switch tier: `RenderFeatureData` hands a feature adapter no bpPerPx.

## Height

The drawing is the track's height (`canvasHeight` is the display's `height`):
the config's `height` and a drag on the track's handle, as on any track.
`paneHeight` only applies to a standalone view.

## Across a re-cut

- The ramp spans `graphRegion`, the region of the graph on screen, which is set
  with the graph. `cutRegion` moves before the fetch; reading it painted the old
  graph against the new window on every re-cut.
- The selection is found again by node id. An edge index means nothing in
  another graph, so the hover goes.
- The sample rows' order: the layout is handed the rows on screen, and a sample
  new to the window goes below them.

Fetch ordering needed nothing new: `beginLoad` and `liveLoad` let only the
latest cut asked for land, and removing the track aborts its cut. Each track
cuts through its own RPC session.

## What the standalone view keeps

`GraphGenomeView` opens a whole GFA file (**Add → Graph genome view**) or a
session-spec launch, with its own pan, zoom and fit. A stated
`loadedTrackId`/`loadedRegion` pair, which 4.0 sessions and the docs' specs
carry, is cut once on attach; following the linear view is the track's job.

## Snapshots

A 4.0 track entry nests the graph's state as `pane: {...}`, which the display
folds flat. Entries now state `layoutMode` and `colorScheme` flat, and
`paneHeight` is inert in a track; use `height`.

## Past the cut: a zoom-in notice

A window too large to cut shows a notice and fetches nothing more. "Too large"
is the bp cap, which draws core's region-too-large banner, or a cut that came
back over the GBZ adapter's `nodeLimit`. The second is learned by failing: the
adapter throws `NodeLimitError` marked `regionTooLarge`, which core's error bar
(jbrowse-components `526ff487e6`) shows as a neutral "Zoom in to about … to see
the graph" with no Retry; older hosts show it as a plain error. `dense` records
the refused window, and windows as wide or wider on that contig within one
window-width of it keep the notice without cutting again, so where the track
stops follows how dense the graph is. A narrower window cuts again. The lanes
display reads the same error and says "to see lanes".

Retired 2026-10-04: 5.0 drew the haplotype index's overview here, a row per
haplotype classed per bin. It was a coarse copy of core's multi-sample variant
display and had started re-growing its features (row clustering), so a
population view across a wide window belongs to a VariantTrack over the graph's
VCF (`vg deconstruct` makes one from a GBZ). The index's overview tables and
gbz-base's `haplotypeOverview` are untouched; a 5.x session's
`overviewRowsChoice` and `overviewRowOrder` load and are dropped.

## Walk-indexed cuts

A walk-indexed `RgfaTabixAdapter` names a third file, `walksLocation`: one row
per haplotype path per reference chunk, beside node and link rows filed under
the same chunks (row formats at the top of `src/RgfaTabixAdapter/walkRows.ts`).
A cut reads all three together, from the start of the chunk before the window to
the window's end, so a row filed under its chunk's first base is found as well
as one spanning the chunk. The chunk size comes from a `chunk:i:` header line,
else `walkChunk`. `getFeatures` reads from the chunk before the window too,
since a node crossing a chunk boundary is filed under the chunk holding its
start; `anchoredCut`, the coarse tier and the bubble halos read no anchor
interval of a walk-indexed file.

The cut decodes only the walks `haplotypes` names, and the reference's; the rest
are dropped on their name column before their steps are split. Each fragment
runs from its first to its last step on the reference inside the window plus 1
kb, then on outward while the next node is already in the cut, so an allele
straddling the edge draws every walk that crosses it. Rows whose steps sum past
`walkStepBudget` (4 M) fail as a `NodeLimitError` naming the span that fits, or
asking for fewer haplotypes where the two chunks any window there reads are over
on their own; the walk read stops the node and link reads.

Measured 2026-10-08 on HPRC v2.1 chr22, local files, minimum of three runs on a
loaded machine, window chr22:20.0–20.26 Mb:

| route                  | fetch  | cut    | GFA load | total  |
| ---------------------- | ------ | ------ | -------- | ------ |
| spike, every haplotype | 0.07 s | 2.7 s  | 6.5 s    | 9.2 s  |
| now, every haplotype   | 0.06 s | 1.0 s  | 4.3 s    | 5.3 s  |
| now, 8 haplotypes      | 0.08 s | 0.18 s | 0.12 s   | 0.29 s |

"Cut" includes the adapter's own reads. "Now" loads with bandage-core at 0ffbfda
(on its main after 8.0.1, unreleased), which builds no string per walk step; on
8.0.1 the every-haplotype load takes about 40% longer and the 8-haplotype one
0.02 s longer. Every haplotype there is past the budget, refused in 0.12 s; the
row above raised it. In the browser at chr22:20.0–20.1 Mb, from showing the
track to the graph drawn, 8 haplotypes take 1.4 s force-directed (0.8 s of it
FMMM), 0.5 s as a tube map and 0.55 s as walk rows; every haplotype takes 4.7 s,
25 s (20 s of tube map layout) and 6.4 s.

The Rust builder's files (rows under their chunk's first base, a `chunk:i:`
header, an `LN:i:` column after each node row) cut the same walks: 0.28 s for 8
haplotypes over chr22:20.0–20.26 Mb.

The budget counts only the haplotypes asked for, and node and link rows are
filed for all of them. At chr22:11.80–11.864 Mb, 8 haplotypes stay under budget
and read 1.94 M node and link rows: 1.7–3.9 s to fetch, 3.2–7.8 s in all.
