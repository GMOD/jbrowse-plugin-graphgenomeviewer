---
name: gene-chip-readout
description:
  Hovering a gene chip reads out chr position 1 bp low, under the graph's PanSN
  contig name.
metadata:
  category: ready
  area: genes
  first_move:
    'Print gene.start + 1 on the contig name in LabelLayer.tsx, or use core
    regionLabel.'
  order: 14
---

# The gene chip readout prints a 0-based start and the PanSN name

- `components/LabelLayer.tsx` 39 prints `gene.refName` raw and
  `gene.start.toLocaleString()` 0-based
- BandageJS's node hover names genes the same way through its own code; both
  belong in core `hoverText.ts` (BandageJS
  `agent-docs/ideas/collections/share-with-bandage-core.md`)
