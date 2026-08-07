# End-to-end tests

Puppeteer boots a real JBrowse Web and loads the built plugin. Three suites:

| suite                    | what only it can prove                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `forceLayout.test.ts`    | the Bandage WASM engine is fetched at runtime as the hashed sibling chunk, and draws                 |
| `interaction.test.ts`    | the mouse is wired to hit detection, and a node drag repaints                                        |
| `launchAndHover.test.ts` | the launch menu items are reachable and open a view that fetches; the graph/linear hover sync paints |

## What `launchAndHover` demonstrates

It serves the real `test_data/rgfa_ecoli` tabix fixture behind a
`RgfaTabixAdapter` track on a `K12` assembly, plus a **plain BED track derived
from that same index** standing in for any track that marks where variation is
but cannot cut a graph (the bubble track is the real case). Every screenshot it
writes to `test-screenshots/` is a real browser frame:

| screenshot                                   | shows                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `demo-00-linear-view-with-graph-track`       | the rGFA segments drawn as features, PanSN names resolved             |
| `demo-01-rubberband-menu`                    | a real shift-drag selection offering "Graph genome view (this selection)" |
| `demo-02-subgraph-launched-from-selection`   | the subgraph fetched and drawn, paired to the linear view             |
| `demo-03-graph-hover-highlights-linear-view` | hovering a node paints a band over exactly its reference span         |
| `demo-04-linear-hover-selects-graph-node`    | hovering the linear view selects the covering graph node              |
| `demo-05-cross-track-context-menu`           | the launch offered from the track that _can't_ cut a graph            |
| `demo-06-cross-track-launched`               | that launch cutting from the graph track instead                      |
| `demo-07-over-cap-region`                    | past 100 kb the item is disabled with the size as its reason          |

Two things learned building it, both worth not rediscovering:

- **A menu item under "Launch view" is not in the DOM until that submenu is
  opened.** A test that only scans rendered rows will not find it. The
  rubberband items are deliberately flat, so they need no such step.
- **Hover targets come from the model, not from painted pixels.** Sweeping
  painted pixels flakes, because the first painted rows are the top edge of the
  drawn tube — about 4.6 screen px above the centreline, against a 5 px hover
  threshold. Projecting a node's own mid-point through the view's
  scale/translate is exact, and lets the assertion check the highlight equals
  that node's declared span rather than merely that some highlight appeared.

## Running

```console
RUN_E2E=1 pnpm test:e2e
```

Opt-in only because it needs a jbrowse-web static build to serve. **All 19 tests
pass as of 2026-08-06.**

Point `JBROWSE_TEST_DIR` at a jbrowse-web build and go:

```console
JBROWSE_TEST_DIR=/path/to/jbrowse-web/build RUN_E2E=1 pnpm test:e2e
```

**A build from the same checkout the plugin links against is not merely the most
faithful option, it is usually the only one that works**, and that is the single
most expensive thing to rediscover here. The plugin compiles against a
jbrowse-components checkout, so it calls core APIs as soon as they exist there —
`contributeToExtensionPoint` (2026-08-05), `requireAssembly` (2026-08-04) — and
an older host has none of them. The failure is that the plugin throws while
INSTALLING, so every suite dies in setup with a minified
`e.<something> is not a function` and the whole run reads as a plugin bug.

A host dir is a copy, and nothing refreshes it: `.test-jbrowse-demos` sat at
2026-07-24 for two weeks and every run against it was a lie. `setup.ts` now
greps the served bundles for those API names and throws with the `cp -r` line if
they are missing, so a stale host says so in one sentence instead of costing an
afternoon. Add to `HOST_REQUIRES` when the plugin picks up another new API.

A stock `jbrowse create .test-jbrowse-nightly --nightly` should also work now, but has
not been verified to carry the merge -- that is the one thing still keeping the
`e2e-tests` CI job disabled.

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
  `.test-jbrowse-<version>`). Use this to target a graph_viz-compatible build.
- `SKIP_BUILD=1` — reuse an existing `dist/` instead of rebuilding the plugin.
- `TEST_JBROWSE_VERSION` — names the default dir (`nightly` if unset).

Verified on 2026-08-06 against a build copied from
`~/src/jbrowse-components/products/jbrowse-web/build`:

```console
cp -r ~/src/jbrowse-components/products/jbrowse-web/build .test-jbrowse-local
JBROWSE_TEST_DIR=$PWD/.test-jbrowse-local RUN_E2E=1 pnpm test:e2e
```

All 19 tests pass. **Running the five suites together flakes**, about one test in
five runs, and never the same one — `launchAndHover`'s setup once, `forceLayout`'s
non-empty-canvas assertion once — and each passed on its own immediately after.
They share one server and one machine, so treat a single failure as load until a
second run agrees with it. Re-run the file alone before believing it.
