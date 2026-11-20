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
- The strip's x would not follow the ruler: `walkStripFrame` fits the longest
  walk to the pane width (`scaleX = usable / longest`), so under a track it
  neither matches the host's bpPerPx nor moves with a pan. Frame it from the
  host instead: the reference row at the window's start and bpPerPx, other rows
  at the same scale and clipped at the edge.
- The view's toggle ("Show walk rows under the graph") lives in its
  SettingsMenu, not `showMenuItems`, so the track menu has none; the track's
  height must also make room for the strip's `frame.height`.
