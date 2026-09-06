# Handoff: the GBZ reader route, and what it still owes

Decided 2026-09-05: JBrowse reads pangenome graphs from gbz-base's `.gbz.db`
through the pure-TypeScript package `@gmod/gbz-base`
(github.com/GMOD/gbz-base-js, checkout `~/src/gbz-base-js`, on npm), and
`GbzBaseSyntenyAdapter` in this repo (`src/GbzBaseSyntenyAdapter/`, helpers in
`src/synteny/`) feeds `MultiWaySyntenyDisplay` from it. The adapter landed in
jbrowse-components core as `18597ad0c4` and moved here the same evening, before
any release carried it; core keeps only the display it feeds, whose design
record is `agent-docs/ideas/multiway-synteny-lgv-track.md` there.

The WASM routes were measured and rejected: wasm32 gbz-base needs patches that
cast 64-bit header fields to a 32-bit `usize`, and wasm64 gbwt-rs loads the
whole graph and cannot carry SQLite. That is why the browser reader is
TypeScript.

## What the adapter does

It opens the database through `openLocation` (range requests), locates the
anchor window on the reference sample's indexed path (`referenceSample`, or the
anchor's `assemblyNameToPanSN` prefix, or the database's one
`gbwt_reference_samples` entry), runs `subgraphInInterval` and
`identifyPaths`, and emits one `SyntenyFeature` per haplotype fragment: anchor
coordinates from `refStart`/`refEnd`, the fragment's CIGAR, the mate at
`hapStart`/`hapEnd` on the haplotype's own contig, and the lane labelled
`sample#haplotype` unless a listed assembly maps to it. Ids are the walk's GBWT
position at its first node in the window, so a refetch of one window re-keys
nothing. A window on a haplotype lane answers nothing, so the display composes
lane links through the anchor. `getHeader` says `hasCoarseTier: false`, and
`nodeLimit` fails a window that would read a whole chromosome.

`getSubgraph(region)` returns GFA (reference walk first, contained snarls,
PanSN W lines) and the adapter type declares `adapterCapabilities:
['getSubgraph']`, so the graph view's launch menu offers a
`GbzBaseSyntenyAdapter` track and one opened `.gbz.db` serves both the graph
view and the lanes. Slots `haplotypeIndexLocation` and `subgraphSnarls` go with
it.

`scripts/gfa_to_pairwise_paf.py` in jbrowse-components is the offline version of
the same walk, and its jest cases plus the E. coli and HPRC agreement numbers in
that repo's `reference/PANGENOME_GRAPHS.md` are the oracle to check against.

## The databases

**HPRC publishes a gbz-base database of the v2.1 GRCh38 graph:**
`https://s3-us-west-2.amazonaws.com/human-pangenomics/pangenomes/freeze/release2/minigraph-cactus/v2.1/hprc-v2.1-mc-grch38/hprc-v2.1-mc-grch38.gbz.db`
(10,050,412,544 bytes, `Accept-Ranges: bytes`, schema "GBZ-base version 4",
139.5M nodes, 53,150 paths, 233 samples, 464 haplotypes, reference samples
`GRCh38 CHM13`, no pggname tag). A 500 bp chr6 window with contained snarls is
31 nodes in 12 range requests, ~1.3 s after the one-time 2.9 MB Paths scan. So
the graph itself needs no hosting; only the haplotype names do, which is what
the companion index is for. Note it is **v2.1**, while the tutorial's rGFA
tracks are the top-level **v2.0** `sv.gfa` projections; segment ids differ,
coordinates are both GRCh38.

`https://jbrowse.org/demos/ivg/hprc/hprc-chr20.gbz.db` is HPRC release 1.1
(46 samples, 232 MB) and now carries `HaplotypeSamples` (2,602,582 rows,
interval 4096, both orientations) and `HaplotypeLengths` (919). Verified before
upload: 10 kb windows at 20, 40 and 50 Mb name every fragment across 89 to 90
haplotypes in about 0.2 s from disk, and 25 sampled identifications at 30 Mb
agree with an independent backward GBWT walk (`scripts/verify-chr20.ts` in the
package). It covers none of the tutorial's loci.

`demos/hprc_multiway/config.json` in jbrowse-components (`74e6d95294`, deployed)
has a second synteny track, `hprc_chr20_gbz`, on that chr20 database, anchored
on hg38 alone: the graph's haplotype contigs are release 1 GenBank accessions
(`HG01109#1#JAHEPA010000088.1`), not the release 2 assemblies the PIF track's
lanes are loaded as, so its 89 lanes are labelled by PanSN prefix. It loads this
plugin by `esmUrl`.

## Measured, so nobody re-measures it

**Snarl mode decides how many walks a haplotype becomes** (HPRC v2.1 remote,
context 0, `haplotypes: 'all'`):

| window | mode | nodes | fragments | distinct | time |
| --- | --- | --- | --- | --- | --- |
| C4 chr6:31.95-32.01 Mb (60 kb) | contained | 2,703 | 8,083 | 741 | 3.2 s |
| same | overlapping | 4,184 | 464 | 375 | 2.4 s |
| same | contained, context 100 | 4,186 | 464 | 374 | 2.0 s |
| C4 10 kb (31.98-31.99) | contained | 321 | 2,712 | 213 | 0.3 s |
| same | overlapping | 1,120 | 464 | 191 | 0.4 s |
| LPA KIV-2 chr6:160.58-160.62 Mb | contained | 3,492 | 18,130 | 749 | 4.2 s |
| same | overlapping | 24,547 | 465 | 474 | 20.6 s |
| AMY1 bubble chr1:103.61-103.73 Mb | overlapping | 15,411 | 490 | 482 | 17.7 s |
| MHC class II chr6:32.50-32.56 Mb | contained | 12,277 | 994,914 | 8,372 | 11 s |

464 fragments is one walk per haplotype: `overlapping` (or a bp context) is what
makes a haplotype one W line, at the price of every node in the snarl (the
KIV-2 repeat is 24k nodes). `contained` keeps the window small and breaks each
haplotype into fragments wherever it leaves the window's nodes; carriage per
node (`carriedBy`) is still right, but **Sample rows** continuity and the W
count suffer. MHC class II at 60 kb sits inside a snarl far larger than the
window. Time here is CPU in `extractPaths`, not fetches; typed arrays there are
the next optimisation if it matters.

**A window on HPRC chr20, 90 haplotypes, local file:**

| window | context | nodes  | records | time   |
| ------ | ------- | ------ | ------- | ------ |
| 100 kb | 0       | 1,374  | 9,083   | 0.6 s  |
| 100 kb | 100     | 2,093  | 102     | 0.4 s  |
| 100 kb | 1000    | 2,160  | 102     | 0.5 s  |
| 300 kb | 1000    | 5,808  | 102     | 1.6 s  |
| 500 kb | 1000    | 10,613 | 106     | 4.1 s  |
| 1 Mb   | 0       | 14,675 | 87,291  | 39 s   |
| 1 Mb   | 100     | 22,861 | 381     | 17 s   |
| 1 Mb   | 1000    | 22,973 | 116     | 17 s   |

Over HTTP the 100 kb window is 16 range requests, 1 MB, 2.6 s. Two things
follow. `context: 0` is the wrong default for a human graph: every private
bubble splits a walk, so a 100 kb window is 9,000 records where 100 would do,
and the adapter's slot default is still 0. And time grows faster than linearly
in nodes with the record count flat, so it is the per-path edit computation over
a longer reference, not fetching; the demo sets `nodeLimit: 12000` (about
500 kb, 4 s) so a zoom-out fails with the limit's message instead of holding the
display's first-load phase for 17 s. Identification is free once the side tables
exist (0 steps at context 1000).

Also: overlapping mode on chr20:30.0-30.1 Mb added 25,887 nodes; the companion
tool's from-db and GBZ routes write identical tables (checksummed on
micb-kir3dl1); micb at interval 1000 is 176 KB.

## Where an expensive window's time actually goes (2026-09-06)

Measured on the published v2.1 database with the hosted companion index
(`https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38.haplotype-index.db`,
interval 16384, 6.99 GB), context 1000, contained snarls, both files over HTTP:

| locus | window | nodes | records | ident. steps | time |
| --- | --- | --- | --- | --- | --- |
| C4 | chr6:31.98-31.99 Mb (10 kb) | 1,173 | 463 | 3,937 | 5.4 s |
| C4 | chr6:31.95-32.01 Mb (60 kb) | 4,236 | 463 | 0 | 7.1 s |
| CFH | chr1:196.64-196.90 Mb | 16,372 | 465 | 0 | 16.4 s |
| LPA KIV-2 | chr6:160.525-160.655 Mb | 27,438 | 464 | 0 | 20.7 s |
| MHC class II | chr6:32.51-32.60 Mb | 43,540 | 463 | 0 | 31.1 s |
| AMY1 | chr1:103.69-103.78 Mb | 12,240 | 1,912 | 78,506 | 283 s |

Re-measured on 2.1.0 the same six are 5.1, 5.8, 12.3, 15.5, 25.2 and 233.7 s,
with identical node, record and step counts. The companion reads there are 8, 9,
17, 14 and 11 requests under 1.1 MB, against AMY1's 5,202 and 325 MB.

With the companion on local disk the same rows are 4.5, 4.8, 10.8, 14.0, 23.0
and 95.5 s, so the hosted index roughly doubles a normal window and triples
AMY1. Step counts are transport-independent and identical either way.

**The earlier note in this file blamed AMY1 on "the per-path edit computation".
A CPU profile says that is wrong.** `node --cpu-prof` over the 115 s local run,
self time:

| % | frame |
| --- | --- |
| 22.6 | `cellOffset` (sqlite/btree.js) |
| 10.0 | `tableRowid` (btree) |
| 7.4 + 5.8 | `page`, `block` (sqlite/pager) |
| 5.3 | `identifyPaths` |
| 4.8 | `indexScanFrom` (btree) |
| 4.3 | `decodeRecord` |
| 3.4 | `extractPaths` |
| 2.1 | `haplotypeSamplesInRange` |
| **0.9** | `edits`, the alignment |

Over half the run is the pure-TypeScript SQLite B-tree reader re-deriving page
cell offsets, driven by the per-node record lookups that identification makes.
The causal chain is: the amylase repeat fragments each haplotype into ~4 pieces;
a fragment shorter than the 16 kb sampling interval holds no recorded position,
so `identifyPaths` walks node by node (capped at `4 * interval`); each step is a
B-tree lookup. The 10 kb C4 window shows the same effect in miniature, 3,937
steps because the window itself is under the interval.

**The companion reads 340 MB for that one window, and the pager cannot fix it.**
`--stats` in 2.1.0 reports the companion's own pager, and it is where everything
goes: the graph database is 37 fetches and 4.9 MB, the companion 5,202 fetches
and 340,918,272 bytes. Hosted that window is 241.6 s, with the identical
companion counters from local disk at 64.5 s, so the 177 s gap is those fetches
crossing the network. Shrinking the block size does not help, because the byte
volume is what is invariant:

| block size | companion fetches | companion bytes | time, local |
| --- | --- | --- | --- |
| 65536 | 5,202 | 340,918,272 | 64.5 s |
| 16384 | 20,782 | 340,492,288 | 69.5 s |
| 8192 | 41,555 | 340,418,560 | 82.7 s |

**Scatter, not step count, is what costs.** The 10 kb C4 window settles it from
the other side: it is under the sampling interval too and takes 3,937 steps, and
reads the companion in 8 requests, about 490 steps per request. AMY1 gets 15.
Its 1,912 fragments belong to 464 different haplotypes at unrelated positions,
so a block serves almost nothing before the next lookup lands elsewhere, where a
normal window's walks stay in a handful of blocks. That is also why no block
size helps.

So the lever is removing the scattered lookups rather than making them cheaper:
reusing one anchor across the sibling fragments of the same haplotype, which the
`starts`/`chain` path in `identifyPaths` already half does, would take 1,912
walks down toward 464 and is the same 4x a denser companion buys without adding
21 GB to a hosted file.

The earlier reading below stands for the local case, where the same 340 MB has
to be decoded rather than fetched.

So the second lever is a page-level cell-offset cache in the reader (`cellOffset` and
`tableRowid` recompute per lookup what is constant per page), not a denser
index and not an adapter setting. A denser companion would cut the miss rate but
scales the 6.99 GB file linearly, and the config lever fails outright:
`context` 5000, `context` 20000 and `overlapping` snarls each exhaust a 4 GB JS
heap at AMY1 after ~130 s without returning. `nodeLimit` does not catch it
either, since 12,240 nodes is under any limit that lets MHC class II's 43,540
through.

## Still owed

- **A whole-genome haplotype index for HPRC v2.1.**
  `gbz-haplotype-index --interval 16384 --output
  hprc-v2.1-mc-grch38.haplotype-index.db hprc-v2.1-mc-grch38.gbz` over the
  5.5 GB GBZ in `~/src/hprc-gbz/` (16 threads, ~4.5 GB RSS, roughly 170M sample
  rows, a few GB of SQLite). When it exists: sanity check against the published
  database with `bin/query.js <url> --haplotype-index <file> --sample GRCh38
  --contig chr6 --interval 31500000..31501000 --context 0 --snarls --alignments
  --stats`, which should print PanSN names rather than `unknown`; time
  `identifyPaths` on the tutorial windows to decide whether 16384 is dense
  enough; hosting to `s3://jbrowse.org/demos/hprc/` is Colin's call.
- **Tutorial figures on `pangenome_hprc.md`**, which currently says reading the
  `.gbz` haplotype walks "is a vg job": the graph cut from the GBZ at LPA KIV-2
  or AMY1 in **Sample rows** as carriage rather than attribution, and the
  haplotype lanes under GRCh38 at the same locus. Specs go in
  `website/scripts/specs/graph-hprc.ts`.
- **Adapter gaps**: `context` defaults to 0, which the tables argue against for
  human graphs; `mateShape: 'grouped'` is not implemented; `nodeLimit` is a hard
  failure with no coarse fallback, and a whole-chromosome view stays on a PIF;
  no `identity` field because gbz-base's `M` is match-or-mismatch; since
  gbz-base 2.0.0 an alignment record is a union on `resolved`, and the adapter
  still drops an unresolved fragment rather than drawing it anonymously.
- **Package gaps**: the 1 Mb cost above is edit computation, not I/O, so the
  lever is the per-path alignment against the reference; small queries are bound
  by sequential request latency, and prefetching the Nodes leaf pages for the
  window's handle range would cut the 16 requests of a 100 kb window.
- **89 lanes is not a lane stack** any more than 464 are; the demo shows the
  graph-native read, and the lane-selection provider the design record parks is
  what makes it usable.

## The ruzstd shim, and why it is not a PR

It sits on `cmdcolin/gbwt-rs` branch `wasm-ruzstd` (checkout `~/src/gbwt-rs`,
based on upstream v0.7.0; 138 + 37 native tests pass, wasm64 builds).

gbwt-rs cannot be built for `wasm32`: its `simple-sds` dependency serializes
`usize` at native width, so every GBZ written on a 64-bit host misparses on a
32-bit target, and the maintainer closed the fix (gbwt-rs PR 14). On `wasm64`
`usize` is 8 bytes and that class of bug is gone; the one thing that still fails
is `zstd-sys`, because there is no libc for wasm64. The shim swaps it for
`ruzstd` on wasm targets only, behind the same `zstd::stream::{Encoder,
Decoder}` names the two call sites use. Native builds keep real zstd.

Measured: with the shim, `cargo +nightly build -Z build-std=std,panic_abort
--target wasm64-unknown-unknown` produces a 258 KB cdylib that loads
`micb-kir3dl1.gbz` (2891 nodes, 169 paths) and a GBZ v3 file in Node 24 in about
5 ms. It matters for the in-memory route only: bacterial graphs, a `vg chunk`,
desktop or MCP-driven local tooling. It does not help gbz-base, whose bundled
SQLite has no wasm64 libc either.

No PR was opened: on the wasm target the shim writes GBZ v3's compressed
sequences through ruzstd's encoder, which failed this crate's round-trip tests
when tried natively, so a wasm build that writes GBZ could emit files the
maintainer would have to answer for. Nothing of ours needs it today. If it is
ever proposed, make the backend a cargo feature and have `compress` return
`ErrorKind::Unsupported` on the pure-Rust backend rather than encode. The patch:

```diff
--- a/Cargo.toml
+++ b/Cargo.toml
 [dependencies]
-simple-sds = { version = "0.4.2" }
-zstd = { version = "0.13" }
+simple-sds = { version = "0.4.2", default-features = false }
 getopts = { version = "0.2", optional = true }

+[target.'cfg(not(target_family = "wasm"))'.dependencies]
+zstd = { version = "0.13" }
+
+[target.'cfg(target_family = "wasm")'.dependencies]
+ruzstd = { version = "0.9" }
--- a/src/lib.rs
+++ b/src/lib.rs
+#[cfg(target_family = "wasm")]
+mod zstd;
--- a/src/bwt.rs  (and identically in src/support.rs)
+++ b/src/bwt.rs
+#[cfg(target_family = "wasm")]
+use crate::zstd::stream::Encoder as ZstdEncoder;
+#[cfg(target_family = "wasm")]
+use crate::zstd::stream::Decoder as ZstdDecoder;
+#[cfg(not(target_family = "wasm"))]
 use zstd::stream::Encoder as ZstdEncoder;
+#[cfg(not(target_family = "wasm"))]
 use zstd::stream::Decoder as ZstdDecoder;
```

`simple-sds`'s default `libc` feature is dropped because it only adds mmap
helpers, which do not exist on wasm and which gbwt-rs's library code does not
call. The new file `src/zstd.rs`:

```rust
pub mod stream {
    use ruzstd::decoding::{FrameDecoder, StreamingDecoder};
    use ruzstd::encoding::{compress_to_vec, CompressionLevel};
    use std::io::{self, Read, Write};

    pub struct Encoder {
        buf: Vec<u8>,
    }

    impl Encoder {
        pub fn new(_target: Vec<u8>, _level: i32) -> io::Result<Self> {
            Ok(Encoder { buf: Vec::new() })
        }
        pub fn finish(self) -> io::Result<Vec<u8>> {
            Ok(compress_to_vec(&self.buf[..], CompressionLevel::Default))
        }
    }

    impl Write for Encoder {
        fn write(&mut self, data: &[u8]) -> io::Result<usize> {
            self.buf.extend_from_slice(data);
            Ok(data.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    pub struct Decoder<'a> {
        inner: StreamingDecoder<&'a [u8], FrameDecoder>,
    }

    impl<'a> Decoder<'a> {
        pub fn new(source: &'a [u8]) -> io::Result<Self> {
            let inner = StreamingDecoder::new(source)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e.to_string()))?;
            Ok(Decoder { inner })
        }
    }

    impl<'a> Read for Decoder<'a> {
        fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
            self.inner.read(buf)
        }
    }
}
```

The shim ignores the compression level, and a reader never encodes.
