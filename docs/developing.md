# Developing

Needs [pnpm](https://pnpm.io/installation) and builds against `@jbrowse/*`
5.0.0-beta.11. Earlier hosts fail because the plugin passes RPC calls an
AbortSignal that older betas cannot post to a worker.

```console
pnpm install
pnpm start        # esbuild watch, serves dist/out.js on :9000 with CORS
pnpm build        # code-split ESM bundle
pnpm typecheck    # esbuild strips types without checking them
pnpm lint
```

Serve a JBrowse Web pointed at `config.json`, whose `plugins` entry targets
`http://localhost:9000/dist/out.js`.

`pnpm typecheck` runs TypeScript 7 through the `typescript7` alias, while
`typescript` stays on 6 for typescript-eslint and the core's declaration build.
`npx tsc` picks 6.

## Build output

A host has to serve the whole `dist/` directory, because the entry loads chunks
relative to `import.meta.url`:

- `jbrowse-plugin-graphgenomeviewer.esm.js`: the entry
- `chunks/bandage-layout-<hash>.js`: the Bandage engine (~425 kB), fetched when
  someone first picks the force-directed layout
- `chunks/*.js`: other lazy code

A dynamic `import()` takes no subresource-integrity hash. For pinned bytes, serve
the plugin from an immutable, versioned url you control.

## The core

[@jbrowse/bandage-core](https://github.com/GMOD/bandage-core) holds the layout
engine, renderers and graph logic. To develop both, link a checkout:

```console
pnpm add -D @jbrowse/bandage-core@link:../bandage-core
```

Run `pnpm build` in the core after each change, since the plugin reads its
`dist/`. Before committing, restore `package.json` and the lockfile, then
`pnpm install`.

## Testing

```console
pnpm test         # vitest unit tests
pnpm test:e2e     # puppeteer, needs RUN_E2E=1 and a jbrowse-web build
pnpm host-compat  # boots dist/ on hosted JBrowse releases, cuts a graph, draws the track
pnpm host-names   # builds against each supported host's export names
```

[test/README.md](../test/README.md) covers the e2e setup.

- `host-compat` serves `dist/` to a shipped config on each hosted release. It
  catches an RPC argument a released core cannot post, or a re-export the host
  dropped. `pnpm version` runs it, and a publish has to pass
- `esbuild.mjs` resolves each host import through `scripts/hostShim.mjs`, using
  the names in `scripts/host-names/<tag>.json`. `pnpm host-names` builds against
  every file and jbrowse-components `main`. Add a release with
  `node scripts/fetch-host-names.mjs <tag>`
- On a host that lacks a name at runtime, the bundle holds a stub that throws
  naming the export

## Releasing

- `pnpm version` refuses unless the Push workflow passed on the commit
  (`scripts/ci-green.mjs`), so push and let CI finish first
- The core's CI packs the core and runs this plugin's tests on it, using a
  `core-next` branch here when one exists
- If the version commit fails with `cannot lock ref 'HEAD'`, another session
  landed mid-run. Rerun after
  `git restore --staged --worktree CHANGELOG.md package.json src/version.ts`
- Tutorials and demos load the plugin from the store's `latest/` url, so an npm
  release reaches them once jbrowse-plugin-list promotes it:

```console
cd ~/src/jbrowse-plugin-list
pnpm dep && pnpm invalidate
```

## Figures

```console
pnpm build
node scripts/shoot-figures.mjs            # every figure in img/
node scripts/shoot-figures.mjs force_mhc  # one
node scripts/shoot-figures.mjs --compare /tmp/diffs  # old | new | diff
```

Every figure in `img/` is a spec in `FIGURES` in `scripts/shoot-figures.mjs`: a
session, an optional action before the shot, and an optional config. The script
refuses to run while `img/` holds an image without one. It serves `dist/` to
jbrowse.org's hosted JBrowse on the HPRC demo's config, unless a figure names
another (`tube_map_reads` uses `test_data/cactus/`).
