---
name: tube-map-layout-in-a-worker
description:
  The tube map lays out on the main thread, ~50 ms for 857 nodes plus ~40 ms per
  1000 reads; @jbrowse/tubemap-core 0.2 dropped the module-level state that kept
  it off a worker.
---

# Tube map layout in a worker

The tube map lays out on the main thread, at about 50 ms for 857 nodes plus
about 40 ms per 1000 reads, so a large GBZ window with its 5000-read sample can
stutter. A worker would take that off the main thread. **What it costs:**
`@gmod/tubemap-core` 0.1.0 kept module-level state, so it wasn't re-entrant.
`@jbrowse/tubemap-core` 0.2 builds a fresh state per layout, so a worker can run
layouts side by side once the plugin's `@jbrowse/bandage-core` depends on it.
