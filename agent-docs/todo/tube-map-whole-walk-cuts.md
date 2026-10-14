---
name: tube-map-whole-walk-cuts
description:
  With the walk strip on, every tube-map cut asks gbz-base for overlapping
  snarls though tube maps draw no strip.
metadata:
  category: ready
  area: walk strip
  first_move:
    'Pass walkStrip: self.walkStrip && self.modeDrawsNodes to cutsWholeWalks in
    both places.'
  order: 11
---

# A tube map asks for whole-walk cuts for a strip it never draws

- `pane/walkRowViews.ts` 52-57 and `model.ts` 53-56 hand `self.walkStrip`
  straight to core's `cutsWholeWalks`, which knows nothing of tube maps;
  `walkStripApplies` excludes them
- Cost only: larger cuts, nothing drawn wrong
