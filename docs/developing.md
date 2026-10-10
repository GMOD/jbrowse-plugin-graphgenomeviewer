# Developing

The plugin needs [pnpm](https://pnpm.io/installation) and builds against
`@jbrowse/*` 5.0.0-beta.11. Earlier hosts fail because the plugin passes its RPC
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

`pnpm typecheck` runs TypeScript 7 through the `typescript7` npm alias, while
`typescript` stays on 6: typescript-eslint needs 6's JavaScript API, and the
core's declaration build runs 6's `tsc`. `npx tsc` would pick 6.

The build writes `dist/`, and a host has to serve the **whole directory**,
because the entry loads its chunks relative to `import.meta.url`:

- `jbrowse-plugin-graphgenomeviewer.esm.js`: the entry
- `chunks/bandage-layout-<hash>.js`: the Bandage engine (~425 kB), fetched the
  first time someone picks the force-directed layout. The content hash keeps a
  redeployed engine out of stale caches.
- `chunks/*.js`: other lazy code

To host the engine on another origin, rebuild with the chunk emitted there; no
config names its url.

A dynamic `import()` takes no subresource-integrity hash. For pinned bytes,
serve the plugin from an immutable, versioned url on a host you control.

## The core

The layout engine, renderers and graph logic live in
[@jbrowse/bandage-core](https://github.com/GMOD/bandage-core), a separate repo
this plugin installs from npm. To develop both at once, link a checkout into
this one:

```console
pnpm add -D @jbrowse/bandage-core@link:../bandage-core
```

Run `pnpm build` in the core after each change, since the plugin reads its
`dist/`. Undo the link before committing by restoring `package.json` and the
lockfile, then `pnpm install`. The core's README covers rebuilding the WASM
engine.

## Testing

```console
pnpm test         # vitest unit tests
pnpm test:e2e     # puppeteer, needs RUN_E2E=1 and a jbrowse-web build
pnpm host-compat  # boots dist/ on hosted JBrowse releases, cuts a graph, draws the track
pnpm host-names   # builds against each supported host's export names
pnpm lint
```

[test/README.md](../test/README.md) covers the e2e setup.

`pnpm version` runs `host-compat`, and a publish has to pass it. The probe
serves `dist/` to a shipped config on each hosted release, which catches what
tsc, eslint and unit tests miss: an RPC argument a released core can't post, or
a re-export the host no longer serves. It draws the graph in its own view and as
a track in a linear view, whose display renders host components the view does
not.

`esbuild.mjs` resolves each host import through `scripts/hostShim.mjs`, which
binds it to a name the host serves. The names come from
`scripts/host-names/<tag>.json`, one file per supported release, and the bundle
is built against the installed `@jbrowse/core`'s tag. `pnpm host-names` builds
against every file there and against jbrowse-components `main`, so an import a
host dropped fails with its file and line. On a host that lacks a name at
runtime, the bundle holds a stub that throws naming the export. Add a release
with `node scripts/fetch-host-names.mjs <tag>`.

`pnpm version` refuses unless the Push workflow, the browser suites among it,
passed on the commit being released (`scripts/ci-green.mjs`), so push the commit
and let CI finish first. The core's own CI packs the core and runs this plugin's
tests on it, using a `core-next` branch here when one exists.

If the version commit fails with `cannot lock ref 'HEAD'`, another session
landed mid-run. Unstage and restore what the version script wrote, then rerun:

```console
git restore --staged --worktree CHANGELOG.md package.json src/version.ts
```

The jbrowse-components tutorials, demos and figure fixtures load the plugin from
the store's `latest/` url on jbrowse.org, so an npm release reaches them only
once jbrowse-plugin-list promotes it:

```console
cd ~/src/jbrowse-plugin-list
pnpm dep && pnpm invalidate
```

## Figures

```console
pnpm build
node scripts/shoot-figures.mjs            # every figure in img/
node scripts/shoot-figures.mjs force_mhc  # one
```

Every figure in `img/` is a spec in `FIGURES` in `scripts/shoot-figures.mjs`: a
session, an optional action before the shot, and an optional config. The script
refuses to run while `img/` holds an image without one. It serves `dist/` to
jbrowse.org's hosted JBrowse, the way `host-compat` does, on the HPRC demo's
config unless a figure names another; `tube_map_reads` names one in
`test_data/cactus/`, served from the same host.

The core's `bandage-figure` renders figures from a spec; see its
[figures guide](https://github.com/GMOD/bandage-core/blob/main/docs/figures.md).
