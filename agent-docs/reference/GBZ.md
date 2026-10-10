---
name: gbz
description: The GBZ route: decisions, hosted files, how the reader identifies walks, and measurements. Read before touching GbzBaseSyntenyAdapter or the gbz-base reader.
---

# The GBZ route: decisions, measurements, open work

Replaces `GBZ_PLAN.md`, `GBZ_HANDOFF.md` and `HAPLOTYPE_WALKS_VISION.md`
(2026-09-05 to 09-07); git history has them whole. Repos: `~/src/gbz-base-js`
(`@gmod/gbz-base`), this plugin (`GbzBaseSyntenyAdapter`, the graph view),
`~/src/jbrowse-components` (tutorial, `MultiWaySyntenyDisplay`, specs, demo
configs).

## Decisions

- **The browser reader is TypeScript.** wasm32 gbz-base needs patches that cast
  64-bit header fields to a 32-bit `usize`; wasm64 gbwt-rs loads the whole graph
  and cannot carry SQLite.
- **Lane selection lives in the display and session**, not adapter config: no
  `samples` slot. A walk has to be identified before anyone knows whose it is,
  so an allowlist saves no query time, and a local filter redraws without a
  refetch.
- **Precompute identity; keep the GBWT as the walk container.** Any
  per-haplotype walk store is linear in haplotypes: delta-encoded steps are
  0.162 B/step over the base-level graph's 38.4 G steps, 6-8 GB per product at
  464 haplotypes and 50-70 GB at 4,000. The GBWT grows sublinearly because
  haplotypes share runs. `sv.gfa.gz` has no walks (S and L lines only), so an
  sv-level store would have to come from the graphmap GAF and lose everything
  under the SV threshold. The 10 GB `gbz.db` stays hosted under any design,
  because the graph view needs node lengths, sequences and edges.
- **`context` stays, default 1000.** At context 0 every private bubble splits a
  walk (chr20 100 kb: 9,083 records against 102), and MHC class II sits inside a
  snarl larger than the window: 1.1M pieces, 41 s against 13 s at 1000, for the
  same 463 records. Since gbz-base 2.3.0 joins pieces, the record count no
  longer depends on context; context trades nodes read against pieces joined.
- **No plugin version pins** in configs or screenshot fixtures;
  `check-live-configs.ts` refuses one.
- **Not to do:** a denser per-path companion as a cost fix (scales the hosted
  file linearly); anything on the release 1.1 chr20 database; a hosted multi-way
  GBZ track without a fixed `lanes` set.

## Hosted files

- Graph: HPRC publishes
  `s3-us-west-2.amazonaws.com/human-pangenomics/pangenomes/freeze/release2/minigraph-cactus/v2.1/hprc-v2.1-mc-grch38/hprc-v2.1-mc-grch38.gbz.db`
  (10.05 GB, 139.5M nodes, 464 haplotypes, reference samples GRCh38 and CHM13).
  It needs no rehosting.
- Companion: `jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38.haplotype-index.f3.db`
  (5.1 GB, format 3 from `gbz-haplotype-index` 0.3.0: per-path samples every
  16,384, anchors every 131,072 on the 292 GRCh38 and CHM13 paths, stray rows,
  and a 467 MB overview, which plugin 6 no longer draws). Plugin 5.0 and later
  and gbz-base 7 read format 3 only. The format 2 `anchored.db` and the
  un-anchored `haplotype-index.db` were deleted from S3 on 2026-10-04.
- `demos/ivg/hprc/hprc-chr20.gbz.db` (release 1.1) is still hosted; nothing we
  serve points at it.

## How the reader identifies walks

- **Keep route** (reader after 4.1.0, taken when `keep` is set and the index has
  the bin node lists and stray rows that `gbz-haplotype-index` 0.2.0 writes):
  read the rows at the anchors around the window and walk each chosen haplotype
  from one anchor to the next and along its stray rows, checked at query time so
  that any walk it cannot show complete sends the whole window to the sampled
  route. `gbz-base-js/docs/haplotype-index.md` has the account. The hosted
  `anchored.db` predates both tables, so on it every keep query identifies every
  walk. The route that placed haplotypes from anchor rows and samples alone
  (reader 2.6.0 to 4.1.0) is gone: it dropped pieces.
- **Sampled route** (every haplotype, or no anchors): one companion index scan
  per run of consecutive handles (gap over 4,096). A single scan from the
  smallest handle to the largest crossed two node-id gaps at AMY1 and read 7.9M
  rows, 340 MB, 49 s; that, not scattered seeks, was AMY1's cost until
  `fd91599`. Fragments without a sample chain forward with `lf()`; the bound is
  `4 * interval + 4 * nodeLen` past the last chained fragment and never tripped.
- **Twins:** `extractPaths` keeps one orientation of each walk, so where a
  fragment boundary sits on an inverted node a walk can land on a discarded twin
  and cross its sibling's nodes as private. 8,484 of AMY1's 78,506 steps; zero
  elsewhere.

## Measured

**Snarl mode** decides how many walks a haplotype becomes (v2.1, context 0, all
haplotypes). `configSchema.ts`'s `subgraphSnarls` doc cites this:

| window             | mode        | nodes  | walks   | time   |
| ------------------ | ----------- | ------ | ------- | ------ |
| C4 60 kb           | contained   | 2,703  | 8,083   | 3.2 s  |
| C4 60 kb           | overlapping | 4,184  | 464     | 2.4 s  |
| LPA KIV-2 40 kb    | contained   | 3,492  | 18,130  | 4.2 s  |
| LPA KIV-2 40 kb    | overlapping | 24,547 | 465     | 20.6 s |
| MHC class II 60 kb | contained   | 12,277 | 994,914 | 11 s   |

**Window size**, chr20, 90 haplotypes, local, context 1000: 100 kb 0.5 s, 300 kb
1.6 s, 500 kb 4.1 s, 1 Mb 17 s with the record count flat. Time grows faster
than nodes, from per-path edit computation over a longer reference; the demo's
`nodeLimit: 12000` (about 500 kb) fails a zoom-out fast.

**Anchored against sampled**, both files hosted, context 1000, contained snarls:

| window       | set   | nodes  | after open | cached |
| ------------ | ----- | ------ | ---------- | ------ |
| KIV-2 30 kb  | eight | 3,140  | 3.08 s     | 0.38 s |
| KIV-2 30 kb  | all   | 21,721 | 3.75 s     | 2.17 s |
| AMY1         | eight | 8,164  | 6.11 s     | 0.48 s |
| AMY1         | all   | 12,240 | 8.43 s     | 3.00 s |
| MHC class II | eight | 31,008 | 5.46 s     | 0.97 s |
| MHC class II | all   | 43,540 | 9.59 s     | 9.16 s |

After open the time is 9-28 graph and 9-15 companion round trips, not work. Per
window at MHC class II with everything local: Paths scan 2.7 s (no name index on
`Paths`), reference walk 1.4 s, `extractPaths` 2.8 s, alignments 3.2 s.

`context` 20000 or `overlapping` snarls at AMY1 exhaust a 4 GB heap after about
a minute.

## The ruzstd shim

`cmdcolin/gbwt-rs` branch `wasm-ruzstd` (`~/src/gbwt-rs`) builds gbwt-rs for
wasm64 by swapping `zstd-sys` for `ruzstd` on wasm targets: a 258 KB cdylib that
loads a small GBZ in Node in about 5 ms. Useful only for in-memory graphs
(bacterial, `vg chunk`, local tooling); gbz-base's SQLite has no wasm64 libc
either. No PR, because ruzstd's encoder failed the crate's round-trip tests
natively; if proposed, make the backend a cargo feature and have `compress`
return `ErrorKind::Unsupported` on it.
