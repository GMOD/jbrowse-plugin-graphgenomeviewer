---
status: Accepted
summary:
  'A graph track opens force-directed, which the stress engine draws in
  reference order, rather than anchored; anchored stays in the Layout menu'
---

# ADR-046: The graph track opens force-directed

## Status

Accepted (2026-11-03). Amends ADR-041's default for `LinearGraphDisplay`.

## Context

ADR-041 made the track open anchored because force-directed then meant FMMM: no
axis, so a graph could not sit under a linear view of its locus. ADR-044 gave
the track the stress engine, which targets each reference point's separation
along x, so a force-directed track now runs left to right in reference order and
keeps its drawing across a re-cut. The default was not revisited. Every hosted
pangenome config set `layoutMode: 'force'` per track, so only a reader's own
config, such as the one `gfa-to-tabix build` writes, still opened anchored, with
its alleles in rows by build order (`Rank 3`, `Rank 284`), which read as
haplotypes and are not.

Drawn three ways at HPRC C4, HLA-DRB5, LPA KIV-2 and GSTT1 and bovine KIT,
stress showed each allele as a loop off a reference-ordered backbone where
anchored stacked the same alleles in rank rows. Panned on the hosted main build
(headless Chrome, 24 cores), each window settled in:

| window, width       | anchored | stress | FMMM   |
| ------------------- | -------- | ------ | ------ |
| MHC class II, 60 kb | 526 ms   | 697 ms | 717 ms |
| LPA KIV-2, 60 kb    | 526 ms   | 695 ms | 694 ms |
| C4, 70 kb           | 526 ms   | 694 ms | 693 ms |

Medians over five pans of a fifth of the window. Anchored does not re-cut on a
pan; the force layouts re-cut, and the stress layout itself took 0.1 to 21 ms of
each settle.

## Decision

`LinearGraphDisplay` defaults `layoutMode` to `force`. With ADR-044's
`layoutEngine: 'stress'`, a track opens force-directed in reference order.
Anchored (`auto`) and the other layouts stay in the Layout menu and in config.

`layoutEngine` becomes a track config slot beside `layoutMode`, so a config can
open its tracks under FMMM, and a share link, Edit plot and Reset track settings
see the engine the menu picks. The standalone view keeps its own `layoutEngine`
property, defaulting to `fmmm`.

## Consequences

- A figure or tour whose session names no layout redraws force-directed.
- At the coarse tier of a base-level plain GFA (the five-strain pggb E. coli
  graph at 15 kb), stress spreads the cut into parallel strands joined by long
  links and FMMM folds it into a hairball; anchored stays readable there. A
  config for such a graph can set `layoutMode: 'auto'`.
- `drawsGenomicCoordinates` is false for a default track, so the host stops
  placing the graph's x on the view's ruler unless a config picks anchored.
