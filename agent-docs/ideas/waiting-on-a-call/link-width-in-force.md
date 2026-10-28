---
name: link-width-in-force
description:
  Link width › By walks barely shows in force layouts; scale its ceiling with
  node thickness, or steer readers to Ordered.
---

# Link width in force layouts

- Force draws links as short connectors between abutting nodes, so their width
  hardly registers. At GSTM1 with 60 haplotypes, nodes by frequency, turning
  links from uniform to by walks changed about 2,300 px of a 1400x700 shot.
- bandage-core's `edgeWidthFactor` caps a link at 4x the 2 px connector, 8 px,
  beside nodes drawn at 10–14 px.
- Ordered hangs each alternate allele on a long link, where the width reads;
  `img/ordered_micb_link_width.png` uses it for that reason.
- The call:
  - scale the ceiling with `contigThickness`, so heavy links keep pace with
    nodes by frequency, or
  - leave the factor and say in `EDGE_WIDTHS`' description that the setting
    reads best in Ordered.
- Deletion edges already widen by walks since bandage-core 12.0.1, which is what
  makes a common deletion like GSTM1's show in force.
