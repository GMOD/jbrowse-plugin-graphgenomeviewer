---
name: lenient-track-enums
description:
  The track config takes layoutMode, layoutEngine and hover as strict enums, so
  a value from another build throws where the view and core fall back.
metadata:
  category: ready
  area: linear graph display
  first_move:
    'Use GraphGenomeView/lenientEnum.ts for all three slots in
    LinearGraphDisplay/configSchema.ts.'
  order: 17
---

# An unknown layoutMode, layoutEngine or hover in a track config throws

- `LinearGraphDisplay/configSchema.ts` uses `types.enumeration` for
  `layoutMode`, `layoutEngine` and `hover`
- The view reads an unknown mode as unset; core `layoutModeByValue` falls back
  to `auto`
- jbrowse's config editor reads a `stringEnum` slot's dropdown choices off the
  enumeration's union subtypes, which a `snapshotProcessor` wrapper hides, so
  check the editor still lists the modes after the change
