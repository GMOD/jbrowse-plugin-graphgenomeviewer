# The graph as a track

`LinearGraphDisplay` draws the graph inside a linear genome view. It hosts the
same pane model the standalone `GraphGenomeView` is (`pane`), so every layout,
colour, overlay and menu the view has, the track has; what differs is who places
the viewport and who asks for the cut. This records what shipped and why.

## The pane finds its host from the tree

A pane inside a display reads the linear view above it as `host`, through
`getContainingView`. A pane that is a view of its own has none. Nothing is
written by a launch and nothing pairs two views: the relation is where the pane
sits. `connectedViewId` stays for the node menu's "Open in …" targets and the
hover sync between a standalone view and a linear view.

## Two clocks, both the host's

On a layout whose x is reference bp (`referenceAxis`), showing the host's window
is a transform: `scale = 1 / bpPerPx`, and a translate that puts the cut's
refName at the same screen x (`hostFrame`). The frame clock applies it on every
frame of the host and fetches nothing; the pane's `viewportOwner` is `host`, and
a drag or a wheel on the canvas is the host's, as on any track.

A cut cannot be extrapolated past its edge, so the settle clock, woken by the
host's debounced `coarseDynamicBlocks`, re-cuts the window plus a window-width
each side once the window leaves the cut (`hostCut`), on every layout. It
narrows the margins to fit under `maxRegionBp`; past the cap it keeps the last
cut and the track shows `cutNote`.

A layout whose x is not reference bp — force, ordered, variants, walk rows —
draws in its own coordinates inside the track, the way a variant matrix does:
the pane owns its viewport (`fit`, then `user`), the track menu carries zoom in,
out and fit, and a drag or a wheel on the canvas stays inside the track. The
settle clock still re-cuts it as the view moves. A popped bubble is a picture of
its own the same way.

## The tier

`RgfaTabixAdapter`'s `coarse` slot names a second segments/links pair at one
node per bubble, and `aboveBpPerPx`, the zoom past which a settle cuts it. A
coarse cut has no bp cap, since `maxGraphNodes` counts what came back; it asks
for no hops, and reads no bubble index, since its nodes are the bubbles.
`coarseCut` is persisted in the pane, so a restored session re-makes the cut it
saved. The segments lane (`LinearBasicDisplay` on the same track) does not
switch tier: `RenderFeatureData` hands a feature adapter no bpPerPx.

## Height

The display's `height` follows the pane's `canvasHeight`, which is the layout's
height up to a ceiling; the config's `height` and a drag on the track's handle
set that ceiling (`setPaneHeight`). While the host places x the pane holds its
height across a re-cut (`hostPaneHeight`), so more rows arriving does not move
the tracks below while the view is being dragged.

## Across a re-cut

- The selection is found again by node id. An edge index means nothing in
  another graph, so the hover goes.
- The sample rows' order: the layout is handed the rows on screen, and a sample
  new to the window goes below them.
- Each cut sets the span of the reference-position ramp, so a re-cut re-spans
  it.

Fetch ordering needed nothing new: `beginLoad` and `liveLoad` let only the
latest cut asked for land.

## What the standalone view keeps

`GraphGenomeView` opens a whole GFA file (**Add → Graph genome view**) or a
session-spec launch, with its own pan, zoom and fit. The linear view's launch
entries are gone: the graph is a track, opened like any other.
