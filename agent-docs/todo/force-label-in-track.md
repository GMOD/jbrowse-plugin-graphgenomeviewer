---
name: force-label-in-track
description:
  The force mode's description says "OGDF FMMM" wherever it shows, though a
  graph track runs the stress engine by default.
metadata:
  category: ready
  area: menus
  first_move:
    'Give the force mode a description that holds for both engines, or one per
    engine.'
  order: 4
---

# The force mode's description names one engine

- The Layout menu names the engine since 79a43bb and 5592502: "Force-directed
  (FMMM)" and "Force-directed (stress)", with the engine in the header.
- The mode's description still says "OGDF FMMM, via the external Bandage engine"
  (bandage-core `layoutModes.ts`). `LayoutSelect.tsx` shows it as the option's
  tooltip and the Layout menu as its disabled help, whichever engine runs.
