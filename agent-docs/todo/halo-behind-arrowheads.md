---
name: halo-behind-arrowheads
description:
  A halo that keeps an arrowhead legible over a node without cutting the edge
  shaft where it enters the notch.
metadata:
  category: visual-call
  area: drawing
  first_move: 'Prototype the barb-only stroke and look at an abutting joint.'
  order: 1
---

# Halo behind arrowheads

- Goal: keep a head legible where it sits over a node, e.g. at an abutting joint
  or in a tight bubble.
- A background-coloured outline stroked before the fill also cuts the edge's own
  shaft where it enters the head's notch, so the head reads as detached.
- Needs a halo that skips the shaft: clip the outline to the node strokes under
  the head, or stroke only the two barbs.
- Code: `renderArrows` / `arrowheadOutline` in
  `bandage-core/src/renderer/Canvas2DRenderer.ts`.
