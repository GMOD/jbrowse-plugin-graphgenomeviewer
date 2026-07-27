# Bandage layout engine

`native/` is the C++ port of Bandage's FMMM layout (OGDF), ~1,100 lines: the
graph model, the OGDF wiring, and the Emscripten bindings. It lives here rather
than in a BandageNG checkout so a change to the layout is a reviewable diff in
this repo, beside the figures it moves.

`bandage-layout.js` is the generated artifact — an Emscripten build of `native/`
compiled with `-sSINGLE_FILE=1`, so the wasm is embedded as base64 and the file
is a self-contained ES module with no imports. That is what lets `esbuild` leave
it alone and the plugin load it as a lazy chunk at runtime.

Regenerate with `pnpm build:wasm` (`scripts/build-wasm.sh`). It needs the
Emscripten SDK and an OGDF checkout, which is _not_ vendored: it is ~85 MB of
build tree and compiles for far longer than this port does. `OGDF_DIR` defaults
to `~/src/vendor/BandageNG/thirdparty/ogdf`.

`pnpm test:wasm` runs the committed artifact for real. Two things it guards: the
file is minified glue that any reformatter (eslint --fix, prettier) will
silently corrupt, and **the layout is deterministic** — FMMM used to seed its
initial placement from `clock()`, which moved ~2% of the pixels in every
force-directed screenshot between regens. The seed is fixed
(`LayoutSettings::randomSeed`) and overridable per call with a `seed` option.

Upstream: https://github.com/cmdcolin/BandageNG-web (`bandage-layout-js/`)

Both Bandage and OGDF are GPL, which is why this plugin is GPL-3.0-or-later.
