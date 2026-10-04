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
its viewport (`fit`, then `user`), the track menu carries zoom in, out and fit,
and a drag or a wheel on the canvas stays inside the track. The settle clock
still re-cuts it as the view moves. A popped bubble is a picture of its own the
same way.

Such a drawing gets a reference strip (`packages/core/src/referenceStrip.ts`,
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

## Past the cut: the haplotype overview

A GBZ track whose window is too large to cut draws the haplotype index's
overview in its place (`src/HaplotypeOverview/`): every haplotype classed per
bin of the reference as reference-like, diverging by 50 bp or more, partial or
absent, at the coarsest level whose bins fit two pixels. "Too large" is the bp
cap, or a cut that came back over the adapter's `nodeLimit`. The second is
learned by failing: `dense` records the refused window, and windows as wide or
wider on that contig within one window-width of it draw the overview without
trying again, so where the track switches follows how dense the graph is. A
narrower window cuts again.

The overview is read for the window plus a window each side and refetched when
the window leaves it or the zoom moves past a factor of two. The band above the
rows stacks the share of haplotypes in each class up to 16 kb bins; past them
nearly every bin holds an excursion for most haplotypes, so it counts the bin's
excursions instead, and its label says which. The rows put the track's lanes
first at a height their labels fit, then every other haplotype unless the menu
asks for the lanes alone. SNPs and small indels never show, and the tooltip says
so. A click zooms to the bin.

**Cluster rows by divergence** orders the rows under the lanes the way the
variant display's "Cluster rows by genotype" orders samples: `@gmod/hclust`
(Euclidean, average linkage) over the window's bins, 1 for diverging and 0 for
reference-like, with absent and partial cells imputed to the bin's mean as a
no-call is. The order is kept by name across pans and saved with the session,
since rows that jumped on every pan would be harder to follow than a stale
order; the menu re-clusters on demand and **Reset row order** drops it.
`@gmod/hclust` is bundled into a lazy chunk, since `@jbrowse/tree-sidebar` is
not in the plugin ABI.

The haplotype lanes display does not swap yet: `MultiWaySyntenyDisplay` is
core's, and doing it from here means overriding its internals through
`Core-extendPluggableElement`. Past its node limit its error names the Graph
display instead.
