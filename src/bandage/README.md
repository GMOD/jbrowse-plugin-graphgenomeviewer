# Vendored Bandage layout engine

`bandage-layout.js` is a generated artifact, not source. It is an Emscripten
build of Bandage's FMMM layout (OGDF), compiled with `-sSINGLE_FILE=1` so the
wasm is embedded as base64 and the file is a self-contained ES module with no
imports. That is what lets `esbuild` leave it alone and the plugin load it as a
lazy chunk at runtime.

Regenerate with `pnpm build:wasm` (see `scripts/build-wasm.sh`), which needs the
Emscripten SDK and a `BandageNG` checkout.

Source: https://github.com/cmdcolin/BandageNG-web (`bandage-layout-js/`)

Both Bandage and OGDF are GPL, which is why this plugin is GPL-3.0-or-later.
