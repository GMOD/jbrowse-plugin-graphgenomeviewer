# Developing

The plugin needs [pnpm](https://pnpm.io/installation) and builds against
`@jbrowse/*` 5.0.0-beta.11. Earlier hosts fail because the plugin passes RPC
calls an AbortSignal that older betas cannot post to a worker.

```console
pnpm install
pnpm start        # esbuild watch, serves dist/out.js on :9000 with CORS
pnpm build        # code-split ESM bundle
pnpm typecheck    # esbuild strips types without checking them
pnpm lint
```

Serve a JBrowse Web pointed at `config.json`, whose `plugins` entry targets
`http://localhost:9000/dist/out.js`.

`pnpm install` points git at `.githooks`, whose pre-push hook runs
`format:check`, both typechecks and `lint`. Skip it with `git push --no-verify`.

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

A dynamic `import()` takes no subresource-integrity hash. For pinned bytes,
serve the plugin from an immutable, versioned url you control.

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

- `host-compat` serves `dist/` to a shipped config on each hosted release. It
  catches an RPC argument a released core cannot post, or a re-export the host
  dropped. `pnpm version` runs it, and a publish has to pass
- `esbuild.mjs` resolves each host import through `scripts/hostShim.mjs`, using
  the names in `scripts/host-names/<tag>.json`. `pnpm host-names` builds against
  every file and jbrowse-components `main`. Add a release with
  `node scripts/fetch-host-names.mjs <tag>`
- On a host that lacks a name at runtime, the bundle holds a stub that throws
  naming the export

## End-to-end tests

Puppeteer boots a real JBrowse Web and loads the built plugin. All 48 tests pass
on 5.0.0-beta.13, the latest release, as of 2026-10-15.

```console
JBROWSE_TEST_DIR=/path/to/jbrowse-web/build RUN_E2E=1 pnpm test:e2e
```

- The suite is opt-in because it needs a jbrowse-web static build to serve.
  Without `RUN_E2E=1` it skips and exits clean, so it never blocks a run
- The host has to be at least 5.0.0-beta.11, the version the plugin's
  `@jbrowse/*` dependencies are pinned to. On an older host the plugin throws
  while installing, so every suite dies in setup with a minified
  `e.<something> is not a function`, which looks like a plugin bug
- `setup.ts` greps the served bundles for the API names in `HOST_REQUIRES` and
  throws with the `cp -r` line if one is missing, because a host dir is a copy
  that nothing refreshes (`.test-jbrowse-demos` once sat at 2026-07-24 for two
  weeks). Add to `HOST_REQUIRES` when the plugin picks up another new API
- A stock `jbrowse create .test-jbrowse-nightly --nightly` should also work. The
  `e2e-tests` CI job stays disabled until someone verifies that the nightly
  carries the merge
- The suites share one server and one machine, and a full run has flaked under
  load, a different test each time. Treat a single failure as load until a
  second run agrees, and re-run the file alone before believing it

### Env vars

- `RUN_E2E=1`: required to un-skip the suite
- `JBROWSE_TEST_DIR`: a jbrowse-web static dir to serve (default
  `.test-jbrowse-<version>`), such as a build newer than the release. The
  harness writes `config.json`, `test.gfa` and `plugin/` into it, so point it at
  a copy
- `TEST_JBROWSE_VERSION`: names the default dir (`beta13` if unset)
- `JBROWSE_PORT` (9876): moves the server, so two sessions can run at once
- `SKIP_BUILD=1`: skips the plugin build and tests whatever `dist/` holds, which
  once made a fixed import look broken

### Host builds

A copy of a local jbrowse-web build, verified on 2026-08-06:

```console
cp -r ~/src/jbrowse-components/products/jbrowse-web/build .test-jbrowse-local
JBROWSE_TEST_DIR=$PWD/.test-jbrowse-local RUN_E2E=1 pnpm test:e2e
```

- Copying a build while something rebuilds it yields a tree with no
  `index.html`, so `serve` shows a directory listing and React never mounts.
  Check that `index.html` and `static/js` exist in the copy
- The served JBrowse and its fixtures live in the primary checkout's
  `.test-jbrowse-beta13`. From a git worktree, set
  `JBROWSE_TEST_DIR=<primary checkout>/.test-jbrowse-beta13`, or the fixture
  suites (`walkRows`, `walkStrip`) skip without a word

### Suites

| suite                        | what only it can prove                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `forceLayout.test.ts`        | the Bandage WASM engine is fetched at runtime as the hashed sibling chunk, and draws                                  |
| `interaction.test.ts`        | the mouse is wired to hit detection, and a node drag repaints                                                         |
| `addTrack.test.ts`           | a `.segs.bed.gz` url through File → Open track opens as a drawn `GraphTrack`                                          |
| `addGbzTrack.test.ts`        | a `.gbz.db` url does the same, finding GRCh38 from `hg38` with no PanSN map                                           |
| `addWalksTrack.test.ts`      | a `.walks.bed.gz` url does the same, reading `hg38` as the GRCh38 its file name gives                                 |
| `launchAndHover.test.ts`     | the graph track cuts the window, re-cuts past it, and the graph/linear hover sync paints                              |
| `tubeMap.test.ts`            | both tube map layouts paint, and a GBZ cut draws as a tube map track of a linear view                                 |
| `tubeMapReads.test.ts`       | a GBZ track's GAF reads load through the worker and lay out under its tube map                                        |
| `walkHover.test.ts`          | hovering a node with walks lifted keeps the view still, since only a browser sizes a key                              |
| `launchOut.test.ts`          | the view menu and a node's context menu open the linear view beside the graph, not on top                             |
| `pathAnchoredLayout.test.ts` | a graph with no SN/SO/SR tags draws path-anchored, rows by strain, and paints both canvases                           |
| `walkRows.test.ts`           | the KIV-2 cut draws a bar per haplotype, tiles by a repeat annotation's unit, and reads `<CNV:TR>`                    |
| `walkRowsGap.test.ts`        | a haplotype the cut returns in two pieces draws as one row whose readout names the gap                                |
| `walkStrip.test.ts`          | walk rows under a force layout, with bars and nodes linked both ways                                                  |
| `hostedGestures.test.ts`     | a force-layout track's drag and ctrl+wheel drive the linear view and the graph follows; a node drag stays the graph's |

`tubeMapReads.test.ts` serves `test_data/cactus/`, sequenceTubeMap's cactus
graph with NA12879's reads over nodes 240–280. The whole read set, 51k reads, is
at `~/src/sequenceTubeMapModern/exampleData/cactus-NA12879.gaf.gz`.

### Waiting for a drawn frame

Use `waitForAppReady(page, condition)` from `setup.ts` before a screenshot or an
assertion on what is drawn. It waits for the condition, then for core's
`AppReadyMarker` to read `ready`, which covers every view's `showLoading` and
every display's `displayPhase`, including `LinearGraphDisplay`'s. A wait on
`nodeCount` or a canvas selector passes while the pane still shows "Fetching
subgraph".

### launchAndHover

`launchAndHover.test.ts` serves the `test_data/rgfa_ecoli` tabix fixture behind
a `RgfaTabixAdapter` track on a `K12` assembly, opened as its graph display
(`LinearGraphDisplay`), plus a plain BED track derived from the same index. Each
screenshot it writes to `test-screenshots/` is a real browser frame:

| screenshot                                   | shows                                                          |
| -------------------------------------------- | -------------------------------------------------------------- |
| `demo-00-graph-track-in-linear-view`         | the graph cut for the window and drawn under the view's x      |
| `demo-01-graph-hover-highlights-linear-view` | hovering a node paints a band over exactly its reference span  |
| `demo-02-linear-hover-selects-graph-node`    | with the setting on, hovering the plain track selects its node |
| `demo-03-graph-track-recut`                  | navigating past the cut re-cuts the new window                 |
| `demo-04-reference-strip-hover`              | an ordered track's strip block lights the node it draws        |
| `demo-05-bubble-label-hover`                 | a bubble's name lights its span on the strip and the view      |

The test takes hover targets from the model: it projects a node's own mid-point
through the view's scale/translate, which is exact, and checks that the
highlight equals that node's declared span. Sweeping painted pixels flakes,
because the first painted rows are the top edge of the drawn tube, about 4.6
screen px above the centreline, against a 5 px hover threshold.

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
another (`tube_map_reads` uses `test_data/cactus/`). A figure with no host to
read against names a `bandage-figure` spec instead, which core's CLI draws
(`syng_c4` from `test_data/syng/c4.json`).

### Figures shared with ggbandage

[ggbandage](https://github.com/GMOD/ggbandage) draws the same graphs from the
same bandage-core, and its gallery reads the same files. These pairs show one
locus and the same walks, so a change in either reads against the other:

| Here                 | ggbandage gallery | What both show                                |
| -------------------- | ----------------- | --------------------------------------------- |
| `syng_c4`            | `syng_overlay`    | C4 copies as a thread per pass round the ring |
| `force_kiv2_overlay` | `kiv2_overlay`    | KIV-2 expansions as extra loops, 30 kb flanks |
| `force_kiv2_facet`   | `kiv2_walks`      | KIV-2 a panel per walk                        |
| `walk_rows_kiv2`     | `kiv2_rows`       | KIV-2 copy number as walk rows                |

When one of them changes, redraw its partner, or note in the commit why they now
differ. Both read `hprc-v2.1-mc-grch38-f5` from jbrowse.org/demos/hprc.

`node scripts/preview-candidate.mjs '?config=…&session=…' out.png` screenshots
that hosted session with `dist/` served in place of the published bundle, to
check a change before release.
