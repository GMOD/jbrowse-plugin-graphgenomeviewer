# jbrowse-plugin-graphgenomeviewer

Pangenome graphs in JBrowse 2.

## As a track of a linear view

A `GraphTrack` cuts the graph for the view's window and redraws it as you pan.

![KIV-2 as a graph track under RefSeq genes, force-directed, with its bubbles marked](img/force_kiv2.png)

![MICB as a tube map track, eight HPRC haplotypes on the reference axis, genes drawn above the tubes](img/tube_map_micb_track.png)

## As its own view

**Add → Graph genome view** opens a whole GFA file. A session spec's
`loadedTrackId` and `loadedRegion` open a track's cut there instead.

![MICB's exons 2–4 as a tube map on its own axis, with the reference ruler under it](img/tube_map_micb.png)

![KIV-2 walk rows: eight haplotypes tiled by the repeat unit](img/walk_rows_kiv2.png)

## Features

- Eight layouts: force-directed (Bandage FMMM), variant map, ordered, anchored,
  sample rows, walk rows, and sequenceTubeMap's tube map on its own axis or the
  reference's
- Genes from the session's annotation track, drawn on the graph
- Bubbles from `gfatools bubble` or the graph itself, opened level by level
- gbz-base haplotypes as walks: carriage as node thickness, one walk lifted out
- GAF reads in the tube map, with their mismatches, from a gbz-base track

## Usage

Needs JBrowse 5.0.0-beta.9 or later.

```json
{
  "plugins": [
    {
      "name": "GraphGenomeView",
      "esmUrl": "https://unpkg.com/jbrowse-plugin-graphgenomeviewer/dist/jbrowse-plugin-graphgenomeviewer.esm.js"
    }
  ]
}
```

- **File → Open track** opens an rGFA index (`.segs.bed.gz` from
  `build_rgfa_tabix.sh`) or a gbz-base database (`.gbz.db`) as a `GraphTrack`
- A hand-written track needs only the adapter:

```json
{
  "type": "GraphTrack",
  "trackId": "hprc_graph",
  "name": "HPRC release 2 graph",
  "assemblyNames": ["hg38"],
  "adapter": {
    "type": "RgfaTabixAdapter",
    "uri": "https://example.com/hprc",
    "coarse": {
      "uri": "https://example.com/hprc.tier10000",
      "aboveBpPerPx": 1000
    }
  }
}
```

- The track menu picks layout, colour and walk, and switches to the segments
  lane or, for gbz-base, the haplotype lanes
- Cuts the window plus a window each side, up to 5 Mb; past `aboveBpPerPx`, the
  `coarse` tier (`build_bubble_tier.sh` in jbrowse-components)
- gbz-base swaps in `{ "type": "GbzBaseSyntenyAdapter", "uri": "….gbz.db" }`; an
  `hg38` or `hs1` track finds the graph's GRCh38 or CHM13 reference sample, and
  `assemblyNameToPanSN` covers other names
- `"reads": "….gaf.gz"` on that adapter draws GAF reads in the tube map layouts

## Docs

- [docs/layouts.md](docs/layouts.md) — layouts, bubbles, walks, genes, loci
- [docs/developing.md](docs/developing.md) — building, testing, `host-compat`

## License

GPL-3.0-or-later (this module is based on work from Bandage and ODGF graph
drawing algorithms which are both GPL).
