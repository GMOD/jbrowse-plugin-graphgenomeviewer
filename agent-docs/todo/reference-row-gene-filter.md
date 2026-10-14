---
name: reference-row-gene-filter
description:
  The reference walk row draws every gene feature of the cut, where other rows
  and BandageJS keep only the genes on the row.
metadata:
  category: ready
  area: walk rows
  first_move: "Filter the reference row's genes as BandageJS's genesOnRow does."
  order: 15
---

# The reference walk row gets every gene unfiltered

- `pane/walkRowViews.ts` 166-168 sets the reference row to `self.geneFeatures`
- BandageJS filters with `genesOnRow` (`src/derived.ts` 93-106)
