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
  `packages/core/src/renderer/Canvas2DRenderer.ts`.

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

## Tube map

### Genes per haplotype through GAF

- Goal: draw each gene through the nodes a haplotype carries it on, with that
  haplotype's edits marked. The gene lane (`tubeMap/genes.ts`) maps genes
  through the reference's boxes only, so it can't show an exon a haplotype's
  allele shifts, and on the own axis an exon over one long node looks as wide as
  a short intron.
- Route: transcripts as GAF on the graph, drawn through the reads pipeline
  (`GetGraphReads`, `src/gaf/gafFile.ts`, `tubeMap/reads.ts`). Each transcript
  gets a lane through the nodes it uses, and its cs tag marks the edits.
- Open question: where per-haplotype alignments come from. Projecting the
  reference annotation onto the graph repeats what the gene lane already draws;
  the gain needs each haplotype's own annotation, or transcripts aligned to each
  haplotype's path. Nobody has tried either.
- Limits inherited from reads (`HANDOFF_tubemap_reads.md`):
  - only gbz-base tracks take reads
  - a tabix GAF index needs numeric node ids; without one a file is read whole,
    up to 50 MB
  - reads are sampled to 5000 a cut and coloured by strand; transcripts would
    want neither, and a name on each lane
