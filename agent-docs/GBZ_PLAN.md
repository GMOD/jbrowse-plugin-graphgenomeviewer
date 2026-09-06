# Plan: the GBZ route into the HPRC pangenome tutorial

Written 2026-09-06, continuing `GBZ_HANDOFF.md`, revised the same day after a
code-level review. The handoff records what exists and what was measured; this
file orders what to do next and says why each step sits where it does. Read the
handoff first. Repos: `~/src/gbz-base-js` (the reader, `@gmod/gbz-base`), this
plugin (`GbzBaseSyntenyAdapter`, the graph view), `~/src/jbrowse-components`
(the tutorial, `MultiWaySyntenyDisplay`, figure specs, build scripts, hosted
demo configs).

## Decisions already taken

- Lane selection lives in the display and session, not in adapter config. The
  adapter exposes the haplotype list and honours a fetch-time filter through
  `opts`; it gets no `samples` slot. A config allowlist would make one track per
  panel and cannot save query time, because a walk has to be identified before
  anyone knows whose it is.
- The tutorial moves to HPRC release 2.1 for every track it can, so node ids
  agree across the page. Verified 2026-09-06: v2.1 publishes `sv.gfa.gz`
  (841,185,082 bytes, rGFA tags present), `wave.vcf.gz` (2.29 GB),
  `pgbi.vcf.gz`, `.snarls`, the `gbz.db`, and a CHM13-referenced `gbz.db` (11.5
  GB). Use the `sv.gfa.gz` without the `.bad` suffix beside it.
- A build-your-own section goes on the E. coli Minigraph-Cactus page, whose run
  already emits a GBZ and a distance index.
- The GBZ figures are shot after the v2.1 move, so they are shot once.
- Phase 1 found AMY1's cost in one companion index scan across two node-id gaps,
  fixed in gbz-base-js `fd91599`; the handoff's scatter diagnosis and CPU
  profile are superseded (marked so there). Phase 2 is reshaped below.
- The companion index is hosted:
  `s3://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38.haplotype-index.db`
  (6,993,690,624 bytes, 2026-09-05). That closes the first item of the handoff's
  "Still owed" list. Its "typed arrays in extractPaths" note is also stale; that
  shipped as `4b3011c`.

## What the identification code actually does

Stated here because the first draft of this plan got it wrong, and every phase
below leans on it. `identifyPaths` is `src/subgraph.ts` around lines 723-892.

- The window's samples come from index scans over the subgraph's handles, one
  per run of consecutive handles (gap over 4,096, `handleRuns`, since `fd91599`;
  before that one scan from the smallest handle to the largest, which at AMY1
  crossed two gaps of 6.9M and 7.8M node ids and read 7.9M rows). A fragment
  holding one is anchored without walking.
- Otherwise a chain walks forward with `lf()`. On landing on another fragment's
  first position (`starts`) it links that fragment and keeps going; on landing
  on an already identified fragment it anchors from that identity and stops.
  Outside the subgraph every step does two lookups: `recordAt` against the graph
  and `sampleAt` against the companion, and both increment one counter.
- A chain stops at the first anchor and assigns identities only to the fragments
  already in it. Downstream siblings it never reached each start a fresh walk
  from the outer loop, and those are the walks that leave the window and seek
  the companion at every node. A haplotype with four fragments and a sample in
  the second costs two chains, the second of them scattered.
- `extractPaths` keeps only the canonical twin of each walk (line 659). Two
  fragments of one haplotype can be stored in opposite directions when a
  boundary sits on an inverted node, and then the walk from one lands on the
  other's last position, `starts` misses, and the sibling's nodes are crossed as
  if private, one companion seek each. GBWT positions are unique per path visit,
  so `starts` keyed on position is otherwise safe, repeats included.
- The bound is `4 * interval + 4 * nodeLen` measured from the last chained
  fragment's start, since `counter` has already added that fragment's length. A
  fragment longer than 64 kb with no in-window sample trips it on its first
  step. The README's "at most one interval past the window" is stale.

## Phase 1: measure how chains end (done 2026-09-06, `fd91599`)

`--stats` with `--resolve` or `--alignments` now prints, per window: index scans
and rows, fragments against chains against haplotypes, how each chain ended,
sibling links, steps that re-entered the subgraph and how many of those landed
on a discarded twin's start, companion seeks with misses against graph record
lookups with fetches, and fragment lengths against the bound. The per-chain
records are `subgraph.stats.identification.chains`; `scripts/chains-dump.mjs`
writes a window's records and alignments to JSON. Graph hosted, companion local,
context 1000, contained snarls:

| window               | fragments | chains | haplotypes | ended in fragment / on sibling / out of window | steps   | seeks (misses)    | re-entries (on a twin) | scans, rows |
| -------------------- | --------- | ------ | ---------- | ---------------------------------------------- | ------- | ----------------- | ---------------------- | ----------- |
| C4 10 kb             | 463       | 463    | 463        | 386 / 0 / 77                                   | 3,937   | 4,014 (3,937)     | 0                      | 1, 1,186    |
| C4 60 kb             | 463       | 463    | 463        | 463 / 0 / 0                                    | 0       | 0                 | 0                      | 1, 4,357    |
| CFH                  | 465       | 465    | 465        | 465 / 0 / 0                                    | 0       | 0                 | 0                      | 1, 13,348   |
| LPA KIV-2            | 464       | 464    | 464        | 464 / 0 / 0                                    | 0       | 0                 | 0                      | 1, 11,694   |
| MHC class II         | 463       | 463    | 463        | 463 / 0 / 0                                    | 0       | 0                 | 0                      | 1, 6,912    |
| AMY1                 | 1,912     | 1,624  | 490        | 1,200 / 4 / 420                                | 78,506  | 3,057 (3,042)     | 8,484 (51)             | 5, 8,792    |
| LPA 40 kb, context 0 | 18,129    | 1,102  | 463        | 516 / 0 / 586                                  | 464,085 | 298,067 (297,657) | 0                      | 1           |
| C4 10 kb, context 0  | 2,711     | 776    | 463        | 254 / 0 / 522                                  | 87,583  | 82,802 (82,386)   | 0                      | 1           |

No chain hit the bound or an endmarker anywhere. What the table settled:

- **AMY1's 340 MB was the index scan, not the walks.** Before `fd91599` the one
  scan over the window's handle range returned 7,878,652 rows in 49 s for 6,766
  on subgraph nodes; the walks made 351 seeks. With one scan per run of handles
  identification is 1.2 s, the companion reads 1.5 MB in 24 requests, and the
  records are identical. The handoff's CPU profile was that scan's `byRowid`
  calls, and its block-size table measured the scan three times.
- **Chains beyond one per haplotype are bookkeeping, not cost.** At AMY1 the
  first chain of each haplotype takes 1,717 steps and the other 1,134 chains
  take 76,789, but propagating forward past an anchor would not remove them: the
  private stretch after a fragment without a sample is walked exactly once
  either way, and propagation would also walk the stretches after fragments that
  have one. The plan's first Phase 2 bullet is withdrawn.
- **Twins are real and small.** 51 walks landed on a discarded twin's first
  position at AMY1 and then crossed the sibling's nodes as if private, 8,484 of
  the 78,506 steps. Zero in every other window, the LPA inversion included.
- **The bound never trips.** 564 AMY1 fragments are longer than the 65 kb bound
  and all hold a sample. The README's stale sentence is corrected to the actual
  rule (four intervals past the last linked fragment).
- **Context 0 is where seeks live.** Steps run 5 to 25 times the record count
  and 99.9 percent of seeks miss. That is Phase 3's case for retiring `context`,
  not something to optimise in the walk.

## Phase 2: what is left of the identification cost

Repo: gbz-base-js. Shaped by Phase 1's numbers, which withdrew most of the first
draft: no forward propagation, no two-pass batched seeks (3,057 seeks at AMY1, 0
at the other five), no change to the bound.

After `fd91599` the six windows with the companion on disk are 4.1, 4.1, 12.1,
15.3, 25.2 and 12.7 s, and in each the subgraph fetch is most of it (AMY1: 9.9 s
subgraph, 1.2 s identification, 1.6 s alignment; MHC class II: 43,540 nodes).
With both files hosted AMY1 is 16.3 s (37 graph requests, 24 companion requests,
1.5 MB), against 233.7 s on 2.2.0, so the "AMY1 under 30 s" target below is met
before the rest of this phase starts. After `ad48851` the six hosted are 7.2,
5.1, 9.0, 8.8, 13.2 and 17.2 s (the handoff has the table); the two C4 windows
and AMY1 are inside the network noise of the day, the three large windows halved
or better.

- Done in `ad48851`. A fresh `node --cpu-prof` of MHC class II put
  `extractPaths` at 37% self time and `tableRowid` at 0.6%, so the cell-offset
  cache the handoff proposed is withdrawn. `extractPaths` pushed one
  `{node, offset}` object per node per path and walked every twin in full before
  `pathIsCanonical` discarded it; at 43,540 nodes and 19.7M GBWT positions that
  was 47 s per phase timing. It now walks typed successor arrays, records
  forward-start walks directly, and skips a reverse record's starts outright
  when every one of them is the twin of a canonical walk that ended on the
  flipped handle, which a per-record count settles without a walk (disabled when
  the reference position sits on a reverse record, the CHM13 against-orientation
  case): 2.8 s, same paths. Positions are now `path[k]` and `offsets[k]`.
- Done in `ad48851`. The reference walk fetched Nodes leaf pages one sequential
  request at a time (49 at MHC). `ReferenceIndex` gives the handle at the
  window's end, so `prefetchReferenceWalk` fetches the rowid range in one
  request before the walk: 23 requests, 1.4 s after a 0.7 s prefetch. A generic
  sequential read-ahead in `tableRowid` was tried first and dropped: it cut MHC
  to 37 requests but added 4 to C4 and 9 to AMY1, because the context extension
  and identification lookups are not sequential in handle order.
- What remains per window with the companion local, phase timings at MHC class
  II: Paths scan 2.7 s (one per `GBZBase`, no name index on `Paths`), reference
  walk 1.4 s, `extractPaths` 2.8 s (memory-bound steps over 19.7M positions),
  alignments 3.2 s (`sharedWeight`, `orderedMatches` and `editsAgainst` each do
  two Map lookups per node). The alignment pass is Phase 3's territory.
- Register a discarded twin's positions so a walk landing on one links the
  canonical sibling and stops crossing its nodes. Worth about a tenth of AMY1's
  steps and nothing elsewhere; it needs the twin's positions kept, so do it
  lazily, only when a walk re-enters the subgraph.
- Remeasure the six tutorial windows with both files hosted after each lever and
  keep the table in `GBZ_HANDOFF.md` current. `test/hprc.test.ts` is the
  presence-gated AMY1 check (skips without the local companion).

## Phase 3: join alignments through the chain (join done 2026-09-06, `context` stays)

Repo: gbz-base-js (`cf9b8b8`), then the plugin (`context` redocumented, default
1000), then the tutorial's prose once the plugin depends on the release.

What landed. After identification `alignments()` sorts the resolved fragments of
one path by haplotype coordinate and joins consecutive pairs that are
same-strand and monotone on both axes; the gap is `hapStart(B) - hapEnd(A)`
against `refStart(B) - refEnd(A)` (reversed for `-`), scored by the same
mismatch-or-indel rule `align()` applies to a diverging stretch, without
sequences (the private nodes are outside the subgraph; a SNP bubble still comes
out `1M`, matching the oracle). Pairs that fail stay separate, as do unresolved
fragments; `distinct` output is not joined. `start` and `path` of a joined
record follow the walk's orientation so the walk-back check still holds. The
CHM13 against-orientation window on chr20 is now one `395M` record in each
direction where it was `102M` plus pieces.

Measured, graph hosted, companion local, contained snarls:

| window       | context 0 fragments | records                | context 1000 records | agree      |
| ------------ | ------------------- | ---------------------- | -------------------- | ---------- |
| C4 10 kb     | 2,711               | 463                    | 463                  | 463 of 463 |
| C4 60 kb     | 8,083               | 463                    | 463                  | 463 of 463 |
| CFH          | 4,099               | 465                    | 465                  | 465 of 465 |
| LPA KIV-2    | 465                 | 464                    | 464                  | 463 of 464 |
| MHC class II | 1,141,750           | 463                    | 463                  |            |
| AMY1         | 30,314              | 1,371 (478 haplotypes) | 1,395 (490)          |            |

"agree" is the haplotype coordinate read off the CIGAR at three reference points
inside both records, for every `+` haplotype; the one LPA disagreement is an
equal-weight gap placed differently in a repeat. AMY1's twelve missing
haplotypes at context 0 share no node with the reference in the window.

**`context` stays, and the plan's "retire it" is withdrawn.** The prediction was
that context 0 becomes the fastest setting once records are joined. It is not:
MHC class II sits inside a snarl far larger than the window, so context 0 is
1.1M pieces to extract, identify and align, 41 s against 13 s at 1000, for the
same 463 records. Elsewhere the two are within noise (CFH 8.7 against 11.8 s,
AMY1 11.1 against 12.6 s) after `editsAgainst` stopped aligning an empty path
slice against the whole remaining reference per piece. So context trades nodes
read against pieces joined, the record count no longer depends on it, and the
adapter's slot says exactly that with default 1000 (the handoff's "defaults to
0" gap). The `AlignmentOptions` type is unchanged, so this is not a major
version.

Closed 2026-09-06, after Phase 5: `@gmod/gbz-base` 2.3.0 is on npm (tag
`v2.3.0`, published by the tag workflow), the plugin depends on it and is
released as 0.1.0 and deployed to the demo bucket (bundle `1f5a17a155f7`), and
the plugin's record-count test asserts equality: one record per haplotype CONTIG
at any context, since HG03516#2 carries the micb window on two contigs and those
are two walks (90 records over 89 lanes). The tutorial's `#gbz-window-cost`
section is rewritten around what context trades, with the table from one 2.3.0
run (jbrowse-components `56d0746a00`; hosted, context 1000, contained snarls:
7.5, 5.0, 8.1, 8.5, 12.7 and 12.8 s; AMY1 is 1,395 records from 1,912 pieces, 24
companion requests), and the tutorial's GBZ track lists the eight lanes in the
display's `lanes` slot. `context` 20000 and `overlapping` snarls at AMY1 still
exhaust a 4 GB heap after about a minute on 2.3.0, remeasured.

Still to do in this phase:

- `identity` is still missing: the CIGAR's `M` is match-or-mismatch and the join
  scores gaps without sequences. Sequence-level identity would need the private
  nodes fetched, which identification already does for the pieces whose chain
  walked; measure before deciding.

Closed since the first draft: the `nodeLimit` failure names a window that fits
(`b8ba3b1`, off gbz-base's `walkedBp`); `mateShape: 'grouped'` needs no adapter
work, since `groupFeatures` reads the ungrouped shape and the records are one
per haplotype now; an unresolved fragment stays dropped, because without
haplotype coordinates it has no mate to draw.

## Phase 4: a companion whose geometry matches the queries

Repo: gbz-base-js (`tools/haplotype-index` and the reader), then the plugin and
the display. Measure Phases 1 to 3 first; this is a format change.

Samples today sit every 16 kb along each path, in both orientations. Windows are
on the reference.

- **Reference-aligned samples.** At reference nodes spaced along the reference
  path, record a sample for every path visit through the node. Any window wider
  than the spacing then identifies every haplotype from the index scan already
  made. Counted in both orientations as the tool writes today, 16 kb spacing is
  about 176M rows, more than the current 158M, not fewer; writing one
  orientation halves that but needs the reader to derive the reverse-record
  offset of the same visit by a rank walk (what `verify-chr20.ts` does). Decide
  after measuring whether the per-path interval can widen once these exist.
  Haplotypes that never touch the reference in a stretch still need per-path
  samples, so this is an addition. The primary key `(node_handle, node_offset)`
  is one row per visit, so the new rows are transparent to
  `haplotypeSamplesInRange`.
- **A coarse table from the same rows** at about 1 Mb spacing, about 2.9M rows
  in both orientations, gives every haplotype's own coordinate per reference
  megabase with no alignment. A placement block between two consecutive samples
  of one path is valid only where the path is monotone between them; say so in
  the record and skip the rest. On the display side this needs more than a
  header flag: a `coarseBpPerPxThreshold` slot on the adapter config (the
  display resolves tiers only when it is present,
  `synteny-core/src/lodTier.ts`), `getFeatures` honouring
  `opts.lodMode === 'coarse'`, `getHeader` returning `coarseGap` as the spacing,
  and a check that the renderer draws a coarse feature with no CIGAR, since PIF
  coarse rows carry a folded one.
- **A sampled-node bitmap**, one bit per node, about 17 MB here, so a miss costs
  nothing. Only if Phase 1 shows walks ending at out-of-window samples. It says
  some path has a sample at the node, not this walk, so it removes misses only;
  with about 79M sampled positions per orientation the set-bit density may reach
  40 percent of nodes, so compute it from the existing companion before
  deciding. Store it chunked, one row per 2^16 nodes, so a walk fetches only the
  chunks it touches rather than following a 17 MB overflow chain.
- The companion's `Tags` record which of these it carries and the reader
  degrades to today's behaviour without them. Rebuild and rehost the index and
  record the build in `scripts/build_hprc_gbz_index.sh`.

## Phase 5: lane selection at 464 haplotypes (done 2026-09-06)

Repo: the plugin (`157bb5e`, and the header lanes the same day) and
jbrowse-components (`MultiWaySyntenyDisplay`, `44e771ef80`). A hosted config can
now point a multi-way lane track at the v2.1 graph and open on a fixed set.

What landed:

- Adapter: `getHaplotypes()` lists every `sample#haplotype` with its contigs
  from the Paths scan; `opts.haplotypes` narrows a fetch to PanSN prefixes at
  sample or haplotype depth, or to assembly names the config maps to one; and
  `getHeader()` declares `lanes` (every haplotype but the reference sample's
  own, `name` the lane's assembly name as the features' mates carry it, `label`
  the PanSN prefix, `group` the sample) plus `anchorAssemblyName`. The adapter
  type declares `adapterCapabilities: ['headerLanes']`.
- Display: `selectedLanes` is a display property (session state, so a shared
  session carries it), narrowing `rowAssemblies` beside `rowOrder` and
  `hiddenLanes`; the config slot `lanes` is what a hosted track opens on until
  the reader chooses. The universe the picker offers is the header's declared
  lanes plus any lane the window places; an adapter with the `headerLanes`
  capability has its `CoreGetInfo` header read even without a tier slot
  (`installLodTierInfoFetch`'s new `alsoWhen`). The picker is a dialog off the
  track menu ("Choose lanes...", with "Every lane" as the way back): filter,
  tick or untick what is shown, lanes grouped by sample with the unplaced ones
  greyed. Ticking every lane writes no selection.
- The selection is applied in the display and not sent with the fetch,
  deliberately: a walk has to be identified before anyone knows whose it is, so
  a fetch-time filter saves no query time, and a local filter means a selection
  change redraws without a 5 to 13 s refetch. What the selection saves is the
  display's per-lane work, the lane-gene and lane-link fetches above all.

What stays parked: the shared tree sidebar (`TreeSidebarMixin`) as the picker's
home, with lanes as sources and cluster-by-identity as its run; the lane stack
has its own geometry and headers, so that is a larger fit than the picker was,
and it wants the wave VCF genotype matrix as the cheap "which haplotypes differ
here" first. Ordering by similarity stays parked per
`agent-docs/ideas/ordering-synteny-lanes-by-similarity.md`; densest-first is
fine for a chosen set of eight.

## Phase 6: move the tutorial to release 2.1

Repo: jbrowse-components, hosted files at `s3://jbrowse.org/demos/hprc/` and
`s3://jbrowse.org/demos/hprc_multiway/`.

- Rebuild from `hprc-v2.1-mc-grch38.sv.gfa.gz`: `build_rgfa_tabix.sh` (full and
  `.ref` pairs), `build_rgfa_alleles.sh`, `gfatools bubble`,
  `build_bubble_tier.sh`. Swap the callset and carriage URLs to v2.1.
- The multiway demo holds three PIFs: `hprc_multiway.pif.gz` from the release
  PAF (release-level, stays) and two graph-derived ones,
  `hprc_multiway_gfa.pif.gz` and `hprc_multiway_graph.pif.gz`, plus each
  haplotype's `.gfa.chrom.sizes` and `.graph.chrom.sizes`. The two graph PIFs
  and the chrom.sizes rebuild from the v2.1 GFA.
- The MAF track and its summary read the v2.0 TAF; v2.1's MAF is 53 GB. Decide
  whether the MAF lane stays on v2.0 with a sentence saying so, or moves. The
  impg all-vs-GRCh38 PAF is release-level and stays.
- Re-derive every literal segment id in `website/scripts/specs/graph-hprc.ts`
  with `scripts/probe-graph-nodes.ts`. There are about nineteen, not two:
  `HPRC_ALLELE`, `MHC_LANDMARK_NODES`, `CHM13_NODE`, `MHC_TIER_BUBBLE`, and bare
  ids in action lists. Re-check the counts the captions and comments quote
  (751,237 segments, 130,510 bubbles, 208,545 alleles) and the v2.0 breakpoints
  in `build_hprc_inversion_synteny.sh`'s header, which chose its locus from the
  v2.0 bubbles file. Then reshoot every rGFA figure and reread the captions.
- Update `README.txt` beside the hosted files, drop the "two releases" sentence
  from the walks section, and replace `hprc_chr20_gbz` in
  `demos/hprc_multiway/config.json` with the v2.1 pair, retiring the release 1.1
  chr20 database from every config we serve. That swap works because the
  multiway lanes are release 2 assemblies (`HG00097.1` and so on) and the v2.1
  graph's PanSN prefixes map to them through `assemblyNameToPanSN`, where the
  chr20 graph's contigs were release 1 accessions. Set the display's `lanes`
  slot on the swapped track so the hosted demo opens on a chosen set rather than
  464 lanes; the picker takes it from there.

## Phase 7: the GBZ figures

Repo: jbrowse-components, specs in `website/scripts/specs/graph-hprc.ts`, hosted
config `demos/hprc/config.json`. After Phases 3, 5 and 6; AMY1 after Phase 2 as
well.

- **CFH, the same eight lanes three ways.** The gene-table stack, the PIF
  unpacked offline, and the live GBZ read, one figure per route on
  `chr1:196,640,000-196,900,000`, the GBZ one filtered to the eight through the
  Phase 5 filter. Prose states the agreement between the GBZ CIGARs and
  `gfa_to_pairwise_paf.py` as the control, with the number from the check.
- **LPA KIV-2 as carriage rather than attribution.** The graph view's cut from
  the GBZ (one W line per haplotype) in Sample rows beside the rGFA cut, whose
  node can only name the assembly that contributed it.
- **AMY1, the flagship.** Copy count per haplotype read off the graph, which the
  spec's own comment today calls "a vg job". Define the measurement before
  shooting: fragments are cut wherever a walk leaves the window, so a private
  insertion cuts too and fragment count is not copy count (1,912 fragments for
  490 haplotype paths, 1 to 19 each). Count occurrences of an AMY1-unit marker
  node in each haplotype's W line from `getSubgraph`, or fragments whose
  `refStart` falls in the unit interval. The window is 12.7 s with the companion
  local after `fd91599`; the figure must reproduce from the hosted pair.
- Spec comments carry the measured cost of each window, and the tutorial's cost
  table is regenerated from the same run.

## Phase 8: build your own

Repo: jbrowse-components, `pangenome_cactus.md` and
`build_ecoli_pangenome_cactus.sh`.

- Three commands after the cactus run: `vg chains` from a distance index,
  `gbz-base construct --chains`, and `gbz-haplotype-index` written into the
  small database. The run's only distance index belongs to the filtered
  `ecoli.d2.gbz`; using the full graph's GBZ means one extra `vg index -j`
  first. Confirm the cactus 3.2.1 image's vg is 1.69 or newer for `vg chains`.
- Then the same two tracks the HPRC page shows, on K12: the GBZ lane track with
  five strain lanes, and the graph cut from the GBZ, beside the existing
  `odgi extract` route on the same window so the two can be compared.
- The HPRC page's "Preparing a graph of your own" links here as the runnable
  version, and adds the pggb route in one line
  (`vg gbwt -G graph.gfa --gbz-format` makes the GBZ).

## Phase 9: the hosted entry points

- genomes.jbrowse.org's HPRC page gains "Haplotype lanes from the graph" beside
  the graph launch, opening the Phase 7 CFH set through the display's `lanes`
  slot.
- The CHM13-referenced `gbz.db` gets a companion and the hs1 section opens the
  same locus from it. Lowest priority; it is the same build a second time.

## Not to do

- No `samples` config slot on the adapter (see Decisions).
- No denser per-path companion as the AMY1 fix; it scales the hosted file
  linearly and the handoff measured that block size does not help scatter.
- No building on the release 1.1 chr20 database.
- No GBZ figure before the v2.1 move.
- No companion format change before Phase 1's numbers exist.
- No hosted multi-way GBZ track without a fixed lane set (the display's `lanes`
  slot).
