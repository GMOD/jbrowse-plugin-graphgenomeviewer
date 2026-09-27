# End-to-end tests

Puppeteer boots a real JBrowse Web and loads the built plugin. The suites:

| suite                    | what only it can prove                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `forceLayout.test.ts`    | the Bandage WASM engine is fetched at runtime as the hashed sibling chunk, and draws     |
| `interaction.test.ts`    | the mouse is wired to hit detection, and a node drag repaints                            |
| `addTrack.test.ts`       | a `.segs.bed.gz` url through File → Open track opens as the graph display                |
| `launchAndHover.test.ts` | the graph track cuts the window, re-cuts past it, and the graph/linear hover sync paints |
| `tubeMap.test.ts`        | both tube map layouts paint, and a GBZ cut draws as a tube map track of a linear view    |

## What `launchAndHover` demonstrates

It serves the real `test_data/rgfa_ecoli` tabix fixture behind a
`RgfaTabixAdapter` track on a `K12` assembly, opened as its graph display
(`LinearGraphDisplay`), plus a **plain BED track derived from that same index**.
Every screenshot it writes to `test-screenshots/` is a real browser frame:

| screenshot                                   | shows                                                         |
| -------------------------------------------- | ------------------------------------------------------------- |
| `demo-00-graph-track-in-linear-view`         | the graph cut for the window and drawn under the view's x     |
| `demo-01-graph-hover-highlights-linear-view` | hovering a node paints a band over exactly its reference span |
| `demo-02-linear-hover-selects-graph-node`    | hovering the plain track selects the covering graph node      |
| `demo-03-graph-track-recut`                  | navigating past the cut re-cuts the new window                |

One thing learned building it, worth not rediscovering:

- **Hover targets come from the model, not from painted pixels.** Sweeping
  painted pixels flakes, because the first painted rows are the top edge of the
  drawn tube — about 4.6 screen px above the centreline, against a 5 px hover
  threshold. Projecting a node's own mid-point through the view's
  scale/translate is exact, and lets the assertion check the highlight equals
  that node's declared span rather than merely that some highlight appeared.

## Waiting for a drawn frame

Use `waitForAppReady(page, condition)` from `setup.ts` before a screenshot or an
assertion on what is drawn. It waits for the condition, then for core's
`AppReadyMarker` to read `ready`, which covers every view's `showLoading` and
every display's `displayPhase`, including `LinearGraphDisplay`'s. A wait on
`nodeCount` or a canvas selector passes while the pane still shows "Fetching
subgraph".

## Running

```console
RUN_E2E=1 pnpm test:e2e
```

Opt-in only because it needs a jbrowse-web static build to serve. **All 18 tests
pass on 5.0.0-beta.9 as of 2026-09-26.**

Point `JBROWSE_TEST_DIR` at a jbrowse-web build and go:

```console
JBROWSE_TEST_DIR=/path/to/jbrowse-web/build RUN_E2E=1 pnpm test:e2e
```

**The host has to be at least 5.0.0-beta.9**, the version the plugin's
`@jbrowse/*` dependencies are pinned to. An older host lacks core APIs the
plugin calls, and the failure is that the plugin throws while INSTALLING, so
every suite dies in setup with a minified `e.<something> is not a function` and
the whole run reads as a plugin bug.

A host dir is a copy, and nothing refreshes it: `.test-jbrowse-demos` sat at
2026-07-24 for two weeks and every run against it was a lie. `setup.ts` now
greps the served bundles for those API names and throws with the `cp -r` line if
they are missing, so a stale host says so in one sentence instead of costing an
afternoon. Add to `HOST_REQUIRES` when the plugin picks up another new API.

A stock `jbrowse create .test-jbrowse-nightly --nightly` should also work now,
but has not been verified to carry the merge -- that is the one thing still
keeping the `e2e-tests` CI job disabled.

> **The harness writes into `JBROWSE_TEST_DIR`** -- `config.json`, `test.gfa`
> and `plugin/`. Give it a copy, not a build you care about.

Two things that cost time when this was first run, both of which look like
plugin bugs and are not:

- copying a jbrowse-web build **while something is rebuilding it** yields a tree
  with no `index.html`, so `serve` shows a directory listing and React never
  mounts. Check `index.html` and `static/js` exist in the copy.
- running with `SKIP_BUILD=1` tests whatever is already in `dist/`. That is how
  a fixed import kept appearing broken.

Without `RUN_E2E=1` the suite skips and exits clean, so it never blocks a run.

## Env vars

- `RUN_E2E=1` — required to un-skip the suite.
- `JBROWSE_TEST_DIR` — a jbrowse-web static dir to serve (default
  `.test-jbrowse-<version>`). Use this to target a build newer than the release.
- `SKIP_BUILD=1` — reuse an existing `dist/` instead of rebuilding the plugin.
- `TEST_JBROWSE_VERSION` — names the default dir (`nightly` if unset).

Verified on 2026-08-06 against a build copied from
`~/src/jbrowse-components/products/jbrowse-web/build`:

```console
cp -r ~/src/jbrowse-components/products/jbrowse-web/build .test-jbrowse-local
JBROWSE_TEST_DIR=$PWD/.test-jbrowse-local RUN_E2E=1 pnpm test:e2e
```

All 18 tests pass. **Running the five suites together flakes**, about one test
in five runs, and never the same one — `launchAndHover`'s setup once,
`forceLayout`'s non-empty-canvas assertion once — and each passed on its own
immediately after. They share one server and one machine, so treat a single
failure as load until a second run agrees with it. Re-run the file alone before
believing it.
