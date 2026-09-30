# Developing

The plugin needs [pnpm](https://pnpm.io/installation) and builds against
`@jbrowse/*` 5.0.0-beta.9. Earlier hosts fail because the plugin passes its RPC
calls an AbortSignal, which older JBrowse 5 betas cannot post to a worker.

```console
pnpm install
pnpm start        # esbuild watch, serves dist/out.js on :9000 with CORS
```

Then serve a JBrowse Web pointed at `config.json`, whose `plugins` entry already
targets `http://localhost:9000/dist/out.js`.

## Building

```console
pnpm build        # code-split ESM bundle via esbuild
pnpm typecheck    # esbuild strips types without checking them
```

The build writes `dist/`, and a host has to serve the **whole directory**,
because the entry loads its chunks relative to `import.meta.url`:

- `jbrowse-plugin-graphgenomeviewer.esm.js`: the entry
- `chunks/bandage-layout-<hash>.js`: the Bandage engine (~425 kB), fetched the
  first time someone picks the force-directed layout. The content hash keeps a
  redeployed engine out of stale caches.
- `chunks/*.js`: other lazy code

To host the engine on another origin, rebuild with the chunk emitted there; no
config names its url.

A dynamic `import()` cannot carry a subresource-integrity hash. For pinned
bytes, serve the plugin from an immutable, versioned url on a host you control.

## Rebuilding the engine

`packages/core/src/bandage/bandage-layout.js` is a committed artifact, so
`pnpm build` never needs Emscripten. After changing the C++ layout sources:

```console
pnpm build:wasm   # needs emsdk only
```

OGDF is vendored at `vendor/ogdf`, patched to build for wasm (see
[vendor/README.md](../vendor/README.md)), so the build works offline. It takes
about four minutes cold and seconds after. `-sSINGLE_FILE=1` embeds the wasm as
base64, giving one ES module esbuild copies as-is.

The artifact's bytes change for reasons the layout doesn't, so check a rebuild
against the drawing with `scripts/layout-digest.mjs`
([packages/core/src/bandage/README.md](../packages/core/src/bandage/README.md)).

## Testing

```console
pnpm test         # vitest unit tests
pnpm test:wasm    # the committed Bandage engine
pnpm test:e2e     # puppeteer, needs RUN_E2E=1 and a jbrowse-web build
pnpm host-compat  # boots dist/ on hosted JBrowse releases and cuts a graph
pnpm lint
```

[test/README.md](../test/README.md) covers the e2e setup.

`pnpm version` runs `host-compat`, and a publish has to pass it. The probe
serves `dist/` to a shipped config on each hosted release, which catches what
tsc, eslint and unit tests miss: an RPC argument a released core can't post, or
a re-export the host no longer serves.

BandageJS draws with this repo's core from npm, so CI's **BandageJS on this
core** job packs the core as it would publish, installs it into BandageJS's main
and runs BandageJS's tests on it: a core change can pass everything here and
still break that page. `pnpm version` refuses unless the Push workflow, that job
and the browser suites among it, passed on the commit being released
(`scripts/ci-green.mjs`), so push the commit and let CI finish first.

## Figures

```console
pnpm build
node scripts/shoot-figures.mjs            # every figure in img/
node scripts/shoot-figures.mjs force_mhc  # one
```

The script serves `dist/` to jbrowse.org's hosted HPRC demo, the way
`host-compat` does, so a figure shows this checkout's drawing on real data. The
two tube map figures draw local fixtures instead; the header of
`scripts/shoot-figures.mjs` names the e2e tests that frame them.

`node scripts/render-figures.mjs` renders the specs in `figures/` with the
core's `bandage-figure` (build the core first), and `figure.test.ts` keeps one
saved figure: a change to what figures draw shows up as its diff, accepted with
`vitest -u`. See [figures.md](figures.md).
