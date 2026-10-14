---
name: simplifications-awaiting-a-call
description:
  Cleanups a review skipped on a judgement worth re-checking, such as a
  duplicate HSL helper, two legend swatch renderers, the morph gate, and
  preversion repeating CI. Each entry lists the reason, the case against it, and
  a first move.
---

# Simplifications awaiting a call

A review skipped each of these on judgement alone, without measuring the cost.
Each entry gives the case against the skip, so the decision can be made again.

## A second HSL-to-RGB helper

- `hslRgb` in `src/GraphGenomeView/walkRowSpans.ts` duplicates bandage-core's
  `hslToRgb` (`renderer/GeometryBuilder`) scaled by 255.
- Kept because the two round differently: over about 4.9M ramp hues, 801 land on
  a different 0–255 channel value, and 374 interpolated gradient pieces change.
- Against: a one-unit difference in one channel is invisible, so the trade is a
  few changed pixels for eight fewer lines of colour maths.
- First move: switch to `hslToRgb` and compare a walk-row screenshot by eye.

## One swatch renderer for the screen legend and the SVG export

- The legend draws each swatch twice, as HTML in `Legend.tsx`
  (`LegendSwatchView`, `stopsCss`) and as SVG in `PaneSvg.tsx` (`Gradient`,
  `SvgSwatch`). Both switch over the same ten swatch kinds, and only reading
  both keeps them in step.
- Drawing `SvgSwatch` on screen too would remove about 90 lines.
- Skipped because the e2e screenshots changed: Chrome snaps HTML boxes to whole
  pixels but antialiases SVG rects at fractional positions.
- Against: the screenshots are not baselines (`test/setup.ts`: "nothing here
  diffs against a golden image"), so a changed screenshot fails no check. The
  open question is whether softer swatch edges look worse, and rects placed on
  whole pixels might not change at all.
- First move: render `SvgSwatch` in a small `<svg>` inside `LegendSwatchView`,
  then compare a legend at 1x and 2x DPR in light and dark themes.

## The synteny adapters' getFeatures dispatch

- `GbzBaseSyntenyAdapter` and `WalkTabixSyntenyAdapter` each choose between
  anchor features and pair features in `getFeatures`. They already share
  `matchFeature` and the "Reading X against Y" status.
- Not moved into `ComparativeAdapterBase` because the adapters check different
  things first: the GBZ adapter its anchor and haplotype index, the walk adapter
  its name lookup.
- Against: an abstract preflight step could hold that difference. The GBZ route
  is deprecated, and removing its synteny adapter would leave one adapter and
  nothing to share.
- First move: decide whether `GbzBaseSyntenyAdapter` stays.

## The morph gate and timing in morph.ts

- `morphFrom` in `src/GraphGenomeView/pane/settingActions.ts` is about 110
  lines: a dozen conditions that decide whether a layout change animates, then a
  requestAnimationFrame loop.
- The proposal: `canMorph(previous, next, graph)` and
  `runMorph({onFrame, isLive})` in `pane/morph.ts`, with the model only wiring
  them up.
- Not done because the change relocates code without shrinking it.
- For: the gate would become a pure function that a test can call without
  building a model.
- First move: list the gate's conditions and count the tests that reach
  `morphFrom` today.

## preversion repeats the checks CI already passed

- `preversion` runs `scripts/ci-green.mjs`, then lint, format:check, both
  typechecks, the unit tests, build, host-names and host-compat.
- `ci-green.mjs` refuses unless the Push workflow passed on HEAD, and
  `pnpm version` refuses a dirty tree, so HEAD is the commit CI tested. Only
  host-names and host-compat read anything that can change after that CI run,
  because both load main's host.
- Trimming to `ci-green && build && host-names && host-compat` would save 2–3
  minutes per release, about 75 s of it the unit tests.
- The review kept these checks as a second line of defence, and whether the
  minutes matter is the maintainer's call.

## Two no-ops in the release workflow

- `.github/workflows/publish.yml` runs `pnpm build` before
  `scripts/publish-once.sh`, and `pnpm publish` builds again through `prepack`.
- `publish.yml` passes `--access public` to `publish-once.sh`, and an unscoped
  package publishes publicly without it.
- Left alone because only a real release runs this workflow.
- First move: drop both in the commit before a release, then watch that publish
  run.

## Members only tests use

- `setPaneHeight` (`pane/settingActions.ts`) has no production caller, and only
  a test reads `highlightInLinearView`'s return value
  (`src/launchFromGraph/launchFromGraph.ts`).
- Both stayed because removing them changes tests and nothing at runtime.
