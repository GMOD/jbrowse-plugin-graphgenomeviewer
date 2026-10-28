---
name: allele-frequency-on-hover
description:
  Hovering a node or link reads its share of the cut's haplotypes, e.g. "12 of
  60 haplotypes (20%)", the number Node width › By frequency already computes.
---

# Allele frequency on hover

- With nodes by frequency and links by walks, the drawing shows which allele is
  common but not how common; `img/ordered_micb_link_width.png` invites the
  question.
- Node width › By frequency already computes each node's share of haplotypes
  (bandage-core `NODE_WIDTHS`), and a link's walk count is
  `edge.pathIds.length`.
- First step: add the count and percentage to the node hover text, then to a
  link's hover where one exists.
