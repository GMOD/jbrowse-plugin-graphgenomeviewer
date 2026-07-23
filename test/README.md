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

Opt-in because it can't pass yet. The plugin is built against the unreleased
`graph_viz` branch of jbrowse-components (MUI 9, `@jbrowse/render-core`), so it
throws on `createSvgIcon` inside a stock `jbrowse create --nightly`, which is
built from `main`. This is the same blocker as the `build-and-test` CI job.

Once `graph_viz` is released (or you build a jbrowse-web from a compatible
checkout), point the harness at it and run:

```console
jbrowse create .test-jbrowse-nightly --nightly   # or a graph_viz build
JBROWSE_TEST_DIR=/path/to/jbrowse-web RUN_E2E=1 pnpm test:e2e
```

Without `RUN_E2E=1` the suite skips and exits clean, so it never blocks a run.

## Env vars

- `RUN_E2E=1` — required to un-skip the suite.
- `JBROWSE_TEST_DIR` — a jbrowse-web static dir to serve (default
  `.test-jbrowse-<version>`). Use this to target a graph_viz-compatible build.
- `SKIP_BUILD=1` — reuse an existing `dist/` instead of rebuilding the plugin.
- `TEST_JBROWSE_VERSION` — names the default dir (`nightly` if unset).
