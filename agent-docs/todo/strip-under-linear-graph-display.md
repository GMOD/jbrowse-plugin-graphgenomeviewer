---
name: strip-under-linear-graph-display
description:
  Draw walk rows under a graph track in a linear view, which walkStripApplies
  refuses while the pane has a host.
metadata:
  category: ready
  area: walk strip
  first_move:
    'Pass `host: false` to walkStripApplies from a track and see what the track
    needs.'
  order: 2
---

# Strip under LinearGraphDisplay

- The view draws walk rows under the graph (`WalkStrip.tsx`). A graph track in a
  linear view has no strip: `walkStripShown` (`pane/walkRowViews.ts`) passes
  `host: !!self.host`, and bandage-core's `walkStripApplies`
  (`layout/walkStrip.ts`) refuses a host.
- Dropping the `!o.host` clause in bandage-core changes every host at once, so
  try it from the plugin side first.
