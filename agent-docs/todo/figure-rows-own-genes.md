---
name: figure-rows-own-genes
description: A bandage-figure strip that boxes every row's genes, as the view's strip does, instead of the reference row only.
metadata:
  category: ready
  area: walk strip
  first_move: "Add a spec field mapping each sample to its gene file."
  order: 2
---

# Each row's own genes in bandage-figure

- Goal: a figure's strip boxes every row's genes, as the view's strip does.
  Today the spec's `genes` are the backbone's, so `renderSpec` in
  `bandage-core/src/cli/figure.ts` boxes the reference row only and the key says
  "no gene track" for the rest.
- Needs a spec field mapping each sample to its gene file, plus contig aliases
  per file, as `genes.refNames` gives the backbone's.
