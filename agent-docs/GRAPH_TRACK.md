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
`nodeReferenceSpan` is boxed on the strip with a leader to its node. A tube map
has its own bands and walk rows' bars are lengths, so neither gets a strip.

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
