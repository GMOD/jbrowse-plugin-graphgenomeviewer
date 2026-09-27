# jbrowse-plugin-graphgenomeviewer

A JBrowse 2 plugin that draws a pangenome graph (GFA / rGFA, or a gbz-base
database) as a track of a linear genome view, and as a **GraphGenomeView** of
its own for a whole file.

![KIV-2, force-directed, with its bubbles marked](img/force_kiv2.png)

The LPA KIV-2 window of the HPRC release 2 graph, force-directed: the GRCh38
backbone runs left to right and the kringle repeat array is the knot of loops in
the middle. Each bubble is haloed and labelled, and its label opens it on its
own.

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

The plugin needs a JBrowse host of 5.0.0-beta.9 or later. Add a graph track with
a `LinearGraphDisplay`, or open a whole file from **Add → Graph genome view**.

## Docs

- [docs/layouts.md](docs/layouts.md) — every layout, bubbles, walks, genes on
  the graph, and the demonstration loci
- [docs/configuration.md](docs/configuration.md) — track and adapter config, the
  coarse tier
- [docs/developing.md](docs/developing.md) — dev server, building, the Bandage
  engine, testing and `host-compat`
- [docs/layout-experiments.md](docs/layout-experiments.md) — all six loci in
  every layout, current and proposed

## License (GPL-3.0)

This plugin is **GPL-3.0-or-later**. The force-directed layout is computed by a
WebAssembly build of Bandage's FMMM layout from [OGDF](https://ogdf.github.io/),
and both Bandage and OGDF are GPL-licensed, so this plugin takes the same
license rather than linking around it.

JBrowse itself is unaffected and stays Apache-2.0: this is a separate plugin,
loaded at runtime only by configs that ask for it. The anchored and sample-row
layouts are pure TypeScript and need no external engine.
