---
name: requested-row-set-on-the-rgfa-route
description:
  Empty rows for requested haplotypes and callset-style labels would line an
  rGFA graph up row for row with a genotype matrix.
---

# A requested row set on the rGFA route

A walk-indexed rGFA cut already takes the requested haplotypes:
`subgraphHaplotypes` (`LinearGraphDisplay/model.ts`) reaches `walkSubgraph` as
`prefixes` (`RgfaTabixAdapter.ts`), and `defaultHaplotypes` seeds it. Two gaps
keep the graph from lining up row for row with a genotype matrix of chosen
donors:

- A requested haplotype with no walk in the window gets no row, so the order
  shifts between windows. An empty row would pin it.
- The graph labels `HG00642.1` where the callset labels `HG00642 HP0`.

A plain segs/links rGFA has no walks, so its rows still come from whoever
contributed to the window.
