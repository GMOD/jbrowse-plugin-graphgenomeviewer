# The graph following the linear view

A graph cut from a track and launched from a linear view follows that view. This
records what shipped and what it measured.

## Two clocks

An anchored graph's x is reference bp, so showing the linear view's window is a
transform: `scale = 1 / bpPerPx`, and a translate that puts the cut's refName at
the same screen x (`followFrame`). The frame clock applies it on every frame of
the linear view and fetches nothing.

A graph cut cannot be extrapolated past its edge, so the settle clock, woken by
the linear view's debounced `coarseDynamicBlocks`, re-cuts the window plus a
window-width each side once the window leaves the cut (`followCut`). It narrows
the margins to fit under `maxRegionBp`; past the cap it keeps the last cut, and
the toolbar shows the cap.

`SyntenyFollow` in jbrowse-components runs the same two clocks over synteny
rows, where the frame pass approximates and the settle pass corrects. Here the
frame pass is exact, and the settle pass fetches nodes the graph did not have.

## Re-cuts, measured

`follow.test.ts` pans a 60 kb window 2 Mb in 10 kb steps. At a one-window margin
that makes 28 re-cuts, one per 70 kb, since a cut holds the window for six
steps. At a two-window margin the same pan makes 15, one per 130 kb, for cuts
5/3 as wide. An rGFA re-cut costs ~1.3 s against the hosted HPRC index and is
flat in window size, so the margin is nearly free; the one-window margin
shipped. The stats element carries the count as `data-follow-recuts`.

## The tier

`RgfaTabixAdapter`'s `coarse` slot names a second segments/links pair at one
node per bubble, and `aboveBpPerPx`, the zoom past which a follow cuts it. The
view reads the threshold off the source track's adapter config and compares it
with the linear view's `bpPerPx`. A coarse cut has no bp cap, since
`maxGraphNodes` counts what came back; it asks for no hops, since each bubble
node's two links are indexed under the backbone either side; and it reads no
bubble index, since its nodes are the bubbles. `coarseCut` is persisted, so a
restored session re-makes the cut it saved. A track with no `coarse` cuts fine
only.

The segments lane in the linear view does not switch tier. `RenderFeatureData`
calls the adapter's `getFeatures` without `bpPerPx`, so a feature adapter cannot
answer that display by zoom.

## Across a re-cut

- **The viewport owner** has three states (`viewportOwner`): `fit` refits to
  every layout, `user` leaves the view where it is, and `follow` takes x from
  the linear view. A gesture on a followed graph moves the linear view. y stays
  the pane's own, and the pane holds its height across re-cuts.
- **The selection**, found again by node id. An edge index means nothing in
  another graph, so the hover goes.
- **The sample rows' order**: the layout is handed the rows on screen, and a
  sample new to the window goes below them.

Each cut sets the span of the reference-position ramp, so a re-cut re-spans it,
and the lane above with it.

Fetch ordering needed nothing new. When re-cuts overlap, `beginLoad` and
`liveLoad`, already on main, let only the latest cut asked for land.

## Launching

Every launch entry on a linear view arms the follow. "(this selection)" and
"(this segment)" or "(this feature)" first bring the linear view to their span.
The launch cuts the span it picked, so the default force layout draws what it
always drew, and the first re-cut adds the margins.

## What does not follow

The force-directed and ordered layouts, whose x is not reference bp; a popped
bubble; a region the linear view shows reversed; a whole-file import; and a GBZ
cut, which at up to 12 s would spend its time on windows the reader has left.
The toolbar shows the reason for each.

## Pairing with more than one linear view

`connectedViewId` is one string, written by the launch and by
`pairWithLinearView` and never repointed. `launchSyntenyView` does not pair, so
a graph that opens a synteny stack keeps drawing its hover band in the view it
came from. A `connectedViewIds` set appended by both launchers would serve the
hover sync and the follow alike, and is not built. Matching on assembly alone
would not serve them, because two linear views on one assembly, a chromosome
above a locus, is common.
