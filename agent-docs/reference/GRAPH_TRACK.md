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
and renders through `GraphStatusChrome`, so an error, the loading scrim and the
too-large banner sit inside the track's box rather than below its clip, and the
app's readiness waits for the first graph. The chrome is the plugin's own copy
of core's `DisplayStatusChrome`, built from overlays every host from beta.11
serves, since jbrowse-web main removed that component on 2026-10-08 and the
track failed there with React error #130. It is `loading` until a graph is
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
`walksUri` names all three by their shared prefix, in place of `uri`. From
gfa-to-tabix 0.5.0, `--walks -o <prefix>` writes one set per reference sample,
`<prefix>.<sample>.{walks,nodes,links}.bed.gz`, so a track names the set for its
assembly's reference, `<prefix>.<sample>`, whose `#reference` header line names
that one sample. A 0.4.0 build holds every reference in one set, which a track
names by `<prefix>` alone:

```js
{
  type: 'GraphTrack',
  trackId: 'hprc_chr22_walks',
  name: 'HPRC v2.1 chr22 graph',
  assemblyNames: ['hg38'],
  adapter: {
    type: 'RgfaTabixAdapter',
    walksUri: 'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38.GRCh38',
    assemblyNameToPanSN: { hg38: 'GRCh38' },
    defaultHaplotypes: ['HG002', 'HG00733', 'HG02257', 'NA19240'],
  },
}
```

A cut reads all three together over whole chunks, from a chunk before the window
to the window's end, so a row filed under its chunk's first base is found as
well as one spanning the chunk. A node is filed under the chunk holding its
start, so a node reaching into the window can be filed several chunks back. From
gfa-to-tabix 0.5.0 each file's first header line gives the longest node as
`maxnode:i:`, and the cut starts ceil(maxnode / chunk) chunks before the
window's own, at least one. Without it the cut starts one chunk back, which
holds for vg's graphs, chopped to nodes of at most 1,024 bp; an unchopped graph
from an older build loses any node starting further back. `getFeatures` reads
from the same start. `anchoredCut`, the coarse tier and the bubble halos read no
anchor interval of a walk-indexed file.

The walk file's header holds a `chunk:i:` line, which sets the chunk size
(`walkChunk` when absent), and from gfa-to-tabix 0.4.0 a `#reference` line per
reference sample and a `#haplotype` line per other haplotype with rows: 462 on
chr22, 9.75 kB. From 0.5.0 the first line also carries `maxnode:i:` and `cap:i:`
(the most steps in one row, which nothing reads). The adapter takes these lines
in one header read, and `GetGraphHaplotypes` hands the haplotype names to the
track: the Settings field becomes a searchable pick list that still takes a
typed prefix, and the Haplotypes menu counts them. Without the lines the field
takes typed names.

The set a cut is for lives in the display's session state, `subgraphHaplotypes`.
Unset, it is the config's `defaultHaplotypes`, else the lanes the track's
`assemblyNames` lists after its reference, else every haplotype. An empty list,
`subgraphHaplotypes: []`, is every haplotype whatever the config says: the
Haplotypes menu's "Every haplotype in the graph" sets it, and a harness tracing
a cut for every haplotype sets the same. A graph view opened from the track
takes the set with it. The cut decodes only those walks and the reference's; the
rest are dropped on their name column before their steps are split. Each
fragment runs from its first to its last step on the reference inside the window
plus 1 kb, then on outward while the next node is already in the cut, so an
allele straddling the edge draws every walk that crosses it.

### Walks that leave the window

A walk that leaves the reference inside the window, through steps off it or
across a deletion, is followed to the reference step where it rejoins
(`walkCut`), and the reference walk is cut out as far as those rejoins reach.
gfa-to-tabix files a step off the reference with the reference step before it,
so an excursion leaving inside the window is in the read; its rejoin is too
unless it lies in a chunk past the read. A walk that never rejoins keeps the
steps off the reference the read holds.

From gfa-to-tabix 0.6.0 each walk row ends with `pv:i:`/`nx:i:`, the chunk its
path's previous and next piece is filed under. A walk the read cuts off with no
reference step to rejoin at reads on to that chunk, the reference between
included, up to four chunks out, three rounds and the byte budget
(`WalkReader.cut`). A contig that ends has no tag and is not followed; 0.5.0
files have no tags and are not followed either. The tags add 0.8% to the chr22
walk file, and the node and link files are byte-identical.

Measured 2026-10-09, every haplotype, rows over the window against gbz-base's
`walkRows` (bp and complete), both on bandage-core 8.2.0:

| where                                    | before    | rejoin in the read | and follow (0.6.0 files)                 |
| ---------------------------------------- | --------- | ------------------ | ---------------------------------------- |
| ABCA7 VNTR chr19:1,049,000-1,050,500     | 457 / 462 | 462 / 462          | not built for chr19                      |
| C4A chr6:31,982,000-32,003,000           | 308 / 463 | 463 / 463          | not built for chr6                       |
| chr22, 150 windows of 0.6-100 kb, local  |           | 67,797 / 68,256    | 68,256 / 68,256                          |
| amylase cluster chr1:103.52-103.83 Mb    |           | 470 / 470          | not built for chr1                       |
| amylase chr1:103.56-103.66 Mb, inside it |           | 85 / 467           | 456 / 468 read one chunk wider each side |

ABCA7 is the four walks above: HG00320#2 leaves GRCh38 at 1,049,885, runs 16.2
kb off it and rejoins at 1,052,290, inside the chunk the window reads, and now
measures 16.3 kb whole over the TRGT record as gbz-base does; its 9 partial rows
are 7 contigs that end on the reference and 2 that start off it. At C4A, 155
haplotypes with one RCCX copy fewer cross a deletion past the context and read
as contigs ending there. Over the 135 random chr22 windows, 327 of 61,758 walk
crossings were partial before and 13 after, at least 10 of them contigs that
end; following was needed only where the window's context runs into the chunk
after the read, 17 of the 150 windows (the 15 placed there on purpose), one more
round of three reads and 0.1-0.6 MB. Without it one such window,
25,557,894-25,558,540, matched gbz-base on none of its 459 rows. The rejoin adds
4% to a cut's nodes and steps at the median, 28% at most (chr22:44.1-44.2 Mb,
where it fixed 304 rows), and nothing to its reads. A window ending inside a
collapsed cluster, amylase's, is the other case following fixes: the copies a
walk passes are filed where the reference places them, beyond the read.

Two budgets refuse a window with the zoom-in notice. Before any row is read, the
three Tabix indexes estimate the compressed bytes the reads would fetch
(`bytesForRegions`), and past `walkByteBudget` (8 MB) the notice names the span
that fits, or says none does where the window's first two chunks are over on
their own. The bytes are the same for any haplotype set: every haplotype's walk
rows are downloaded and dropped by name afterwards, and node and link rows are
filed for all of them, so this budget is what bounds the download. On chr22 from
gfa-to-tabix 0.4.0 at `--settle 0`, the two-chunk read a window always makes is
0.53 MB at the median, 2.6 MB at the 99th percentile and 36 MB at most; 8 MB
refuses every window over 11.80–12.06 Mb on GRCh38 and 0.20–0.46 Mb on CHM13 (20
MB for 10 kb at 11.80 Mb) and nothing else. A 1 Mb window elsewhere fetches
2.8–4.7 MB, a 3 Mb one at 40 Mb 9.5 MB. The 0.3.0 build at the default settle
refuses the same windows. Then `walkStepBudget` (4 M) bounds the steps the cut
keeps, and rows holding eight times as many stop the reads; either fails the
same way. A window reads whole chunks, so a narrow one reads several times what
it keeps: every haplotype across the 1.5 kb ABCA7 repeat reads 5.0 M steps and
keeps 1.16 M, in 0.4 s from warm files, and a budget on steps read refused it.
The budget counts only the haplotypes asked for, so the notice asks for fewer
haplotypes where no zoom fits, and a cut for every haplotype is offered fewer
beside the zoom.

Walk rows skip the step budget. Their cut (`walkRows` in the cut options)
computes each row's on- and off-reference runs from the tables in the worker
(`walkRowRuns`) and ships them beside the tables. The pane parses only the
reference walk into its Graph, with every other walk named and stepless, takes
the rows from the runs, and paints the bars through render-core's `spanMark`
(`walkRowSpans.ts`). A layout that draws nodes parses the cut whole
(`wholeGraph`). ADR-043 records the decision.

The cut crosses to the main thread as bandage-core's `GraphTables`, not GFA
text: node, link and step arrays, every link end and step an index into the node
table. `GetSubgraph` hands their buffers to postMessage to transfer, and
`loadGraph` builds from them the graph their GFA converts to, deep equal. The
rGFA and GBZ cuts stay text.

Measured 2026-10-08 on HPRC v2.1 chr22 from gfa-to-tabix 0.4.0's files, local,
minimum of three runs on a loaded machine, every haplotype from chr22:20.0 Mb:

| window | handoff | worker | crosses          | main-thread load |
| ------ | ------- | ------ | ---------------- | ---------------- |
| 100 kb | GFA     | 0.24 s | 11.4 MB of text  | 0.84 s           |
| 100 kb | tables  | 0.26 s | 7.0 MB of array  | 0.25 s           |
| 260 kb | GFA     | 0.70 s | 36.4 MB of text  | 3.8 s            |
| 260 kb | tables  | 0.75 s | 22.2 MB of array | 0.99 s           |

The 100 kb cut reads 2.8 M steps and keeps 1.4 M; the 260 kb one reads 6.3 M,
past the step budget, which the rows above raised, and keeps 4.3 M. Copying the
text across took only 10–30 ms; parsing and converting it was the cost. Eight
haplotypes load in 5 ms and 20 ms where the text took 30 ms and 90 ms.

In the browser at chr22:20.0–20.1 Mb, from showing the track to the graph drawn,
every haplotype takes 3.3 s force-directed where GFA text took 3.7 s, and 12 s
as a tube map and 18–19 s as walk rows through either handoff. Eight haplotypes
take 1.5 s force-directed through either.

Drawing is what bounds every-haplotype views, measured 2026-10-08 on the beta.13
host from the hosted files. FMMM takes 10–12 s in the worker at chr22:20.0–20.26
Mb. The tube map's layout takes about 9 s on the main thread at 20.0–20.1 Mb. So
the step budget stays at 4 M for both: a cut at 20.0–20.26 Mb reaches the view
in 2–3 s, but draws in 13–23 s force-directed and in 47 s or more as a tube map.

Walk rows, measured 2026-10-09 on the beta.11 host in headless Chrome from the
hosted GRCh38 walk files, every haplotype, from navigation to drawn:

| window             | steps  | runs → spans     | SVG bars                                     | spans                                     |
| ------------------ | ------ | ---------------- | -------------------------------------------- | ----------------------------------------- |
| KIV-2, 30.7 kb     | 4.41 M | 122,871 → 26,863 | refused by the step budget                   | 2.8 s cold, 2.2 s warm                    |
| chr22:20.0–20.1 Mb | 1.37 M | 98,857 → 84,016  | 4.8 s view, 3.6 s track; 84,481 SVG elements | 2.1 s view, 2.2 s track; 465 SVG elements |

The spans paint in 18–21 ms at KIV-2 and 58 ms at chr22, where the runs barely
coalesce. The SVG bars and the spans give pixel-identical screenshots at KIV-2
with 8 haplotypes and at chr22 with every haplotype; under the reference ramp
they differ at 3.6% of pixels, by at most 55 of 255 in a channel, where a
gradient's interpolation rounds differently. An earlier CPU profile put 27 s of
React SVG work behind walk rows at chr22:20.0–20.1 Mb; the first draw there
takes the 4.8 s above, and the SVG count is 84,481 at a 1,388 px pane, not 78k.

The Rust builder's files (rows under their chunk's first base, a `chunk:i:`
header, an `LN:i:` column after each node row) cut the same walks: 0.28 s for 8
haplotypes over chr22:20.0–20.26 Mb, and 0.09 s over chr22:20.0–20.1 Mb. At
chr22:11.80–11.864 Mb, 8 haplotypes used to stay under the step budget and read
1.94 M node and link rows in 3.1 s; the byte budget now refuses that window in
10 ms, from the indexes and the header.

## Lanes from walks

`WalkTabixSyntenyAdapter` reads the same file set as haplotype lanes for
`MultiWaySyntenyDisplay`, and cuts the graph display's subgraph as a
walk-indexed `RgfaTabixAdapter` does (both go through `WalkReader`), so one
track carries both displays with no gbz-base database:

```js
{
  type: 'GraphTrack',
  trackId: 'hprc_walk_lanes',
  name: 'HPRC v2.1 haplotypes vs GRCh38',
  assemblyNames: ['hg38', 'HG00097.1', 'HG00099.1'],
  adapter: {
    type: 'WalkTabixSyntenyAdapter',
    walksUri: 'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38.GRCh38',
    assemblyNames: ['hg38'],
    assemblyNameToPanSN: {
      hg38: 'GRCh38#0',
      'HG00097.1': 'HG00097#1',
      'HG00099.1': 'HG00099#1',
    },
  },
  displays: [
    { type: 'MultiWaySyntenyDisplay', displayId: 'hprc_walk_lanes-multiway' },
    { type: 'LinearGraphDisplay', displayId: 'hprc_walk_lanes-graph' },
  ],
}
```

A lane fetch reads the walk and node files over the window and leaves the link
file and its index unread. The walk files hold no bases (`--sequences` adds
them, and nothing reads them), so both alignments work on shared nodes and node
lengths alone:

- **A haplotype against the reference** (`referenceAligner`) is the heaviest
  common subsequence of the two walks' steps, each node weighing its length, in
  whichever direction shares more: gbz-base's `weightedLcs`, the step under its
  own reference alignment. It matches one pass over a node the haplotype passes
  several times, so at a collapsed copy-number array a lane aligns one copy and
  the others are insertions, as gbz-base's lanes have it.
- **A lane pair** (`walkAligner`) is gbz-base's `pairAlignments` with
  `bases: false`: runs of nodes both walks visit, chained, leaving out every
  node either walk passes twice. Lanes were first aligned to the reference this
  way too, and at amylase a 3-copy haplotype matched its flanks alone (39 kb of
  340 kb, against 86 kb by subsequence).

Between two shared runs the CIGAR is an insertion and a deletion, and
`bubblesAsMismatches` rewrites one of equal length up to 50 bp as `X`, which
draws a SNP as a mismatch where gbz-base's pair lanes draw a 1 bp insertion
beside a 1 bp deletion. gbz-base's reference lanes compare bases and write `M`.

The header's `#haplotype` lines are the lanes `getHeader` declares. A lane's
contigs are named only in its walk rows, so `getRefNames` lists the anchor's
contigs alone, and a window on a lane answers nothing: lane pairs are read
inside the anchor's window (`lanePairsOnAnchor`, `lanePairBatches`). Records
come back in the order the fetch names its lanes.

Checked 2026-10-08 against `GbzBaseSyntenyAdapter` on chr22 of HPRC v2.1 (local
gbz-base database, gfa-to-tabix 0.5.0 GRCh38 files, eight haplotypes, 60 windows
of 1 bp to 300 kb). In 56 windows both routes answer the same lanes and pairs,
and a coordinate mapped through either CIGAR lands within 50 bp on the
haplotype; the records' ends differ where gbz-base's cut runs on to a snarl's
end and the walk cut stops 1 kb past the window. At 22.2–22.7 Mb (two windows,
the immunoglobulin lambda locus) the walk route answers the eight full-length
records gbz-base answers and none of its 41 to 72 records of 1 to 2 bp, checked
by eye on one haplotype. At 18.50 and 18.76 Mb in the 22q11 repeats the routes
differ, as the graph cuts do: a walk is filed where the reference places its
nodes. `gbzParity.test.ts` keeps the chr22:20.0–20.1 Mb case.

Measured in Chrome on jbrowse-web `main` from the hosted whole-genome files,
cold cache, eight haplotypes at chr1:196.64–196.90 Mb (CFH to CFHR4), from the
session starting to load to the lanes and their seven pairs drawn, median of
three (jb2bench `results/graph-track/lanes-figure5-window.jsonl`):

| route    | requests | MB   | drawn |
| -------- | -------- | ---- | ----- |
| walks    | 5        | 3.48 | 2.9 s |
| gbz-base | 27       | 9.97 | 7.5 s |
| PIF      | 3        | 1.89 | 2.1 s |

The five are two indexes, the walk header, and one range of each file; the pair
fetch reads nothing more, from tabix-js's chunk cache. In Node on local files a
300 kb window's eight lanes take 0.4–0.6 s and its seven pairs 0.4–0.5 s, most
of it the chaining; gbz-base takes 0.3–0.9 s and 0.7–1.0 s there, and 9 s for
the pairs at the immunoglobulin lambda locus.

Compared 2026-10-08 in Chrome against the gbz-base track on the genomes portal's
config, at the loci the tutorial figures draw, one cold run each, time from
navigation to drawn:

| locus                                 | display      | walks        | gbz-base       |
| ------------------------------------- | ------------ | ------------ | -------------- |
| CFH, 4 lanes, 110 kb                  | lanes        | 2.8 s, 5 req | 7.5 s, 25 req  |
| amylase, 5 lanes, 150 kb              | lanes        | 2.7 s, 5 req | 11.1 s, 43 req |
| GSTT1, 10 lanes, 110 kb               | lanes        | 3.2 s, 5 req | 9.1 s, 23 req  |
| FLNA / EMD inversion, 4 lanes, 90 kb  | lanes        | 2.7 s, 5 req | 11.8 s, 57 req |
| KIV-2, 8 haplotypes, 31 kb            | force layout | 7.9 s, 7 req | 10.0 s, 25 req |
| KIV-2, 8 haplotypes                   | walk rows    | 2.6 s, 7 req | 6.4 s, 17 req  |
| amylase, 5 haplotypes                 | walk rows    | 2.4 s, 7 req | 8.0 s, 34 req  |
| ABCA7 repeat, every haplotype, 1.5 kb | walk rows    | 3.8 s, 7 req | 13.3 s, 18 req |

The lanes draw the same pictures: the same contigs and frames (amylase's 1.5×
and 3×), offset by a few bp to 1 kb. The KIV-2 cuts hold the same 15,808 nodes
and the same row lengths. The amylase and ABCA7 cuts hold fewer nodes (9,658
against 11,122, and 11,566 against 14,454) because gbz-base's cut runs on to the
end of each snarl. Cut in Node over the window and a window each side, 452 ABCA7
haplotypes hold one walk in both, each shorter from the walk files by a flank of
1.9 kb or more, 2.6 kb in most, so the rows differ from each other as they did.

At the ABCA7 VNTR's TRGT record (chr19:1,049,406-1,050,096), measured 2026-10-09
with every haplotype, all 462 walk rows match gbz-base's to the bp since walks
are followed to where they rejoin (above). gbz-base's cut at its default context
and snarls there breaks GRCh38's path at 1,051,927-1,051,934 and reads those
four walks as partial; the comparison used the cut that holds the whole
reference path.
