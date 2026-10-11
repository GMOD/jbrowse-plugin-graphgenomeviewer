---
status: Accepted
summary:
  'The stress engine draws a component with a backbone by its structural
  placement alone; the SGD schedule twisted every loop and runs only on
  components without one'
---

# ADR-045: Anchored graphs keep their placement

## Status

Accepted (2026-10-11). Amends ADR-044 for `@jbrowse/graph-stress-layout`.
Measured on the four HPRC release 2 example cuts in BandageJS's `examples/`, the
eight-haplotype KIV-2 GBZ cut, and bandage-core's zoom-continuity harness
(`scripts/layout-lab/continuity.ts`) at MHC class II and KIR.

## Context

Under the stress engine, loops hung below the backbone with their legs crossing
the links over them, and a bubble's alleles twisted into lollipops rather than
nesting. Counting crossings in the engine's own point space after each stage, on
MHC class II (279 nodes, 80 alleles anchored on the backbone):

| stage                     | link × node | node × node |
| ------------------------- | ----------: | ----------: |
| placement                 |          10 |           4 |
| placement + smoothing     |          14 |          17 |
| placement + untangle      |           6 |          25 |
| placement + SGD (shipped) |           6 |          32 |

Two causes, neither a tuning matter:

- **The objective.** A walk from a loop's leg runs on along the backbone, so the
  stress term pulls each leg to continue the reference's line on its own side,
  and the two legs cross at the neck. Starting the schedule later (3 of 60
  iterations), stopping walks at the backbone, dropping walks, or the untangle
  pass alone each left 20-44 node crossings.
- **Smoothing's end extension.** `respace` restored the length smoothing took by
  extending each chain's ends along their tangents, which ran a node's ends past
  its anchors and through the links there: 13 of the 32 crossings.

## Decision

A component with a backbone keeps `stressPlacement`'s drawing: the SGD schedule
and the untangle pass run only on components the placement reached nothing of.
Smoothing restores a chain's length by bulging its interior out from the chord
between its ends, which stay put.

| cut                     | shipped: link × node / node × node | now         | time        |
| ----------------------- | ---------------------------------- | ----------- | ----------- |
| MHC class II, 279 nodes | 6 / 32                             | 9 / 2       | 170 → 42 ms |
| KIV-2 rGFA, 58 nodes    | 7 / 13                             | 6 / 3       | 74 → 14 ms  |
| CFH, 44 nodes           | 1 / 3                              | 0 / 0       |             |
| AMY1, 42 nodes          | 0 / 2                              | 1 / 0       |             |
| KIV-2 GBZ, 8 haplotypes | 140 / 69, 58 twisted loops         | 226 / 22, 3 | 6.9 → 1.6 s |

Chain lengths hold to 0.3% on the GBZ cut where the schedule left them 54% off.
Zoom continuity, the reason the graph track uses this engine, is unchanged or
better: 0° turns at every step at both loci, and the movement the fit leaves
within 0.1-2.8 points of the shipped engine, 3-4x faster.

## Consequences

- The reference is exactly straight, so a track's drawing is the placement's:
  lenses, teardrops on stems, arches for deletions, nested on their parent's
  outside.
- A piece anchored on two different curves hangs on the chord between them and
  its links stay long: on the GBZ cut the haplotype junction nodes between the
  big loop and the rings draw as a hub of straight links, the one place the
  schedule drew better. Relaxing just those pieces with the rest held stretched
  the junction nodes across the gap instead (node crossings 22 to 48, length
  error 0.3% to 57%); the note is at the chord case in `stressPlacement.ts`.
- FMMM is as it was. Seeding it from the placement changes nothing, since OGDF's
  multilevel keeps only the coarsest level's seeds (ADR-042), and the untested
  `singleLevel` is now tested: it honours every seed and repulsion then buckles
  the straight backbone into waves at both loci.
- The settings dialog's caption no longer calls stress slower than FMMM.

## Alternatives rejected

- **Keeping the schedule with the backbone absorbing walks.** Rings widened into
  their neighbours and the backbone still bent: MHC 15 / 33.
- **Relaxation over links alone after placement.** MHC 8 / 20, since any local
  move ignores what lies between the points it moves.
