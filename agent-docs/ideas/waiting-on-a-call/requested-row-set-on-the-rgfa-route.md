---
name: requested-row-set-on-the-rgfa-route
description:
  An explicit haplotype list on the rGFA route would line a graph up row for row
  with a genotype matrix, pin row order across windows and label donors by
  haplotype.
---

# A requested row set on the rGFA route

`subgraphHaplotypes` names the haplotypes a cut is for, and only the GBZ cut
reads it. On the rGFA route rows still come from whoever contributed to the
window, so a graph cannot be lined up row-for-row with a genotype matrix of
chosen donors. An explicit list (empty rows included) would make the two panels
comparable, pin the order across windows, and let the graph label `HG00642.1`
where the callset labels `HG00642 HP0`.
