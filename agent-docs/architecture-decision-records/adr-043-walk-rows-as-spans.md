---
status: Accepted
summary:
  'Walk rows take their runs from the worker and paint them through render-core
  spanMark; the step budget no longer bounds them'
---

# ADR-043: Walk rows as spans, runs from the worker

## Status

Accepted (2026-10-09).

## Context

`walkStepBudget` (4 M) guards the main thread from a Graph of every walk's
steps. Walk rows draw spans, not steps: every haplotype over the LPA KIV-2 array
(chr6:160,616,002-160,646,753) is 4.41 M steps but 26,863 spans at pane width,
so the budget refused a picture of 27k rectangles while admitting
chr22:20.0-20.1 Mb's 84k. The gbz-base route, which caps nodes, drew KIV-2.

## Decision

- A walk-rows cut computes each row's on- and off-reference runs from the cut's
  typed arrays in the worker (`walkRowRuns`, the same rows as bandage-core's
  `walkRows` over the parsed cut) and ships them beside the tables.
- The pane parses only the reference walk; every other walk is named and
  stepless. A layout that draws nodes parses the cut whole first.
- The bars paint through render-core's `spanMark` on a canvas, coalesced as
  `walkRowsTree` coalesces them, reference ramp included (a gradient run paints
  a piece per pixel or per degree of hue). Readouts, ticks, genes, calls and the
  hover box stay SVG, and SVG export keeps `walkRowsTree`.
- Walk rows skip `walkStepBudget`; `walkByteBudget` still bounds the download.
  Force-directed and tube map keep the step budget.

## Consequences

KIV-2 every haplotype draws in 2.2-2.8 s; chr22:20.0-20.1 Mb every haplotype
draws in 2.1 s where SVG bars took 4.8 s. GRAPH_TRACK.md and
GRAPH_SCALE_AND_LOD.md hold the measurements.

The tables still cross to the main thread, since a repeat pick re-slices the
walks by the repeat's own array (`walkRowRuns` on the main thread, about 80 ms
at KIV-2). Lifted walks are off while the cut is a walk-rows cut, since its
walks are stepless.

## Rejected

| idea                                            | why                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Keep the step budget for walk rows and raise it | the cost was per step on the main thread (1.5 s at KIV-2), not the picture |
| Ship runs alone, no tables                      | a repeat pick re-slices the walks; it would need a re-cut                  |
| A build-time run file from gfa-to-tabix         | the runs take 77-95 ms from the tables; only bytes would justify one       |
