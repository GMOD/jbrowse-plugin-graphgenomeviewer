# jbrowse-plugin-graphgenomeviewer

A JBrowse 2 plugin that adds a **GraphGenomeView** for pangenome graphs (GFA /
rGFA), plus a right-click launcher to open the local subgraph around a region
from a linear genome view.

## Screenshots

The HLA class II locus of the HPRC human pangenome, the same subgraph in two
layouts:

| Anchored (rGFA, reference-aligned)     | Force-directed (Bandage)         |
| -------------------------------------- | -------------------------------- |
| ![Anchored layout](img/anchored_hla.png) | ![Force layout](img/force_hla.png) |

Left: rank-0 backbone drawn at its GRCh38 offsets with each rank on its own row,
under the bubble and segment feature tracks it was launched from. Right: the same
subgraph laid out by the Bandage force engine, the shape people recognize.

It ships three layouts:

- **Anchored** (rGFA only): x is reference bp, one row per stable rank, read from
  the file so it renders instantly and aligns under a linear view.
- **Sample rows** (rGFA only): x is reference bp, one row per contributing
  assembly.
- **Force-directed**: the graph's shape, computed by the OGDF FMMM engine from
  [Bandage](https://github.com/rrwick/Bandage).

## About the Bandage engine (GPL)

The force-directed layout is computed by a WebAssembly build of Bandage's FMMM
layout from [OGDF](https://ogdf.github.io/). Both Bandage and OGDF are
**GPL-licensed**. That engine is **not bundled** in this plugin: it is fetched at
runtime from a configurable URL (default
`https://jbrowse.org/demos/bandage`) inside the layout RPC. Keeping this view as
a separate plugin is why the rest of JBrowse can stay Apache-2.0 while still
offering the Bandage layout to those who load this plugin. The anchored and
sample-row layouts are pure TypeScript and need no external engine.

## Developing

Requires [pnpm](https://pnpm.io/installation).

This plugin depends on `@jbrowse/render-core`, which is not yet published to npm,
so it is consumed via a `link:` to a sibling `jbrowse-components` checkout. Clone
both side by side:

```
~/src/jbrowse-components/     # provides @jbrowse/render-core
~/src/jbrowse-plugin-graphgenomeviewer/
```

Then:

```console
pnpm install
pnpm start        # esbuild watch, serves dist/out.js on :9000 with CORS
```

In another terminal, serve a JBrowse Web that points at `config.json` (its
`plugins` entry already targets `http://localhost:9000/dist/out.js`).

## Building

```console
pnpm build        # typecheck (tsc) + minified UMD bundle via esbuild
```

The bundle is written to
`dist/jbrowse-plugin-graphgenomeviewer.umd.production.min.js`. Load it from any
JBrowse 2 config:

```json
{
  "plugins": [
    {
      "name": "GraphGenomeView",
      "url": "https://your-host/jbrowse-plugin-graphgenomeviewer.umd.production.min.js"
    }
  ]
}
```

## Testing

```console
pnpm test         # jest unit tests
pnpm lint
```
