---
name: genes-per-haplotype-through-gaf
description: Draw each gene through the nodes a haplotype carries it on, with that haplotype's edits marked, as transcripts in GAF.
metadata:
  category: measure
  area: tube map
  first_move: "Map one gene through one haplotype's walk by hand and compare with the reference-box lane."
  order: 1
---

# Genes per haplotype through GAF

- Goal: draw each gene through the nodes a haplotype carries it on, with that
  haplotype's edits marked. The gene lane (`tubeMap/genes.ts`) maps genes
  through the reference's boxes only, so it can't show an exon a haplotype's
  allele shifts, and on the own axis an exon over one long node looks as wide as
  a short intron.
- Route: transcripts as GAF on the graph, drawn through the reads pipeline
  (`GetGraphReads`, `src/gaf/gafFile.ts`, `tubeMap/reads.ts`). Each transcript
  gets a lane through the nodes it uses, and its cs tag marks the edits.
- Where per-haplotype annotation comes from: the hosted HPRC config gives every
  release 2 haplotype assembly its CAT gene track (`HG00097.1_cat_genes`, tabix
  BED), aliased by PanSN name (`HG00097#1`). Walk rows read it per row through
  `walkGeneReads`; the tube map could read the same tracks, then map each gene
  through the nodes of that haplotype's walk.
- Limits inherited from reads (`docs/layouts.md`, Reads):
  - only gbz-base tracks take reads
  - a tabix GAF index needs numeric node ids; without one a file is read whole,
    up to 50 MB
  - reads are sampled to 5000 a cut and coloured by strand; transcripts would
    want neither, and a name on each lane
