# Data and track config

A graph track reads one window of a graph at a time. Use a walk file where you
can:

- **Walk file** (`<prefix>.<sample>.walks.bed.gz`): the walk adapters read walk
  format 5, which [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) writes
  from 1.4
- **Segments index** (`.segs.bed.gz`): gfa-to-tabix's index of an rGFA or plain
  GFA
- **gbz-base database** (`.gbz.db`): the one source that takes GAF
  [reads](#reads)
- **GFA** small enough to load whole: opens with **Add → Graph genome view**

Build the graph with [minigraph](https://github.com/lh3/minigraph) (rGFA),
[pggb](https://github.com/pangenome/pggb) or
[Minigraph-Cactus](https://github.com/ComparativeGenomicsToolkit/cactus/blob/master/doc/pangenome.md)
(GFA and GBZ), then index it. [vg](https://github.com/vgteam/vg) 1.69.0 or later
covers the GBZ steps. [syng.md](syng.md) builds a syng graph with impg.

| Data                         | Commands                                                                                                 | Adapter                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Walk file                    | `vg convert -f graph.gbz > graph.gfa`, then `gfa-to-tabix graph.gfa --walks --refs GRCh38 -o out` (1.4+) | `RgfaTabixAdapter` with `walksUri`, or `WalkTabixSyntenyAdapter` |
| rGFA                         | `gfa-to-tabix build graph.rgfa.gz -o out` (0.11.0+)                                                      | `RgfaTabixAdapter`                                               |
| Plain GFA (pggb, odgi, vg)   | the same, plus `--reference`, `--assembly`, `--snarls`                                                   | `RgfaTabixAdapter`                                               |
| Alleles with a CIGAR each    | `build` writes `.alleles.bed.gz`; `gfa-to-tabix alleles <prefix>` from a `--layout contig` index         | alignments track                                                 |
| gbz-base database            | `vg chains`, `gbz-base construct`, `gbz-haplotype-index`                                                 | `GbzBaseSyntenyAdapter`                                          |
| Reads                        | see [Reads](#reads)                                                                                      | `reads` on a gbz-base adapter                                    |
| Minigraph paths per assembly | `minigraph -cxasm --call`, then `gfa-to-tabix paths` (0.9.0+)                                            | one row per bubble and sample                                    |

`gfa-to-tabix build` calls [gfatools](https://github.com/lh3/gfatools) for
bubbles and writes `.segs.bed.gz`, `.links.bed.gz`, `.bubbles.bed.gz`,
`.alleles.bed.gz`, a coarse tier, a `.graph.json` manifest and a track config.
For plain GFA, pass a VCF from `vg deconstruct -a` or `pggb -V`.

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

## Reads

A gbz-base adapter's `reads` names a GAF file, which both tube map layouts draw
under the haplotypes ([tube-maps.md](tube-maps.md#reads)):

```json
{
  "type": "GbzBaseSyntenyAdapter",
  "uri": "graph.gbz.db",
  "reads": "reads.gaf.gz",
  "assemblyNames": ["hg38"]
}
```

```console
vg giraffe -Z graph.gbz -f reads.fq -o gaf > reads.gaf
vg gamsort -G reads.gaf | bgzip > reads.gaf.gz
tabix -p gaf reads.gaf.gz
```

- Only gbz-base tracks take reads
- Minigraph and GraphAligner GAF work if step names are the cut's segment names
  (numeric ids, or `vg giraffe --named-coordinates`)
- A tabix index needs numeric ids. Without one the plugin reads the whole file,
  up to 50 MB
