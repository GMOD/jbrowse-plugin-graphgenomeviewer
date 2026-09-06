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
  `opts`; it gets no `samples` slot. A config allowlist would make one track
  per panel and cannot save query time, because a walk has to be identified
  before anyone knows whose it is.
- The tutorial moves to HPRC release 2.1 for every track it can, so node ids
  agree across the page. Verified 2026-09-06: v2.1 publishes `sv.gfa.gz`
  (841,185,082 bytes, rGFA tags present), `wave.vcf.gz` (2.29 GB),
  `pgbi.vcf.gz`, `.snarls`, the `gbz.db`, and a CHM13-referenced `gbz.db`
  (11.5 GB). Use the `sv.gfa.gz` without the `.bad` suffix beside it.
- A build-your-own section goes on the E. coli Minigraph-Cactus page, whose run
  already emits a GBZ and a distance index.
- The GBZ figures are shot after the v2.1 move, so they are shot once.
- Phase 1 found AMY1's cost in one companion index scan across two node-id
  gaps, fixed in gbz-base-js `fd91599`; the handoff's scatter diagnosis and CPU
  profile are superseded (marked so there). Phase 2 is reshaped below.
- The companion index is hosted: `s3://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38.haplotype-index.db`
  (6,993,690,624 bytes, 2026-09-05). That closes the first item of the
  handoff's "Still owed" list. Its "typed arrays in extractPaths" note is also
  stale; that shipped as `4b3011c`.

## What the identification code actually does

Stated here because the first draft of this plan got it wrong, and every phase
below leans on it. `identifyPaths` is `src/subgraph.ts` around lines 723-892.

- The window's samples come from index scans over the subgraph's handles, one
  per run of consecutive handles (gap over 4,096, `handleRuns`, since
  `fd91599`; before that one scan from the smallest handle to the largest,
  which at AMY1 crossed two gaps of 6.9M and 7.8M node ids and read 7.9M rows).
  A fragment holding one is anchored without walking.
- Otherwise a chain walks forward with `lf()`. On landing on another fragment's
  first position (`starts`) it links that fragment and keeps going; on landing
  on an already identified fragment it anchors from that identity and stops.
  Outside the subgraph every step does two lookups: `recordAt` against the
  graph and `sampleAt` against the companion, and both increment one counter.
- A chain stops at the first anchor and assigns identities only to the
  fragments already in it. Downstream siblings it never reached each start a
  fresh walk from the outer loop, and those are the walks that leave the window
  and seek the companion at every node. A haplotype with four fragments and a
  sample in the second costs two chains, the second of them scattered.
- `extractPaths` keeps only the canonical twin of each walk (line 659). Two
  fragments of one haplotype can be stored in opposite directions when a
  boundary sits on an inverted node, and then the walk from one lands on the
  other's last position, `starts` misses, and the sibling's nodes are crossed
  as if private, one companion seek each. GBWT positions are unique per path
  visit, so `starts` keyed on position is otherwise safe, repeats included.
- The bound is `4 * interval + 4 * nodeLen` measured from the last chained
  fragment's start, since `counter` has already added that fragment's length.
  A fragment longer than 64 kb with no in-window sample trips it on its first
  step. The README's "at most one interval past the window" is stale.

## Phase 1: measure how chains end (done 2026-09-06, `fd91599`)

`--stats` with `--resolve` or `--alignments` now prints, per window: index
scans and rows, fragments against chains against haplotypes, how each chain
ended, sibling links, steps that re-entered the subgraph and how many of those
landed on a discarded twin's start, companion seeks with misses against graph
record lookups with fetches, and fragment lengths against the bound. The
per-chain records are `subgraph.stats.identification.chains`;
`scripts/chains-dump.mjs` writes a window's records and alignments to JSON.
Graph hosted, companion local, context 1000, contained snarls:

| window | fragments | chains | haplotypes | ended in fragment / on sibling / out of window | steps | seeks (misses) | re-entries (on a twin) | scans, rows |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C4 10 kb | 463 | 463 | 463 | 386 / 0 / 77 | 3,937 | 4,014 (3,937) | 0 | 1, 1,186 |
| C4 60 kb | 463 | 463 | 463 | 463 / 0 / 0 | 0 | 0 | 0 | 1, 4,357 |
| CFH | 465 | 465 | 465 | 465 / 0 / 0 | 0 | 0 | 0 | 1, 13,348 |
| LPA KIV-2 | 464 | 464 | 464 | 464 / 0 / 0 | 0 | 0 | 0 | 1, 11,694 |
| MHC class II | 463 | 463 | 463 | 463 / 0 / 0 | 0 | 0 | 0 | 1, 6,912 |
| AMY1 | 1,912 | 1,624 | 490 | 1,200 / 4 / 420 | 78,506 | 3,057 (3,042) | 8,484 (51) | 5, 8,792 |
| LPA 40 kb, context 0 | 18,129 | 1,102 | 463 | 516 / 0 / 586 | 464,085 | 298,067 (297,657) | 0 | 1 |
| C4 10 kb, context 0 | 2,711 | 776 | 463 | 254 / 0 / 522 | 87,583 | 82,802 (82,386) | 0 | 1 |

No chain hit the bound or an endmarker anywhere. What the table settled:

- **AMY1's 340 MB was the index scan, not the walks.** Before `fd91599` the
  one scan over the window's handle range returned 7,878,652 rows in 49 s for
  6,766 on subgraph nodes; the walks made 351 seeks. With one scan per run of
  handles identification is 1.2 s, the companion reads 1.5 MB in 24 requests,
  and the records are identical. The handoff's CPU profile was that scan's
  `byRowid` calls, and its block-size table measured the scan three times.
- **Chains beyond one per haplotype are bookkeeping, not cost.** At AMY1 the
  first chain of each haplotype takes 1,717 steps and the other 1,134 chains
  take 76,789, but propagating forward past an anchor would not remove them:
  the private stretch after a fragment without a sample is walked exactly once
  either way, and propagation would also walk the stretches after fragments
  that have one. The plan's first Phase 2 bullet is withdrawn.
- **Twins are real and small.** 51 walks landed on a discarded twin's first
  position at AMY1 and then crossed the sibling's nodes as if private, 8,484 of
  the 78,506 steps. Zero in every other window, the LPA inversion included.
- **The bound never trips.** 564 AMY1 fragments are longer than the 65 kb bound
  and all hold a sample. The README's stale sentence is corrected to the actual
  rule (four intervals past the last linked fragment).
- **Context 0 is where seeks live.** Steps run 5 to 25 times the record count
  and 99.9 percent of seeks miss. That is Phase 3's case for retiring
  `context`, not something to optimise in the walk.

## Phase 2: what is left of the identification cost

Repo: gbz-base-js. Shaped by Phase 1's numbers, which withdrew most of the
first draft: no forward propagation, no two-pass batched seeks (3,057 seeks at
AMY1, 0 at the other five), no change to the bound.

After `fd91599` the six windows with the companion on disk are 4.1, 4.1, 12.1,
15.3, 25.2 and 12.7 s, and in each the subgraph fetch is most of it (AMY1: 9.9 s
subgraph, 1.2 s identification, 1.6 s alignment; MHC class II: 43,540 nodes).
With both files hosted AMY1 is 16.3 s (37 graph requests, 24 companion
requests, 1.5 MB), against 233.7 s on 2.2.0, so the "AMY1 under 30 s" target
below is met before the rest of this phase starts. The levers are now the ones
the handoff's "package gaps" named, and the order is:

- Prefetch the Nodes leaf pages for each run of handles in the window instead
  of fetching them as the context extension reaches them. Small windows are
  bound by sequential request latency (C4 10 kb is 37 graph requests), large
  ones by the same requests plus record decoding. Take a fresh CPU profile
  first; the old one is the scan.
- `tableRowid` on table leaf pages still recomputes cell offsets per lookup,
  and the 78k graph record lookups at AMY1 and the record fetches of every
  window go through it. Cache the cell offset array per decoded page.
- Register a discarded twin's positions so a walk landing on one links the
  canonical sibling and stops crossing its nodes. Worth about a tenth of AMY1's
  steps and nothing elsewhere; it needs the twin's positions kept, so do it
  lazily, only when a walk re-enters the subgraph.
- Remeasure the six tutorial windows with both files hosted after each lever
  and keep the table in `GBZ_HANDOFF.md` current. `test/hprc.test.ts` is the
  presence-gated AMY1 check (skips without the local companion).

## Phase 3: join alignments through the chain, and retire `context`

Repo: gbz-base-js, then the plugin, then the tutorial's track JSON.

After identification, the insertion between two sibling fragments is
`hapStart(B) - hapEnd(A)` and the reference gap is `refStart(B) - refEnd(A)`,
both available once `alignments()` has stripped leading and trailing deletions
(around line 1147). No extra walk is needed. So one record per haplotype per
window at any `context` is reachable, and `context: 0` becomes the fastest
setting rather than the one that returns 8,082 records at C4.

- Join only pairs that are same-strand, monotone on the reference
  (`refStart(B) >= refEnd(A)`), and inside one reference fragment's subgraph
  (each fragment is its own subgraph, `db.ts` around line 387). Mixed-strand
  pairs, negative reference gaps and bound-crossers stay separate records. A
  `-` haplotype's walk runs the reference backwards, so the joined CIGAR is
  emitted in reference order.
- Score the gap through `align()` (line 1035 onward) on the private path's
  node sequences and the skipped reference segment, not as raw `I`/`D`. At
  context 0 a SNP bubble would otherwise come out `1I1D` where the oracle and
  context 1000 both say `1M`. This also yields the `identity` value the
  handoff lists as missing.
- Oracle: records equal the distinct haplotype count on C4 10 kb and 60 kb,
  and the CFH CIGARs agree with `gfa_to_pairwise_paf.py --max-gap`. The stats
  say how many pairs refused to join and why.
- AMY1 is a tandem repeat, so its consecutive fragments map to overlapping
  reference intervals and will not join. That is correct, and Phase 7's copy
  count is read off exactly those fragments.
- Then remove `context` from `getAlignmentsForRange` (a major version) and from
  the adapter's alignment path. What is lost at context 0 is only haplotypes
  sharing no node with the reference in the window, which the adapter already
  drops as all-insertion records. The graph view keeps `context` and
  `subgraphSnarls`; snarl mode is topological where a bp radius is not.
  Rewrite the `context` slot doc in `configSchema.ts` for the graph view alone,
  change the tutorial's track JSON and `demos/hprc/config.json`, which both set
  `context: 1000`, and leave the CLI's `--context`, which mirrors upstream.
- Draw unresolved fragments anonymously rather than dropping them, honour
  `mateShape: 'grouped'` (the display sends it, the adapter ignores it), and
  turn the hard `nodeLimit` failure into a message naming the zoom that would
  fit.

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
  display resolves tiers only when it is present, `synteny-core/src/lodTier.ts`),
  `getFeatures` honouring `opts.lodMode === 'coarse'`, `getHeader` returning
  `coarseGap` as the spacing, and a check that the renderer draws a coarse
  feature with no CIGAR, since PIF coarse rows carry a folded one.
- **A sampled-node bitmap**, one bit per node, about 17 MB here, so a miss
  costs nothing. Only if Phase 1 shows walks ending at out-of-window samples.
  It says some path has a sample at the node, not this walk, so it removes
  misses only; with about 79M sampled positions per orientation the set-bit
  density may reach 40 percent of nodes, so compute it from the existing
  companion before deciding. Store it chunked, one row per 2^16 nodes, so a walk
  fetches only the chunks it touches rather than following a 17 MB overflow
  chain.
- The companion's `Tags` record which of these it carries and the reader
  degrades to today's behaviour without them. Rebuild and rehost the index and
  record the build in `scripts/build_hprc_gbz_index.sh`.

## Phase 5: lane selection at 464 haplotypes

Repo: the plugin (adapter surface) and jbrowse-components (display). This has
to land before any hosted config points a multi-way lane track at the v2.1
graph without a fixed lane set.

- Adapter: a method returning the graph's haplotypes as `sample#haplotype`
  with their contigs, from the Paths scan it already does; and a fetch-time
  haplotype filter through `opts`, the pattern `targetAssemblyName` uses.
- Display: a lane picker on the shared tree sidebar (`TreeSidebarMixin`, the
  home MAF and variant tracks use), lanes as sources, with the chosen set held
  as display state so it survives a refetch and is shareable in a session.
  Ordering by similarity stays parked per
  `agent-docs/ideas/ordering-synteny-lanes-by-similarity.md`; densest-first is
  fine for a chosen set of eight.
- The wave VCF genotype matrix as the cheap answer to "which haplotypes differ
  here" feeds the picker later; the picker itself does not need it.

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
  `HPRC_ALLELE`, `MHC_LANDMARK_NODES`, `CHM13_NODE`, `MHC_TIER_BUBBLE`, and
  bare ids in action lists. Re-check the counts the captions and comments quote
  (751,237 segments, 130,510 bubbles, 208,545 alleles) and the v2.0 breakpoints
  in `build_hprc_inversion_synteny.sh`'s header, which chose its locus from the
  v2.0 bubbles file. Then reshoot every rGFA figure and reread the captions.
- Update `README.txt` beside the hosted files, drop the "two releases" sentence
  from the walks section, and replace `hprc_chr20_gbz` in
  `demos/hprc_multiway/config.json` with the v2.1 pair, retiring the release 1.1
  chr20 database from every config we serve. That swap works because the
  multiway lanes are release 2 assemblies (`HG00097.1` and so on) and the v2.1
  graph's PanSN prefixes map to them through `assemblyNameToPanSN`, where the
  chr20 graph's contigs were release 1 accessions. Until Phase 5 lands, gate
  the swapped track's lanes through `assemblyNames` so the hosted demo is not
  464 lanes.

## Phase 7: the GBZ figures

Repo: jbrowse-components, specs in `website/scripts/specs/graph-hprc.ts`,
hosted config `demos/hprc/config.json`. After Phases 3, 5 and 6; AMY1 after
Phase 2 as well.

- **CFH, the same eight lanes three ways.** The gene-table stack, the PIF
  unpacked offline, and the live GBZ read, one figure per route on
  `chr1:196,640,000-196,900,000`, the GBZ one filtered to the eight through the
  Phase 5 filter. Prose states the agreement between the GBZ CIGARs and
  `gfa_to_pairwise_paf.py` as the control, with the number from the check.
- **LPA KIV-2 as carriage rather than attribution.** The graph view's cut from
  the GBZ (one W line per haplotype) in Sample rows beside the rGFA cut, whose
  node can only name the assembly that contributed it.
- **AMY1, the flagship.** Copy count per haplotype read off the graph, which
  the spec's own comment today calls "a vg job". Define the measurement before
  shooting: fragments are cut wherever a walk leaves the window, so a private
  insertion cuts too and fragment count is not copy count (1,912 fragments for
  490 haplotype paths, 1 to 19 each). Count occurrences of an AMY1-unit marker
  node in each haplotype's W line from `getSubgraph`, or fragments whose
  `refStart` falls in the unit interval. The window is 12.7 s with the
  companion local after `fd91599`; the figure must reproduce from the hosted
  pair.
- Spec comments carry the measured cost of each window, and the tutorial's
  cost table is regenerated from the same run.

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
  version, and adds the pggb route in one line (`vg gbwt -G graph.gfa
  --gbz-format` makes the GBZ).

## Phase 9: the hosted entry points

- genomes.jbrowse.org's HPRC page gains "Haplotype lanes from the graph" beside
  the graph launch, opening the Phase 7 CFH set. Needs Phase 5.
- The CHM13-referenced `gbz.db` gets a companion and the hs1 section opens the
  same locus from it. Lowest priority; it is the same build a second time.

## Not to do

- No `samples` config slot on the adapter (see Decisions).
- No denser per-path companion as the AMY1 fix; it scales the hosted file
  linearly and the handoff measured that block size does not help scatter.
- No building on the release 1.1 chr20 database.
- No GBZ figure before the v2.1 move.
- No companion format change before Phase 1's numbers exist.
- No hosted multi-way GBZ track without a fixed lane set until Phase 5 exists.
