# Vision: haplotype access at HPRC scale

Written 2026-09-06 after Phase 7 of `GBZ_PLAN.md` stalled on a sample filter,
and rewritten the same day after the review in `HAPLOTYPE_WALKS_REVIEW.md`.
The first draft proposed replacing the GBZ route with a precomputed walk store
built from the sv graph. The review measured it and the draft was wrong on its
premises; this version keeps what survived. It is a proposal, not a decision.

## What we want

- Large genomes: a 3 Gb reference, haplotypes in dozens of contigs, windows on
  either.
- Many samples: 464 haplotypes today, thousands in later releases.
- Static hosting: range requests against files on S3, no server process.
- Selection that costs what it asks for: eight lanes out of four thousand read
  eight haplotypes' worth of data.
- Interactive: a window with a chosen set under a second, every haplotype in a
  window in a few seconds.
- Reproducible from files the graph builders publish, by a script.

## What the review established

- The GBWT's anonymity is the wrong thing to fight at query time. Identity
  should be precomputed. That instinct was right and is the whole of what the
  first draft got right.
- The GBWT is the only representation whose size grows sublinearly with
  haplotype count, because haplotypes share runs. Any per-haplotype store is
  linear: measured on 32 base-level chr1 walks, delta-encoded steps compress to
  0.162 bytes per step, which over the graph's 37 G steps (estimate from the
  companion build log) is 6 to 8 GB per product at 464 haplotypes and 50 to
  70 GB at 4,000. That is the same scaling as the 16 kb per-path companion the
  draft wanted to retire, with no better constant.
- `sv.gfa.gz` has no walks: 759,223 S lines, 1,107,199 L lines, nothing else.
  The only published walks are the base-level GFA's, in a different node id
  space from the sv graph's. An sv-level walk store would have to come from the
  graphmap GAF, which is alignments and loses everything under the SV threshold.
- The multiway PIF is eight haplotypes at 16 MB each, not 464. It is the
  precomputed lane product per haplotype and says nothing about scaling.
- The graph view keeps needing node lengths, sequences and edges, so the 10 GB
  `gbz.db` stays hosted under any base-level design. A walk store could retire
  the companion and the chain walk, never the graph.
- The GRCh38 database already indexes CHM13's paths, so CHM13 windows work on
  the same pair today. A reference-cut store is a second copy per reference.
- The reader's per-window cost is not identification. At AMY1 it is 9.9 s of
  subgraph fetch, 1.2 s identification, 1.6 s alignment; at MHC class II the
  Paths scan, reference walk, `extractPaths` and alignments are 2.7, 1.4, 2.8
  and 3.2 s. What a selection can save is the walk extraction and alignment of
  the unchosen haplotypes and the fetch of the nodes only they visit.

## The direction: precompute identity, keep the GBWT as the walk container

Phase 4's first bullet, costed and moved to the front.

- **Reference-anchored samples in the companion.** At reference nodes spaced
  along each indexed reference path, one row per path visit: path handle, GBWT
  position, the haplotype's own coordinate. The table's key is already
  `(node_handle, node_offset)`, one row per visit, so these rows are transparent
  to today's scan. At 128 kb spacing that is about 24k reference nodes times
  about 470 visits, some 11M rows per orientation, under 1 GB, growing with
  haplotype count rather than haplotype bp.
- **A per-path walk in the reader.** Given a window, one index scan at the
  reference node before it lists every haplotype passing and where it is in its
  own coordinates, with no chain walk and no bound. For a chosen set, `lf()`
  walks each path handle from its sample through the window: at 35 bp per step
  (measured) a 130 kb KIV-2 window is about 3,700 steps per haplotype over the
  Nodes pages `prefetchReferenceWalk` already fetches, since Minigraph-Cactus
  interleaves alt node ids with their reference neighbours. Eight haplotypes is
  about 30,000 in-memory steps; the subgraph for the set is the nodes those
  walks visit, so the fetch shrinks with the selection too.
- **`haplotypes` reaches the query.** `getSubgraphForRange` and
  `getAlignmentsForRange` take the set and walk only those paths; the adapter
  passes the display's selection through; the graph view's `GetSubgraph`
  carries it, and Sample rows draws the chosen set.
- **What the per-path samples still cover.** A haplotype whose contig starts or
  ends inside the window, or that touches the reference only between two
  anchors, has no visit at an anchor. Those keep today's per-path samples and
  chain walk; the reference-anchored rows are an addition, as the plan says.
- **CHM13 comes free**, because anchors are written for every indexed reference
  path of the same database.

Targets to measure, both files hosted:

| measurement | target |
| --- | --- |
| companion with anchors at 128 kb | under 8 GB total, anchors under 1 GB |
| KIV-2, eight haplotypes | under 1 s after the first open |
| KIV-2, all 464 | no worse than today's 8.5 s |
| AMY1, eight haplotypes | under 2 s |

If eight lands under a second and 464 holds, the walk store's only remaining
argument is an all-haplotype parse against `extractPaths` at thousands of
haplotypes, and that decision can wait for a graph with thousands.

## Unblock the figures now

Phase 7 waits on a sample filter for two figures. A static cut per tutorial
locus, `gbz-base-query --format gfa --alignments` written once from the hosted
pair and read by a trivial adapter, gives every figure at zero runtime cost and
is the honest reproduction story for a figure anyway. It does not generalise to
arbitrary windows and the tutorial does not need it to.

## Define the copy count before making AMY1 a target

Nothing yet demonstrates a per-haplotype copy count from walks at either graph
level. At sv level minigraph credits extra repeat copies to a first contributor
as inserted alleles, so a haplotype's count is length arithmetic over the
branch it takes; at base level the extra copies revisit GRCh38 nodes, so a count
is visits of a marker node per walk with a monotone chaining rule. Pick one,
show it on one haplotype by hand, then write the spec.

## Decide what the graph view draws

Today it draws the sv graph's rGFA segments and the GBZ's base-level nodes,
depending on the track. Walks it can name are base-level, so a named walk over
the rGFA cut needs a base-to-sv node map that nothing published provides. Either
the GBZ track owns the "walks from the graph" figures on base-level nodes, or an
sv-level walk product is built from the graphmap GAF with its caveats stated.
The first is available now.

## The walk store, deferred

Sizes, if it is ever built: base level 6 to 8 GB per product at 464 haplotypes
(all-haplotype file, per-haplotype files, haplotype-coordinate sort), with a
build of an hour or two on the lab machine, about 1,900 objects per reference
on S3, a full rebuild per graph release, and a policy in the adapter for which
product a given selection size reads. Per-haplotype tabix works with
`@gmod/tabix` (it loads a whole index: 0.1 to 0.5 MB per haplotype at 100 kb to
10 kb tiles). Rows cut at reference nodes are correct by overlap for
inversions, private stretches and revisits, but a lane still needs monotone
chaining at query time and a scoring rule stated, since the reader's `align()`
and `gfa_to_pairwise_paf.py` emit different CIGARs for the same walks by design.

## Order of work

- Static cuts for the six tutorial loci; shoot KIV-2 and CFH from them.
- Copy-count measurement defined and shown by hand; then the AMY1 figure.
- Anchored rows in `tools/haplotype-index`, the per-path walk in the reader,
  `haplotypes` through the two range queries; rebuild and rehost the companion;
  measure against the table above.
- Selection through the adapter and the graph view's `GetSubgraph`.
- Retire Phase 9's CHM13 companion as a separate item; it is the same file.
