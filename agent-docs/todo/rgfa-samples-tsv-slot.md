---
name: rgfa-samples-tsv-slot
description:
  A walk-indexed rGFA track draws walk rows but drops a configured samples TSV,
  so Group by never appears.
metadata:
  category: ready
  area: adapters
  first_move:
    'Share the walk-file slots, samplesTsvLocation among them, from
    panSNTabix.ts.'
  order: 12
---

# RgfaTabixAdapter has no samplesTsvLocation slot

- `pane/graphViews.ts` 864 reads `sourceAdapter?.samplesTsvLocation`; only the
  GBZ and walk schemas declare it
- Six slots repeat across `RgfaTabixAdapter/configSchema.ts` and
  `WalkTabixSyntenyAdapter/configSchema.ts`: walksLocation, walksIndex,
  walkStepBudget, walkByteBudget, defaultHaplotypes, assemblyNameToPanSN. A
  `walkFileSlots` object beside `walksLocations` would hold them and this one
- Check first that the `#slot` docs generator follows a spread
