---
name: expand-a-bubble-on-click
description: PangyPlot-style expand on click: a coarse-tier node id is its bubble source segment, so expanding is a fine-index query over the same span.
---

# Expand a bubble on click

PangyPlot's `/pop`. A coarse-tier node's id _is_ its bubble's source segment, so
expanding one is a fine-index query over the same span, with no cross-reference
to maintain. The tier itself shipped as `RgfaTabixAdapter`'s `coarse` slot,
which the graph track switches to by zoom (`reference/GRAPH_TRACK.md`).

A graph loaded through `gfaLocation` has no tier to switch to, so its coarsening
has to happen in the view: `ideas/waiting-on-a-call/coarsen-trivial-bubbles.md`.
