---
name: hops-that-reach-donor-rows
description:
  A reference-only segs/links pair silently returns the context-0 graph for a
  cut; a third small file keyed by segment id for allele interiors would let
  hops reach donor rows.
---

# Hops that reach donor rows without indexing every donor contig

A reference-only segs/links pair was built and does _not_ serve a graph cut:
`subgraphContext` defaults to 1 hop, and a hop follows allele interiors, which
are indexed under exactly the donor contigs the small pair drops — so pointing
the cut at it silently returns the context-0 graph with no error to notice
(measured on C4: context 0 agrees at 30/36, context 1 and 2 differ). The small
pair is for a segments track drawn on the reference. What would do it is making
the hop reach donor rows without indexing every donor contig — a third small
file keyed by segment id for allele interiors, or a link row carrying enough
interior that no second query is needed. Producer plus adapter change, not a
config swap.
