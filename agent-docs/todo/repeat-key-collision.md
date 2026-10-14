---
name: repeat-key-collision
description:
  repeatFeatures.ts keys each repeat array by its span alone, so the user cannot
  pick the second of two arrays over one interval.
metadata:
  category: ready
  area: repeats
  first_move:
    'Add the motif, unit or record index to the key in repeatFeatures.ts.'
  order: 9
---

# Two repeat arrays over one span share a key

- `repeats/repeatFeatures.ts` 271 keys an array `${refName}:${start}-${end}`
- TRF reports two periods over one interval, and `bcftools norm -m-` splits a
  multi-allelic `<CNV:TR>` into same-span records
- `selectedRepeat` finds the first, both radios read checked, and React warns of
  duplicate keys
