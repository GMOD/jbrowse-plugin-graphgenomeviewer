---
name: strip-under-linear-graph-display
description: Draw walk rows under a graph track in a linear view, which walkStripShown refuses while the pane has a host.
metadata:
  category: ready
  area: walk strip
  first_move: "Drop the `!self.host` condition in walkStripApplies and see what the track needs."
  order: 3
---

# Strip under LinearGraphDisplay

- The view draws walk rows under the graph (`WalkStrip.tsx`); a graph track in a
  linear view has no strip, since `walkStripShown` requires `!self.host`.
