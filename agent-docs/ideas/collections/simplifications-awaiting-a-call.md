---
name: simplifications-awaiting-a-call
description:
  Cleanups a review skipped on a judgement worth re-checking, such as a
  duplicate HSL helper, the morph gate and test-only members. Each entry lists
  the reason, the case against it, and a first move.
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

## Members only tests use

- `setPaneHeight` (`pane/settingActions.ts`) has no production caller, and only
  a test reads `highlightInLinearView`'s return value
  (`src/launchFromGraph/launchFromGraph.ts`).
- Both stayed because removing them changes tests and nothing at runtime.
