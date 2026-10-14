---
name: whole-graph-skips-derivation
description:
  Relaying out a walk-rows cut without a recut re-parses it but skips the
  anchoring, fold, clip and reads parseAndLayout applies.
metadata:
  category: ready
  area: loading
  first_move:
    "Factor parseAndLayout's post-parse steps into deriveGraph and call it from
    wholeGraph."
  order: 10
---

# wholeGraph re-parses a cut without anchoring, folding or reads

- `wholeGraph()` (`pane/loadActions.ts` 642-652) calls only `parseCut(…, true)`;
  `parseAndLayout` (325-357) also applies the loaded reference,
  `anchorFromPaths`, the fold and the clip, and attaches reads
- Reached when LinearGraphDisplay's `relayoutFrom` falls back to
  `recomputeLayout` (region too large), or an engine setting changes mid-recut
- Result: a path-GFA graph unanchored or unfolded, and GAF reads lost
