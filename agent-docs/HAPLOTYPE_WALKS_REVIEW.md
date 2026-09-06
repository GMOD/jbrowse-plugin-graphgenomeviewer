# Review: HAPLOTYPE_WALKS_VISION.md

Reviewed 2026-09-06 against `GBZ_PLAN.md`, `GBZ_HANDOFF.md`, the reader
(`~/src/gbz-base-js`), the plugin adapters and graph view, jbrowse-components'
`gfa_to_pairwise_paf.py` and PIF pipeline, the files in `~/src/hprc-gbz/v2.1/`,
the published v2.1 bucket listing, and a sample of the 63 GB base-level GFA on
`ada`. Everything below marked "measured" was run today; the commands and raw
outputs are in the scratchpad (`gfa_stats.awk`, `analyse.awk` on ada,
`synth_tiles.awk`, `list_samples.mjs`).

## Verdict first

Do not adopt the document as written. Its central factual premise is wrong (the
sv graph it proposes to build from has no walks), its one size target is off by
an order of magnitude once that is corrected, its headline comparison puts an
8-haplotype file against a 464-haplotype one, and it dismisses the GBZ route's
own selection-priced design (Phase 4 of the plan) without measuring it. What is
right in it, and worth keeping, is the lever: precomputing haplotype identity is
what removes the chain walk, and per-haplotype addressing is the only way a
selection of eight costs eight. That lever is available inside the GBZ route
too, and the document never checks.

Recommendation, in order: measure the reference-anchored companion plus a
per-path walk in the reader (a week, no new hosted format); precompute the six
tutorial windows as static cuts so Phase 7's figures stop waiting on either
route; and only then decide whether a walk store is wanted, at which level, with
the numbers below in front of you rather than the document's estimates.

## 1. Is the diagnosis right?

### What holds up

- Upstream gbz-base names paths `unknown#N`; the companion index and
  `identifyPaths` (`src/subgraph.ts` 1015-1250) are ours; identification is a
  chain walk with a bound. True.
- The current code identifies after extracting every walk, and the adapter's
  `haplotypes` option (`GbzBaseSyntenyAdapter.ts`, `haplotypeWanted`) filters
  the records after `getAlignmentsForRange` has aligned all of them. So today a
  filter saves nothing in the reader. True, and the plan's Phase 5 says so.
- The companion at 16 kb per-path sampling is linear in total haplotype bp, so
  ~60 GB at 4,000 haplotypes is a fair extrapolation of that design.

### What does not

**"A sample filter can never make a window cheaper" is a statement about the
current code, not about the format, and it is false even for the current code.**
The plan's own phase timings at MHC class II (companion local): Paths scan
2.7 s, reference walk 1.4 s, `extractPaths` 2.8 s, alignments 3.2 s. The
alignment phase is per path (`alignments()` calls `this.alignment(index)` for
every path) and could take a path-handle filter today for about a quarter of
that window's time. At AMY1 the split is 9.9 s subgraph fetch, 1.2 s
identification, 1.6 s alignment: identification, the thing the document blames,
is a tenth of the window. Most of the cost is sequential node-record fetching
for the subgraph (37 requests, latency-bound) and `extractPaths` walking every
GBWT position in the window, neither of which the document names.

**The cheaper identification path the document ignores is Phase 4's first
bullet, and it makes the GBZ route selection-priced.** Reference-aligned
samples (one row per path visit at reference nodes spaced along the reference)
turn "which haplotypes are here, and where in their own coordinates" into one
index scan on one node, no chain walk, no bound. From there, a chosen haplotype
is `lf()` steps along its own path for the window's length: at 35 bp per step
(measured below) a 130 kb KIV-2 window is ~3,700 steps per haplotype, over
Nodes pages that `prefetchReferenceWalk` already fetches in one request
(Minigraph-Cactus ids interleave alt nodes with their reference neighbours, the
+2 deltas in the sample show it). Eight haplotypes is ~30,000 in-memory steps.
The subgraph for a chosen set is then only the nodes those walks visit, so the
9.9 s fetch shrinks too. And the spacing can be far coarser than 16 kb, because
walking 128 kb of reference to reach a window is ~3,600 steps over two 64 KiB
blocks: at 128 kb spacing the table is ~24k reference nodes x ~470 visits =
~11M rows, well under 1 GB, and it grows with haplotype count, not with
haplotype bp squared. This is the design the document should have costed
before proposing to retire the companion. It needs a "walk these path handles
from this anchor" query in the reader and a `haplotypes` slot on the
subgraph-level query; it needs no new hosted format and no per-haplotype files.

**Other routes the question named, checked:**

- GBWT document-array samples: gbwt-rs loads `da_samples` as opaque `Vec<u64>`
  ("we pass the data through but cannot interpret it", `src/gbwt.rs:102`), and
  `gbz-base construct` does not carry them into the `.gbz.db`. Not a route
  without upstream work, and they give a path id, not a path offset, so the
  companion would still be needed for coordinates.
- WASM: the handoff's reasons stand (wasm32 misreads 64-bit `usize`
  serialisation, upstream declined the port; wasm64 has no libc for SQLite).
  The document does not rely on it, correctly.
- A per-sample `extract`: the GBWT extracts a path from its start; without
  samples that is linear in the chromosome. With reference-anchored samples it
  is the per-path walk above.

**Numbers in the document against the plan and disk:**

- "11.5 GB graph": the GRCh38 `gbz.db` is 10,050,412,544 bytes; 11.5 GB is the
  CHM13-referenced one. The GRCh38 database also indexes CHM13's 97 paths
  (`gbwt_reference_samples` = `GRCh38 CHM13`, measured through the reader), so
  a CHM13 window works on the same pair today.
- "The multiway PIF built from the same graph is 128 MB": it holds eight
  haplotypes (`README_gfa.txt`: HG01109#1 ... HG00133#1, 4,609 rows). That is
  16 MB per haplotype; the same file for 464 haplotypes is ~7.4 GB and for
  4,000 is ~64 GB, the same linear scaling the document holds against the
  companion. The table's "hosted" row compares 464 haplotypes on one side with
  8 on the other.
- "Windows sit at 5 to 13 s": matches the 2.3.0 table (7.5, 5.0, 8.1, 8.5,
  12.7, 12.8 s).
- "the chain walking in `subgraph.ts`, which is most of the reader's source":
  `identifyPaths` is ~235 of `subgraph.ts`'s 1,794 lines (3,503 in `src/`).

## 2. Is the walk store the right design?

### The graph level: the sv graph has no walks

Measured: `hprc-v2.1-mc-grch38.sv.gfa.gz` is 759,223 S lines and 1,107,199 L
lines and nothing else (34 s pass). 3.40 Gbp of segment sequence, every
segment carries `SN`, 305,458 are rank 0. No W, no P. The document's "841 MB
with sequences and every W line" is false, and with it the "which graph level"
section, the "one streaming pass over a GFA with W lines" build, and the
"under the 841 MB GFA" target.

The only published GFA with walks is the base-level one, 63,643,486,000 bytes
gzipped (`hprc-v2.1-mc-grch38.gfa.gz`, integer node ids, no rGFA tags), which
is what the multiway PIF was built from. Its node ids (1..139,520,381) and the
sv graph's (`s1..s759223`) are different id spaces; the `.gbz.db`'s samples
are `CHM13`, `GRCh38` and 231 `HG`/`NA` donors (measured: 53,150 paths, 233
samples, 464 haplotypes), so no `_MINIGRAPH_` paths exist in the clipped graph
to project through.

Two published files do state each haplotype's route through the sv graph, and
the document should have found them: `hprc-v2.1-mc-grch38.paf` (18.5 GB, the
cactus-graphmap alignment of every contig to the sv segment sequences in
`sv.gfa.fa.gz`, with a `.paf.filter.log`) and `chrom-graphmap/chr*.gaf.gz`
(14.9 GB over 27 files; the GAF path column is literally `>s1>s2<s3`). Those
are alignments, not walks: fragmented, filtered, mapq-bearing, and what cactus
was seeded with rather than what it produced. Projecting the base-level W lines
onto sv segments would need a base-node to sv-segment map that nothing
published provides.

What an sv-level store would lose: everything under the SV threshold. The
lanes would be SV-only CIGARs, so "makes the PIF optional" is false at this
level, and sequence identity is unavailable. Copy count at AMY1 at the sv level
is allele-branch identity, not visit count: minigraph represents extra repeat
copies as inserted alleles credited to a first contributor, so a haplotype's
copy number is length arithmetic over the branch it takes (the tutorial's own
"length is the proxy for copy number here"). Nothing in the document, the plan
or the tutorial has yet demonstrated a per-haplotype copy count from walks at
either level; the tutorial says the extra AMY1 records "are where a copy count
per haplotype would be read off". "AMY1 copy counts, one query" is a target
without a defined measurement.

### Size, measured at base level

Sample on ada: the first 40 W lines of the base-level GFA (chr1 block): 31
haplotype pieces of chr1 from HG00097#1, HG00097#2, HG00099#1, HG00099#2, plus
CHM13's chr1, against GRCh38's chr1 walk (6,366,942 steps).

| measured on 32 walks, 910 Mbp | value |
| --- | --- |
| steps | 25,927,110 |
| bp per step | 35.1 |
| steps on GRCh38 chr1 nodes | 92.6% |
| steps that are +1 in the same orientation | 52.4% |
| raw walk text | 213.3 MB; gzip -6 59.2 MB = 2.28 B/step |
| delta-encoded steps | 52.3 MB; bgzip 4.20 MB = 0.162 B/step; gzip -6 3.95 MB; zstd -19 2.99 MB = 0.115 B/step |
| run-length of +1 runs on top of delta | 4.21 MB, no gain over delta under gzip |

So delta encoding is a real win, 14x over the GFA's own text under the same
compressor, and the document's "most steps are +1" is half true: at every
bubble the reference-following haplotype steps +2 past the alt node.

Whole genome: the companion build log says 158,703,664 samples at 16,384 bp in
both orientations, so total haplotype path length is ~1.3 Tbp; at 35.1 bp per
step that is ~37 G steps. (The full pass over the 63 GB file is running on ada
as this is written; see section 4 for the exact count if it landed.)

| product, base level, 464 haplotypes | estimate |
| --- | --- |
| steps column, all haplotypes | 37 G x 0.162 B = 6.0 GB bgzip (4.3 GB zstd) |
| row overhead at 10 kb tiles | ~130M rows x ~14 B compressed = ~1.8 GB |
| row overhead at 100 kb tiles | ~0.2 GB |
| all-haplotype file | 6.2 to 8 GB |
| per-haplotype files | the same again |
| haplotype-coordinate sort | the same again |
| three products | 18 to 24 GB hosted |
| at 4,000 haplotypes | x8.6, 50 to 70 GB per product |

Against: the GBZ is 5.49 GB and holds every walk; `gbz.db` + companion is
17 GB. The document's "under 841 MB" is out by 7 to 10x for one product, and
the design it proposes scales exactly as linearly as the companion it wants to
retire. The GBWT's run-length sharing across haplotypes is the one thing that
grows sublinearly with haplotype count; no per-haplotype representation can
have it, and the document's "Many samples: thousands in the releases after this
one" cuts against its own proposal harder than against the GBZ.

An sv-level store (from the GAF, if its alignment caveats are accepted) would
be small: ~350k steps per haplotype x 464 = ~160M steps = ~30 MB of steps plus
row overhead, a few hundred MB at 100 kb tiles. That is the only version of
this proposal that meets its size target, and it is the version that cannot
replace the PIF.

### What the store does not carry, and what still has to be hosted

A walk store is W lines. The graph view's cut needs S (lengths, sequences) and
L too, and the lanes need node lengths for every step. At sv level the rGFA
segs/links tabix supplies both. At base level nothing published does: the
base-level nodes are not in any tabix, and their coordinates exist only through
the walks. So a base-level store needs either the `gbz.db` Nodes table kept
hosted (a rowid range fetch per window, which is `prefetchReferenceWalk`
today) or a new 139.5M-row node table, or per-step lengths inline for the 7.4%
private steps plus a reference-walk row per tile. The document says "with node
lengths" as if they came free. It also says "Retire the hosted 7 GB companion"
while the graph view keeps reading the 10 GB database; the store retires the
companion and the chain walk, not the graph.

Edges: derivable from consecutive steps for the chosen set, and for the window's
full edge set only from the all-haplotype file.

### Tile semantics

- Rows cut only at reference nodes means a walk that leaves the reference for
  3 Mb (a large inversion, a centromere-spanning contig, MHC class II's snarl
  "far larger than the window") is one row of ~90k steps whose reference
  interval is its two anchoring nodes. A window inside that interval gets the
  row by overlap, which is correct, and the row is ~15 KB compressed. Fine,
  but the row is not "bounded by the tile", so the document's per-query cost
  reasoning does not hold inside such spans.
- "At or past a tile boundary" has no direction for a walk visiting reference
  nodes in decreasing order (inverted stretch) or non-monotonically (a
  duplication revisiting the same reference stretch, which is exactly AMY1: the
  tutorial says the extra copies revisit GRCh38). The document admits the
  inversion case is open. The revisit case is the one that matters for its
  flagship, and it means one row per haplotype per tile is not one lane record:
  the lane still needs monotone chaining at query time, the same `joinSiblings`
  / `gfa_to_pairwise_paf.py` chain logic, so "the PIF becomes optional" is
  carrying that code into the adapter.
- A haplotype that shares no reference node in a stretch (twelve AMY1
  haplotypes at context 0, per the plan) lands in a row anchored on whatever
  reference nodes it last and next touched, possibly megabases apart; correct
  by overlap, but the row's `start`/`end` say nothing about where the haplotype
  actually is. Contigs with no reference node at all are only in the
  haplotype-coordinate index.
- Reference N gaps and clipped telomeres: no rows; fine.
- A haplotype visiting a window twice: two rows; fine.

### Per-haplotype tabix at 3 Gb

Measured on a synthetic per-haplotype file with GRCh38's chromosome lengths
(303,114 rows at 10 kb tiles, ~256 steps per row, 79M synthetic steps):

| tile | `.tbi` | data |
| --- | --- | --- |
| 10 kb | 496,910 bytes | 16.9 MB (synthetic steps, 90% +1, so optimistic) |
| 100 kb | 91,638 bytes | 12.4 MB |

The document's "about 1.5 MB per haplotype" is the uncompressed linear index;
the `.tbi` is bgzipped and a third of that. `@gmod/tabix` reads the whole index
(`indexFile.js` `readIndexBytes` → `filehandle.readFile`), so a selection of
eight is eight 0.1 to 0.5 MB index downloads plus eight range reads: 1 to 4 MB
on first open, then cached. A selection of 464 through per-haplotype files is
464 index downloads (45 to 230 MB) and 464 reads, which is why the all-haplotype
file exists; the document says so. The failure mode nobody will enjoy: a user
ticks 60 lanes in the picker and the adapter has to decide, per selection,
which of the two products is cheaper. That is a policy the adapter has to carry.

A single all-haplotype file keyed on `haplotype|chrom` as the tabix sequence
name would fold the 464 files into one, but its `.tbi` would be 464 x 0.5 MB,
and the reader loads it whole, so per-haplotype files are the right shape given
that reader. The document's "no new binary format" is honest; a lazily loaded
two-level index is what a purpose-built format would add, and it would be the
only thing it added.

### The all-haplotype row filter at 4,000 haplotypes

KIV-2 (130 kb), 464 haplotypes, base level: ~1.7M steps x 0.162 B = ~280 KB of
steps plus ~84 KB of row overhead at 10 kb tiles, ~10 MB of text to parse.
Well under a second. At 4,000 haplotypes: ~3.4 MB compressed, ~85 MB of text,
1 to 2 s of parsing in a worker. Acceptable, and better than the GBZ's
`extractPaths` at the same scale (2.8 s at 464 at MHC, linear). This is the
one place the document's cost argument is right: with identity precomputed,
"everyone in the window" is a parse, not a walk.

### Lane CIGARs from walks versus the oracle

Two things the document runs together. The reader's `align()`
(`src/subgraph.ts` ~1380-1400, `appendGap`) scores a diverging stretch with
vg's parameters: with `gapPenalty(n) = n + 5`, the mismatch-plus-indel choice
wins only when `min(pathBp, refBp) <= 2`, or `<= 5` when the two stretches are
equal in length. A 50 bp against 50 bp divergent stretch is `50I50D`; `gfa_to_pairwise_paf.py` writes it as `50X` (and
`min(q,r)X` then `I`/`D` in general, `--no-x` for plain `I` then `D`). So the
two routes emit different CIGARs for the same pair of walks by design, the
PIF's identity is `=/(=+X)` and the reader has no identity field, and the plan
says outright "nothing measures the two against each other yet" (Phase 7). A
walk store can derive either from walks plus node lengths, but "puts the graph
view and the lanes on one source" does not make them agree with the PIF or with
upstream gbz-base; the store would need to pick one scoring rule and state it,
and the "refine `M` into `=` and `X`" sentence needs the sequences of the
private nodes, which brings back the node table question above.

## 3. What is missing or wrong

### Alternatives the document should have weighed and rejected with reasons

- **Phase 4 reference-anchored samples plus a per-path walk** (section 1).
  Selection-priced, sublinear hosting, CHM13 for free, no per-haplotype files.
  The document mentions Phase 4 only as a thing to retire.
- **The deconstructed VCFs as the existing sample-addressable walk store.**
  `pgbi.vcf.gz` (3.5 GB), `wave.vcf.gz` (2.3 GB), `raw.vcf.gz` (24 GB): one
  row per snarl, a genotype column per sample, and on the ones that keep
  `INFO/AT`, the allele traversal as base-level node ids
  (`PANGENOME_GRAPHS.md:663`). That is per-bubble carriage and, with `AT`, the
  walk of each allele, coordinate-indexed, tabix-read, row-filtered by sample
  column: the document's "carriage per tile" and "who differs here" already
  exist there, which is what Phase 5 parked the picker on. Its limits (nested
  snarls flattened by `LV`, symbolic alleles at big SVs, 232 sample columns to
  scan) are the argument to make for a separate store, and the document makes
  none.
- **The graphmap GAF/PAF** as the sv-level walk source (section 2).
- **A PIF per haplotype.** The lanes are already precomputed for eight at
  16 MB each; `make-pif` per haplotype is the per-haplotype product for the lane
  display, today, with the display and picker unchanged. It does nothing for
  the graph view, which is the honest scope of the walk store's advantage.
- **Precomputed cuts for the six tutorial loci.** Phase 7 needs three figures.
  `gbz-base-query --format gfa --alignments` at each locus, written once to
  static files and read by a trivial adapter, gives every figure at zero runtime
  cost and is reproducible from the hosted pair. It does not generalise to
  arbitrary windows, and it does not need to for the tutorial.

### Targets that are unrealistic as stated

- "all-haplotype store, sv graph: under the 841 MB GFA": no sv walks exist;
  base level is 6 to 8 GB per product.
- "build, sv graph, lab machine: minutes": the base-level GFA streams in
  1,191 s on ada for the PIF (318 MB/s, 1.49 GB RSS holding the reference
  index). Cutting 130M rows, sorting them twice (reference and haplotype
  order), and writing 465 bgzip+tabix pairs is an hour or two, not minutes. The
  E. coli case is minutes.
- "AMY1 copy counts, 490 haplotype contigs: one query": one tabix query
  returns the rows; the copy count is undefined (section 2).
- "KIV-2, eight haplotypes, under 1 s": plausible after the eight indexes are
  cached; first open is 1 to 4 MB of index plus the rGFA or node fetch.

### What would surprise the maintainer six months in

- **Every graph release is a full rebuild and re-upload**: 20 to 30 min of
  streaming plus sorting, then 18 to 24 GB to S3 across ~1,900 objects, with
  CloudFront invalidations. The companion is 1.5 h of build and one 7 GB
  object. Neither is cheap; the store is more objects to get wrong.
- **CHM13 is a second cut of everything** (rows are cut at reference nodes, so
  a CHM13-anchored store is a separate reference-sorted product, 6 to 8 GB
  more per copy), whereas the GRCh38 `gbz.db` already indexes CHM13's paths and
  answers CHM13 windows with the same companion. The document lists "Phase 9's
  CHM13 companion" as a saving; it is the reverse.
- **Graphs without rGFA tags** (pggb, odgi, base-level MC): the store works
  (it only needs a reference path), but the graph view needs a segs/links
  source, which is `build_pggb_tabix.sh` per graph, and pggb node ids follow
  `odgi sort`, not the reference, so delta encoding degrades (measure before
  promising). pggb writes P lines, not W; the script handles both, the document
  says "any GFA with W lines".
- **Hosting many files**: 465 data + 465 index + the haplotype-sorted pair per
  reference, a URL template or manifest in the adapter config, and a picker
  that has to know which product to read for a given selection size. At 4,000
  haplotypes that is ~16,000 objects per reference.
- **The `gbz.db` does not go away** for the graph view at base level, so the
  hosted set becomes graph + store rather than graph + companion, and the
  "point JBrowse at a published gbz.db" story is lost for a design that still
  needs the gbz.db.
- **"Every haplotype in a window" at 4,000 haplotypes** is an 85 MB parse per
  window in the all-haplotype file. It works; it is not "a few seconds" on a
  laptop with a busy main thread unless it stays in the worker.

## 4. Measurements

| what | result |
| --- | --- |
| `sv.gfa.gz` line types | S 759,223; L 1,107,199; W 0; P 0 (34 s pass, gawk) |
| `sv.gfa.gz` segment sequence | 3,404,568,523 bp; 759,223 with `SN`; 305,458 rank 0 |
| rGFA tabix on disk (`~/src/hprc-gbz/v2.1/`) | segs 6.69 MB + 4.43 MB tbi; links 34.1 MB + 4.77 MB tbi; ref.segs 2.54 MB + 213 KB; ref.links 12.2 MB + 260 KB; bubbles 61.5 MB + 661 KB; alleles 5.2 MB + 595 KB; tier10000 pairs 327 KB + 73 KB |
| published `gbz.db` through the reader | 53,150 paths, 233 samples, 464 haplotypes, 292 indexed paths (GRCh38 195 + CHM13 97), 139,520,381 nodes; contigs per haplotype min/median/p90/max 22/38/48/195; path fragments per haplotype 90/113/128/195 |
| companion build log | 158,703,664 samples, 53,150 paths, 16,384 bp interval, ~1.3 Tbp of path |
| base-level sample on ada (32 walks, chr1) | 25,927,110 steps over 909,881,321 bp; 35.1 bp/step; 92.6% on GRCh38 nodes; 52.4% +1 deltas; delta text bgzip 0.162 B/step, zstd -19 0.115 B/step; raw walk gzip 2.28 B/step |
| base-level GFA whole-file W stats | full pass running on ada at review time (`~/walks_review/full.txt`); estimate from the sample: ~37 G steps, ~53,150 W lines |
| synthetic per-haplotype tile file, GRCh38 lengths | 10 kb tiles: 303,114 rows, `.tbi` 496,910 B; 100 kb tiles: `.tbi` 91,638 B |
| `@gmod/tabix` 3.5.5 index loading | whole file (`indexFile.js` `readIndexBytes`) |
| published v2.1 bucket, relevant sizes | `gfa.gz` 63.6 GB; `full.gfa.gz` 71.4 GB; `gbz` 5.49 GB; `full.gbz` 34.2 GB; `gbz.db` 10.05 GB; `paf` 18.5 GB (+ `paf.unfiltered.gz` 5.5 GB); `gaf.gz` 15.3 GB; `chrom-graphmap/*.gaf.gz` 14.9 GB; `sv.gfa.fa.gz` 0.8 GB; `pgbi.vcf.gz` 3.5 GB; `wave.vcf.gz` 2.3 GB; `raw.vcf.gz` 24.2 GB; `hapl` 21.4 GB |
| multiway PIF | 128,126,873 bytes for 8 haplotypes, 4,609 rows; 16 MB/haplotype |
| store size, base level, 464 haplotypes | 6.2 to 8 GB per product (steps 6.0 GB bgzip + rows), three products 18 to 24 GB |
| store size, sv level from GAF | a few hundred MB at 100 kb tiles |

## 5. Verdict, with the changes that would make the document adoptable

**Reject the document's plan; keep its lever.** Specifically:

- Strike the sv-graph premise. State the graph level honestly: base level from
  `hprc-v2.1-mc-grch38.gfa.gz`, with the measured sizes, or sv level from the
  graphmap GAF with the alignment caveats and the loss of everything under the
  SV threshold. Those are two different products with different value; the
  document currently claims the size of one and the capability of the other.
- Replace the comparison table. Per haplotype, per product, at 464 and 4,000:
  GBZ 5.5 GB (sublinear), `gbz.db` 10 GB, companion 7 GB (16 kb per-path) or
  <1 GB (reference-anchored at 128 kb), PIF 16 MB/haplotype, walk store 13 to
  17 MB/haplotype per product. The document's table is the one thing a reader
  will remember, and it is wrong in every cell but the middle two.
- Cost Phase 4 plus a per-path walk before anything else. It is the cheapest
  experiment available (the Rust tool already writes samples keyed by node; add
  rows at reference nodes; add a reader query that walks named path handles
  from an anchor; measure KIV-2 for eight and for 464). If it lands under a
  second for eight and stays where it is for 464, the walk store's only
  remaining argument is the all-haplotype parse versus `extractPaths`, which is
  a 3 s difference at 464 and a real one at 4,000.
- Define the copy-count measurement before making AMY1 a target, at whichever
  level, and show it on one haplotype by hand.
- Decide what the graph view draws. If it stays on the rGFA (sv) segments, the
  walks it can draw are sv-level and the store is small and SV-only. If it
  draws base-level nodes, it needs a base-level node source and the `gbz.db`
  stays hosted. The document assumes the rGFA view and base-level walks at
  once.
- For the tutorial, precompute the six windows now. Phase 7 is blocked on a
  sample filter for two figures; a static cut per locus unblocks it this week
  and is the honest reproduction story for a figure anyway.

Is the document overselling? Yes. "Everything the graph route promises derives
from it", "makes the PIF optional", "under the 841 MB GFA", "build in minutes",
"retire the 7 GB companion" and the hosted-size table are each wrong or
unsupported as written, and the one measured fact it leans on, the 128 MB PIF,
is an 8-haplotype file presented as the alternative to a 464-haplotype route.
The underlying instinct, that the GBWT's anonymity is the wrong thing to fight
at query time and identity should be precomputed, is right, and the plan's
Phase 4 is where that instinct already lives.
