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
