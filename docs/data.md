# Data and track config

A graph track reads one window of a graph at a time. Use a walk file where you
can:

- **Walk file** (`<prefix>.<sample>.walks.bed.gz`): the walk adapters read walk
  format 5, which [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) writes
  from 1.4
- **Graph index** (`.graph.bed.gz`, or the `.segs.bed.gz` and `.links.bed.gz`
  pair of `gfa-to-tabix --format 1`): gfa-to-tabix's index of an rGFA or plain
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
| Structural forms             | a walk file                                                                                              | `WalkFormsAdapter`, see [Structural forms](#structural-forms)    |
| Reads                        | see [Reads](#reads)                                                                                      | `reads` on a gbz-base adapter                                    |
| Minigraph paths per assembly | `minigraph -cxasm --call`, then `gfa-to-tabix paths` (0.9.0+)                                            | one row per bubble and sample                                    |

`gfa-to-tabix build` calls [gfatools](https://github.com/lh3/gfatools) for
bubbles and writes `.graph.bed.gz`, `.bubbles.bed.gz`, `.alleles.bed.gz`, a
coarse tier, a `.graph.json` manifest and a track config. For plain GFA, pass a
VCF from `vg deconstruct -a` or `pggb -V`.

## Opening tracks

- **File → Open track** opens a walk file (`.walks.bed.gz`), a graph index
  (`.graph.bed.gz` or `.segs.bed.gz`) or a gbz-base database (`.gbz.db`) as a
  `GraphTrack`. It finds the links and indexes beside the url, which a presigned
  url's signature does not cover, so spell out each location in a config for
  those
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
    "walksUri": "https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5s.GRCh38",
    "assemblyNameToPanSN": { "hg38": "GRCh38" },
    "defaultHaplotypes": ["HG002", "HG00733"]
  }
}
```

- **Walk files:** the adapter reads `<walksUri>.walks.bed.gz` and its `.tbi`.
  `defaultHaplotypes` lists the haplotypes the track cuts for until you pick
  others. `WalkTabixSyntenyAdapter` takes the same `walksUri` and also opens in
  synteny, dotplot and circular views, a lane per haplotype
- **Graph index:**
  `{ "type": "RgfaTabixAdapter", "uri": "https://example.com/hprc", "format": 2, "coarse": { "uri": "https://example.com/hprc.fold10000", "format": 2, "foldBelowBp": 10000 } }`
  reads `<uri>.graph.bed.gz` and its `.tbi`. Past `aboveBpPerPx` (default
  `foldBelowBp / 10`) the track uses the `coarse` tier (`gfa-to-tabix fold`)
- gfa-to-tabix writes a plain GFA's carriers as bits in each format 2 node row,
  so the track reads a fraction of format 1's text for a window
- **Format 1:** leave out `"format"` to read `<uri>.segs.bed.gz`,
  `<uri>.links.bed.gz` and their `.tbi`
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

## Structural forms

`WalkFormsAdapter` groups a walk file's haplotypes by the structural changes
their walks make over one pinned window. Core's
`LinearMultiSampleVariantDisplay` draws a row per group, or form, labelled with
its share of the haplotypes and its largest change ("66% · del 18.4kb"):

```json
{
  "type": "VariantTrack",
  "trackId": "forms_gstm1",
  "name": "Structural forms at GSTM1",
  "assemblyNames": ["hg38"],
  "adapter": {
    "type": "WalkFormsAdapter",
    "walksUri": "https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5s.GRCh38",
    "pinned": { "refName": "chr1", "start": 109680000, "end": 109715000 },
    "exclude": ["CHM13"]
  },
  "displays": [
    {
      "type": "LinearMultiSampleVariantDisplay",
      "axis": { "tree": false },
      "shadeByDosage": false,
      "encoding": {
        "color": {
          "field": "consequence",
          "scale": {
            "type": "ordinal",
            "domain": ["loss", "gain", "shift", "inversion", "net"],
            "range": ["#e41a1c", "#800080", "#8a94a3", "#ff7f00", "#7e6148"],
            "names": [
              "Loss",
              "Gain",
              "Shifted, same length",
              "Inversion",
              "Net change, place unknown"
            ]
          },
          "legend": { "title": "Change" }
        }
      }
    }
  ]
}
```

- `pinned` names the window the forms come from, 0-based and half-open. The rows
  keep the same forms wherever the view moves, and draw empty outside it
- `floorBp` sets the smallest change that tells two forms apart: `auto`, the
  default, picks 50 bp under 25 kb, 1 kb to 300 kb and 10 kb past it; 50, 1000
  and 10000 fix it. A new floor regroups the cut the adapter already read
- `exclude` leaves samples out of every form. HPRC's GRCh38 walk file lists
  CHM13 as a haplotype
- `maxForms`, 8 by default, caps the rows: the largest forms get one each, and
  the rest share an empty "other forms" row
- A row label names the form's largest change in graph-walks' tokens, such as
  `del 18.4kb`, `del 6.46kb->94bp`, `repl 32.7kb->58.7kb`, `shift 94.2kb` or
  `ref`, and "+N" counts its other changes, which the variants under it name.
  Changes every form shares stay out of the label
- `walkByteBudget`, 1 MB by default, caps what the cut fetches. A pinned window
  over it shows an error naming how much of the window fits
- The adapter reads every abridged walk in full. A window whose walks would take
  more than graph-walks' 16 M step budget shows an error naming how much of it
  fits; the MHC's 90 kb take 9.4 M steps
- Each change is a variant with a `consequence` of `loss`, `gain`, `shift`,
  `inversion` or `net`, which `encoding.color` paints with a key. A replacement
  counts as a loss or gain by its net change. graph-walks labels one whose
  smaller side is under 5% of the other as a deletion or insertion, so C4's
  6,460 bp to 94 bp reads `del 6.46kb->94bp`
- The adapter sets a form's genotype to `1` at its own changes and `.` where its
  walks do not span a site
- The display's notifications name the haplotypes with no walk over the window
  and the forms in the "other forms" row. Each starts with the pinned window,
  and a re-pin or floor change takes the old ones down
- The track menu shows the pinned window and its form count, "Re-pin to visible
  region" and "Hide changes under: Auto / 50 bp / 1 kb / 10 kb". Panning and
  zooming never change the forms; only a re-pin does
- The display stores a re-pin or a floor in the session and sends it in place of
  the config's `pinned` and `floorBp`. A new floor regroups the cut without
  reading the walk file again
- A re-pin over `walkByteBudget` shows the error in place of the rows
- The adapter cuts GSTM1 in about 0.5 s and LPA in 5 s, abridged walks included.
  graph-walks'
  [structural-forms.md](https://github.com/GMOD/graph-walks/blob/main/docs/structural-forms.md)
  gives the grouping rules and their measurements

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
