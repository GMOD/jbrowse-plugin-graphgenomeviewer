---
name: walk-rows-as-spans
description:
  Every-haplotype walk rows at KIV-2 are refused by walkStepBudget, though the
  picture is 21k spans; compute runs in the worker and draw them through
  render-core's spanMark, then drop the step budget for walk rows.
---

# Walk rows as spans, runs from the worker

## The problem

`pangenome_hprc_repeats.md` tells readers to open every haplotype in walk rows
over the LPA KIV-2 array (chr6:160,616,002-160,646,753). On the walk-file route
that window holds 4.41 M steps across 465 walks, over `walkStepBudget` (4 M), so
the reader gets "Zoom in to about 27.9 kb". The gbz-base route caps nodes, not
steps, and drew it.

## What the budget is guarding

Measured 2026-10-09 against the hosted HPRC v2.1 walk files, every haplotype:

| stage                                  | KIV-2 30.7 kb                  |
| -------------------------------------- | ------------------------------ |
| cut, cold / warm                       | 1.93 s / 0.92 s                |
| nodes / links / walks / steps          | 21,714 / 29,595 / 465 / 4.41 M |
| most visits of one node by one walk    | 1                              |
| on/off-reference runs, raw             | 122,871                        |
| runs after `coalesceRuns` at 1000 px   | 20,967                         |
| `graphFromTables`, main thread         | 1,133 ms                       |
| `walkRows()`, main thread              | 975 ms                         |
| `walkRowsTree`                         | 11 ms, 21,433 SVG elements     |

No walk revisits a node: the steps are 465 haplotypes carrying a median 110 kb
of array in 8.5 bp nodes. The cost is one `PathVisit` object per step on the
main thread (`graphFromTables`, then `walkRows()` over it), and
`WalkRowsOverlay` rebuilding its whole tree on every pan frame and row hover.
The GRAPH_TRACK.md profile of 27 s in React SVG was chr22:20.0-20.1 Mb, 77,828
elements. Steps are the wrong unit: the budget refuses KIV-2's 21k spans and
admits chr22's 78k.

## The plan

1. **Runs in the worker.** The RPC computes each walk's on/off-reference runs
   from `GraphTables` typed arrays and ships them in place of steps for walk
   rows. No per-step object reaches the main thread in that mode.
2. **Spans on the host mark layer.** Walk rows paint through `render-core`'s
   `spanMark` (`x`, `x2`, `row`, `color`), on WebGPU, WebGL or Canvas2D; ADR-128
   shares those subpaths with runtime plugins. Hover stays y→row. Readouts,
   gene boxes and unit ticks stay SVG. `walkRowsTree` stays for SVG export.
3. **Budget.** Walk rows stop counting steps; `walkByteBudget` stays. Force and
   tube map keep `walkStepBudget`.

Out of scope: a build-time run file from gfa-to-tabix (only if bytes bind at
wider windows), a copy-number strip display.

## The number that decides it

A spike over the KIV-2 cut: runs from tables under 100 ms, spans painted under
20 ms, and the walk-rows picture unchanged against the SVG path.
