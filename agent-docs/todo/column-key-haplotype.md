---
name: column-key-haplotype
description: columnKeyOf rebuilds a walk's haplotype from its number, so #01 becomes #1 and a walk with no haplotype becomes #undefined.
metadata:
  category: ready
  area: tube map
  first_move: 'Use core panSNHaplotype in columnKeyOf in tubeMapPanels.ts.'
  order: 16
---

# A samples TSV row named HG00097#01 never matches

- `tubeMapPanels.ts` 121-126 builds `${sample}#${haplotype}` from
  `Number(parts[1])`
- bandage-core's `panSNHaplotype` keeps the name as written
