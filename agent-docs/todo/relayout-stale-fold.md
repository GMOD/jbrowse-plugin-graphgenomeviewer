---
name: relayout-stale-fold
description:
  relayoutFrom recuts at the fresh window but cut() folds and caps by the
  settled one.
metadata:
  category: ready
  area: linear graph display
  first_move: 'Have recutAt set settledWindow to the window it cuts at.'
  order: 13
---

# A layout change during the settle debounce cuts with the old fold

- `LinearGraphDisplay/model.ts` 373-383 passes `hostWindow(self.host)` to
  `recutAt`; `cut()` (298-300) takes `cutFoldBp` from `settledWindow`, and
  `regionTooLarge` reads it too
- Narrow: only a layout change right after a zoom, before the window settles
