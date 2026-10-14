---
name: simplifications-awaiting-a-call
description:
  Cleanups a review skipped on a judgement worth re-checking: the synteny
  adapters' getFeatures dispatch and the morph gate. Each entry lists the
  reason, the case against it, and a first move.
---

# Simplifications awaiting a call

A review skipped each of these on judgement alone, without measuring the cost.
Each entry gives the case against the skip, so the decision can be made again.

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
