---
name: ordered-position-ramp
description:
  Reference position colours bunch in Ordered, which floors short nodes and
  compresses long ones; ramp by drawn x or mark bp ticks in the key.
---

# Reference position ramp in Ordered

- Ordered lays nodes end to end by rank with a length floor (ADR-041), so drawn
  length barely tracks bp: in MICB's exon 3 cut a 1 bp node draws 18 units, a 15
  bp one 42 and a 217 bp one 72.
- The position ramp stays linear in bp, so a SNP-dense intron spreads one hue
  across half the width and the exon's long nodes squeeze the rest of the ramp
  into a narrow band. A 550 bp cut there reads red, then magenta.
- Options:
  - in Ordered, spread the ramp along drawn position, which loses "same hue
    means same bp" against other views
  - keep the ramp and draw bp ticks on the key so a reader sees where the layout
    stretches bp
- Repro: a GraphGenomeView over chr6:31,505,950-31,506,500 on the HPRC demo's
  walk lanes, the 30 samples of `POPULATION_SAMPLES` in
  `scripts/shoot-figures.mjs`, layout Ordered.
