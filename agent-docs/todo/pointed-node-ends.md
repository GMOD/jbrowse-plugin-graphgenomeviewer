---
name: pointed-node-ends
description: Taper the forward end of a node to a point, once each layout records which way a node is drawn.
metadata:
  category: ready
  area: drawing
  first_move: "Emit a per-node drawn strand from the force and tube map layouts."
  order: 1
---

# Bandage-style pointed node ends

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
