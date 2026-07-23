# Handoff: restoring MultiLGVSyntenyDisplay on rGFA

## The idea

Load a pangenome graph into an ordinary linear genome view track, and launch a
local subgraph view from wherever you are in it. That existed in this repo and
was removed in `884a126861` (2026-05-21, "Remove MultiLGVSyntenyDisplay,
plugins/graph, plugins/tube-map-view", 152 files, -17,754 lines), with the
adapters following in `fa737e4255`.

It is worth restoring, but **not** on the file format it was built for. This doc
records why the first attempt stalled, what changed, and what to build.

## Why the first attempt stalled

The display's launcher looked for a `GfaTabixAdapter` or `GfaServerAdapter` in
the session to extract the subgraph (see the removed
`MultiLGVSyntenyDisplay/menus/launch.ts`, `getLaunchSubMenu`). Both are gone.

The root cause is the format, not the code. **Plain GFA carries no coordinates
on its segments.** S-lines and L-lines have no reference position at all; the
only coordinate-bearing records are the P/W lines, and each is one enormous
record. Verified on every graph available here: pggb `*.smooth.final.gfa`,
`cactus-pangenome --gfa` output, and HPRC `hprc-v1.1-mc-grch38.chrM.gfa` — not
one has `SN`/`SO`/`SR`.

So a tabix index over GFA has to invent the coordinates it indexes on. That is
what `GfaTabixAdapter` did, and its footprint shows the cost: a 487-line adapter
plus a five-file sidecar set per graph (`.pos.bed.gz`, `.edges.spatial.bed.gz`,
`.synteny.bed.gz`, `.graph.coarse.bed.gz`, `.seglens.bin`). Every one of those
was a bespoke artifact with a bespoke builder.

## What changed: rGFA

[rGFA](https://github.com/lh3/gfatools/blob/master/doc/rGFA.md) is a strict
subset of GFA that minigraph emits, and it requires three tags on every segment:

| Tag  | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| `SN` | stable sequence name the segment came from               |
| `SO` | offset on that stable sequence                           |
| `SR` | rank: `0` on the linear reference, `>0` otherwise        |

Because segments don't overlap on stable sequences, **every base has a stable
coordinate**, and rank 0 states which segments are the reference backbone. Both
of the things the old design had to infer are now read from the file.

Already landed on this branch (see `plugins/graph`):

- `stableCoordinate()` in `packages/graph-core/src/gfaParser.ts`, surfaced as
  `GraphNode.stable`.
- `anchoredLayout.ts` — rank-0 segments at their declared offset, one row per
  rank (the scheme lh3's own viewer VRPG uses, `~/src/vendor/VRPG`). Runs in
  ~1 ms with no WASM and is deterministic, unlike FMMM.
- A `stable-rank` color scheme.
- Figure `pangenome/rgfa_backbone` + tutorial section, built from a real
  minigraph graph of the four E. coli strains.

## The index: standard tabix, no new format

`gfatools gfa2bed -m` projects an rGFA to stable-coordinate BED directly
(`stableName, start, end, segmentId, rank`), and edges need one projection step
gfatools does not provide. Both are in `scripts/build_rgfa_tabix.sh`:

```bash
bash scripts/build_rgfa_tabix.sh graph.rgfa   # -> graph.segs.bed.gz, graph.links.bed.gz (+.tbi)
```

Two standard BED+tabix files, both derived by standard tools, replacing the old
five bespoke sidecars. Sequence, if a view needs it, comes from
`gfatools gfa2fa -s` (stable FASTA) — otherwise segment lengths from the BED are
enough to draw.

**The link rows are fatter than the first sketch, for a reason worth keeping.**
The original awk indexed each L-line once, under its source segment, carrying
only the two segment ids. That cannot build a subgraph: a region on the
reference returns rank-0 backbone segments, and every bubble hanging off them is
a rank>0 segment sitting at *its own* coordinates on a different stable
sequence, which no coordinate query on this region can reach and which tabix
cannot look up by segment id. So each L-line is written **twice — once under
each endpoint** — and each row carries **both endpoints in full**:

```
chrom start end  srcId±  tgtId±  srcChrom srcStart srcEnd srcRank  tgtChrom tgtStart tgtEnd tgtRank
```

An edge is then found whether the region covers its source or its target, and
the neighbour it leads to states its own coordinates rather than pointing at
them. Following those coordinates is also what makes multi-hop expansion
possible (`getSubgraph`'s `context`), one tabix query per newly reached segment.
It is still plain BED+tabix built by standard tools; it is roughly 2x the rows
(436 vs 218 on the E. coli slice, 4.5 KB).

**Key property for the multi-LGV case**: every segment is indexed under *its
own* stable sequence, so K12 segments sit on the K12 axis and Sakai segments on
the Sakai axis. That is exactly the shape a multi-genome synteny display wants,
with the L-lines as the correspondences between axes.

## What to build, in order

1. ~~**`RgfaTabixAdapter`**~~ — **done**, see "What landed" below.
2. ~~**Restore the launcher.**~~ — **done**, but *not* by restoring
   `MultiLGVSyntenyDisplay/menus/launch.ts`. See "The launcher does not need the
   display" below.
3. **Restore `MultiLGVSyntenyDisplay`** from `884a126861^` — a much larger job
   than this doc first implied, and the one open decision. See "What restoring
   the display actually costs".
4. **Then TubeMapView** (`plugins/tube-map-view`, also at `884a126861^`) if the
   reference-anchored tube map is still wanted. It had a browser test (a
   `tube-map.ts` suite under jbrowse-web's browser-tests, recoverable at the
   same commit) and a launch test at `05847f4bbe`. The anchored layout now in `plugins/graph` covers much of
   the same ground, so decide whether both views are warranted before restoring.

## The launcher does not need the display

The idea at the top of this doc — *load a pangenome graph into an ordinary
linear genome view track, and launch a local subgraph view from wherever you are
in it* — needs no synteny display at all. An `RgfaTabixAdapter` track **is** an
ordinary `FeatureTrack`, so its segments already draw in `LinearBasicDisplay`;
the launcher is two menu items added to that display via
`Core-extendPluggableElement` (`plugins/graph/src/launchSubgraph/`), the same
pattern `LinearReadVsRef` uses.

Three deliberate departures from the recovered `launch.ts`:

- **Discovery is by declared capability**, not adapter name. The old code named
  `GfaTabixAdapter`/`GfaServerAdapter`, which is precisely why it went dead when
  those were removed; now an adapter joins by declaring
  `adapterCapabilities: ['getSubgraph']`. The "prefer a graph track in the
  session over the display's own adapter" fallback is gone with it — the menu
  hangs off the graph track itself, so there is nothing to prefer.
- **The launch is a snapshot, not an RPC.** `session.addView('GraphGenomeView',
  { loadedTrackId, loadedRegion })` and the view fetches when its canvas mounts,
  through the same `refetchIfNeeded` path a reloaded session takes. A launched
  view is therefore restorable for free, and the menu neither calls
  `GetSubgraph` nor holds the GFA text.
- **The per-feature entry point reads `contextMenuInfo`**, whose `item` already
  carries the segment's bp span. The recovered code used `contextMenuFeature`,
  which exists on `LinearAlignmentsDisplay` but not on `LinearBasicDisplay` —
  a small instance of the general warning below about mirroring May's code.

`TubeMapView` is dropped from `SUBGRAPH_VIEW_TYPES`; only `GraphGenomeView`
exists.

## What restoring the display actually costs

This is not a `git checkout` of 70 files. `MultiLGVSyntenyDisplay` reads a data
plane that was deleted in the same cleanup, so the restore is really a port:

- 70 display files (~200 KB), including its own GPU renderer stack and four
  `.slang` shaders, and a 23 KB MST model.
- 6 RPC files that no longer exist: `MultiPairGetFeatures`,
  `buildSyntenyRegionData`, `syntenyRegionTypes`, `GetSyntenyBlocks`,
  `MultiLGVSyntenyClusterIdentityMatrix`, `executeClusterIdentityMatrix`.
- **`MultiPairFeature` and `getMultiPairFeatures`, which no longer exist
  anywhere** (`git grep getMultiPairFeatures HEAD` is empty — removed in
  `fa737e4255`). The display's entire input format is gone, so restoring it
  means re-landing a multi-pair adapter interface the repo deliberately deleted,
  or rewriting the display against `SyntenyGetFeaturesAndPositions` as it is
  now.

Its `CLAUDE.md` mandates mirroring `LinearAlignmentsDisplay`, and that code has
moved substantially since May — so the mirror has to be re-derived, not copied.
Treat this as a feature project with its own design decision (does the multi-
genome synteny display come back at all, and on which data plane?), not as
step 3 of a restore.

## What landed

- `plugins/comparative-adapters/src/RgfaTabixAdapter/` — `getFeatures` (segments
  as features on the stable sequence, with their rank) and `getSubgraph`
  (deterministic, byte-identical GFA per region, `SN`/`SO`/`SR` preserved so the
  view lays it out anchored instead of calling the layout WASM). PanSN-aware:
  a region on assembly `K12` refName `chr` resolves to `K12#1#chr`.
- `scripts/build_rgfa_tabix.sh` and a fixture built from the tutorial's
  `ecoli_rgfa_slice.gfa` (161 segments, four stable sequences, ranks 0-3), which
  the adapter test asserts a golden subgraph against. Note the local
  `test_data/ecoli_rgfa_slice.gfa` is **untracked** — `.gitignore` line 1 is
  `ecoli_*` — so the checked-in fixture is named `rgfa_ecoli.*`, and the source
  graph comes from `jbrowse.org/demos/ecoli_pangenome/`.
- `plugins/graph/src/GetSubgraph.ts`. **The RPC was gone too** — the handoff
  originally said it "needs no changes", but `884a126861` took it out with the
  display (it lived in `plugins/linear-comparative-view/src/LinearSyntenyRPC/`).
  Only the call site in `GraphGenomeView/model.ts` and its test mock survived,
  which is why nothing failed. It now lives in `plugins/graph`, the only
  consumer, next to `GraphComputeLayout`, and a test asserts it is registered
  under the exact string the model calls.
- The `RpcRegistry` entry types the args, so `model.ts` no longer passes
  `sessionId` by hand (`rpcManager.call` injects it).

- `plugins/graph/src/launchSubgraph/` — the two menu items above, tested
  against a **real** `LinearBasicDisplay` in a real `LinearGenomeView`
  (`testEnv.ts`), so the display API they extend cannot drift silently. This is
  why `plugins/graph` now devDepends on `@jbrowse/plugin-canvas` and depends on
  `@jbrowse/plugin-linear-genome-view`.
- The stale `adr-027` citations in `plugins/graph` are gone (that number is now
  wheel-input semantics), and `MAX_GRAPH_REGION_BP` is exported so the menu and
  the view share one cap.

Not done: **no browser test, and none of this has been run in the app** — every
claim above is unit-test-backed only. A `GraphGenomeView` browser test is still
the gap that let a missing `LaunchView-GraphGenomeView` extension point break
session-spec launching silently.

## Scope limit, stated plainly

This works for rGFA, i.e. minigraph graphs and the minigraph stage of
Minigraph-Cactus. **pggb and Minigraph-Cactus GFAs are not rGFA** and have no
segment coordinates, so they keep the `odgi extract` route documented in the
pangenome tutorial: the user cuts a window offline and opens the GFA. Do not
paper over that difference by re-deriving coordinates for plain GFA — that is
the road that produced the five sidecar files.

`vg` graphs (GBZ/xg) are a third case: they have the coordinates but in their
own index format, which would need a WASM reader. Not in scope here; noted so it
isn't mistaken for a gap in this design.

## Loose ends found along the way

- `plugins/graph/src/GraphGenomeView/model.ts` cites **adr-027** for the 100 kb
  cap; adr-027 is now "wheel-input semantics". The number was reused after
  `9d8102f0b5` ("Remove GraphGenomeView large mode (adr-027)"). The graph view
  has no ADR — worth writing one that records the single-node/canonical-strand
  decision, which is easy to "fix" back into per-strand nodes.
- No browser test covers `GraphGenomeView`. A missing
  `LaunchView-GraphGenomeView` extension point broke session-spec launching
  silently and only surfaced because a docs figure wouldn't render.
- The Bandage WASM (`jbrowse.org/demos/bandage`) exposes no layout seed, so FMMM
  reshuffles on every recompute and every screenshot regen. The anchored layout
  sidesteps this for rGFA only.
