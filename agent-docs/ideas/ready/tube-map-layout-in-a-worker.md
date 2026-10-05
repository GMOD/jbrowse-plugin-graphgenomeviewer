---
name: tube-map-layout-in-a-worker
description: The tube map lays out on the main thread, ~50 ms for 857 nodes plus ~40 ms per 1000 reads; a worker needs tubemap-core to stop keeping module-level state.
---

# Tube map layout in a worker

The tube map lays out on the main thread, at about 50 ms for 857 nodes plus
about 40 ms per 1000 reads, so a large GBZ window with its 5000-read sample can
stutter. A worker would take that off the main thread. **What it costs:**
tubemap-core keeps module-level state, so it isn't re-entrant, and a worker has
to run its layouts one at a time.
