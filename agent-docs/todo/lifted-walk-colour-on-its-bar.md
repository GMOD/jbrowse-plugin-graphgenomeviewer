---
name: lifted-walk-colour-on-its-bar
description:
  Show a lifted walk's lane colour on its strip bar, and decide whether
  bandage-figure follows.
metadata:
  category: visual-call
  area: walk strip
  first_move:
    'Pick between a chip beside the label and an outline round the bar.'
  order: 2
---

# The lifted walk's colour on its bar

- A lifted walk's name goes bold on the strip, but its bar doesn't take its lane
  colour. A chip beside the label or an outline round the bar would; decide
  whether `bandage-figure` follows.
- `walkStripLabelsTree` in `bandage-core/src/layout/walkStrip.ts` takes the
  lifted set as `bold`. An additive optional argument with each walk's colour
  avoids a breaking core change.

## Tube map
