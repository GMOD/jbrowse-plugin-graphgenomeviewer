---
name: lenient-track-enums
description:
  The track config takes layoutMode and hover as strict enums, so a value from
  another build throws where the view and core fall back.
metadata:
  category: ready
  area: linear graph display
  first_move:
    'Use GraphGenomeView/lenientEnum.ts for both slots in
    LinearGraphDisplay/configSchema.ts.'
  order: 17
---

# An unknown layoutMode or hover in a track config throws

- `LinearGraphDisplay/configSchema.ts` 25 and 91 use `types.enumeration`
- The view reads an unknown mode as unset; core `layoutModeByValue` falls back
  to `auto`
