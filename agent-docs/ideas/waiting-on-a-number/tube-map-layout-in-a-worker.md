---
name: tube-map-layout-in-a-worker
description:
  The tube map lays out on the main thread, ~50 ms for 857 nodes; a worker is
  unblocked but only pays off once a workload stutters.
---

# Tube map layout in a worker

The tube map lays out on the main thread (the layout mode's `run` in
`pane/loadActions.ts`), at about 50 ms for 857 nodes plus about 40 ms per 1000
reads. `@jbrowse/tubemap-core` builds a fresh state per layout, so a worker can
run layouts side by side.

Only GBZ tracks take reads, and that route is deprecated, so the one stutter
case on record, a large window with its 5000-read sample, no longer counts.
Build the worker once a non-GBZ cut measures a layout long enough to drop
frames.
