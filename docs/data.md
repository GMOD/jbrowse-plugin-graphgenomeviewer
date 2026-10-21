# Data and track config

A graph track reads one window of a graph at a time from a gfa-to-tabix walk
file (`.walks.bed.gz`), a gfa-to-tabix segments index (`.segs.bed.gz`) or a
gbz-base database (`.gbz.db`). A GFA small enough to load whole opens with **Add
→ Graph genome view**.

Build the graph with [minigraph](https://github.com/lh3/minigraph) (rGFA),
[pggb](https://github.com/pangenome/pggb) or
[Minigraph-Cactus](https://github.com/ComparativeGenomicsToolkit/cactus/blob/master/doc/pangenome.md)
(GFA and GBZ), then index it. [vg](https://github.com/vgteam/vg) 1.69.0 or later
covers the GBZ steps.

| Data                         | Commands                                                                                          | Adapter                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Walk file                    | `vg convert -f graph.gbz > graph.gfa`, then `gfa-to-tabix graph.gfa --walks --refs GRCh38 -o out` | `RgfaTabixAdapter` with `walksUri`, or `WalkTabixSyntenyAdapter` |
| rGFA                         | `gfa-to-tabix build graph.rgfa.gz -o out` (0.11.0+)                                               | `RgfaTabixAdapter`                                               |
| Plain GFA (pggb, odgi, vg)   | the same, plus `--reference`, `--assembly`, `--snarls`                                            | `RgfaTabixAdapter`                                               |
| Alleles with a CIGAR each    | `build` writes `.alleles.bed.gz`; `gfa-to-tabix alleles <prefix>` from a `--layout contig` index  | alignments track                                                 |
| gbz-base database            | `vg chains`, `gbz-base construct`, `gbz-haplotype-index`                                          | `GbzBaseSyntenyAdapter`                                          |
| Reads                        | `vg giraffe -o gaf`, `vg gamsort -G`, `bgzip`, `tabix`                                            | `reads` on a gbz-base adapter                                    |
| Minigraph paths per assembly | `minigraph -cxasm --call`, then `gfa-to-tabix paths` (0.9.0+)                                     | one row per bubble and sample                                    |

`gfa-to-tabix build` calls [gfatools](https://github.com/lh3/gfatools) for
bubbles and writes `.segs.bed.gz`, `.links.bed.gz`, `.bubbles.bed.gz`,
`.alleles.bed.gz`, a coarse tier, a `.graph.json` manifest and a track config.
For plain GFA, pass a VCF from `vg deconstruct -a` or `pggb -V`.

## syng graphs from impg

[impg](https://github.com/pangenome/impg) builds a
[syng](https://github.com/richarddurbin/syng) syncmer index with no alignment
step, and `impg query -o gfa:syng` cuts a region from it as a blunt GFA that
opens like any other.

![C4 as a syng graph, with walk rows: HG02080's 51 kb haplotype goes round the loop once, GRCh38 twice and HG01978's 116 kb haplotype three times](../img/syng_c4.png)

[test_data/syng/build.sh](../test_data/syng/build.sh) builds this graph from
odgi's 90 C4 haplotypes, and
`npx -p @jbrowse/bandage-core bandage-figure test_data/syng/c4.json` draws it.
Three quirks of impg 0.5.0's output, which the script works around:

- impg puts a reverse-complemented haplotype on nodes of its own, splitting the
  graph in two, so orient the input to one strand
- impg leaves the query path out of the output, so query from a path you can
  spare
- Path names nest a range in a range (`chr6:31972046-32055647:0-83601`), and the
  walk keys read only the last one

GRCh38 has C4A and C4B, two copies of a 32.7 kb module, and syng folds both onto
one copy's nodes. GRCh38 walks the ring twice, and a haplotype's copy count is
how often it goes round:

- A node takes the colour of GRCh38's first visit, so the ring shows C4A's hues.
  The blue specks are nodes GRCh38 walks only in C4B, where C4B differs from C4A
- A walk row follows each copy to the GRCh38 copy it continues, and switches
  where it walks a node only C4A or only C4B holds. GRCh38's own row stays a
  smooth gradient
- A syng branch repeats the reference's sequence on both sides of a variant, so
  a SNP draws as an off-path run of tens of bp, the charcoal specks on the ring,
  where a pggb graph draws a 1 bp bubble

## Opening tracks

- **File → Open track** opens a walk file (`.walks.bed.gz`), a segments index
  (`.segs.bed.gz`) or a gbz-base database (`.gbz.db`) as a `GraphTrack`. It
  finds the links and indexes beside the url, which a presigned url's signature
  does not cover, so spell out each location in a config for those
- **Add pangenome graph track** also reads `<prefix>.graph.json` for the coarse
  tier and the reference's PanSN sample. Without it the track has no coarse tier
- A walk file's name gives its reference sample: `chr22.GRCh38.walks.bed.gz`
  opened on `hg38` reads `hg38` as `GRCh38`. **Add pangenome graph track** also
  takes the haplotypes the track cuts for until you pick others

## Track config

```json
{
  "type": "GraphTrack",
  "trackId": "hprc_walks",
  "name": "HPRC release 2 walks",
  "assemblyNames": ["hg38"],
  "adapter": {
    "type": "RgfaTabixAdapter",
    "walksUri": "https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5.GRCh38",
    "assemblyNameToPanSN": { "hg38": "GRCh38" },
    "defaultHaplotypes": ["HG002", "HG00733"]
  }
}
```

- **Walk files:** the adapter reads `<walksUri>.walks.bed.gz` and its `.tbi`.
  `defaultHaplotypes` lists the haplotypes the track cuts for until you pick
  others. `WalkTabixSyntenyAdapter` takes the same `walksUri` and also opens in
  synteny, dotplot and circular views, a lane per haplotype
- **Segments index:**
  `{ "type": "RgfaTabixAdapter", "uri": "https://example.com/hprc", "coarse": { "uri": "https://example.com/hprc.fold10000", "foldBelowBp": 10000 } }`
  reads `<uri>.segs.bed.gz`, `<uri>.links.bed.gz` and their `.tbi`. Past
  `aboveBpPerPx` (default `foldBelowBp / 10`) the track uses the `coarse` tier
  (`gfa-to-tabix fold`)
- **gbz-base:** `{ "type": "GbzBaseSyntenyAdapter", "uri": "….gbz.db" }`. An
  `hg38` or `hs1` track finds the GRCh38 or CHM13 reference sample, and
  `assemblyNameToPanSN` covers other names. A haplotype's lane draws on the
  assembly aliased by its PanSN name (`HG002#1`) with no map entry
- The track cuts the window plus a window each side, up to 5 Mb. Past the cut (5
  Mb, a walk file's `walkByteBudget` or a gbz-base `nodeLimit`) the track asks
  you to zoom in. For a wide window, add the graph's VCF as a variant track
- The track menu picks layout, colour and highlighted haplotypes, and switches
  to the segments lane or, for `GbzBaseSyntenyAdapter` and
  `WalkTabixSyntenyAdapter`, the haplotype lanes
