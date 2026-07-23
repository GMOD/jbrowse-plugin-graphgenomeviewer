# Handoff: rGFA graph tracks, and what to do next

This is about the shipped rGFA path: what works, what it is verified against,
and the next steps worth taking. The adapters below live in this repo; the
`GraphGenomeView`, its `GetSubgraph` RPC, and the subgraph launchers moved out
to the third-party `jbrowse-plugin-graphgenomeview` (`~/src/jb2plugins`) because
their force-directed layout uses the GPL Bandage/OGDF engine — see that repo's
`docs/` for the layout ADR and the `MultiLGVSyntenyDisplay` restore notes.

## What exists now

A pangenome graph loads into an ordinary linear genome view track, and a local
subgraph view opens from wherever you are in it.

| Piece                                              | Where                                             |
| -------------------------------------------------- | ------------------------------------------------- |
| `RgfaTabixAdapter` (segments + `getSubgraph`)      | `plugins/comparative-adapters/src/RgfaTabixAdapter/` |
| `MinigraphBubbleAdapter` (`gfatools bubble` BED)   | `plugins/comparative-adapters/src/MinigraphBubbleAdapter/` |
| `GetSubgraph` RPC                                  | `jbrowse-plugin-graphgenomeview` (third-party)    |
| Track + context menu launchers                     | `jbrowse-plugin-graphgenomeview` (third-party)    |
| Index builder                                      | `scripts/build_rgfa_tabix.sh`                     |
| Tutorial                                           | `website/docs/tutorials/pangenome_hprc.md`        |
| Demo data                                          | `test_data/rgfa_ecoli/`, `test_data/hprc_minigraph/` |

Discovery is by declared capability (`adapterCapabilities: ['getSubgraph']`),
not by adapter name. The old launcher hardcoded `GfaTabixAdapter` /
`GfaServerAdapter` and went silently dead when those were removed; do not
reintroduce name matching.

## Verified live, not just unit-tested

Two screenshot specs render this in a real browser against real data, which is
how three bugs surfaced that mocked unit tests could not have caught:

- `pangenome/rgfa_subgraph_launch` - E. coli minigraph graph, 53 nodes.
- `pangenome/hprc_mhc_subgraph` - HPRC human pangenome at HLA class II, 108
  nodes / 139 edges on release 2 (v1.0 gave 165 / 216).

Regenerate with `node scripts/generate-screenshots.ts --filter pangenome/` from
`website/`, after `pnpm build` in `products/jbrowse-web` (the generator renders
the built bundle, not source).

Both live paths are now also covered by an ordinary browser test —
`products/jbrowse-web/browser-tests/suites/pangenome-graph.ts`, run with
`node browser-tests/runner.ts --filter=Pangenome` after a `pnpm --filter
@jbrowse/web build`. It uses the committed `test_data/rgfa_ecoli` fixtures, so
it needs no network, and it asserts model state rather than pixels: `GraphStats`
publishes `data-node-count`/`data-edge-count`/`data-path-count`, and both tests
gate on those plus `assertCanvasHasContent` (the layout-collapse bug below left
the stats correct while the drawing shrank to 0.3%).

- The session-spec test covers `LaunchView-GraphGenomeView`. Verified by
  mutation: commenting out `LaunchGraphGenomeViewF(pluginManager)` in the
  `jbrowse-plugin-graphgenomeview` entry and rebuilding makes exactly this test
  fail — the silent break that motivated it.
- The track-menu test drives "Launch view -> Graph genome view (this region)",
  covering capability discovery, `regionFromViewport`, the tabix query and the
  `GetSubgraph` RPC. It does *not* catch a missing extension point, since the
  menu calls `session.addView` directly.

The three bugs, all found by the first capture rather than by the test suite:

- **The subgraph never loaded.** `refetchIfNeeded` was called from
  `startRenderingBackend`, but the canvas only mounts once `hasGraph` is true,
  so a view whose graph must be *fetched* showed the import form forever. This
  also meant reloading a session with a tabix subgraph view had never worked. It
  now runs in `afterAttach`, beside the `gfaLocation` load.
- **The layout collapsed at human scale.** Rows were indexed by raw stable rank.
  HPRC ranks up to 89 while an MHC window holds ranks 0/1/3/6/14/23, so 17 of 24
  rows were empty and zoom-to-fit shrank the drawing to 0.3%. `anchoredLayout`
  now rows by the ranks *present*. This is the identity for a window holding a
  contiguous run from 0, which is why the committed E. coli figures did not
  change.
- **A test adapter without `explicitlyTyped`** silently loses its `type`, so the
  capability lookup found nothing. Caught by the launcher's test harness, which
  drives a real `LinearBasicDisplay`.

## Checked against Bandage itself

The force-directed mode was compared against real Bandage on byte-identical
input, because "does this look like Bandage" is otherwise unfalsifiable:

```bash
cd plugins/comparative-adapters
node scripts/dump-subgraph.ts ../../test_data/rgfa_ecoli/rgfa_ecoli \
  K12 chr 4050000 4100000 ecoli.gfa            # 53 segments, 68 links
QT_QPA_PLATFORM=offscreen Bandage image ecoli.gfa ecoli.png --height 900 --width 1200
```

`dump-subgraph.ts` emits exactly what `getSubgraph` returns (verified: same
53/68 and 165/216 the two figures report). Bandage 0.8.1 is at
`~/.local/bin/Bandage`; BandageNG in `~/src/vendor/BandageNG` is source-only and
needs Qt6, which is not installed — the vendored tree is still worth reading,
since it is where the layout constants below come from.

**The result: Bandage draws these graphs the same way we now do** — a long
sparse arc with small bubbles hanging off it and a lot of whitespace, not the
compact blob people picture when they hear "Bandage". That shape is a property
of a minigraph pangenome window (a few multi-kb backbone segments plus many
sub-kb alleles), not of our renderer. Don't take a future "this doesn't look
like Bandage" report as a rendering bug without re-running this comparison.

Where we deliberately differ, and should stay differing: we color by stable rank
(reference vs each rank of alternate) where Bandage colors nodes randomly, and
we draw thicker tubes, which is what keeps a 349 bp allele visible at all.

The comparison also caught a real bug, which is the argument for keeping it
runnable. The `pangenome/local_subgraph` figure (a **pggb** graph, not rGFA — a
different load path) drew as a chain of same-sized two-node bubbles. That looked
like a GFA-export artifact and was not: the file genuinely holds nine two-allele
bubbles, and 20 of its 31 segments are 1 bp, because pggb decomposes to base
level and each SNP is a 1 bp bubble. The artifact was in the *sizing*. The
whole-GFA load path passed no scale options, so the WASM wrapper's own
1000 units/Mbp applied; in a 400 bp window that puts every node below
`minimumNodeLength`, all 31 clamp to the floor, and a 1 bp SNP allele draws the
same size as the 164 bp backbone segment beside it. Bandage renders the same
file with a 75:1 length ratio and the SNP alleles as specks. Every FMMM layout
now derives its scale with `bandageAutoScale`, which is what Bandage does.

Lesson worth keeping: "the topology is faithful" and "the picture is honest" are
different claims. Node counts matching the file proved the first and said
nothing about the second.

The layout decisions this produced are recorded in ADR-041, which moved with the
view to `jbrowse-plugin-graphgenomeview` (`docs/adr-041-graph-genome-view-two-layout-modes.md`):
two layout modes, node length derived per graph, and the anchored floor.

## The HPRC release 2 data we host

`hprc-v2.0-mc-grch38.sv.gfa.gz` is fully rGFA even though release 2 ships no
`minigraph/` directory (`SR:i:0` on the `GRCh38#0#chrN` backbone, `SR:i:1` on
assembly contigs). It is filed under Minigraph-Cactus, which is why searching
the release for "rGFA" finds nothing. The graph view was never tied to release
1, and release 1 is now retired from the docs entirely.

Its BED projections are small enough to serve, so we host them at
`s3://jbrowse.org/demos/hprc/` (106 MB; public read, `access-control-allow-origin: *`
and range requests verified against the live URLs). That is what retired release
1: HPRC publishes a bubble BED only for release 1, and rehosting made that stop
mattering.

| File                                          | Size            |
| --------------------------------------------- | --------------- |
| `hprc-v2.0-mc-grch38.segs.bed.gz` + `.tbi`    | 6.7 MB + 4.4 MB |
| `hprc-v2.0-mc-grch38.links.bed.gz` + `.tbi`   | 34 MB + 4.8 MB  |
| `hprc-v2.0-mc-grch38.bubbles.bed.gz` + `.tbi` | 60 MB + 0.67 MB |

`RgfaTabixAdapter` takes the prefix
`https://jbrowse.org/demos/hprc/hprc-v2.0-mc-grch38`; `MinigraphBubbleAdapter`
takes the `.bubbles.bed.gz` URL. Both need
`assemblyNameToPanSN: { hg38: 'GRCh38' }`, since these rows are PanSN-named. To
rebuild and re-upload:

```bash
wget .../release2/minigraph-cactus/hprc-v2.0-mc-grch38.sv.gfa.gz
bash scripts/build_rgfa_tabix.sh hprc-v2.0-mc-grch38.sv.gfa.gz
gzip -dc hprc-v2.0-mc-grch38.sv.gfa.gz | gfatools bubble - \
  | sort -k1,1 -k2,2n | bgzip > hprc-v2.0-mc-grch38.bubbles.bed.gz
tabix -p bed hprc-v2.0-mc-grch38.bubbles.bed.gz
aws s3 cp . s3://jbrowse.org/demos/hprc/ --recursive --exclude "*.gfa.gz"
```

Three things about this graph that are easy to get wrong:

- `sv.gfa` is the SV-resolution projection of a base-level Minigraph-Cactus
  graph, not a minigraph graph, so it is coarser per window while having more
  segments genome-wide (751,237 vs v1.0's 391,950).
- Its first segment is **not** untagged, despite an earlier note here claiming
  so. `s1` is the leading telomere gap, so its sequence field is a ~10 kb run of
  `N`, and any truncated view of the line cuts off before the tags. It carries
  `LN:i:10616 SN:Z:GRCh38#0#chr1 SO:i:0 SR:i:0`, and `gfa2bed -m` places it at
  `GRCh38#0#chr1:0-10616` like any other segment. Verified against the published
  file and the hosted index; don't reintroduce the "tolerate untagged S lines"
  requirement from it.
- **gfatools saturates the bubble path count at int32 max**, which 406 of the
  130,510 bubbles hit. It does not overflow negative, so parsing is safe, but
  `2147483647` is a sentinel; `bubbleDescription` renders it as "more paths than
  gfatools counts" rather than printing it.

## On "can users actually produce an rGFA"

This came up as a real design worry, so the numbers are recorded here.

| Effort   | Path                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| none     | We host the release-2 indexes and bubble BED at `https://jbrowse.org/demos/hprc/hprc-v2.0-mc-grch38{,.bubbles}` (106 MB total, public + CORS + range verified). Both adapters read them off that URL with nothing downloaded and nothing built. This is what retired release 1: HPRC publishes a bubble BED only for release 1, and rehosting is what made that stop mattering. |
| one step | `build_rgfa_tabix.sh hprc-v2.0-mc-grch38.sv.gfa.gz`. Measured on the full 464-haplotype release-2 graph: **38 s wall, 3.66 GB peak RSS**, 842 MB in, 46 MB of index out, 751,237 segments. |
| one step | `gfatools bubble` over the same download: **26 s wall, 4.0 GB peak RSS**, 130,510 bubbles, 60 MB out. |
| one step | `minigraph -cxggs ref.fa a.fa b.fa > graph.rgfa` on your own genomes, then the same script.        |
| never    | Converting an existing pggb / Minigraph-Cactus graph. The coordinates were never recorded.         |

The naming is the actual obstacle, not the tooling: HPRC labels the file
"Minigraph graph" and never writes "rGFA", so searching for the format finds
nothing while the file sits in `hpp_pangenome_resources`. `R3_HPRC` has no
graphs at all (verkko assemblies and QC).

## Committed state (2026-07-23)

Everything below the two adapters is in two commits on `main`:
`feat(pangenome): rGFA graph tracks, indexed by tabix` (the whole feature +
`MinigraphBubbleAdapter` + tutorial + figures) and `docs(pangenome): map
GraphGenomeView spec fields to figure-recipe click-paths` (the figure-recipe
dialog now reproduces a graph figure from a reader's own data). Working tree is
clean. Two loose ends from the build were run down and are **not** open work:

- `check-spec-recipes` now gates in `push.yml` against the tracked
  `website/scripts/spec-recipe-unmapped.txt` (it used to be advisory, wired into
  no workflow, with a hand-kept count). Its unmapped names are the repo-wide
  spec-recipe worklist, unrelated to pangenome; the four GraphGenomeView fields
  are mapped. Don't treat that list as a regression to fix.
- The demo bubble BED (`test_data/hprc_minigraph/hprc_bubbles_chr6.bed.gz`) was
  **trimmed 1.4 MB → 115 KB** by subsetting to the MHC window
  (chr6:31.5–33.5 Mb). The `hprc_mhc_subgraph` figure draws chr6:32.5–32.56 Mb,
  which holds exactly one bubble (the MHC-wide one at 32,486,309); the trim
  preserves that row byte-for-byte, so the committed PNG is unchanged. See
  "Things not to redo" before touching it again.

## Next steps, roughly in order of value

- **More loci in the tutorial.** `~/src/jb2hubs/website/src/components/pangenomeLoci.ts`
  is a curated catalog of 20 human structural-variation loci (GRCh38, with
  variation classes and one-line significance notes: MHC, AMY1, C4, LPA, RHD,
  SMN, KIR, DEFB, FCGR, HP, CYP2D6, HBA, SRGAP2, MNS, CFHR, PRSS, UGT2B17,
  NPHP1, GSTM1). The tutorial's table lists five; that file is the source to pull
  from, and its framing (which loci a single reference represents poorly) is the
  right one for figures. Adding a locus as a *figure* means new demo data — see
  the trim note in "Things not to redo".
- **Sequence.** `getSubgraph` emits `S <id> * LN:i:<len>`, since the BED records
  spans and not sequence. `gfatools gfa2fa -s` writes a stable FASTA if a view
  ever needs bases. Nothing needs it today; lowest priority.

## Things not to redo

- **Do not re-derive coordinates for plain GFA.** That road produced the five
  bespoke sidecars per graph that the old `GfaTabixAdapter` needed. pggb and
  Minigraph-Cactus keep the `odgi extract` route.
- **Do not shrink the link rows.** Each link is written once per endpoint and
  repeats both endpoints in full. It looks redundant until you notice that an
  off-reference allele's `SN` is an assembly contig
  (`HG03516#1#JAGYYT010000071.1`), never a GRCh38 chromosome, so no coordinate
  query on the region you are viewing can reach it and tabix cannot look it up
  by segment id. The chr6 demo subset works precisely because of this.
- **Do not gate menus on adapter type names.** See above.
- `test_data/ecoli_rgfa_slice.gfa` and friends are **untracked**: `.gitignore`
  line 1 is `ecoli_*`. Committed fixtures are named `rgfa_ecoli.*` for that
  reason.
- **Do not "restore" the demo bubble BED to full chr6.** The committed
  `hprc_bubbles_chr6.bed.gz` is a deliberate MHC-window subset (its bytes are
  dominated by the giant MHC allele sequences, so widening it barely helps
  anyway). The full-chr6 source is **not in the repo**. Since the release-2
  retarget it comes from `gfatools bubble` over
  `hprc-v2.0-mc-grch38.sv.gfa.gz`, so a new locus figure needs that 842 MB
  download and a fresh subset, not an un-trim of this file. It must come from the
  same graph as the segments: mixing a release-1 bubble with a release-2 segment
  describes two different graphs.
- **A new adapter's file-types row needs a `git add` to appear.**
  `docs/generateFileTypeDocs.ts` enumerates source via `git ls-files`, so an
  untracked adapter dir is invisible to it and its `#fileFormat` row silently
  goes missing even though `pnpm autogen` runs clean (the config-doc generator
  uses `readdir` and *does* see it, which masks the gap). Stage the adapter, then
  `pnpm autogen`.
