---
status: Accepted
summary:
  'A graph track lays out force-directed with the stress engine, so a zoom
  re-cut keeps the drawing it had; the standalone view keeps FMMM'
---

# ADR-044: The graph track lays out with the stress engine

## Status

Accepted (2026-10-10). Amends ADR-042 for `LinearGraphDisplay`.

## Context

A graph track re-cuts at every zoom, folds the cut at 10 px of the view
(GRAPH_TRACK.md "Level of detail: the fold"), and lays it out fresh. Under FMMM
the drawing turned, mirrored and changed shape between steps. bandage-core's
`scripts/layout-lab/continuity.ts` measures it. It lays out windows from 1.4 Mb
down to 125 kb in seven steps and fits each layout onto the one before it over
the nodes they share:

| Locus             | FMMM turn | FMMM left | stress turn | stress left |
| ----------------- | --------- | --------- | ----------- | ----------- |
| bovine DEFB       | 0-27°, 1R | 2.7-12.7% | 0-1°        | 1.4-3.8%    |
| HPRC MHC class II | 0-15°, 1R | 2.2-11.9% | 0-3°        | 0.9-10.5%   |
| HPRC KIR          | 0-5°      | 1.7-6.8%  | 0-5°        | 1.1-5.2%    |

"Left" is the movement the best similarity fit leaves, as a share of the
drawing. At bovine DEFB, FMMM curls the reference into a ring from 1.4 Mb to 700
kb and draws a straight line from 500 kb. The stress engine targets each
reference point's separation along x, so every step reads as a crop of the last.

## Decision

`LinearGraphDisplay` defaults `layoutEngine` to `stress`. `GraphGenomeView`
keeps `fmmm`, since it draws a whole file or one locus and never re-cuts. Both
engines stay in the settings dialog.

The cost is shape. At a coarse zoom, small alleles bunch on the reference line,
and a large deletion draws as a chord along the top rather than as FMMM's U.

Speed matches FMMM where the track draws, since bandage-core 9.5.0 caps a
referenced component's walks at 20 links. Measured in node, ms:

| cut                            | nodes  | FMMM  | stress |
| ------------------------------ | ------ | ----- | ------ |
| bovine DEFB, 1.4 Mb, unfolded  | 1,293  | 908   | 858    |
| HPRC chr6, 20 Mb, unfolded     | 4,061  | 6,948 | 2,764  |
| GBZ chr22:20.0-20.1 Mb, 8 haps | 3,295  | 580   | 675    |
| GBZ KIV-2 130 kb, 8 haps       | 19,920 | 4,035 | 4,551  |

## Alternatives rejected

- **Seeding FMMM from the previous step and turning the result to match it.**
  Rotation went to 0°, but FMMM keeps only its coarsest level's seeds, and the
  matched turn carried a curled reference's angle forward: the bovine reference
  ran at 45° by 125 kb. Noted at bandage-core's `forceLayout`.
- **Seeding stress from the previous step.** Its structural placement overrides
  the seeds, and drift rose, with turns up to 141° at MHC.
- **Choosing the mirror image by the previous step under FMMM.** This fixes the
  flips, but not the 20-27° turns or the curl.
