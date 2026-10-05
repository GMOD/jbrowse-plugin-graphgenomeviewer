---
name: todo
description: Open action items by area: drawing, walk strip, tube map. Read when picking up work, and before filing anything new here.
---

# Todo

## Drawing

### Halo behind arrowheads

- Goal: keep a head legible where it sits over a node, e.g. at an abutting joint
  or in a tight bubble.
- A background-coloured outline stroked before the fill also cuts the edge's own
  shaft where it enters the head's notch, so the head reads as detached.
- Needs a halo that skips the shaft: clip the outline to the node strokes under
  the head, or stroke only the two barbs.
- Code: `renderArrows` / `arrowheadOutline` in
  `bandage-core/src/renderer/Canvas2DRenderer.ts`.

### Bandage-style pointed node ends

- BandageNG draws strand on the node itself: the forward end tapers to a point
  (`GraphicsItemNode::shape`, in `~/src/vendor/BandageNG/graph/`).
- Blocked: no layout records which way a node is drawn.
  - Anchored rows: reference nodes run left to right whatever their strand;
    `stable.strand` says which strand that is, off-reference nodes have none.
  - Ordered: always left to right (`orderedLayout.ts`).
  - Tube map: follows the id's strand letter.
  - Force: follows the id's strand letter; since ec10976 links attach by strand,
    so the drawn direction there is now meaningful.
- First step: have each layout emit a per-node drawn strand, then taper the node
  end in `buildGeometry`. Force and tube map could go first.

## Walk strip

### Each row's own genes in bandage-figure

- Goal: a figure's strip boxes every row's genes, as the view's strip does.
  Today the spec's `genes` are the backbone's, so `renderSpec` in
  `bandage-core/src/cli/figure.ts` boxes the reference row only and the key says
  "no gene track" for the rest.
- Needs a spec field mapping each sample to its gene file, plus contig aliases
  per file, as `genes.refNames` gives the backbone's.

### Strip under LinearGraphDisplay

- The view draws walk rows under the graph (`WalkStrip.tsx`); a graph track in a
  linear view has no strip, since `walkStripShown` requires `!self.host`.

### The lifted walk's colour on its bar

- A lifted walk's name goes bold on the strip, but its bar doesn't take its lane
  colour. A chip beside the label or an outline round the bar would; decide
  whether `bandage-figure` follows.
- `walkStripLabelsTree` in `bandage-core/src/layout/walkStrip.ts` takes the
  lifted set as `bold`. An additive optional argument with each walk's colour
  avoids a breaking core change.

## Tube map

### Reads

- Fetch reads only for the tube map layouts: a track that names reads fetches
  them in every layout, though only a tube map draws them. A switch into a tube
  map then has to fetch when the graph has none.
- Keep mismatch text visible in a squeezed track; today it shows only once the
  track is dragged taller.
- Add a hover leader on read marks.

### Genes per haplotype through GAF

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
