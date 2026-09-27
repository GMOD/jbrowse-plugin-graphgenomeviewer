# Developing

Requires [pnpm](https://pnpm.io/installation). The plugin builds against the
published `@jbrowse/*` packages at 5.0.0-beta.9 and needs a host of at least
that version: it hands its RPC calls an AbortSignal, which an earlier JBrowse 5
beta cannot post to its worker.

```console
pnpm install
pnpm start        # esbuild watch, serves dist/out.js on :9000 with CORS
```

In another terminal, serve a JBrowse Web that points at `config.json` (its
`plugins` entry already targets `http://localhost:9000/dist/out.js`).

## Building

```console
pnpm build        # native ESM bundle via esbuild (code-split)
pnpm typecheck    # tsc, separately — esbuild strips types without checking them
```

This writes the plugin to `dist/`, and the **whole directory must be served
together** — the entry loads its sibling chunks relative to its own url:

- `jbrowse-plugin-graphgenomeviewer.esm.js` — the plugin entry
- `chunks/bandage-layout-<hash>.js` — the Bandage layout engine (~425kb),
  imported on demand and named by content hash so a redeployed engine is never
  served from cache
- `chunks/*.js` — other lazily-loaded code split out of the entry

Load the plugin from any JBrowse config, 5.0.0-beta.9 or later, with an
`esmUrl`:

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

Note: ESM plugins are loaded via a dynamic `import()`, which cannot carry a
subresource-integrity hash the way a UMD `<script integrity>` can — there is
nowhere to put a digest. For a deployment that needs pinned, tamper-evident
bytes, serve the plugin from an immutable, version-pinned url on a host you
control. The engine chunk is already immutable by content hash.

The engine is a lazy chunk: it is only fetched the first time someone selects
the force-directed layout, so sessions that use the anchored or sample-row
layouts never download it. Its url is not configured anywhere — `loadBandage` is
a plain dynamic `import()`, so the browser resolves the chunk relative to the
plugin module's own url (`import.meta.url`, defined on the main thread and in
the RPC worker alike). That is why the whole `dist/` has to be served together,
and it is also why there is nothing to point elsewhere: to host the engine on
another origin, rebuild with the chunk emitted there.

## Rebuilding the engine

`src/bandage/bandage-layout.js` is a committed build artifact, so a normal
`pnpm build` never needs Emscripten. Regenerate it only when the C++ layout
sources change:

```console
pnpm build:wasm   # needs emsdk, nothing else
```

Emscripten is the only thing you have to install. OGDF is vendored at
`vendor/ogdf` (a stock checkout of it does not build for wasm at all — see
[`vendor/README.md`](../vendor/README.md)), so this works offline from a fresh
clone of this repo alone. Roughly four minutes the first time, seconds after
that.

It compiles with `-sSINGLE_FILE=1`, embedding the wasm as base64 so the result
is one self-contained ES module that esbuild can copy rather than bundle.

A rebuild has to be checked against the drawing rather than against the file,
since the artifact's bytes move for reasons the layout does not — see
[`src/bandage/README.md`](../src/bandage/README.md) for
`scripts/layout-digest.mjs`.

## Testing

```console
pnpm test         # vitest unit tests
pnpm test:watch
pnpm test:wasm    # runs the committed Bandage engine, no deps needed
pnpm test:e2e     # puppeteer, opt-in — see test/README.md
pnpm host-compat  # boots dist/ on the hosted JBrowse releases and cuts a graph
pnpm lint
pnpm typecheck
```

`pnpm test:e2e` drives the force layout through a real JBrowse in a headless
browser, behind `RUN_E2E=1` because it needs a jbrowse-web build to serve;
[`test/README.md`](../test/README.md) explains how to run it.

`pnpm host-compat` is the check a publish has to pass, and `pnpm version` runs
it. It serves the built `dist/` to a real shipped config on each hosted release
and cuts a subgraph there, because the failures it catches pass tsc, eslint and
the unit tests: an RPC argument a released core cannot post to its worker, or a
re-export the host no longer serves, shows only when the bundle runs on the
host.
