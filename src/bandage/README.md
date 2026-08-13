# Bandage layout engine

`native/` is the C++ port of Bandage's FMMM layout (OGDF), ~1,100 lines: the
graph model, the OGDF wiring, and the Emscripten bindings. It lives here rather
than in a BandageNG checkout so a change to the layout is a reviewable diff in
this repo, beside the figures it moves.

`bandage-layout.js` is the generated artifact — an Emscripten build of `native/`
compiled with `-sSINGLE_FILE=1`, so the wasm is embedded as base64 and the file
is a self-contained ES module with no imports. That is what lets `esbuild` leave
it alone and the plugin load it as a lazy chunk at runtime.

Regenerate with `pnpm build:wasm` (`scripts/build-wasm.sh`). The Emscripten SDK
is the only thing you have to install: OGDF is **vendored** at `vendor/ogdf`
(elderberry-202309, patched — see [`vendor/README.md`](../../vendor/README.md)),
so there is no checkout to find, no network, and no version to get wrong. About
four minutes from nothing on 16 cores, seconds once `libOGDF.a` exists.

`OGDF_DIR` still points it elsewhere if you are testing an upstream bump.

### OGDF's own age is not a suspect

The script reuses `libOGDF.a` whenever one is there, so the OGDF an artifact was
linked against can be much older than the Emscripten that linked it. Measured
rather than assumed: rebuilding OGDF from scratch under emcc 6.0.6, against a
`libOGDF.a` built by whatever was current in October 2025, moved **no coordinate
in any of the 90 digest cases** (2026-08-13). Reach for `layout-digest.mjs`
below to establish that again rather than trusting this line.

`pnpm test:wasm` runs the committed artifact for real. Three things it guards:
the file is minified glue that any reformatter (eslint --fix, prettier) will
silently corrupt; **the layout is deterministic** — FMMM used to seed its
initial placement from `clock()`, which moved ~2% of the pixels in every
force-directed screenshot between regens, and the seed is now fixed
(`LayoutSettings::randomSeed`) and overridable per call with a `seed` option;
and the linear layout draws a graph whose **segment names are not integers**.

That last one is narrow on purpose. `determineLinearNodePositions` is the only
code that reads a segment's name and the only code reached by `linearLayout`,
and the smoke graph's segments were called `1`..`6`, so it never exercised the
branch a minigraph rGFA takes. See `parseWholeInt` in `native/include/types.h`
for what was hiding there.

## Nothing in native/ may throw

Emscripten builds with exception catching off by default, so `throw` is not
caught, it is `abort()` — including a `throw` from inside a `try` with a
`catch (...)` right there, because the handler is compiled away. A `std::stoi`
wrapped in exactly that shape read as careful and took the module down on every
graph whose segments were named `s1`.

An abort is not contained either. The call that aborts leaks whatever it had
allocated, so repeated ones exhaust the heap, and `loadBandage()` caches one
module per worker — measured, about twenty aborted calls and every *later*
layout fails with "memory access out of bounds" until the tab is reloaded. That
is why ownership here is `std::unique_ptr` rather than a matched `new`/`delete`:
not tidiness, but bounding what a future throw can cost.

## Verifying a rebuild

The artifact's bytes move for reasons that have nothing to do with the layout —
a different Emscripten, a different build host — so diffing the file says
nothing. Diff the **drawing**, which is what every committed figure is a
function of:

```console
git show HEAD:src/bandage/bandage-layout.js > /tmp/old-engine.mjs
node scripts/layout-digest.mjs /tmp/old-engine.mjs > /tmp/before.txt
pnpm build:wasm
node scripts/layout-digest.mjs > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt
```

That hashes full-precision coordinates over five graph shapes against every
option the view sends. Expect an empty diff for a change that was not meant to
move anything; every line that does change is a figure that will need
regenerating, and should be one you can name in advance.

`.github/workflows/wasm-rebuild.yml` runs exactly this weekly, and puts the diff
in the job summary. So the question it answers is not "did the bytes change" —
they always do, Emscripten embeds its own version and the build path — but "does
the committed engine still draw what its sources say it draws". It needs no
checkout but this one now that OGDF is vendored, and no `pnpm install`: both
scripts run on bare node.

Upstream: https://github.com/cmdcolin/BandageNG-web (`bandage-layout-js/`)

Both Bandage and OGDF are GPL, which is why this plugin is GPL-3.0-or-later.
