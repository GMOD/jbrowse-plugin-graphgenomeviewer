# End-to-end tests

Puppeteer boots a real JBrowse Web, loads the built plugin, and opens a
`GraphGenomeView` straight into the **force-directed layout** — the one path
unit tests can't cover, since it runs the Bandage WASM engine fetched at runtime
as the hashed sibling chunk. A successful load proves the plugin bundle resolved
the engine URL from its own URL, downloaded the chunk, and drew a graph.

## Running

```console
RUN_E2E=1 pnpm test:e2e
```

Opt-in only because it needs a jbrowse-web static build to serve. **The suite
passes as of 2026-07-24**; the old `createSvgIcon` blocker is gone now that
`graph_viz` has merged to `main`.

Point `JBROWSE_TEST_DIR` at a jbrowse-web build and go:

```console
JBROWSE_TEST_DIR=/path/to/jbrowse-web/build RUN_E2E=1 pnpm test:e2e
```

A build from the same checkout the plugin links against is the most faithful
option, since that is what it compiles against. A stock
`jbrowse create .test-jbrowse-nightly --nightly` should also work now, but has
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
