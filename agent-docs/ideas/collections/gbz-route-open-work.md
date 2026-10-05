---
name: gbz-route-open-work
description:
  Open items on the GBZ route — after-open latency, twin registration, identity,
  AMY1 copy count, walks over the rGFA cut, the build-your-own pangenome recipe
  and the hosted entry point. Triage inside it.
---

# GBZ route: open work

- **After-open latency.** Round trips, above. The next lever the anchors make
  cheap is a coarse table: every anchor's rows already give each haplotype's
  coordinate per 128 kb. A display tier needs `coarseBpPerPxThreshold` on the
  adapter, `getFeatures` honouring `opts.lodMode === 'coarse'`, and a renderer
  that draws a coarse feature without a CIGAR.
- **Twin registration.** Keep a discarded twin's positions, lazily, so a walk
  landing on one links the sibling. About a tenth of AMY1's sampled steps.
- **`identity`.** A CIGAR `M` is match-or-mismatch and the join scores gaps
  without sequences. Sequence identity needs the private nodes; measure first.
- **AMY1 copy count.** Undefined. Fragment count is not copy count (1,912
  fragments for 490 paths, 1-19 each, since a private insertion also cuts). At
  base level extra copies revisit GRCh38 nodes, so count visits of a unit marker
  node per walk with a monotone chaining rule; show it on one haplotype by hand
  before writing the spec.
- **Walks over the rGFA cut.** Walks are base-level; naming one over sv-level
  segments needs a base-to-sv node map nobody publishes. The GBZ track owns the
  walk figures.
- **Build your own** (jbrowse-components `pangenome_cactus.md`): `vg chains`
  from a distance index, `gbz-base construct --chains`, `gbz-haplotype-index`,
  then the lane track and graph cut on K12 beside the `odgi extract` route. The
  run's only distance index is for the filtered `ecoli.d2.gbz`, so the full
  graph needs one `vg index -j`; check the cactus 3.2.1 image's vg is 1.69+.
  Mention the pggb route (`vg gbwt -G graph.gfa --gbz-format`).
- **Hosted entry point:** genomes.jbrowse.org's HPRC page gains "Haplotype lanes
  from the graph" opening the CFH set. CHM13 windows already work on the same
  pair.
