# Handoff: the graph following the linear view beside it

Not built. Written because it is the one bidirectional capability the graph view
is missing, it is bigger than it looks, and the shape of the answer is decided
by two facts that are easy to miss.

Read `MULTILGV_SYNTENY_RGFA_HANDOFF.md` for how the launch pair works today, and
jbrowse-components'
`plugins/linear-comparative-view/src/SyntenyFollow/CLAUDE.md`, which is the same
feature for synteny rows and the design this borrows from. `IDEAS.md` is where
this would go if it were smaller.

## What is missing

A graph is a **static cut**. `Launch → Graph genome view (this region)` writes
`loadedTrackId` and `loadedRegion`, the view fetches once, and that is the
window forever: pan the linear view above it and the graph does not move. The
only ways to re-cut are the settings dialog (`Graph context`, `Haplotypes`,
which call `reloadSubgraph`) and launching again.

The reverse direction is live and continuous — hover a node and the linear view
highlights, hover the linear view and the node lights up (`hoverSync/`) — so the
asymmetry is visible in ordinary use: the graph reacts to the pointer and
ignores the window.

## The two facts that decide the shape

### 1. An anchored graph's x axis IS the linear view's x axis

`anchoredLayout` and `sampleRowLayout` both set `referenceAxis: true`, meaning x
is reference bp. The model's `scale` is screen px per layout unit and
`translateX` is a px offset, so on those two layouts

    scale      = 1 / lgv.bpPerPx
    translateX = -(lgv.offsetPx - <px of the cut's start in lgv>)

is the whole of "show the same window". No fetch, no layout, no geometry rebuild
beyond the debounced viewport pass the view already runs on its own pan. It is
`setTransform`, which exists.

**The force layout cannot do this at all.** Its x is FMMM simulation units and
means nothing on the reference, so there is no transform that lines it up. That
bounds the feature to the anchored modes — the same bound `IDEAS.md` puts on GPU
rendering, and for the same reason.

### 2. A graph cut cannot be extrapolated, so there is no frame pass over CONTENT

This is where the analogy to `SyntenyFollow` breaks, and it breaks usefully.

SyntenyFollow runs two passes on two clocks because its exact answer costs an
RPC: a **frame pass** on live `dynamicBlocks` moves the row by an affine
transform or a cached `CigarMap`, and an **exact pass** on debounced
`coarseDynamicBlocks` walks the CIGAR in the worker. The frame pass works
because a synteny row's answer is a _function of the window_ that can be
approximated between settles.

A graph's answer is not. Pan past the edge of the cut and the correct drawing
contains **nodes that are not in memory** — there is nothing to interpolate. So
the split is not frame-vs-exact over one answer, it is two different answers:

| clock  | what it does                                            | cost                            |
| ------ | ------------------------------------------------------- | ------------------------------- |
| frame  | move the graph's viewport to the linear window (fact 1) | free, anchored layouts only     |
| settle | re-cut when the window has left the cut                 | one `GetSubgraph`, priced below |

Which is a better problem than SyntenyFollow's, not a worse one: the frame pass
here is exact rather than an approximation that snaps when the settle lands.

## What a re-cut costs, measured

- **rGFA / tabix** (`RgfaTabixAdapter`): **~1.3 s, and flat in window size** —
  against the hosted HPRC index a 4.9 Mb links query and a 100 kb one both cost
  about the same, being dominated by HTTP setup (see `MAX_GRAPH_REGION_BP` in
  `model.ts`). Flat is the important half: a follow can cut a window **wider
  than the visible one** for the same price and then pan inside it for free,
  which is what makes this viable at all.
- **layout**: anchored is local and milliseconds. Force is 0.1–3 s for ~1k
  nodes, but force cannot follow anyway.
- **GBZ** (`GbzBaseSyntenyAdapter`): up to **12 s** — 21,721 base-level nodes at
  KIV-2 for all 464 walks, against the two hosted files. A haplotype subset is
  much less, but nothing here is 1.3 s.

**So follow is a tabix-route feature.** On the GBZ route it should be off, and
saying so is cheaper than making it clever. That is a real limit on the value,
because the GBZ route is where the interesting HPRC work is going.

## The design that falls out

Cut a **margin** around the visible window and pan inside it, re-cutting only
when the window approaches the edge. Because the fetch is flat in span the
margin is nearly free; because `maxGraphNodes` (20,000) counts what came back,
the margin is bounded by node count rather than by bp — which is the right
bound, and the one already enforced (`parseAndLayout` throws past it).

Sketch, all of it in the view model:

1. A `followViewId` (or a mode flag beside `connectedViewId`) and a
   `followedWindow`.
2. A **reaction** on the followed LGV's `dynamicBlocks.contentBlocks` →
   `setTransform`, untracked over everything else. Frame clock.
3. A **reaction** on its `coarseDynamicBlocks` → if the window is inside the
   margin, nothing; else `loadedRegion = <window + margin>` and
   `reloadSubgraph()`. Settle clock.
4. A `layoutMode` guard: follow does nothing on `force`, and the toolbar has to
   say so rather than appearing to work — the rule `EngineOnly` in
   `GraphSettingsDialog` already applies to the two engine-only settings.

## Hazards, each of which has bitten something already

- **`userMovedViewport` is a two-state flag and this needs three.** Today it is
  false (auto-fit as the layout and canvas settle) or true (the user has
  positioned the view, never override). Following is a third state: the
  transform moves constantly and none of it is the user's. Setting the flag
  kills the auto-fit a re-cut needs; leaving it clear lets the fit autorun fight
  the follow on every new layout. Read the comment on the volatile first — the
  two-state version already had a bug where zoom-to-fit invalidated its own
  precondition.
- **`liveRequest` in `layoutInto` orders layouts, not fetches.** A follow issues
  fetches from a reaction, so several will be in flight; `doSubgraphLoad` has no
  equivalent guard and writes `self.graph` from whichever returns. The comment
  above `liveRequest` is the account of what that looks like on screen, and the
  fix is the same shape one level up.
- **The pane resizes under the cursor.** `canvasHeight` derives from
  `layoutBounds`, so a re-cut whose row count changed moves the pane while the
  user is dragging the view above it. `paneHeight` is the existing lever;
  whether a follow should pin it is a figure question rather than a code one.
- **Every re-cut clears the interaction state.** `parseAndLayout` calls
  `clearInteractionState()` because `hoveredEdge` is an index into `graph.edges`
  — correct, and it means a followed graph drops its selection whenever the
  window leaves the margin. Node ids survive a re-cut where indexes do not, so
  `selectedNode` could be re-resolved by id and `hoveredEdge` cannot.
- **`subgraphContext` hops cost queries per off-reference segment reached.** At
  the default 1 hop a follow multiplies those by the re-cut rate. Measured
  wall-clock is flat across 0/1/2 hops on the loci in `RgfaTabixAdapter`'s note,
  because the remote index dominates — but that is unmeasured under a follow,
  which is the one workload issuing them repeatedly.

## The sibling problem, which is smaller and should go first

**A graph stops highlighting once it opens a synteny view.** `connectedViewId`
is one string, written by `pairWithLinearView` and never repointed.
`showInLinearView` pairs; `launchSyntenyView` does not, and could not usefully —
a stack is not one view id. So a graph launched from an LGV keeps that pairing
and draws its hover band in a view the user has navigated away from, while the
stack it just opened gets nothing (`graphViewHighlights`, `isConnected`).

This matters to follow because follow needs the same answer to the same
question: _which linear views is this graph related to?_ Deciding it once serves
both.

Two candidate answers, and the second is now cheap:

1. `connectedViewIds` as a set, appended by both launchers, with a
   `preProcessSnapshot` migrating the old single string. Expresses a stack, and
   costs a schema change.
2. Drop the pairing and match on assembly alone. **This got much more plausible
   in `0bb40c5`**, which added the assembly guard both halves of the hover sync
   were missing: an unpaired graph now correctly draws on the rows sharing its
   assembly and nothing on the others, which is the whole of what pairing was
   protecting against — _except_ the genuinely ambiguous case of two linear
   views on one assembly, which is common enough (a whole-chromosome view above
   a locus view) that dropping it outright is probably wrong.

So (1) is the answer, and (2) is worth writing down because it explains why (1)
no longer has to carry the assembly problem as well.

## How to settle whether follow is worth building

Instrument first, build second. The number that decides it is **how often a
re-cut actually fires** under a margin, on a real session — because if a 1 Mb
margin around a 50 kb window means one fetch a minute of browsing, the feature
is a reaction and a transform; if it means one per pan, it is a different
feature and probably should not exist on the tabix route either.

`lastFetchMs` is already on the model and already on the stats element as a
`data-*` attribute (`GraphStats`), so counting needs no new plumbing —
`showPerf` turns the readout on.
