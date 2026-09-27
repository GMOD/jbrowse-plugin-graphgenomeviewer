# jbrowse-plugin-graphgenomeviewer

A JBrowse 2 plugin that draws a pangenome graph (GFA / rGFA, or a gbz-base
database) as a track of a linear genome view, and as a **GraphGenomeView** of
its own for a whole file.

![KIV-2, force-directed, with its bubbles marked](img/force_kiv2.png)

The LPA KIV-2 window of the HPRC release 2 graph: the GRCh38 backbone runs left
to right, and the kringle repeat array forms the loops in the middle.

## Core ideas

- **Six layouts, one graph.** Force-directed (Bandage's OGDF FMMM, compiled to
  wasm) shows the graph's shape; the variant map, ordered, anchored, sample-row
  and walk-row layouts put it on reference coordinates so it lines up under a
  linear view.
- **Bubbles are the unit.** The plugin reads `gfatools bubble` output beside an
  rGFA index, or derives bubbles from the graph itself, then marks them and
  opens any one level by level.
- **Haplotypes as walks.** Over gbz-base a node draws thicker the more
  haplotypes carry it, and picking one walk lifts its route out of the drawing
  with its length against the reference.

![HG00133's walk lifted out of the KIV-2 cut](img/force_kiv2_walk.png)

## Usage

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

The plugin needs a JBrowse host of 5.0.0-beta.9 or later. **File → Open track**
takes an rGFA index (`.segs.bed.gz` from `build_rgfa_tabix.sh`) or a gbz-base
database (`.gbz.db`) and opens it as a `GraphTrack` with no config. The track
opens as the graph, with the segments lane and, for gbz-base, the haplotype
lanes in its menu:

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

A gbz-base track swaps in
`{ "type": "GbzBaseSyntenyAdapter", "uri": "https://example.com/hprc.gbz.db" }`.
The adapter cuts on the track's first assembly and finds the graph's reference
sample from it, so `hg38` finds `GRCh38` and `hs1` finds `CHM13`;
`assemblyNameToPanSN` covers any other name.

The display cuts the visible window plus one window-width each side, up to 5 Mb.
Past `aboveBpPerPx` it cuts the optional `coarse` tier instead, one node per
bubble with no size cap, built by `build_bubble_tier.sh` in jbrowse-components.
Layouts on reference bp pan and zoom with the view; the force-directed and
ordered layouts fit the track and zoom from its menu. The track menu picks the
layout, colour and walk, and switches to the segments lane, one block per
segment.

**Add → Graph genome view** opens a whole GFA file in its own view.

## Docs

- [docs/layouts.md](docs/layouts.md) — every layout, bubbles, walks, genes on
  the graph, and the demonstration loci
- [docs/developing.md](docs/developing.md) — dev server, building, the Bandage
  engine, testing and `host-compat`
- [docs/layout-experiments.md](docs/layout-experiments.md) — all six loci in
  every layout, current and proposed

## License

GPL-3.0-or-later, because the force-directed layout runs a wasm build of
Bandage's FMMM layout from [OGDF](https://ogdf.github.io/), and both are GPL.
JBrowse stays Apache-2.0, since configs load this plugin separately at runtime.
