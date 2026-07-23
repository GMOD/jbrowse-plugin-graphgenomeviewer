---
status: Accepted
summary: "GraphGenomeView keeps both an anchored (reference-axis) and a force-directed layout; node drawn-length is derived per graph by Bandage-style scaling, not a fixed constant"
---

# ADR-041: GraphGenomeView keeps two layout modes, and derives node length per graph

## Status

Accepted (2026-07). Covers the layout decisions in `plugins/graph`. The `adr-027`
citations that used to stand in for this were stale (that ADR was removed in
9d8102f0b5) and have been dropped from the source. See
`agent-docs/RGFA_GRAPH_HANDOFF.md` for the shipped state and the Bandage
comparison recipe.

## Context

A pangenome subgraph can be drawn two ways, and they answer different questions.

**Anchored.** rGFA tags every segment `SN`/`SO`/`SR` (gfatools `doc/rGFA.md`), so
a minigraph graph states its own backbone. x is reference bp, y is one row per
stable rank present in the window. This is lh3's VRPG layout. It needs no layout
engine, runs in about a millisecond, and reproduces exactly for a given window,
which is what lets a graph view sit under a linear view of the same locus and
line up column for column.

**Force-directed.** OGDF's FMMM through the Bandage WASM engine. x and y mean
nothing; the drawing shows the graph's shape. This is the picture people
recognize from Bandage, and it is the only one in which a bubble reads as a
bubble rather than as two stalks hanging off parallel rows.

Neither dominates. The anchored layout cannot show shape, because ranks are
parallel rows by construction. The force layout cannot show position, because it
has no axis. Both are cheap.

## Decision

**Keep both, defaulting to anchored whenever the graph declares a rank-0
backbone** (`layoutMode: 'auto'`), with `'force'` offered in the settings menu
only for such graphs — a plain GFA has no anchored layout to switch away from,
so offering the choice there would be offering one option twice.

**Derive node drawn-length per graph, using Bandage's own rule**
(`AssemblyGraph::determineGraphInfo` in BandageNG): pick units-per-megabase so
the mean drawn node lands on 40, floored so a small graph does not collapse.
This applies to every layout that reaches the engine, not just force mode.

**Floor off-reference node length in the anchored layout** at 1.5% of the window
span, and only for rank>0 nodes.

## Consequences

A fixed units-per-megabase constant cannot work across these graphs, and both
failure modes were observed:

- 1 unit/bp makes each node a long sweeping curve and the graph sprawls.
- 1000 units/Mbp (the WASM wrapper's own default) makes every node shorter than
  the edges between them, and the graph reads as beads on a string. Worse, in a
  400 bp pggb window it puts _every_ node below `minimumNodeLength`, so all 31
  clamp to the same drawn length and a 1 bp SNP allele renders the same size as
  the 164 bp backbone segment beside it. That shipped, and read as a chain of
  same-sized two-node bubbles running the length of the graph.

The wrapper's `settings.h` defaults `minimumNodeLength` / `edgeLength` /
`nodeSegmentLength` to 1.0, which does **not** match upstream's 5 / 5 / 20
(`program/settings.cpp`). They must be passed explicitly.

The anchored floor is safe specifically because rank>0 nodes have synthetic x:
their `SO` is an offset on a different stable sequence, so the layout already
lays them end to end from wherever they branch. Rank-0 nodes keep the exact
offsets they declare, so the reference axis — the only reason to prefer this
layout — is untouched. Without the floor, node length is bp while node thickness
is constant screen pixels, so at a 50 kb window the median 349 bp allele drew
about 9 px long against a 12 px thick tube: wider than it was long.

Costs accepted:

- Force mode is not content-stable. FMMM seeds itself per run and the engine
  exposes no seed, so every regen lands a different equally-valid layout. Figures
  in that mode carry `diffThreshold: 1` and are regenerated deliberately with
  `--force`.
- The anchored floor overstates short alleles slightly. It is a floor, so longer
  nodes are unaffected, and 1.5% is small against the 5% row spacing.
- Two modes is more surface than one, including a persisted `layoutMode` prop and
  a figure-recipe click-path.

## Alternatives rejected

**Force mode only.** Gives up the coordinate correspondence that motivated the
rGFA work at all — the point of indexing by tabix is to open a locus and see it
next to the reference.

**Anchored only.** Was the shipped state, and produced the figures that prompted
"these don't convey the classic Bandage diagrams people are used to". Correct in
topology, misleading in shape.

**Sublinear (log/sqrt) node-length compression.** Would make the sparse arcs more
compact, but is a deliberate departure from what Bandage does, so the rendering
could no longer be validated against it. Rejected on those grounds rather than on
appearance; revisit only with a reason that survives the comparison.

**Per-strand nodes.** Node ids carry `+`/`-` (`s322+`) and the converter emits one
node per segment on its canonical strand. Drawing both strands would double every
node and is easy to "fix" back into; don't.

## Validation

`Bandage image` on byte-identical GFA, via
`plugins/comparative-adapters/scripts/dump-subgraph.ts`. Bandage draws these
graphs the same sparse way we do; the sprawl is a property of a pangenome window
(a few multi-kb backbone segments plus many sub-kb alleles), not of the renderer.
The unit guard is the drawn-length *ratio* in `model.test.ts`, not the constant,
which is free to be retuned.
