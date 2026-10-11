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
and the untangle pass run only on components the placement reached nothing of,
and the reference term, which only ever acted on placed points, is gone.
Smoothing restores a chain's length by bulging its interior out from the chord
between its ends, which stay put. Crossings as link × node / link × link / node
× node:

| cut                     | shipped (6.26.0)         | now                     | time        |
| ----------------------- | ------------------------ | ----------------------- | ----------- |
| MHC class II, 279 nodes | 6 / 1 / 32               | 9 / 18 / 2              | 170 → 42 ms |
| KIV-2 rGFA, 58 nodes    | 7 / 1 / 13               | 6 / 2 / 3               | 74 → 14 ms  |
| CFH, 44 nodes           | 1 / 0 / 3                | 0 / 6 / 0               |             |
| AMY1, 42 nodes          | 0 / 1 / 2                | 1 / 0 / 0               |             |
| KIV-2 GBZ, 8 haplotypes | 140 / 165 / 69, 58 twist | 226 / 342 / 22, 3 twist | 6.9 → 1.6 s |

Link × link is the one count that rises: the placement puts a piece whose
anchors lie on different curves on the chord between them, and those links cross
each other where the schedule had bent them apart. Chain lengths hold to 0.3% on
the GBZ cut where the schedule left them 54% off (the harness's length error on
CFH and AMY1 is deletion routes, drawn at arch length by design). Zoom
continuity, the reason the graph track uses this engine, is unchanged or better:
turns of 0-1° at every step at both loci, and the movement the fit leaves within
0.1-2.8 points of the shipped engine, 3-4x faster.

An independent review (2026-10-11) reproduced every count, and found the first
landing had left the reference term dead, changed the shuffle order of the
schedule for graphs with no backbone, and omitted link × link; all three are
fixed above.

Five placement commits followed the same day (graph-stress-layout d10468b to
b8c8a2c), each measured on the same cuts. Crossings on MHC class II, KIV-2 rGFA,
CFH and the GBZ cut, as link × node / link × link / node × node:

| change                                                               | MHC       | KIV-2     | CFH       | GBZ            |
| -------------------------------------------------------------------- | --------- | --------- | --------- | -------------- |
| one-lane anchor exemption; a short bar hangs deeper under a wide gap | 5 / 5 / 0 | 5 / 2 / 1 | 0 / 2 / 0 | 211 / 349 / 23 |
| no piece behind its frame (the notch on every walk panel)            | 2 / 6 / 0 | 5 / 2 / 1 | 0 / 2 / 0 | 242 / 469 / 13 |
| loops on the same feet longest first; coarse clearance; fit to 0.1%  | 3 / 5 / 0 | 5 / 2 / 1 | 0 / 2 / 0 | 243 / 411 / 13 |
| teardrop leans up to 80°                                             | 3 / 5 / 0 | 5 / 2 / 1 | 0 / 2 / 0 | 223 / 400 / 13 |

The GBZ cut lays out in 0.9 s, from 1.1 s, with the coarse clearance check. The
code carries the numbers for the variants measured and declined. Hanging a
multi-curve piece on its majority curve, leaning by shear at any angle,
exempting only siblings' feet, and splayed legs each raised crossings. Making a
narrower loop yield and re-place after a wide one whose leg pierces it freed the
pierced loop but re-placed it as a hairpin on long legs.

A second independent review (2026-10-11) reproduced the counts and profiled the
placement. Its one unimplemented recommendation is to split a piece with three
or more anchors on one frame at its anchored spine nodes, so the placer puts
each node by its own anchor and draws each segment between them as a lens,
teardrop or bar of its own. On the GBZ cut every link longer than a hundred link
lengths belongs to such a piece, and the junction hub beside the big loop is one
of them.

## Consequences

- The reference is exactly straight, so a track's drawing is the placement's:
  lenses, teardrops on stems, arches for deletions, nested on their parent's
  outside. A placed component is the same under every seed, and nothing pushes
  its overlapping points apart beyond the placement's own candidate search; the
  untangle pass runs only on components with no backbone.
- bandage-core 10.2.0 shipped the engine's new description string before
  graph-stress-layout was published with the behaviour, so until bandage-core
  depends on 0.2.0 the settings dialog describes a drawing the engine does not
  yet make. Under 0.x the `^0.1.1` range does not admit 0.2.0; the bump needs
  the range changed.
- A piece anchored on two different curves hangs on the chord between them and
  its links stay long: on the GBZ cut the haplotype junction nodes between the
  big loop and the rings draw as a hub of straight links, the one place the
  schedule drew better. Relaxing just those pieces with the rest held stretched
  the junction nodes across the gap instead (node crossings 22 to 48, length
  error 0.3% to 57%); the note is at the chord case in `stressPlacement.ts`.
- `GraphGenomeView` still defaults to FMMM (ADR-044). On the KIV-2 walks figure
  (`bandage-core/figures/kiv2_walks.json`) the placement engine draws GRCh38
  straight with HG00097's extra copy as a ring beside it and HG01960's big loop
  below, where FMMM tangles the array's small loops into a knot beside the big
  one; the view's default is worth revisiting once the engine is published.
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
